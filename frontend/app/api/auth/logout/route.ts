import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { AUTH_COOKIE, ROLE_COOKIE } from "@/app/api/_mock/db";

export async function POST() {
  const jar = cookies();
  jar.delete(AUTH_COOKIE);
  jar.delete(ROLE_COOKIE);
  return NextResponse.json({ ok: true });
}
