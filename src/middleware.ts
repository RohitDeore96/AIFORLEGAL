/**
 * Middleware — protects /dashboard, /upload, /documents, /compare, /settings.
 * Public paths: /, /sign-in, /sign-up, /api/auth/*, /api/health.
 */
import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware(req) {
    return NextResponse.next();
  },
  {
    pages: { signIn: "/sign-in" },
    callbacks: {
      authorized: ({ token, req }) => {
        const path = req.nextUrl.pathname;
        const isPublic =
          path === "/" ||
          path.startsWith("/sign-in") ||
          path.startsWith("/sign-up") ||
          path.startsWith("/api/auth") ||
          path.startsWith("/api/health") ||
          path.startsWith("/_next") ||
          path.startsWith("/favicon") ||
          path.match(/\.(svg|png|jpg|jpeg|gif|webp|ico|css|js|map)$/) !== null;

        if (isPublic) return true;
        return !!token;
      },
    },
  },
);

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
