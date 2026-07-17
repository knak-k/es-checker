import { NextRequest, NextResponse } from "next/server";
import { AUTH_COOKIE, computeAuthToken, timingSafeEqual } from "@/lib/auth";

export async function proxy(req: NextRequest) {
  const password = process.env.SITE_PASSWORD;
  if (!password) return NextResponse.next(); // 未設定ならゲートなし（ローカル開発の利便性のため）

  const token = req.cookies.get(AUTH_COOKIE)?.value;
  if (token) {
    const expected = await computeAuthToken(password);
    if (timingSafeEqual(token, expected)) return NextResponse.next();
  }

  const url = req.nextUrl.clone();
  url.pathname = "/login";
  url.searchParams.set("next", req.nextUrl.pathname);
  return NextResponse.redirect(url);
}

export const config = {
  matcher: [
    "/((?!login|api/login|robots\\.txt|_next/static|_next/image|favicon\\.ico).*)",
  ],
};
