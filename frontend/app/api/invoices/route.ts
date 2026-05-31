import { NextResponse } from "next/server";
import { invoices } from "@/app/api/_mock/db";
import { getAuthUser, unauthorized } from "@/app/api/_mock/helpers";
import type { Invoice, PaginatedInvoices } from "@/types/api";

export async function GET(req: Request) {
  if (!getAuthUser(req)) return unauthorized();

  const { searchParams } = new URL(req.url);
  const dateFrom = searchParams.get("date_from");
  const dateTo = searchParams.get("date_to");
  const type = searchParams.get("type");
  const userId = searchParams.get("user_id");
  const page = Math.max(1, Number(searchParams.get("page") ?? 1));
  const pageSize = Math.max(1, Number(searchParams.get("page_size") ?? 10));

  let rows = invoices.slice();
  if (dateFrom) rows = rows.filter((i) => i.created_at >= dateFrom);
  if (dateTo) rows = rows.filter((i) => i.created_at <= `${dateTo}T23:59:59Z`);
  if (type && type !== "all") rows = rows.filter((i) => i.type === type);
  if (userId && userId !== "all") {
    rows = rows.filter((i) => i.user_id === Number(userId));
  }

  rows.sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at));

  const total = rows.length;
  const start = (page - 1) * pageSize;
  // Strip line items for the list view.
  const items: Invoice[] = rows.slice(start, start + pageSize).map(
    ({ items: _items, ...rest }) => rest
  );

  const body: PaginatedInvoices = { items, total, page, page_size: pageSize };
  return NextResponse.json(body);
}
