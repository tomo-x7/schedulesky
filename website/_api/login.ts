import type { VercelRequest, VercelResponse } from "@vercel/node";

export default function GET(req: VercelRequest, res: VercelResponse) {
  if(req.method!=="GET")
	res.status(200).json({
		body: req.body,
		query: req.query,
		cookies: req.cookies,
	});
}
