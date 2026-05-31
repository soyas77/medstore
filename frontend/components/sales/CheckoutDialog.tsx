"use client";

import * as React from "react";
import Link from "next/link";
import { CheckCircle2, Download, FileText, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { computeTotals, useCartStore } from "@/stores/cartStore";
import { invoicePdfUrl } from "@/hooks/useInvoices";
import { formatCurrency } from "@/lib/utils";
import type { InvoiceDetail } from "@/types/api";

interface CheckoutDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "sale" | "restock";
  /** Customer (sale) or supplier (restock) name. */
  partyName: string;
  onPartyNameChange: (v: string) => void;
  isSubmitting: boolean;
  onConfirm: () => void;
  /** Set after a successful submit to show the success state. */
  result: InvoiceDetail | null;
  onDone: () => void;
}

export function CheckoutDialog({
  open,
  onOpenChange,
  mode,
  partyName,
  onPartyNameChange,
  isSubmitting,
  onConfirm,
  result,
  onDone,
}: CheckoutDialogProps) {
  const lines = useCartStore((s) => s.lines);
  const totals = computeTotals(lines, mode === "sale");
  const isSale = mode === "sale";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        {result ? (
          <div className="text-center">
            <DialogHeader className="items-center">
              <CheckCircle2 className="mb-2 h-12 w-12 text-emerald-500" />
              <DialogTitle>
                {isSale ? "Sale completed" : "Restock recorded"}
              </DialogTitle>
              <DialogDescription>
                Invoice{" "}
                <span className="font-medium text-foreground">
                  {result.invoice_number}
                </span>{" "}
                · {formatCurrency(result.grand_total)}
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="mt-6 sm:justify-center">
              <Button variant="outline" asChild>
                <a
                  href={invoicePdfUrl(result.id)}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Download className="mr-2 h-4 w-4" />
                  Download PDF
                </a>
              </Button>
              <Button variant="secondary" asChild>
                <Link href={`/invoices/${result.id}`}>
                  <FileText className="mr-2 h-4 w-4" />
                  View invoice
                </Link>
              </Button>
              <Button onClick={onDone}>
                New {isSale ? "sale" : "restock"}
              </Button>
            </DialogFooter>
          </div>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>
                {isSale ? "Complete sale" : "Record restock"}
              </DialogTitle>
              <DialogDescription>
                Review the summary and confirm.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="party">
                  {isSale ? "Customer name (optional)" : "Supplier name (optional)"}
                </Label>
                <Input
                  id="party"
                  placeholder={isSale ? "Walk-in customer" : "Supplier"}
                  value={partyName}
                  onChange={(e) => onPartyNameChange(e.target.value)}
                />
              </div>

              <div className="rounded-md border p-3 text-sm">
                <div className="flex justify-between text-muted-foreground">
                  <span>Items</span>
                  <span>{totals.itemCount}</span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>Subtotal</span>
                  <span>{formatCurrency(totals.subtotal)}</span>
                </div>
                {isSale && (
                  <div className="flex justify-between text-emerald-600">
                    <span>Discount</span>
                    <span>- {formatCurrency(totals.discount)}</span>
                  </div>
                )}
                <div className="mt-2 flex justify-between border-t pt-2 text-base font-bold">
                  <span>Grand total</span>
                  <span>{formatCurrency(totals.grandTotal)}</span>
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button onClick={onConfirm} disabled={isSubmitting}>
                {isSubmitting && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Confirm
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
