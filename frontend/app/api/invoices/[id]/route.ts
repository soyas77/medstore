import { NextResponse } from "next/server";
import { invoices } from "@/app/api/_mock/db";
import { getAuthUser, notFound, unauthorized } from "@/app/api/_mock/helpers";

export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  if (!getAuthUser(req)) return unauthorized();
  const inv = invoices.find((i) => i.id === Number(params.id));
  if (!inv) return notFound("Invoice not found");
  return NextResponse.json(inv);
}
