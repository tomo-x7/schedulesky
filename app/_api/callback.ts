import { client, redis } from "./client";
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { serialize } from "cookie";
import crypto from "node:crypto";
import { Agent } from "@atproto/api";

export default async function GET(req: VercelRequest, res: VercelResponse) {
	if (req.method !== "GET") {
		res.status(405).send("");
	}
	const params = new URL(`http://${process.env.HOST ?? "localhost"}${req.url}`).searchParams;
	try {
		const { session } = await client.callback(params);
		const sessionID = Buffer.from(crypto.getRandomValues(new Uint32Array(10)).buffer).toString("base64url");
		redis.setredis(`mysession_${sessionID}`, session.did, 7200);
		const agent = new Agent(session);
		const profile = (await agent.getProfile({ actor: session.did })).data;

		return res
			.appendHeader(
				"Set-Cookie",
				serialize("session", sessionID, { httpOnly: true, secure: true, sameSite: "lax", maxAge: 7200, path: "/" }),
			)
			.send(`<script>
				localStorage.setItem("handle","${profile.handle}");
				localStorage.setItem("icon","${profile.avatar}");
				window.location="/";
				</script>`);
	} catch {
		return res.status(400).send("failed auth");
	}
}
