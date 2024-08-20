import { next } from "@vercel/edge";
import { parse } from "cookie";
export const config = {
	matcher: "/",
};

export default function middleware(request: Request) {
	const url = new URL(request.url);
	const cookie = parse(request.headers.get("Cookie") ?? "");
	if (!cookie.session) {
		return Response.redirect("/login", 302);
	}

	return next();
}
