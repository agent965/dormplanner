import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

// Only these paths require a signed-in user. Everything else is public.
const AUTH_REQUIRED_PATHS: string[] = ["/events/new"];
// POST /api/events (create event) is guarded inside the route itself.

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const needsAuth = AUTH_REQUIRED_PATHS.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`)
  );
  if (needsAuth && !req.auth) {
    const url = new URL("/signin", req.url);
    url.searchParams.set("from", pathname);
    return NextResponse.redirect(url);
  }
});

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
