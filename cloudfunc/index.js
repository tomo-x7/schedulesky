const functions = require("@google-cloud/functions-framework");

// Register a CloudEvent callback with the Functions Framework that will
// be executed when the Pub/Sub trigger topic receives a message.
functions.cloudEvent("helloPubSub", async (cloudEvent) => {
	//データを取得
	await fetch("https://rxtjjnbocilskefknuac.supabase.co/rest/v1/schedulesky_posts?select=*", {
		headers: { Authorization: `Bearer ${process.env.SUPABASE_KEY}`, apikey: process.env.SUPABASE_KEY },
	});
	//
});
//test

/**
 * @typedef {Object} data
 * @property {number} id
 * @property {string} post_at DateのISOString
 * @property {string} posttext
 * @property {Object} facet
 * @property {string} refreshtoken
 * @property {string} did
 * @property {string} pdsendpoint
 * @param {data} data
 */
async function POST(data) {
	const dbheader = { Authorization: `Bearer ${process.env.SUPABASE_KEY}`, apikey: process.env.SUPABASE_KEY };
	//ポストの画像を取得
	const imgres = await fetch(`https://rxtjjnbocilskefknuac.supabase.co/rest/v1/schedulesky_images?parent_post=eq.${data.id}&order=id`, {
		headers: dbheader,
	});
	if (!imgres.ok) {
		return;
	}
	/**@type {Array<{"rid":string,"blob":Object,"alt":string|null,}>} */
	const imgdata = await imgres.json();

	//アクセストークンを取得
	const accesstoken = await fetch(`${data.pdsendpoint}/xrpc/com.atproto.server.refreshSession`, {
		method: "POST",
		headers: { Authorization: `Bearer ${data.refreshtoken}` },
	}).then((d) => d.accessJwt);

	//ポストする

	//画像を保持していたレコードを消す(DBデータ削除と並列実行)
	//applyWritesだと削除済みだった場合にエラーになるらしい
	const promises = imgdata.map((img) => {
		return fetch("https://bsky.social/xrpc/com.atproto.repo.deleteRecord", {
			method: "POST",
			body: JSON.stringify({
				repo: data.did,
				collection: "app.vercel.schedulesky",
				rkey: img.rid,
			}),
			headers: { Authorization: `Bearer ${accesstoken}` },
		});
	});

	//DBのデータを削除する 画像の方は外部キー制約により自動で消える (画像保持レコード削除と並列実行)
	const deleteres = fetch(`https://rxtjjnbocilskefknuac.supabase.co/rest/v1/schedulesky_posts?id=eq.${data.id}`, {
		method: "DELETE",
		headers: dbheader,
	});

	//上の並列実行二つを待機
	console.log(Promise.allSettled(...promises, deleteres));
}
