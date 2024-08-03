/**
 * Welcome to Cloudflare Workers! This is your first worker.
 *
 * - Run "npm run dev" in your terminal to start a development server
 * - Open a browser tab at http://localhost:8787/ to see your worker in action
 * - Run "npm run deploy" to publish your worker
 *
 * Learn more at https://developers.cloudflare.com/workers/
 */
import { parse, serialize } from "cookie";

const res401 = new Response(JSON.stringify({ error: "require auth" }), {
	status: 401,
});

export default {
	/**@param {Request} request  */
	async fetch(request, env, ctx) {
		const path = new URL(request.url).pathname;
		const method = request.method;
		const cookie = parse(request.headers.get("Cookie") || "");
		const type = request.headers.get("Content-Type");
		if (method === "POST" && path === "/login") {
			if (type !== "application/json") {
				return new Response({ error: "Content-Type must be 'application/json'" }, { status: 400 });
			}
			const { endpoint, identifier, password } = await request.json();
			const res = await fetch(`https://${endpoint}/xrpc/com.atproto.server.createSession`, {
				body: JSON.stringify({ identifier, password }),
				headers: { "Content-Type": "application/json" },
				method: "POST",
			});
			if (!res.ok) {
				return new Response(await res.json(), { status: res.status, statusText: res.statusText });
			}
			const { accessJwt, refreshJwt } = res.json();
			const accessJwtdata = tokenParser(accessJwt);
			const refreshJwtdata = tokenParser(refreshJwt);
			const header = new Headers();
			header.append(
				"Set-Cookie",
				serialize("refreshtoken", refreshJwt, { httpOnly: true, secure: true, expires: refreshJwtdata.exp }),
			);
			header.append("Set-Cookie", serialize("accesstoken", accessJwt, { httpOnly: true, secure: true, expires: accessJwtdata.exp }));
			return new Response(undefined, { status: 200, headers: header });
		}
		if (method === "GET" && path === "/getprofile") {
		}
		return new Response(undefined, { status: 404 });
	},
};
tokenParser().aud;
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
 * @returns {{DID:string,endpoint:string,accesstoken:string,refreshtoken:string?}|undefined}
 */
async function getsession(cookie) {
	//accesstokenを保持している
	if (cookie.accesstoken) {
		const tokenData = tokenParser(cookie.accesstoken);
		//期限切れの場合リターンしない=>リフレッシュ
		if (tokenData.exp > new Date()) {
			return { accesstoken: cookie.accesstoken, DID: tokenData.sub, endpoint: didresolve(tokenData.sub) };
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
				return await res.json().then((d) => {
					return { accesstoken: d.accessJwt, refreshtoken: d.refreshJwt, DID: tokenData.sub, endpoint: didresolve(tokenData.sub) };
				});
			}
		}
	}
	//両方のtokenがないか期限が切れてる場合、undefinedを返す。この場合は401を返す
	return undefined;
}
/**
 * @param {string} did
 * @returns {string|undefined} PDSのエンドポイント */
async function didresolve(did) {
	let diddocres;
	if (/^did:plc/.test(did)) {
		diddocres = await fetch(`https://plc.directory/${did}`);
	} else if (/^did:web/.test(did)) {
		diddocres = await fetch(`https://${did.replace("did:web:", "")}/.well-known/did.json`);
	} else {
		return undefined;
	}
	if (!diddocres.ok) {
		console.error(`${diddocres.status}-${diddocres.statusText}`);
		return undefined;
	}
	const diddoc = await diddocres.json();
	const endpoint = new Array(diddoc.service).filter((service) => service.id === "#atproto_pds")?.[0]?.serviceEndpoint;
	return endpoint;
}
