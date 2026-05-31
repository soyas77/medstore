"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { apiClient, getErrorMessage } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import type {
  InvoiceDetail,
  RestockCreate,
  SaleCreate,
} from "@/types/api";

export function useCreateSale() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: SaleCreate) => {
      const { data } = await apiClient.post<InvoiceDetail>("/sales", payload);
      return data;
    },
    onSuccess: (invoice) => {
      toast.success(`Sale completed — ${invoice.invoice_number}`);
      qc.invalidateQueries({ queryKey: queryKeys.medicines.all });
      qc.invalidateQueries({ queryKey: queryKeys.medicines.lowStock });
      qc.invalidateQueries({ queryKey: queryKeys.invoices.all });
      qc.invalidateQueries({ queryKey: queryKeys.dashboard.stats });
      qc.invalidateQueries({ queryKey: queryKeys.dashboard.salesTrend });
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });
}

export function useCreateRestock() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: RestockCreate) => {
      const { data } = await apiClient.post<InvoiceDetail>(
        "/restocks",
        payload
      );
      return data;
    },
    onSuccess: (invoice) => {
      toast.success(`Restock recorded — ${invoice.invoice_number}`);
      qc.invalidateQueries({ queryKey: queryKeys.medicines.all });
      qc.invalidateQueries({ queryKey: queryKeys.medicines.lowStock });
      qc.invalidateQueries({ queryKey: queryKeys.invoices.all });
      qc.invalidateQueries({ queryKey: queryKeys.dashboard.stats });
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });
}
