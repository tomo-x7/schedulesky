import { parse, serialize } from "cookie";

export default {
	/**@param {Request} request  */
	async fetch(request, env, ctx) {
		const path = new URL(request.url).pathname;
		const method = request.method;
		const cookie = parse(request.headers.get("Cookie") || "");
		const type = request.headers.get("Content-Type");
		//ログイン処理
		if (method === "POST" && path === "/login") {
			//バリデーション
			if (type !== "application/json") {
				return createresponse({ error: "Content-Type must be 'application/json'" }, 400);
			}
			const { endpoint, identifier, password } = await request.json();
			if (!URL.canParse(`https://${endpoint}/`)) {
				return createresponse({ error: "bad endpoint" }, 400);
			}
			const res = await fetch(`https://${endpoint}/xrpc/com.atproto.server.createSession`, {
				body: JSON.stringify({ identifier, password }),
				headers: { "Content-Type": "application/json" },
				method: "POST",
			});
			//エラー投げてきたらそのままエラーを返す
			if (!res.ok) {
				return res;
			}
			//tokenを取得してクッキーにつけて返す
			const { accessJwt, refreshJwt } = await res.json();
			const header = new Headers();
			setcookie(header, refreshJwt, accessJwt);
			return createresponse({ message: "success" }, 200, header);
		}
		//プロフィールの取得
		if (method === "GET" && path === "/getprofile") {
			//セッションを取得してtokenがなければ認証を要求
			const session = await getsession(cookie);
			if (!session) {
				return createresponse({ error: "require auth" }, 401);
			}
			const data = await fetch(`${session.endpoint}/xrpc/app.bsky.actor.getProfile?actor=${encodeURIComponent(session.DID)}`, {
				headers: { Authorization: `Bearer ${session.accesstoken}` },
			});
			data.headers.append("Set-Cookie");
		}
		//どれにも該当しなければ404
		return createresponse({ error: "not found" }, 404);
	},
};
/**
 * @typedef {Object} tokenData
 * @property {string} scope スコープ(?)
 * @property {string} sub ユーザーのDID
 * @property {Date} iat token作成日時
 * @property {Date} exp token失効日時
 * @property {string} aud PDSのdid？
 * @param {string} token
 * @returns {tokenData}
 */
function tokenParser(token) {
	const data = JSON.parse(atob(token.split(".")[1]));
	return {
		scope: data.scope,
		sub: data.sub,
		iat: new Date(data.iat * 1000),
		exp: new Date(data.exp * 1000),
		aud: data.aud,
	};
}
/**
 * @param {Record<string, string>} cookie
 * @returns {Promise<{DID:string,endpoint:string,accesstoken:string,refreshtoken:string?}|undefined>}
 */
async function getsession(cookie) {
	//accesstokenを保持している
	if (cookie.accesstoken) {
		const tokenData = tokenParser(cookie.accesstoken);
		//期限切れの場合リターンしない=>リフレッシュ
		if (tokenData.exp > new Date()) {
			return { accesstoken: cookie.accesstoken, DID: tokenData.sub, endpoint: await didresolve(tokenData.sub) };
		}
	}
	//accesstokenがないのでリフレッシュ
	if (cookie.refreshtoken) {
		const tokenData = tokenParser(cookie.refreshtoken);
		//期限切れチェック
		if (tokenData.exp > new Date()) {
			const res = await fetch(`https://${tokenData.aud}/xrpc/com.atproto.server.refreshSession`, {
				method: "POST",
				headers: { Authorization: `Bearer ${cookie.refreshtoken}` },
			});
			//エラーチェック
			if (res.ok) {
				return await res.json().then(async (d) => {
					return {
						accesstoken: d.accessJwt,
						refreshtoken: d.refreshJwt,
						DID: tokenData.sub,
						endpoint: await didresolve(tokenData.sub),
					};
				});
			}
		}
	}
	//両方のtokenがないか期限が切れてる場合、undefinedを返す。この場合は401を返す
	return undefined;
}
/**
 * @param {string} did
 * @returns {Promise<string|undefined>} PDSのエンドポイント */
async function didresolve(did) {
	let diddocres;
	if (/^did:plc/.test(did)) {
		diddocres = await fetch(`https://plc.directory/${did}`);
	} else if (/^did:web/.test(did)) {
		diddocres = await fetch(`https://${did.replace("did:web:", "")}/.well-known/did.json`);
	} else {
		console.error("bad did method");
		return undefined;
	}
	if (!diddocres.ok) {
		console.error(`${diddocres.status}-${diddocres.statusText}`);
		return undefined;
	}
	const diddoc = await diddocres.json();
	console.log(JSON.stringify(diddoc));
	try {
		const endpoint = Array.from(diddoc.service).filter((service) => service.id === "#atproto_pds")[0].serviceEndpoint;
		return endpoint;
	} catch (e) {
		console.error(e);
		return undefined;
	}
}
/**
 * @param {Headers} header
 * @param {string} refreshJwt
 * @param {string} accessJwt
 */
function setcookie(header, refreshJwt, accessJwt) {
	const accessJwtdata = tokenParser(accessJwt);
	const refreshJwtdata = tokenParser(refreshJwt);
	header.append("Set-Cookie", serialize("refreshtoken", refreshJwt, { httpOnly: true, secure: true, expires: refreshJwtdata.exp }));
	header.append("Set-Cookie", serialize("accesstoken", accessJwt, { httpOnly: true, secure: true, expires: accessJwtdata.exp }));
}
/**
 * @param {Object} body
 * @param {number?} status
 * @param {Headers?} header
 */
function createresponse(body, status = 200, header = undefined) {
	const newheader = header ?? new Headers();
	newheader.append("Content-Type", "application/json");
	return new Response(JSON.stringify(body), { status: status ?? 200, headers: newheader });
}
