import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { AUTH_COOKIE, ROLE_COOKIE, makeToken, users } from "@/app/api/_mock/db";
import type { LoginResponse } from "@/types/api";

export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as {
    email?: string;
    password?: string;
  } | null;

  if (!body?.email || !body?.password) {
    return NextResponse.json(
      { detail: "Email and password are required" },
      { status: 400 }
    );
  }

  const user = users.find(
    (u) => u.email.toLowerCase() === body.email!.toLowerCase()
  );
  if (!user || user.password !== body.password) {
    return NextResponse.json(
      { detail: "Invalid email or password" },
      { status: 401 }
    );
  }
  if (!user.is_active) {
    return NextResponse.json({ detail: "Account disabled" }, { status: 403 });
  }

  const { password: _pw, ...safeUser } = user;
  const token = makeToken(safeUser);

  const jar = cookies();
  const week = 60 * 60 * 24 * 7;
  jar.set(AUTH_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: week,
  });
  // Non-sensitive role cookie used by middleware for coarse gating.
  jar.set(ROLE_COOKIE, safeUser.role, {
    httpOnly: false,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: week,
  });

  const res: LoginResponse = {
    access_token: token,
    token_type: "bearer",
    user: safeUser,
  };
  return NextResponse.json(res);
}
