"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, Save } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { RoleGuard } from "@/components/layout/RoleGuard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useSettings, useUpdateSettings } from "@/hooks/useSettings";

const settingsSchema = z.object({
  business_name: z.string().min(2, "Required"),
  address: z.string().min(2, "Required"),
  phone: z.string().min(3, "Required"),
  email: z.string().email("Enter a valid email"),
  tax_id: z.string().min(1, "Required"),
  default_low_stock_threshold: z.coerce.number().int().min(0),
  default_discount_rate: z.coerce.number().min(0).max(1),
  discount_min_qty: z.coerce.number().int().min(1),
});

type SettingsValues = z.infer<typeof settingsSchema>;

function SettingsInner() {
  const { data, isLoading } = useSettings();
  const update = useUpdateSettings();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isDirty },
  } = useForm<SettingsValues>({
    resolver: zodResolver(settingsSchema),
  });

  React.useEffect(() => {
    if (data) reset(data);
  }, [data, reset]);

  const onSubmit = (values: SettingsValues) =>
    update.mutate(values, { onSuccess: (d) => reset(d) });

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Business information</CardTitle>
          <CardDescription>
            Appears on invoices and printed documents.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="business_name">Business name</Label>
            <Input id="business_name" {...register("business_name")} />
            {errors.business_name && (
              <p className="text-xs text-destructive">
                {errors.business_name.message}
              </p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="address">Address</Label>
            <Textarea id="address" {...register("address")} />
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <Input id="phone" {...register("phone")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" {...register("email")} />
              {errors.email && (
                <p className="text-xs text-destructive">
                  {errors.email.message}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="tax_id">Tax / PAN</Label>
              <Input id="tax_id" {...register("tax_id")} />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Defaults</CardTitle>
          <CardDescription>
            Low-stock threshold and automatic discount rules.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-3">
          <div className="space-y-2">
            <Label htmlFor="threshold">Default low-stock threshold</Label>
            <Input
              id="threshold"
              type="number"
              {...register("default_low_stock_threshold")}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="rate">Discount rate (0–1)</Label>
            <Input
              id="rate"
              type="number"
              step="0.01"
              {...register("default_discount_rate")}
            />
            {errors.default_discount_rate && (
              <p className="text-xs text-destructive">
                {errors.default_discount_rate.message}
              </p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="minqty">Discount min quantity</Label>
            <Input
              id="minqty"
              type="number"
              {...register("discount_min_qty")}
            />
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button type="submit" disabled={update.isPending || !isDirty}>
          {update.isPending ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Save className="mr-2 h-4 w-4" />
          )}
          Save changes
        </Button>
      </div>
    </form>
  );
}

export default function SettingsPage() {
  return (
    <RoleGuard allow={["admin"]}>
      <PageHeader
        title="Settings"
        description="Business profile and inventory defaults."
      />
      <SettingsInner />
    </RoleGuard>
  );
}
