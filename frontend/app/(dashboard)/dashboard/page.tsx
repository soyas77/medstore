"use client";

import Link from "next/link";
import {
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  DollarSign,
  Package,
  Receipt,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PageHeader } from "@/components/layout/PageHeader";
import { InvoiceTypeBadge } from "@/components/layout/StatusBadge";
import { SalesTrendChart } from "./SalesTrendChart";
import {
  useDashboardStats,
  useSalesTrend,
} from "@/hooks/useDashboardStats";
import { useRecentInvoices } from "@/hooks/useInvoices";
import { cn, formatCurrency, formatDateTime, formatPercent } from "@/lib/utils";

function KpiCard({
  title,
  value,
  icon: Icon,
  change,
  accent,
  loading,
}: {
  title: string;
  value: string;
  icon: typeof DollarSign;
  change?: number;
  accent?: "primary" | "amber";
  loading?: boolean;
}) {
  const positive = (change ?? 0) >= 0;
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        <div
          className={cn(
            "flex h-9 w-9 items-center justify-center rounded-lg",
            accent === "amber"
              ? "bg-amber-500/15 text-amber-600 dark:text-amber-400"
              : "bg-primary/15 text-primary"
          )}
        >
          <Icon className="h-5 w-5" />
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <Skeleton className="h-8 w-28" />
        ) : (
          <div className="text-2xl font-bold">{value}</div>
        )}
        {change !== undefined && !loading && (
          <p
            className={cn(
              "mt-1 flex items-center gap-1 text-xs",
              positive ? "text-emerald-600" : "text-destructive"
            )}
          >
            {positive ? (
              <ArrowUpRight className="h-3.5 w-3.5" />
            ) : (
              <ArrowDownRight className="h-3.5 w-3.5" />
            )}
            {formatPercent(change)} vs yesterday
          </p>
        )}
      </CardContent>
    </Card>
  );
}

export default function DashboardPage() {
  const stats = useDashboardStats();
  const trend = useSalesTrend();
  const recent = useRecentInvoices(10);

  const s = stats.data;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard"
        description="Real-time overview of sales, inventory and activity."
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          title="Today's Revenue"
          value={formatCurrency(s?.today_revenue ?? 0)}
          icon={DollarSign}
          change={s?.revenue_change_pct}
          loading={stats.isLoading}
        />
        <KpiCard
          title="Today's Transactions"
          value={String(s?.today_transactions ?? 0)}
          icon={Receipt}
          change={s?.transactions_change_pct}
          loading={stats.isLoading}
        />
        <KpiCard
          title="Low-Stock Count"
          value={String(s?.low_stock_count ?? 0)}
          icon={AlertTriangle}
          accent="amber"
          loading={stats.isLoading}
        />
        <KpiCard
          title="Total Inventory Value"
          value={formatCurrency(s?.total_inventory_value ?? 0)}
          icon={Package}
          loading={stats.isLoading}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Sales — last 7 days</CardTitle>
        </CardHeader>
        <CardContent>
          {trend.isLoading ? (
            <Skeleton className="h-[300px] w-full" />
          ) : (
            <SalesTrendChart data={trend.data ?? []} />
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Recent invoices</CardTitle>
          <Button variant="outline" size="sm" asChild>
            <Link href="/invoices">View all</Link>
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Invoice #</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>User</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {recent.isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell colSpan={6}>
                      <Skeleton className="h-6 w-full" />
                    </TableCell>
                  </TableRow>
                ))
              ) : recent.data?.items.length ? (
                recent.data.items.map((inv) => (
                  <TableRow key={inv.id}>
                    <TableCell className="font-medium">
                      {inv.invoice_number}
                    </TableCell>
                    <TableCell>
                      <InvoiceTypeBadge type={inv.type} />
                    </TableCell>
                    <TableCell>{inv.user_name}</TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCurrency(inv.grand_total)}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatDateTime(inv.created_at)}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" asChild>
                        <Link href={`/invoices/${inv.id}`}>View</Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    className="py-10 text-center text-muted-foreground"
                  >
                    No invoices yet.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
