import { NextResponse } from "next/server";
import { nextUserId, users } from "@/app/api/_mock/db";
import {
  badRequest,
  forbidden,
  getAuthUser,
  unauthorized,
} from "@/app/api/_mock/helpers";
import type { InviteUserRequest, User } from "@/types/api";

export async function GET(req: Request) {
  const user = getAuthUser(req);
  if (!user) return unauthorized();
  if (user.role !== "admin") return forbidden();
  const safe: User[] = users.map(({ password: _pw, ...u }) => u);
  return NextResponse.json(safe);
}

export async function POST(req: Request) {
  const user = getAuthUser(req);
  if (!user) return unauthorized();
  if (user.role !== "admin") return forbidden();

  const body = (await req.json().catch(() => null)) as InviteUserRequest | null;
  if (!body?.email || !body?.full_name) {
    return badRequest("email and full_name are required");
  }
  if (users.some((u) => u.email.toLowerCase() === body.email.toLowerCase())) {
    return badRequest("A user with this email already exists");
  }

  const created = {
    id: nextUserId(),
    email: body.email,
    full_name: body.full_name,
    role: body.role,
    is_active: true,
    created_at: new Date().toISOString(),
    password: "changeme123",
  };
  users.push(created);
  const { password: _pw, ...safe } = created;
  return NextResponse.json(safe, { status: 201 });
}
