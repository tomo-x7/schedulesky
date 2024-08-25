//@ts-check
import { cloudEvent } from "@google-cloud/functions-framework";
import { NodeOAuthClient } from "@atproto/oauth-client-node";
import { JoseKey } from "@atproto/jwk-jose";

const client = new NodeOAuthClient({
	clientMetadata: {
		// Must be a URL that will be exposing this metadata
		client_id: "https://schedulesky.vercel.app/api/client-metadata.json",
		client_name: "schedulesky",
		client_uri: "https://schedulesky.vercel.app/",
		//		logo_uri: "https://oauth-test-pink.vercel.app/next.svg",
		//		tos_uri: "https://oauth-test-pink.vercel.app/tos",
		//		policy_uri: "https://oauth-test-pink.vercel.app/policy",
		redirect_uris: ["https://schedulesky.vercel.app/api/callback"],
		scope: "profile email offline_access",
		grant_types: ["authorization_code", "refresh_token"],
		response_types: ["code"],
		application_type: "web",
		token_endpoint_auth_method: "private_key_jwt",
		dpop_bound_access_tokens: true,
		jwks_uri: "https://schedulesky.vercel.app/api/jwks.json",
		token_endpoint_auth_signing_alg: "ES256",
	},
	keyset: await Promise.all([
		JoseKey.fromImportable(process.env.PRIVATE_KEY_1 ?? ""),
		JoseKey.fromImportable(process.env.PRIVATE_KEY_2 ?? ""),
		JoseKey.fromImportable(process.env.PRIVATE_KEY_3 ?? ""),
	]),
	sessionStore: {
		set: async (sub, sessionData) => setredis(`session_${sub}`, sessionData),
		get: (key) => getredis(`session_${key}`),
		del: (key) => delredis(`session_${key}`),
	},

	// Interface to store authorization state data (during authorization flows)
	stateStore: {
		set: async (sub, sessionData) => setredis(`state_${sub}`, sessionData, 3600),
		get: (key) => getredis(`state_${key}`),
		del: (key) => delredis(`state_${key}`),
	},
});
/**
 * @param {string} key
 * @param {any} value
 * @param {undefined|number} ex 期限（秒）
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
async function delredis(key) {
	await fetch(`${process.env.UPSTASH_REDIS_REST_URL}/del/${key}`, {
		headers: {
			Authorization: `Bearer ${process.env.UPSTASH_REDIS_REST_TOKEN}`,
		},
	});
}
const dbheader = new Headers({ Authorization: `Bearer ${process.env.SUPABASE_KEY}`, apikey: process.env.SUPABASE_KEY ?? "" });
// Register a CloudEvent callback with the Functions Framework that will
// be executed when the Pub/Sub trigger topic receives a message.
cloudEvent("helloPubSub", async (cloudEvent) => {
	console.log(`start at ${new Date().toLocaleTimeString()}`);
	//データを取得
	const starttime = new Date();
	starttime.setMinutes(starttime.getMinutes(), 0, 0);
	const endtime = new Date();
	endtime.setMinutes(endtime.getMinutes() - 15, 0, 0);
	const data = await fetch(
		`https://rxtjjnbocilskefknuac.supabase.co/rest/v1/schedulesky_posts?post_at=lte.${starttime.toISOString()}&post_at=gte.${endtime.toISOString()}`,
		{
			headers: dbheader,
		},
	).then((d) => d.json());
	console.log(`data:${JSON.stringify(data)}`);

	await Promise.allSettled(data.map(POST));
	console.log(`end at ${new Date().toLocaleTimeString()}`);
});

/**
 * @typedef {Object} data
 * @property {number} id
 * @property {string} post_at DateのISOString
 * @property {string} text
 * @property {Object} facet
 * @property {string} did
 *
 * @param {data} data
 */
async function POST(data) {
	try {
		//ポストの画像を取得
		const imgres = await fetch(
			`https://rxtjjnbocilskefknuac.supabase.co/rest/v1/schedulesky_images?parent_post=eq.${data.id}&order=id`,
			{
				headers: dbheader,
			},
		);
		if (!imgres.ok) {
			console.warn(`getimg return ${imgres.status}:${imgres.statusText}\n${await imgres.text()}`);
			return;
		}
		/**@type {Array<{"rid":string,"blob":Object,"alt":string|null,}>} */
		const imgdata = await imgres.json();

		//agentを取得
		const agent = await client.restore(data.did).catch((e) => {
			console.error(e);
			return undefined;
		});
		if (!agent) {
			return;
		}

		//ポストする
		//recordのviaにクライアント名を入れる
		//textとかfacetと同列
		const postdata = { text: data.text, facets: data.facet ?? undefined, via: "schedulesky" };
		if (imgdata.length !== 0) {
			postdata.embed = {
				$type: "app.bsky.embed.images",
				images: imgdata.map((d) => ({ alt: d.alt ?? "", image: d.blob })),
			};
		}
		await agent.post(postdata);

		//画像を保持していたレコードを消す(DBデータ削除と並列実行)
		//applyWritesだと削除済みだった場合にエラーになるっぽいので使用しない
		const promises = imgdata.map((img) =>
			agent.com.atproto.repo.deleteRecord({ repo: data.did, collection: "app.vercel.schedulesky", rkey: img.rid }),
		);

		//DBのデータを削除する 画像の方は外部キー制約により自動で消える (画像保持レコード削除と並列実行)
		const deleteres = fetch(`https://rxtjjnbocilskefknuac.supabase.co/rest/v1/schedulesky_posts?id=eq.${data.id}`, {
			method: "DELETE",
			headers: dbheader,
		});

		//上の並列実行二つを待機
		return await Promise.allSettled([deleteres, ...promises]);
	} catch (e) {
		console.error(e);
	}
}
