// @ts-check
import { parse, serialize } from "cookie";
import { NodeOAuthClient } from "@atproto/oauth-client-node";
import { JoseKey } from "@atproto/jwk-jose";

const client = new NodeOAuthClient({
	// This object will be used to build the payload of the /client-metadata.json
	// endpoint metadata, exposing the client metadata to the OAuth server.
	clientMetadata: {
		// Must be a URL that will be exposing this metadata
		client_id: "https://schedulesky.vercel.app/api/client-metadata.json",
		client_name: "schedulesky",
		client_uri: "https://schedulesky.vercel.app/",
		logo_uri: "https://oauth-test-pink.vercel.app/next.svg",
		redirect_uris: ["https://schedulesky.vercel.app/api/callback"],
		scope: "profile email offline_access",
		grant_types: ["authorization_code", "refresh_token"],
		response_types: ["code"],
		application_type: "web",
		token_endpoint_auth_method: "private_key_jwt",
		dpop_bound_access_tokens: true,
		jwks_uri: "https://oauth-test-pink.vercel.app/api/jwks.json",
		token_endpoint_auth_signing_alg: "ES256",
	},
	// Used to authenticate the client to the token endpoint. Will be used to
	// build the jwks object to be exposed on the "jwks_uri" endpoint.
	keyset: await Promise.all([
		JoseKey.fromImportable(process.env.PRIVATE_KEY_1 ?? ""),
		JoseKey.fromImportable(process.env.PRIVATE_KEY_2 ?? ""),
		JoseKey.fromImportable(process.env.PRIVATE_KEY_3 ?? ""),
	]),

	// Interface to store authenticated session data
	sessionStore: {
		set: async (sub, sessionData) => {
			console.log(JSON.stringify(sessionData));
			await setredis(`session_${sub}`, sessionData);
		},
		get: (key) => getredis(`session_${key}`),
		del: (key) => delredis(`session_${key}`),
	},

	// Interface to store authorization state data (during authorization flows)
	stateStore: {
		set: async (sub, sessionData) => {
			console.log(JSON.stringify(sessionData));
			await setredis(`state_${sub}`, sessionData, 3600);
		},
		get: (key) => getredis(`state_${key}`),
		del: (key) => delredis(`state_${key}`),
	},

	// A lock to prevent concurrent access to the session store. Optional if only one instance is running.
	//requestLock,
});
/**
 * @param {number | undefined} ex 期限切れになるまでの秒数
 * @param {string} key
 * @param {any} value
 */
async function setredis(key, value, ex = undefined) {
	await fetch(`${process.env.UPSTASH_REDIS_REST_URL}/set/${key}${typeof ex === "number" ? `?ex=${ex}` : ""}`, {
		method: "POST",
		body: JSON.stringify(value),
		headers: {
			Authorization: `Bearer ${process.env.UPSTASH_REDIS_REST_TOKEN}`,
		},
	});
}
/**
 * @param {string} key
 */
async function getredis(key) {
	const res = await fetch(`${process.env.UPSTASH_REDIS_REST_URL}/get/${key}`, {
		headers: {
			Authorization: `Bearer ${process.env.UPSTASH_REDIS_REST_TOKEN}`,
		},
	});
	if (!res.ok) {
		return;
	}
	return JSON.parse((await res.json()).result);
}
/**
 * @param {string} key
 */
async function delredis(key) {
	await fetch(`${process.env.UPSTASH_REDIS_REST_URL}/del/${key}`, {
		headers: {
			Authorization: `Bearer ${process.env.UPSTASH_REDIS_REST_TOKEN}`,
		},
	});
}

export default {
	/**
	 * @param {Request} request
	 * @param {{ SUPABASE_SERVICE_KEY: any; }} env
	 * @param {any} ctx
	 */
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
			if (!URL.canParse(`${endpoint}/`)) {
				return createresponse({ error: "bad endpoint" }, 400);
			}
			const res = await fetch(`${endpoint}/xrpc/com.atproto.server.createSession`, {
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
	const raw = atob(base64Str.replace(/data:.*?;base64,/, ""));
	return Uint8Array.from(
		Array.prototype.map.call(raw, (/** @type {string} */ x) => {
			return x.charCodeAt(0);
		}),
	);
}
