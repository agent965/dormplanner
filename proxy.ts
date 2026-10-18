import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

// Public paths accessible without signing in
const PUBLIC_PATHS = ["/", "/signin", "/signup"];

export default auth((req) => {
  const { pathname } = req.nextUrl;

  // Public: fixed paths, auth routes, and individual event pages (/events/<id>)
  // so QR codes work without an account. /events/new stays gated.
  const isPublicEventPage =
    /^\/events\/[^/]+$/.test(pathname) && pathname !== "/events/new";
  const isPublicItemsRead =
    req.method === "GET" && /^\/api\/events\/[^/]+\/items$/.test(pathname);

  const isPublic =
    PUBLIC_PATHS.includes(pathname) ||
    pathname.startsWith("/api/auth") ||
    isPublicEventPage ||
    isPublicItemsRead;

  if (!isPublic && !req.auth) {
    const url = new URL("/", req.url);
    return NextResponse.redirect(url);
  }
});

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
