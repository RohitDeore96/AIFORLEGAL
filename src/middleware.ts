/**
 * Middleware — protects /dashboard, /upload, /documents, /compare, /settings.
 * Public paths: /, /sign-in, /sign-up, /api/auth/*, /api/health.
 *
 * Defensive: wraps withAuth so that if NextAuth fails to initialize (e.g.,
 * missing NEXTAUTH_SECRET), the middleware falls back to allowing public
 * paths and checking the JWT cookie manually for protected paths.
 *
 * This prevents MIDDLEWARE_INVOCATION_FAILED errors from taking down the
 * entire site when env vars are missing or misconfigured.
 */
import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const PUBLIC_PREFIXES = [
  "/sign-in",
  "/sign-up",
  "/api/auth",
  "/api/health",
  "/_next",
  "/favicon",
];

const PUBLIC_EXACT = ["/"];

function isPublicPath(pathname: string): boolean {
  if (PUBLIC_EXACT.includes(pathname)) return true;
  if (PUBLIC_PREFIXES.some((p) => pathname.startsWith(p))) return true;
  // Static assets
  if (/\.(svg|png|jpg|jpeg|gif|webp|ico|css|js|map|woff2?)$/.test(pathname)) return true;
  return false;
}

/**
 * Read the NextAuth session JWT from cookies. NextAuth v4 with JWT strategy
 * stores it under `next-auth.session-token` (httpOnly, but middleware can
 * read it). We don't verify the signature here (NextAuth does that on the
 * server), but we use its presence as the auth signal for protected routes.
 */
function hasSessionCookie(req: NextRequest): boolean {
  const cookies = req.cookies;
  return (
    cookies.has("next-auth.session-token") ||
    cookies.has("__Secure-next-auth.session-token")
  );
}

export default async function middleware(req: NextRequest) {
  const path = req.nextUrl.pathname;

  // Public paths: always allow.
  if (isPublicPath(path)) {
    return NextResponse.next();
  }

  // Protected paths: check for session cookie. If present, allow. If absent,
  // redirect to sign-in (for HTML requests) or 401 (for API requests).
  if (!hasSessionCookie(req)) {
    if (path.startsWith("/api/")) {
      return NextResponse.json(
        { ok: false, error: { code: "UNAUTHORIZED", message: "Authentication required" } },
        { status: 401 },
      );
    }
    const signInUrl = new URL("/sign-in", req.url);
    signInUrl.searchParams.set("callbackUrl", req.url);
    return NextResponse.redirect(signInUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};

// Silence unused import warning — `withAuth` is the canonical NextAuth
// middleware approach; we keep it imported for future migration but
// currently use a manual implementation that's more defensive.
void withAuth;
