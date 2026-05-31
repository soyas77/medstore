import { NextResponse } from "next/server";
import { medicines, nextMedicineId } from "@/app/api/_mock/db";
import { badRequest, getAuthUser, unauthorized } from "@/app/api/_mock/helpers";
import type { Medicine, MedicineCreate, PaginatedMedicines } from "@/types/api";

export async function GET(req: Request) {
  if (!getAuthUser(req)) return unauthorized();

  const { searchParams } = new URL(req.url);
  const search = (searchParams.get("search") ?? "").trim().toLowerCase();
  const page = Math.max(1, Number(searchParams.get("page") ?? 1));
  const pageSize = Math.max(1, Number(searchParams.get("page_size") ?? 10));
  const sortBy = searchParams.get("sort_by") ?? "id";
  const sortDir = (searchParams.get("sort_dir") ?? "asc") as "asc" | "desc";

  let rows = medicines.slice();
  if (search) {
    rows = rows.filter(
      (m) =>
        m.name.toLowerCase().includes(search) ||
        m.manufacturer.toLowerCase().includes(search) ||
        String(m.id).includes(search)
    );
  }

  rows.sort((a, b) => {
    const av = (a as unknown as Record<string, unknown>)[sortBy];
    const bv = (b as unknown as Record<string, unknown>)[sortBy];
    let cmp = 0;
    if (typeof av === "number" && typeof bv === "number") cmp = av - bv;
    else cmp = String(av).localeCompare(String(bv));
    return sortDir === "asc" ? cmp : -cmp;
  });

  const total = rows.length;
  const start = (page - 1) * pageSize;
  const items = rows.slice(start, start + pageSize);

  const body: PaginatedMedicines = { items, total, page, page_size: pageSize };
  return NextResponse.json(body);
}

export async function POST(req: Request) {
  const user = getAuthUser(req);
  if (!user) return unauthorized();

  const body = (await req.json().catch(() => null)) as MedicineCreate | null;
  if (!body?.name || !body?.manufacturer) {
    return badRequest("name and manufacturer are required");
  }

  const now = new Date().toISOString();
  const created: Medicine = {
    id: nextMedicineId(),
    name: body.name,
    manufacturer: body.manufacturer,
    price_per_strip: Number(body.price_per_strip) || 0,
    stock: Number(body.stock) || 0,
    low_stock_threshold: Number(body.low_stock_threshold) || 10,
    batch_number: body.batch_number ?? null,
    expiry_date: body.expiry_date ?? null,
    created_at: now,
    updated_at: now,
  };
  medicines.push(created);
  return NextResponse.json(created, { status: 201 });
}
