import { NextResponse } from "next/server";
import { settings } from "@/app/api/_mock/db";
import {
  forbidden,
  getAuthUser,
  unauthorized,
} from "@/app/api/_mock/helpers";
import type { BusinessSettings } from "@/types/api";

export async function GET(req: Request) {
  const user = getAuthUser(req);
  if (!user) return unauthorized();
  return NextResponse.json(settings);
}

export async function PUT(req: Request) {
  const user = getAuthUser(req);
  if (!user) return unauthorized();
  if (user.role !== "admin") return forbidden();

  const body = (await req.json().catch(() => ({}))) as Partial<BusinessSettings>;
  Object.assign(settings, body);
  return NextResponse.json(settings);
}
