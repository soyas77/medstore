"use client";

import { Download, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Separator } from "@/components/ui/separator";
import { InvoiceTypeBadge } from "@/components/layout/StatusBadge";
import { invoicePdfUrl } from "@/hooks/useInvoices";
import { formatCurrency, formatDateTime } from "@/lib/utils";
import type { InvoiceDetail as InvoiceDetailType } from "@/types/api";

export function InvoiceDetail({ invoice }: { invoice: InvoiceDetailType }) {
  const pdfUrl = invoicePdfUrl(invoice.id);
  const isSale = invoice.type === "sale";

  return (
    <div className="grid gap-6 lg:grid-cols-5">
      <div className="space-y-6 lg:col-span-3">
        <Card>
          <CardHeader className="flex flex-row items-start justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                {invoice.invoice_number}
                <InvoiceTypeBadge type={invoice.type} />
              </CardTitle>
              <p className="mt-1 text-sm text-muted-foreground">
                {formatDateTime(invoice.created_at)}
              </p>
            </div>
            <Button variant="outline" size="sm" asChild>
              <a href={pdfUrl} target="_blank" rel="noopener noreferrer">
                <Download className="mr-2 h-4 w-4" />
                Download
              </a>
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">Issued by</p>
                <p className="font-medium">{invoice.user_name}</p>
              </div>
              <div>
                <p className="text-muted-foreground">
                  {isSale ? "Customer" : "Supplier"}
                </p>
                <p className="font-medium">
                  {isSale
                    ? invoice.customer_name || "Walk-in"
                    : invoice.supplier_name || "—"}
                </p>
              </div>
            </div>

            <Separator />

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Item</TableHead>
                  <TableHead className="text-right">Qty</TableHead>
                  <TableHead className="text-right">Unit</TableHead>
                  <TableHead className="text-right">Disc</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invoice.items.map((it) => (
                  <TableRow key={it.id}>
                    <TableCell>
                      <div className="font-medium">{it.medicine_name}</div>
                      <div className="text-xs text-muted-foreground">
                        {it.manufacturer}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">{it.quantity}</TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(it.unit_price)}
                    </TableCell>
                    <TableCell className="text-right">
                      {it.discount_rate > 0 ? (
                        <Badge variant="success" className="text-[10px]">
                          {(it.discount_rate * 100).toFixed(0)}%
                        </Badge>
                      ) : (
                        "—"
                      )}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCurrency(it.line_total)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            <Separator />

            <div className="ml-auto w-full max-w-xs space-y-1.5 text-sm">
              <div className="flex justify-between text-muted-foreground">
                <span>Subtotal</span>
                <span>{formatCurrency(invoice.subtotal)}</span>
              </div>
              <div className="flex justify-between text-emerald-600">
                <span>Discount</span>
                <span>- {formatCurrency(invoice.discount_total)}</span>
              </div>
              <div className="flex justify-between border-t pt-2 text-base font-bold">
                <span>Grand total</span>
                <span>{formatCurrency(invoice.grand_total)}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="lg:col-span-2">
        <Card className="flex h-full flex-col">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-base">
              <FileText className="h-4 w-4" />
              PDF preview
            </CardTitle>
          </CardHeader>
          <CardContent className="flex-1 p-3 pt-0">
            <iframe
              src={pdfUrl}
              title={`Invoice ${invoice.invoice_number}`}
              className="h-[560px] w-full rounded-md border bg-white"
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
