import { client, redis } from "./client";
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { serialize } from "cookie";
import crypto from "node:crypto";

export default async function GET(req: VercelRequest, res: VercelResponse) {
	if (req.method !== "GET") {
		res.status(405).send("");
	}
	const params = new URL(`http://${process.env.HOST ?? "localhost"}${req.url}`).searchParams;
	try {
		const { agent, state } = await client.callback(params);
		const sessionID = Buffer.from(crypto.getRandomValues(new Uint32Array(10)).buffer).toString("base64url");
		redis.setredis(`mysession_${sessionID}`, agent.did, 7200);
		return res
			.appendHeader("Set-Cookie", serialize("session", sessionID, { httpOnly: true, secure: true, sameSite: "lax", maxAge: 7200 }))
			.send("<script>location.href='/'</script>")
	} catch {
		return res.status(400).send("failed auth");
	}
}
