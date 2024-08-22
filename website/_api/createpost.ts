import { client, redis } from "./client";
import type { VercelRequest, VercelResponse } from "@vercel/node";

export default async function GET(req: VercelRequest, res: VercelResponse) {
	//バリデーション
	if (req.headers["Content-Type"] ?? req.headers["content-type"] !== "application/json") {
		//ヘッダーが小文字になる場合がある
		return res.status(400).json({ error: "Content-Type must be 'application/json'" });
	}
	type postdata = {
		date: string;
		text: string;
		facets: object;
		/**base64エンコードした画像とALTテキストの配列　最大画像サイズは0.9MB? クライアント側でJPEGに変換しておく　配列の最大長さは4 */
		images: Array<{ base64: string; alt: string | undefined }> | undefined;
	};
	const data: postdata = req.body;
	if (data.images !== undefined && data.images?.length > 4) {
		//imagesがundefinedか長さが4未満ならOK
		return res.status(400).json({ error: "bad request" });
	}
	//セッションを取得

	const session = req.cookies.session;
	const did = await redis.getredis(`mysession_${session}`, false);
	const agent = session ? await client.restore(did).catch(() => undefined) : undefined;
	if (!agent) {
		return res.status(401).json({ error: "require auth" });
	}

	//DBに登録するbodyの元になる
	const blobs: Array<object> = [];
	const rids: Array<string> = [];
	const alts: Array<string | null> = [];
	//画像をアップロード
	if (data.images !== undefined) {
		for (const image of data.images) {
			const blobres = await agent.uploadBlob(Buffer.from(image.base64, "base64"));

			if (!blobres.success) return res.status(500).json({ error: "image upload failed" });
			const body = {
				repo: agent.did,
				collection: "app.vercel.schedulesky",
				validate: false,
				record: {
					$type: "app.vercel.schedulesky",
					blob: blobres.data.blob,
				},
			};
			const recordres = await agent.com.atproto.repo.createRecord(body);
			if (!recordres.success) {
				return res.status(500).json({ error: "save image failed" });
			}
			blobs.push(blobres.data.blob);
			rids.push(recordres.data.uri.split("/")[4]);
			alts.push(image.alt ?? null);
		}
		if (blobs.length !== rids.length) {
			return res.status(500).json({ error: "length conflict" });
		}
	}
	const dbheader = new Headers();
	dbheader.set("Content-Type", "application/json");
	dbheader.set("Authorization", `Bearer ${process.env.SUPABASE_SERVICE_KEY}`);
	dbheader.set("apikey", process.env.SUPABASE_SERVICE_KEY ?? "");
	const dbres = await fetch("https://rxtjjnbocilskefknuac.supabase.co/rest/v1/rpc/createpost", {
		method: "POST",
		headers: dbheader,
		body: JSON.stringify({
			post_at: new Date(data.date),
			posttext: data.text,
			facet: data.facets,
			did: agent.did,
			blob: blobs,
			rid: rids,
			alt: alts,
		}),
	});
	if (!dbres.ok) {
		console.error(await dbres.json());
		return res.status(500).json({ error: "DB error" });
	}
	return res.json({ message: "success" });
}
