"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Plus } from "lucide-react";
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
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  MedicineFormValues,
  medicineFormSchema,
} from "./medicine-form-schema";
import { useCreateMedicine } from "@/hooks/useMedicines";

export function AddMedicineDialog() {
  const [open, setOpen] = React.useState(false);
  const create = useCreateMedicine();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<MedicineFormValues>({
    resolver: zodResolver(medicineFormSchema),
    defaultValues: {
      name: "",
      manufacturer: "",
      price_per_strip: 0,
      stock: 0,
      low_stock_threshold: 10,
      batch_number: "",
      expiry_date: "",
    },
  });

  const onSubmit = (values: MedicineFormValues) => {
    create.mutate(
      {
        ...values,
        batch_number: values.batch_number || null,
        expiry_date: values.expiry_date || null,
      },
      {
        onSuccess: () => {
          reset();
          setOpen(false);
        },
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4" />
          Add Medicine
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add medicine</DialogTitle>
          <DialogDescription>
            Create a new inventory item. Stock is measured in strips.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input id="name" placeholder="Paracetamol 500mg" {...register("name")} />
            {errors.name && (
              <p className="text-xs text-destructive">{errors.name.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="manufacturer">Manufacturer</Label>
            <Input
              id="manufacturer"
              placeholder="Cipla"
              {...register("manufacturer")}
            />
            {errors.manufacturer && (
              <p className="text-xs text-destructive">
                {errors.manufacturer.message}
              </p>
            )}
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-2">
              <Label htmlFor="price">Price/Strip</Label>
              <Input
                id="price"
                type="number"
                step="0.01"
                {...register("price_per_strip")}
              />
              {errors.price_per_strip && (
                <p className="text-xs text-destructive">
                  {errors.price_per_strip.message}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="stock">Stock</Label>
              <Input id="stock" type="number" {...register("stock")} />
              {errors.stock && (
                <p className="text-xs text-destructive">
                  {errors.stock.message}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="threshold">Low @</Label>
              <Input
                id="threshold"
                type="number"
                {...register("low_stock_threshold")}
              />
              {errors.low_stock_threshold && (
                <p className="text-xs text-destructive">
                  {errors.low_stock_threshold.message}
                </p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="batch">Batch # (optional)</Label>
              <Input id="batch" {...register("batch_number")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="expiry">Expiry (optional)</Label>
              <Input id="expiry" type="date" {...register("expiry_date")} />
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={create.isPending}>
              {create.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Save
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
