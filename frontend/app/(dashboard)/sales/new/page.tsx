"use client";

import * as React from "react";
import { ShoppingCart } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MedicineSearchPanel } from "@/components/sales/MedicineSearchPanel";
import { CartPanel } from "@/components/sales/CartPanel";
import { CheckoutDialog } from "@/components/sales/CheckoutDialog";
import { useCartStore } from "@/stores/cartStore";
import { useCreateSale } from "@/hooks/useSale";
import { CART_DISCOUNT_MIN_QTY } from "@/stores/cartStore";
import type { InvoiceDetail } from "@/types/api";

export default function NewSalePage() {
  const lines = useCartStore((s) => s.lines);
  const addMedicine = useCartStore((s) => s.addMedicine);
  const setApplyDiscount = useCartStore((s) => s.setApplyDiscount);
  const clear = useCartStore((s) => s.clear);

  const [open, setOpen] = React.useState(false);
  const [customer, setCustomer] = React.useState("");
  const [result, setResult] = React.useState<InvoiceDetail | null>(null);

  const createSale = useCreateSale();

  // Ensure discount logic is enabled for sales; reset cart on mount/unmount.
  React.useEffect(() => {
    setApplyDiscount(true);
    return () => clear();
  }, [setApplyDiscount, clear]);

  const onConfirm = () => {
    createSale.mutate(
      {
        customer_name: customer || null,
        items: lines.map((l) => ({
          medicine_id: l.medicine_id,
          quantity: l.quantity,
        })),
      },
      { onSuccess: (inv) => setResult(inv) }
    );
  };

  const onDone = () => {
    setResult(null);
    setOpen(false);
    setCustomer("");
    clear();
  };

  return (
    <div className="flex h-[calc(100vh-7rem)] flex-col">
      <PageHeader
        title="New Sale"
        description={`Auto-discount applies at quantity ≥ ${CART_DISCOUNT_MIN_QTY}.`}
      />

      <div className="grid min-h-0 flex-1 gap-4 lg:grid-cols-2">
        <MedicineSearchPanel onPick={addMedicine} title="Search medicines" />
        <CartPanel
          applyDiscount
          title="Cart"
          footer={
            <Button
              size="lg"
              className="w-full"
              disabled={lines.length === 0}
              onClick={() => setOpen(true)}
            >
              <ShoppingCart className="mr-2 h-4 w-4" />
              Complete Sale
              {lines.length > 0 && (
                <Badge variant="secondary" className="ml-2">
                  {lines.length}
                </Badge>
              )}
            </Button>
          }
        />
      </div>

      <CheckoutDialog
        open={open}
        onOpenChange={(o) => {
          if (!createSale.isPending) setOpen(o);
        }}
        mode="sale"
        partyName={customer}
        onPartyNameChange={setCustomer}
        isSubmitting={createSale.isPending}
        onConfirm={onConfirm}
        result={result}
        onDone={onDone}
      />
    </div>
  );
}
