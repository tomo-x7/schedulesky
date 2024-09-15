import { client } from "./client";
import type { VercelRequest, VercelResponse } from "@vercel/node";

export default async function GET(req: VercelRequest, res: VercelResponse) {
	if (req.method !== "GET") {
		res.status(405).send("");
	}
	const requrl = new URL(`http://${process.env.HOST ?? "localhost"}${req.url}`);
	const params = requrl.searchParams;
	const handle = params.get("handle") ?? params.get("endpoint"); // eg. from query string
	const state = crypto.getRandomValues(new Uint16Array(1))[0].toString();

	if (!handle) return res.status(400).send("");
	const redirecturl = await client.authorize(handle, {
		state,
		// Only supported if OAuth server is openid-compliant
		ui_locales: "ja en",
	});

	return res.redirect(302, redirecturl.toString());
}
