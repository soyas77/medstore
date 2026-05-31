"use client";

import * as React from "react";
import { PackagePlus } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RoleGuard } from "@/components/layout/RoleGuard";
import { MedicineSearchPanel } from "@/components/sales/MedicineSearchPanel";
import { CartPanel } from "@/components/sales/CartPanel";
import { CheckoutDialog } from "@/components/sales/CheckoutDialog";
import { useCartStore } from "@/stores/cartStore";
import { useCreateRestock } from "@/hooks/useSale";
import type { InvoiceDetail } from "@/types/api";

function RestockInner() {
  const lines = useCartStore((s) => s.lines);
  const addMedicine = useCartStore((s) => s.addMedicine);
  const setApplyDiscount = useCartStore((s) => s.setApplyDiscount);
  const clear = useCartStore((s) => s.clear);

  const [open, setOpen] = React.useState(false);
  const [supplier, setSupplier] = React.useState("");
  const [result, setResult] = React.useState<InvoiceDetail | null>(null);

  const createRestock = useCreateRestock();

  // Restocks have no discount; reset cart on mount/unmount.
  React.useEffect(() => {
    setApplyDiscount(false);
    return () => {
      clear();
      setApplyDiscount(true);
    };
  }, [setApplyDiscount, clear]);

  const onConfirm = () => {
    createRestock.mutate(
      {
        supplier_name: supplier || null,
        items: lines.map((l) => ({
          medicine_id: l.medicine_id,
          quantity: l.quantity,
          unit_cost: l.unit_price,
        })),
      },
      { onSuccess: (inv) => setResult(inv) }
    );
  };

  const onDone = () => {
    setResult(null);
    setOpen(false);
    setSupplier("");
    clear();
  };

  return (
    <div className="flex h-[calc(100vh-7rem)] flex-col">
      <PageHeader
        title="New Restock"
        description="Record incoming stock from a supplier. Quantities are added to inventory."
      />

      <div className="grid min-h-0 flex-1 gap-4 lg:grid-cols-2">
        <MedicineSearchPanel
          onPick={addMedicine}
          disableOutOfStock={false}
          title="Search medicines"
        />
        <CartPanel
          applyDiscount={false}
          editableUnitPrice
          unitPriceLabel="Unit cost"
          title="Restock list"
          footer={
            <Button
              size="lg"
              className="w-full"
              disabled={lines.length === 0}
              onClick={() => setOpen(true)}
            >
              <PackagePlus className="mr-2 h-4 w-4" />
              Record Restock
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
          if (!createRestock.isPending) setOpen(o);
        }}
        mode="restock"
        partyName={supplier}
        onPartyNameChange={setSupplier}
        isSubmitting={createRestock.isPending}
        onConfirm={onConfirm}
        result={result}
        onDone={onDone}
      />
    </div>
  );
}

export default function NewRestockPage() {
  return (
    <RoleGuard allow={["admin"]}>
      <RestockInner />
    </RoleGuard>
  );
}
