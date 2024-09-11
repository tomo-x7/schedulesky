import { client } from "./client";
import type { VercelRequest, VercelResponse } from "@vercel/node";

export default function GET(req: VercelRequest, res: VercelResponse) {
	if (req.method !== "GET") {
		res.status(405).send("");
	}
	res.status(200).json(client.jwks);
}