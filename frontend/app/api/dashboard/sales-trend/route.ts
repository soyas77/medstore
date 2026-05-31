import { NextResponse } from "next/server";
import { invoices } from "@/app/api/_mock/db";
import { getAuthUser, unauthorized } from "@/app/api/_mock/helpers";
import type { SalesTrendPoint } from "@/types/api";

export async function GET(req: Request) {
  if (!getAuthUser(req)) return unauthorized();

  const sales = invoices.filter((i) => i.type === "sale");
  const points: SalesTrendPoint[] = [];
  const today = new Date();

  for (let d = 6; d >= 0; d--) {
    const day = new Date(today);
    day.setDate(today.getDate() - d);
    const key = day.toISOString().slice(0, 10);
    const dayInvoices = sales.filter(
      (i) => i.created_at.slice(0, 10) === key
    );
    points.push({
      date: key,
      revenue:
        Math.round(dayInvoices.reduce((s, i) => s + i.grand_total, 0) * 100) /
        100,
      transactions: dayInvoices.length,
    });
  }
  return NextResponse.json(points);
}
