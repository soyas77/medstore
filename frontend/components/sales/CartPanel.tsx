"use client";

import { Minus, Plus, ShoppingCart, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  CartLine,
  computeLine,
  computeTotals,
  useCartStore,
} from "@/stores/cartStore";
import { cn, formatCurrency } from "@/lib/utils";

interface CartPanelProps {
  /** When false, hides discount UI and uses editable unit cost (restocks). */
  applyDiscount?: boolean;
  /** Editable unit price (restocks set unit cost manually). */
  editableUnitPrice?: boolean;
  unitPriceLabel?: string;
  footer?: React.ReactNode;
  title?: string;
}

export function CartPanel({
  applyDiscount = true,
  editableUnitPrice = false,
  unitPriceLabel = "Unit price",
  footer,
  title = "Cart",
}: CartPanelProps) {
  const lines = useCartStore((s) => s.lines);
  const increment = useCartStore((s) => s.increment);
  const decrement = useCartStore((s) => s.decrement);
  const setQuantity = useCartStore((s) => s.setQuantity);
  const setUnitPrice = useCartStore((s) => s.setUnitPrice);
  const removeLine = useCartStore((s) => s.removeLine);
  const clear = useCartStore((s) => s.clear);

  const totals = computeTotals(lines, applyDiscount);

  return (
    <Card className="flex h-full flex-col">
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <ShoppingCart className="h-4 w-4" />
          {title}
          {lines.length > 0 && (
            <Badge variant="secondary">{totals.itemCount}</Badge>
          )}
        </CardTitle>
        {lines.length > 0 && (
          <Button variant="ghost" size="sm" onClick={clear}>
            <Trash2 className="mr-1 h-4 w-4" />
            Clear
          </Button>
        )}
      </CardHeader>

      <CardContent className="flex-1 overflow-y-auto scroll-thin p-3 pt-0">
        {lines.length === 0 ? (
          <div className="flex h-40 flex-col items-center justify-center gap-2 text-center text-sm text-muted-foreground">
            <ShoppingCart className="h-8 w-8" />
            Cart is empty. Pick medicines from the left.
          </div>
        ) : (
          <ul className="space-y-2">
            {lines.map((line) => (
              <CartLineRow
                key={line.medicine_id}
                line={line}
                applyDiscount={applyDiscount}
                editableUnitPrice={editableUnitPrice}
                unitPriceLabel={unitPriceLabel}
                onInc={() => increment(line.medicine_id)}
                onDec={() => decrement(line.medicine_id)}
                onQty={(q) => setQuantity(line.medicine_id, q)}
                onPrice={(p) => setUnitPrice(line.medicine_id, p)}
                onRemove={() => removeLine(line.medicine_id)}
              />
            ))}
          </ul>
        )}
      </CardContent>

      <Separator />

      <CardFooter className="flex-col items-stretch gap-3 pt-4">
        <div className="space-y-1.5 text-sm">
          <div className="flex justify-between text-muted-foreground">
            <span>Subtotal</span>
            <span>{formatCurrency(totals.subtotal)}</span>
          </div>
          {applyDiscount && (
            <div className="flex justify-between text-emerald-600">
              <span>Discount</span>
              <span>- {formatCurrency(totals.discount)}</span>
            </div>
          )}
          <div className="flex justify-between text-base font-bold">
            <span>Grand total</span>
            <span>{formatCurrency(totals.grandTotal)}</span>
          </div>
        </div>
        {footer}
      </CardFooter>
    </Card>
  );
}

function CartLineRow({
  line,
  applyDiscount,
  editableUnitPrice,
  unitPriceLabel,
  onInc,
  onDec,
  onQty,
  onPrice,
  onRemove,
}: {
  line: CartLine;
  applyDiscount: boolean;
  editableUnitPrice: boolean;
  unitPriceLabel: string;
  onInc: () => void;
  onDec: () => void;
  onQty: (q: number) => void;
  onPrice: (p: number) => void;
  onRemove: () => void;
}) {
  const computed = computeLine(line, applyDiscount);
  const hasDiscount = applyDiscount && computed.discount_rate > 0;

  return (
    <li className="rounded-md border p-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">{line.name}</p>
          <p className="truncate text-xs text-muted-foreground">
            {line.manufacturer}
          </p>
        </div>
        <button
          type="button"
          onClick={onRemove}
          className="text-muted-foreground hover:text-destructive"
          aria-label="Remove item"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="mt-3 flex items-center justify-between gap-2">
        <div className="flex items-center rounded-md border">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8 rounded-r-none"
            onClick={onDec}
          >
            <Minus className="h-3.5 w-3.5" />
          </Button>
          <Input
            value={line.quantity}
            onChange={(e) => onQty(Number(e.target.value) || 1)}
            className="h-8 w-12 rounded-none border-x-0 border-y-0 text-center"
            inputMode="numeric"
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8 rounded-l-none"
            onClick={onInc}
          >
            <Plus className="h-3.5 w-3.5" />
          </Button>
        </div>

        {hasDiscount && (
          <Badge variant="success" className="text-[10px]">
            {(computed.discount_rate * 100).toFixed(0)}% OFF
          </Badge>
        )}
      </div>

      <div className="mt-3 space-y-1 text-xs">
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">{unitPriceLabel}</span>
          {editableUnitPrice ? (
            <Input
              type="number"
              step="0.01"
              value={line.unit_price}
              onChange={(e) => onPrice(Number(e.target.value) || 0)}
              className="h-7 w-24 text-right text-xs"
            />
          ) : (
            <span>{formatCurrency(line.unit_price)}</span>
          )}
        </div>
        {hasDiscount && (
          <div className="flex justify-between text-emerald-600">
            <span>Discount</span>
            <span>- {formatCurrency(computed.discount_amount)}</span>
          </div>
        )}
        <div
          className={cn(
            "flex justify-between font-semibold text-foreground"
          )}
        >
          <span>Line total</span>
          <span>{formatCurrency(computed.line_total)}</span>
        </div>
      </div>
    </li>
  );
}
