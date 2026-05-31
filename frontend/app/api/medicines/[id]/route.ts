import { NextResponse } from "next/server";
import { medicines } from "@/app/api/_mock/db";
import { getAuthUser, notFound, unauthorized } from "@/app/api/_mock/helpers";
import type { MedicineUpdate } from "@/types/api";

function findIndex(id: number) {
  return medicines.findIndex((m) => m.id === id);
}

export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  if (!getAuthUser(req)) return unauthorized();
  const m = medicines.find((x) => x.id === Number(params.id));
  if (!m) return notFound("Medicine not found");
  return NextResponse.json(m);
}

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  if (!getAuthUser(req)) return unauthorized();
  const idx = findIndex(Number(params.id));
  if (idx === -1) return notFound("Medicine not found");

  const body = (await req.json().catch(() => ({}))) as MedicineUpdate;
  const current = medicines[idx];
  medicines[idx] = {
    ...current,
    ...body,
    price_per_strip:
      body.price_per_strip !== undefined
        ? Number(body.price_per_strip)
        : current.price_per_strip,
    stock: body.stock !== undefined ? Number(body.stock) : current.stock,
    low_stock_threshold:
      body.low_stock_threshold !== undefined
        ? Number(body.low_stock_threshold)
        : current.low_stock_threshold,
    updated_at: new Date().toISOString(),
  };
  return NextResponse.json(medicines[idx]);
}

export async function DELETE(
  req: Request,
  { params }: { params: { id: string } }
) {
  if (!getAuthUser(req)) return unauthorized();
  const idx = findIndex(Number(params.id));
  if (idx === -1) return notFound("Medicine not found");
  medicines.splice(idx, 1);
  return NextResponse.json({ ok: true });
}
