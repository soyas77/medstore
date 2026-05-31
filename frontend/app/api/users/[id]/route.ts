import { NextResponse } from "next/server";
import { users } from "@/app/api/_mock/db";
import {
  forbidden,
  getAuthUser,
  notFound,
  unauthorized,
} from "@/app/api/_mock/helpers";

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  const actor = getAuthUser(req);
  if (!actor) return unauthorized();
  if (actor.role !== "admin") return forbidden();

  const idx = users.findIndex((u) => u.id === Number(params.id));
  if (idx === -1) return notFound("User not found");

  const body = (await req.json().catch(() => ({}))) as Partial<{
    is_active: boolean;
    role: "admin" | "cashier";
    full_name: string;
  }>;
  users[idx] = { ...users[idx], ...body };
  const { password: _pw, ...safe } = users[idx];
  return NextResponse.json(safe);
}
