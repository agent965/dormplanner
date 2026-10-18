import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

// Public paths accessible without signing in
const PUBLIC_PATHS = ["/", "/signin", "/signup"];

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const isPublic =
    PUBLIC_PATHS.includes(pathname) || pathname.startsWith("/api/auth");

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
