import { NextRequest, NextResponse } from "next/server";

/**
 * middleware.ts
 * Route protection based on the httpOnly auth cookie set by /api/auth/login.
 *
 * - Unauthenticated users hitting a protected route → /login
 * - Authenticated users hitting /login → /dashboard
 *
 * Fine-grained role gating (admin-only pages) is enforced both here (coarse)
 * and inside the pages/layout (precise, using the live /auth/me result).
 */

const AUTH_COOKIE = process.env.AUTH_COOKIE_NAME ?? "medstore_token";
const ROLE_COOKIE = "medstore_role";

const PUBLIC_PATHS = ["/login"];
const ADMIN_ONLY_PREFIXES = ["/users", "/settings", "/restocks"];

function isPublic(pathname: string): boolean {
  return PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const token = req.cookies.get(AUTH_COOKIE)?.value;
  const role = req.cookies.get(ROLE_COOKIE)?.value;
  const isAuthed = Boolean(token);

  // Authenticated user visiting /login → send to dashboard.
  if (isAuthed && isPublic(pathname)) {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  // Root → dashboard or login.
  if (pathname === "/") {
    return NextResponse.redirect(
      new URL(isAuthed ? "/dashboard" : "/login", req.url)
    );
  }

  // Unauthenticated user on a protected route → login (preserve return path).
  if (!isAuthed && !isPublic(pathname)) {
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Coarse admin gating.
  if (
    isAuthed &&
    role === "cashier" &&
    ADMIN_ONLY_PREFIXES.some((p) => pathname.startsWith(p))
  ) {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  return NextResponse.next();
}

export const config = {
  // Run on everything except Next internals, static assets, and the mock API.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|api|.*\\..*).*)"],
};
