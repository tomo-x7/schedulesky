import { client } from "./client";
import type { VercelRequest, VercelResponse } from "@vercel/node";

export default async function GET(req: VercelRequest, res: VercelResponse) {
	if (req.method !== "GET") {
		res.status(405).send("");
	}
	const requrl = new URL(`http://${process.env.HOST ?? "localhost"}${req.url}`);
	const params = requrl.searchParams;
	//ハンドルがわかっている場合はハンドル、でなければPDSのエンドポイント
	const handleOrEndpoint = params.get("handle") ?? params.get("endpoint");
	const state = crypto.getRandomValues(new Uint16Array(1))[0].toString();

	if (!handleOrEndpoint) return res.status(400).send("handle or endpoint required");
	const redirecturl = await client.authorize(handleOrEndpoint, {
		state,
		// Only supported if OAuth server is openid-compliant
		ui_locales: "ja en",
		//デプロイ先を切り替えるときに変更！📌
		redirect_uri: "https://schedulesky-fordebug.vercel.app/api/callback",
	});

	return res.redirect(302, redirecturl.toString());
}
