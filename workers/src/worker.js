//@ts-check
import { HTMLRewriter } from "htmlrewriter";
import { Buffer } from "node:buffer";

export default {
	/**
	 * @param {Request} req
	 * @param {Record<string,string>} env
	 * @param {any} ctx
	 */
	async fetch(req, env, ctx) {
		//URL取得とバリデーション
		const rawurl = new URL(req.url).searchParams.get("url");
		if (!rawurl) return new Response(JSON.stringify({ error: "need url" }), { status: 400 });

		const url = new URL(decodeURIComponent(rawurl));

		//データ取得と解析
		const data = await fetch(url);
		if (!data.ok) return new Response(JSON.stringify({ error: "cannot get sitedata" }), { status: 400 });

		const { title, description, ogpurl } = await parsedata(data);

		//バリデーション
		if (!(title && description && ogpurl)) return new Response(JSON.stringify({ error: "cannot get sitedata" }), { status: 400 });

		//画像を取得
		const ogpblob = await fetch(ogpurl).then((res) => (res.ok ? res.blob() : undefined));
		if (!ogpblob) return new Response(JSON.stringify({ error: "cannot get sitedata" }), { status: 400 });

		const ogpdataurl = await blobToBase64(ogpblob);
		if (!ogpdataurl) return new Response(JSON.stringify({ error: "cannot get sitedata" }), { status: 400 });
		return new Response(JSON.stringify({ title, description, ogp: ogpdataurl }));
	},
};

/**@param {Response} data  */
async function parsedata(data) {
	let ogtitle = "";
	let FBtitle = "";
	let ogdescription = "";
	let FBdescription = "";
	let ogimageurl = "";
	let FBtwitterimageurl = "";
	const result = new HTMLRewriter()
		.on("title", {
			text: (text) => {
				FBtitle = text.text;
			},
		})
		.on("meta", {
			element: (elem) => {
				if (elem.getAttribute("name") === "description") {
					FBdescription = elem.getAttribute("content") ?? "";
					return;
				}
				if (elem.getAttribute("name") === "twitter:image") {
					FBtwitterimageurl = elem.getAttribute("content") ?? "";
					return;
				}
				switch (elem.getAttribute("property")) {
					case "og:title":
						ogtitle = elem.getAttribute("content") ?? "";
						break;
					case "og:description":
						ogdescription = elem.getAttribute("content") ?? "";
						break;
					case "og:image":
						ogimageurl = elem.getAttribute("content") ?? "";
						break;
				}
			},
		})
		.transform(data);
	await result.text();
	return {
		title: ogtitle || FBtitle || undefined,
		description: ogdescription || FBdescription || undefined,
		ogpurl: ogimageurl || FBtwitterimageurl || undefined,
	};
}
/**
 * @param {Blob} blob
 * @returns {Promise<string|undefined>}
 */
async function blobToBase64(blob) {
	return Buffer.from(await blob.arrayBuffer()).toString("base64");
}
