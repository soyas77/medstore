import { NextResponse } from "next/server";
import { medicines } from "@/app/api/_mock/db";
import { getAuthUser, unauthorized } from "@/app/api/_mock/helpers";

export async function GET(req: Request) {
  if (!getAuthUser(req)) return unauthorized();
  const low = medicines.filter((m) => m.stock <= m.low_stock_threshold);
  return NextResponse.json(low);
}
