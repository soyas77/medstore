import { NextResponse } from "next/server";
import { getAuthUser, unauthorized } from "@/app/api/_mock/helpers";

export async function GET(req: Request) {
  const user = getAuthUser(req);
  if (!user) return unauthorized();
  return NextResponse.json(user);
}
