import { next } from "@vercel/edge";
import { parse } from "cookie";
export const config = {
	matcher: "/",
};

export default function middleware(request: Request) {
	const url = new URL(request.url);
	const cookie = parse(request.headers.get("Cookie") ?? "");
	if (!cookie.session) {
		url.pathname = "/login";
		//📌ロジック書く段階でコメント化解除
		//return Response.redirect(url, 302);
	}
	//📌セッションが有効かどうかも確認

	return next();
}
