// @ts-check
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
			const header = setcookie(undefined, accessJwt, refreshJwt);
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
			if (data.ok) {
				let header;
				if (session.didRefresh) {
					header = setcookie(data.headers, session.accesstoken, session.refreshtoken);
				}
				return new Response(await data.text(), { headers: header });
			}
			return data;
		}
		//投稿の作成
		if (method === "POST" && path === "/createpost") {
			//バリデーション
			if (type !== "application/json") {
				return createresponse({ error: "Content-Type must be 'application/json'" }, 400);
			}
			/**
			 * @typedef postdata
			 * @property {string} date
			 * @property {string} text
			 * @property {object} facets
			 * @property {Array<{base64:string,alt:string|undefined}>|undefined} images base64エンコードした画像とALTテキストの配列　最大画像サイズは0.9MB? クライアント側でJPEGに変換しておく　配列の最大長さは4
			 */
			/**@type {postdata} */
			const data = await request.json();
			if (data.images !== undefined && data.images?.length > 4) {
				//imagesがundefinedか長さが4未満ならOK
				return createresponse({ error: "bad request" }, 400);
			}
			//セッションを取得してtokenがなければ認証を要求
			const session = await getsession(cookie, true);
			if (!session) {
				return createresponse({ error: "require auth" }, 401);
			}
			//cookieの更新をする場合用のヘッダーの作成
			const header = session.didRefresh ? setcookie(undefined, session.accesstoken, session.refreshtoken) : undefined;
			//DBに登録するbodyの元になる
			const blobs = [];
			const rids = [];
			const alts = [];
			//画像をアップロード
			if (data.images !== undefined) {
				for (const image of data.images) {
					const blobres = await fetch(`${session.endpoint}/xrpc/com.atproto.repo.uploadBlob`, {
						method: "POST",
						headers: { Authorization: `Bearer ${session.accesstoken}`, "Content-Type": "image/jpeg" },
						body: base64ToUint8Array(image.base64),
					}).then((d) => (d.ok ? d.json() : undefined));
					if (!blobres?.blob) return createresponse({ error: "image upload failed" }, 500, header);
					const body = {
						repo: session.DID,
						collection: "app.vercel.schedulesky",
						validate: false,
						record: {
							$type: "app.vercel.schedulesky",
							blob: blobres.blob,
						},
					};
					const res = await fetch("https://bsky.social/xrpc/com.atproto.repo.createRecord", {
						body: JSON.stringify(body),
						method: "POST",
						headers: { Authorization: `Bearer ${session.accesstoken}`, "Content-Type": "application/json" },
					});
					if (!res.ok) {
						return createresponse({ error: "save image failed" }, 500, header);
					}
					blobs.push(blobres.blob);
					rids.push((await res.json()).uri.split("/")[4]);
					alts.push(image.alt ?? null);
				}
				if (blobs.length !== rids.length) {
					return createresponse({ error: "length conflict" }, 500, header);
				}
			}
			const res = await fetch("https://rxtjjnbocilskefknuac.supabase.co/rest/v1/rpc/createpost", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${env.SUPABASE_SERVICE_KEY}`,
					apikey: env.SUPABASE_SERVICE_KEY,
				},
				body: JSON.stringify({
					post_at: new Date(data.date),
					posttext: data.text,
					facet: data.facets,
					refreshtoken: session.refreshtoken,
					did: session.DID,
					pdsendpoint: session.endpoint,
					blob: blobs,
					rid: rids,
					alt: alts,
				}),
			});
			if (!res.ok) {
				console.error(await res.json());
				return createresponse({ error: "DB error" }, 500, header);
			}
			return createresponse({ message: "success" }, 200);
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
 * @param {boolean} forcerefresh trueの場合強制リフレッシュ デフォルトはfalse
 * @returns {Promise<{DID:string,endpoint:string|undefined,accesstoken:string,refreshtoken?:string,didRefresh:boolean}|undefined>}
 */
async function getsession(cookie, forcerefresh = false) {
	//accesstokenを保持しているかつ強制リフレッシュしない
	if (cookie.accesstoken && !forcerefresh) {
		const tokenData = tokenParser(cookie.accesstoken);
		//期限切れの場合リターンしない=>リフレッシュ
		if (tokenData.exp > new Date()) {
			return { accesstoken: cookie.accesstoken, DID: tokenData.sub, endpoint: await didresolve(tokenData.sub), didRefresh: false };
		}
	}
	//accesstokenがないのでリフレッシュ
	if (cookie.refreshtoken) {
		const tokenData = tokenParser(cookie.refreshtoken);
		//期限切れチェック
		if (tokenData.exp > new Date()) {
			const endpoint = await didresolve(tokenData.sub);
			if (endpoint) {
				const res = await fetch(`${endpoint}/xrpc/com.atproto.server.refreshSession`, {
					method: "POST",
					headers: { Authorization: `Bearer ${cookie.refreshtoken}` },
				});
				//エラーチェック
				if (res.ok) {
					return await res.json().then(async (d) => {
						console.log(JSON.stringify(d));
						return {
							accesstoken: d.accessJwt,
							refreshtoken: d.refreshJwt,
							DID: tokenData.sub,
							endpoint: endpoint,
							didRefresh: true,
						};
					});
				}
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
	try {
		const endpoint = Array.from(diddoc.service).filter((service) => service.id === "#atproto_pds")[0].serviceEndpoint;
		return endpoint;
	} catch (e) {
		console.error(e);
		return undefined;
	}
}
/**
 * @param {Headers|undefined} header
 * @param {string} accessJwt
 * @param {string|undefined} refreshJwt
 * @returns {Headers}
 */
function setcookie(header, accessJwt, refreshJwt) {
	const newheader = new Headers(header);
	if (accessJwt) {
		const accessJwtdata = tokenParser(accessJwt);
		newheader.append("Set-Cookie", serialize("accesstoken", accessJwt, { httpOnly: true, secure: true, expires: accessJwtdata.exp }));
	}
	if (refreshJwt) {
		const refreshJwtdata = tokenParser(refreshJwt);
		newheader.append(
			"Set-Cookie",
			serialize("refreshtoken", refreshJwt, { httpOnly: true, secure: true, expires: refreshJwtdata.exp }),
		);
	}
	return newheader;
}
/**
 * @param {Object} body
 * @param {number?} status
 * @param {Headers|undefined} header
 * @returns {Response}
 */
function createresponse(body, status = 200, header = undefined) {
	const newheader = header ?? new Headers();
	newheader.append("Content-Type", "application/json");
	return new Response(JSON.stringify(body), { status: status ?? 200, headers: newheader });
}

// (from: https://gist.github.com/borismus/1032746#gistcomment-1493026)
/**
 * @param {string} base64Str
 */
function base64ToUint8Array(base64Str) {
	const raw = atob(base64Str);
	return Uint8Array.from(
		Array.prototype.map.call(raw, (x) => {
			return x.charCodeAt(0);
		}),
	);
}
