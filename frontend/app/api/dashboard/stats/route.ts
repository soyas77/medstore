import { NextResponse } from "next/server";
import { invoices, medicines } from "@/app/api/_mock/db";
import { getAuthUser, unauthorized } from "@/app/api/_mock/helpers";
import type { DashboardStats } from "@/types/api";

function isSameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export async function GET(req: Request) {
  if (!getAuthUser(req)) return unauthorized();

  const now = new Date();
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);

  const sales = invoices.filter((i) => i.type === "sale");
  const todaySales = sales.filter((i) => isSameDay(new Date(i.created_at), now));
  const yestSales = sales.filter((i) =>
    isSameDay(new Date(i.created_at), yesterday)
  );

  const todayRevenue = todaySales.reduce((s, i) => s + i.grand_total, 0);
  const yestRevenue = yestSales.reduce((s, i) => s + i.grand_total, 0);

  const pct = (curr: number, prev: number) =>
    prev === 0 ? (curr > 0 ? 100 : 0) : ((curr - prev) / prev) * 100;

  const stats: DashboardStats = {
    today_revenue: Math.round(todayRevenue * 100) / 100,
    today_transactions: todaySales.length,
    low_stock_count: medicines.filter((m) => m.stock <= m.low_stock_threshold)
      .length,
    total_inventory_value:
      Math.round(
        medicines.reduce((s, m) => s + m.stock * m.price_per_strip, 0) * 100
      ) / 100,
    revenue_change_pct: Math.round(pct(todayRevenue, yestRevenue) * 10) / 10,
    transactions_change_pct:
      Math.round(pct(todaySales.length, yestSales.length) * 10) / 10,
  };
  return NextResponse.json(stats);
}
