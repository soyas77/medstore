"use client";

import * as React from "react";
import Link from "next/link";
import {
  ChevronLeft,
  ChevronRight,
  Download,
  Eye,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";
import { InvoiceTypeBadge } from "@/components/layout/StatusBadge";
import { invoicePdfUrl, useInvoices } from "@/hooks/useInvoices";
import { useUsers } from "@/hooks/useUsers";
import { useCurrentUser } from "@/hooks/useAuth";
import { formatCurrency, formatDateTime } from "@/lib/utils";
import type { InvoiceFilters, InvoiceType } from "@/types/api";

const PAGE_SIZE = 10;

export function InvoiceTable() {
  const { data: me } = useCurrentUser();
  const isAdmin = me?.role === "admin";
  const { data: users } = useUsers(); // admin-only; ignored otherwise

  const [filters, setFilters] = React.useState<InvoiceFilters>({
    type: "all",
    user_id: "all",
    page: 1,
    page_size: PAGE_SIZE,
  });

  const { data, isLoading, isFetching } = useInvoices(filters);
  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const update = (patch: Partial<InvoiceFilters>) =>
    setFilters((f) => ({ ...f, ...patch, page: patch.page ?? 1 }));

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-5">
          <div className="space-y-1.5">
            <Label className="text-xs">From</Label>
            <Input
              type="date"
              value={filters.date_from ?? ""}
              onChange={(e) => update({ date_from: e.target.value || undefined })}
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">To</Label>
            <Input
              type="date"
              value={filters.date_to ?? ""}
              onChange={(e) => update({ date_to: e.target.value || undefined })}
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Type</Label>
            <Select
              value={(filters.type as string) ?? "all"}
              onValueChange={(v) => update({ type: v as InvoiceType | "all" })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All types</SelectItem>
                <SelectItem value="sale">Sale</SelectItem>
                <SelectItem value="restock">Restock</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {isAdmin && (
            <div className="space-y-1.5">
              <Label className="text-xs">User</Label>
              <Select
                value={String(filters.user_id ?? "all")}
                onValueChange={(v) =>
                  update({ user_id: v === "all" ? "all" : Number(v) })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All users</SelectItem>
                  {users?.map((u) => (
                    <SelectItem key={u.id} value={String(u.id)}>
                      {u.full_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <div className="flex items-end">
            <Button
              variant="outline"
              className="w-full"
              onClick={() =>
                setFilters({
                  type: "all",
                  user_id: "all",
                  page: 1,
                  page_size: PAGE_SIZE,
                })
              }
            >
              Reset
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="rounded-lg border bg-background">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Invoice #</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>User</TableHead>
              <TableHead className="text-right">Total</TableHead>
              <TableHead>Date</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={6} className="h-32 text-center">
                  <Loader2 className="mx-auto h-6 w-6 animate-spin text-muted-foreground" />
                </TableCell>
              </TableRow>
            ) : data?.items.length ? (
              data.items.map((inv) => (
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
                  <TableCell>
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="icon" asChild>
                        <Link href={`/invoices/${inv.id}`} aria-label="View">
                          <Eye className="h-4 w-4" />
                        </Link>
                      </Button>
                      <Button variant="ghost" size="icon" asChild>
                        <a
                          href={invoicePdfUrl(inv.id)}
                          target="_blank"
                          rel="noopener noreferrer"
                          aria-label="Download PDF"
                        >
                          <Download className="h-4 w-4" />
                        </a>
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="h-32 text-center text-muted-foreground"
                >
                  No invoices match your filters.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {total} invoice{total === 1 ? "" : "s"}
          {isFetching && " · updating…"}
        </p>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">
            Page {filters.page} of {totalPages}
          </span>
          <Button
            variant="outline"
            size="icon"
            disabled={(filters.page ?? 1) <= 1}
            onClick={() => update({ page: (filters.page ?? 1) - 1 })}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            disabled={(filters.page ?? 1) >= totalPages}
            onClick={() => update({ page: (filters.page ?? 1) + 1 })}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
