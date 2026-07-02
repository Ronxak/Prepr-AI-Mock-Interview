import { NextResponse, type NextRequest } from "next/server";
import { verifySession, type SessionClaims } from "@/lib/auth/jwt";

const SESSION_COOKIE = "mi_session";

const PROTECTED_PREFIXES = [
  "/dashboard",
  "/interview",
  "/report",
  "/history",
  "/resume",
  "/profile",
];
const AUTH_PAGES = ["/login", "/signup"];

/**
 * Edge guard (Next 16 "proxy" convention, formerly middleware). Verifies the JWT
 * with jose (Edge-compatible) and redirects:
 *  • unauthenticated → /login (preserving intended destination)
 *  • already-authenticated on an auth page → /dashboard
 * Route handlers still re-check auth server-side; this is UX, not the only gate.
 */
export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const token = req.cookies.get(SESSION_COOKIE)?.value;
  const claims: SessionClaims | null = token ? await verifySession(token) : null;

  const isProtected = PROTECTED_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  );
  const isAuthPage = AUTH_PAGES.includes(pathname);

  if (isProtected && !claims) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  if (isAuthPage && claims) {
    const url = req.nextUrl.clone();
    url.pathname = "/dashboard";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/interview/:path*",
    "/report/:path*",
    "/history/:path*",
    "/resume/:path*",
    "/profile/:path*",
    "/login",
    "/signup",
  ],
};
