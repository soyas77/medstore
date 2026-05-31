"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  MedicineFormValues,
  medicineFormSchema,
} from "./medicine-form-schema";
import { useUpdateMedicine } from "@/hooks/useMedicines";
import type { Medicine } from "@/types/api";

interface EditMedicineDrawerProps {
  medicine: Medicine | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EditMedicineDrawer({
  medicine,
  open,
  onOpenChange,
}: EditMedicineDrawerProps) {
  const update = useUpdateMedicine();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<MedicineFormValues>({
    resolver: zodResolver(medicineFormSchema),
  });

  React.useEffect(() => {
    if (medicine) {
      reset({
        name: medicine.name,
        manufacturer: medicine.manufacturer,
        price_per_strip: medicine.price_per_strip,
        stock: medicine.stock,
        low_stock_threshold: medicine.low_stock_threshold,
        batch_number: medicine.batch_number ?? "",
        expiry_date: medicine.expiry_date ?? "",
      });
    }
  }, [medicine, reset]);

  const onSubmit = (values: MedicineFormValues) => {
    if (!medicine) return;
    update.mutate(
      {
        id: medicine.id,
        data: {
          ...values,
          batch_number: values.batch_number || null,
          expiry_date: values.expiry_date || null,
        },
      },
      { onSuccess: () => onOpenChange(false) }
    );
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="overflow-y-auto scroll-thin">
        <SheetHeader>
          <SheetTitle>Edit medicine</SheetTitle>
          <SheetDescription>
            {medicine ? `#${medicine.id} · ${medicine.name}` : ""}
          </SheetDescription>
        </SheetHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="e-name">Name</Label>
            <Input id="e-name" {...register("name")} />
            {errors.name && (
              <p className="text-xs text-destructive">{errors.name.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="e-manufacturer">Manufacturer</Label>
            <Input id="e-manufacturer" {...register("manufacturer")} />
            {errors.manufacturer && (
              <p className="text-xs text-destructive">
                {errors.manufacturer.message}
              </p>
            )}
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-2">
              <Label htmlFor="e-price">Price/Strip</Label>
              <Input
                id="e-price"
                type="number"
                step="0.01"
                {...register("price_per_strip")}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="e-stock">Stock</Label>
              <Input id="e-stock" type="number" {...register("stock")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="e-threshold">Low @</Label>
              <Input
                id="e-threshold"
                type="number"
                {...register("low_stock_threshold")}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="e-batch">Batch #</Label>
              <Input id="e-batch" {...register("batch_number")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="e-expiry">Expiry</Label>
              <Input id="e-expiry" type="date" {...register("expiry_date")} />
            </div>
          </div>

          <SheetFooter className="pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={update.isPending}>
              {update.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Save changes
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}
