"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatCurrency } from "@/lib/utils";
import type { SalesTrendPoint } from "@/types/api";

export function SalesTrendChart({ data }: { data: SalesTrendPoint[] }) {
  const formatted = data.map((p) => ({
    ...p,
    label: new Date(p.date).toLocaleDateString("en-GB", {
      weekday: "short",
      day: "2-digit",
    }),
  }));

  return (
    <ResponsiveContainer width="100%" height={300}>
      <AreaChart data={formatted} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
        <defs>
          <linearGradient id="revFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="hsl(173 80% 40%)" stopOpacity={0.35} />
            <stop offset="95%" stopColor="hsl(173 80% 40%)" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid
          strokeDasharray="3 3"
          className="stroke-muted"
          vertical={false}
        />
        <XAxis
          dataKey="label"
          tickLine={false}
          axisLine={false}
          className="text-xs"
          stroke="hsl(var(--muted-foreground))"
        />
        <YAxis
          tickLine={false}
          axisLine={false}
          width={70}
          className="text-xs"
          stroke="hsl(var(--muted-foreground))"
          tickFormatter={(v) => formatCurrency(Number(v)).replace(/\.00$/, "")}
        />
        <Tooltip
          contentStyle={{
            background: "hsl(var(--popover))",
            border: "1px solid hsl(var(--border))",
            borderRadius: "0.5rem",
            color: "hsl(var(--popover-foreground))",
            fontSize: "0.8rem",
          }}
          formatter={(value: number, name) =>
            name === "revenue"
              ? [formatCurrency(value), "Revenue"]
              : [value, "Transactions"]
          }
        />
        <Area
          type="monotone"
          dataKey="revenue"
          stroke="hsl(173 80% 40%)"
          strokeWidth={2.5}
          fill="url(#revFill)"
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
