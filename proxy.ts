import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

const PUBLIC_PATHS = ["/signin", "/api/auth"];

export default auth((req) => {
  const { pathname } = req.nextUrl;
  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) return;
  if (!req.auth) {
    const url = new URL("/signin", req.url);
    url.searchParams.set("from", pathname);
    return NextResponse.redirect(url);
  }
});

export const config = {
  matcher: [
    // Protect everything except Next internals, static files, and auth routes.
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
