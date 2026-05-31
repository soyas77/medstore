import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { AUTH_COOKIE, parseToken, users } from "./db";
import type { User } from "@/types/api";

/** Read the current user from the httpOnly cookie OR Authorization header. */
export function getAuthUser(req: Request): User | null {
  const cookieToken = cookies().get(AUTH_COOKIE)?.value;
  const header = req.headers.get("authorization");
  const bearer = header?.toLowerCase().startsWith("bearer ")
    ? header.slice(7)
    : undefined;
  const claims = parseToken(cookieToken ?? bearer);
  if (!claims) return null;
  const user = users.find((u) => u.id === claims.sub);
  if (!user) return null;
  const { password: _pw, ...safe } = user;
  return safe;
}

export function unauthorized() {
  return NextResponse.json({ detail: "Not authenticated" }, { status: 401 });
}

export function forbidden() {
  return NextResponse.json(
    { detail: "Insufficient permissions" },
    { status: 403 }
  );
}

export function notFound(detail = "Not found") {
  return NextResponse.json({ detail }, { status: 404 });
}

export function badRequest(detail: string) {
  return NextResponse.json({ detail }, { status: 400 });
}
