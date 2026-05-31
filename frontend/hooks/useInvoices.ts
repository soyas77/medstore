"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import type {
  InvoiceDetail,
  InvoiceFilters,
  PaginatedInvoices,
} from "@/types/api";

export function useInvoices(filters: InvoiceFilters) {
  return useQuery<PaginatedInvoices>({
    queryKey: queryKeys.invoices.list(filters),
    queryFn: async () => {
      const { data } = await apiClient.get<PaginatedInvoices>("/invoices", {
        params: {
          date_from: filters.date_from || undefined,
          date_to: filters.date_to || undefined,
          type: filters.type && filters.type !== "all" ? filters.type : undefined,
          user_id:
            filters.user_id && filters.user_id !== "all"
              ? filters.user_id
              : undefined,
          page: filters.page ?? 1,
          page_size: filters.page_size ?? 10,
        },
      });
      return data;
    },
    placeholderData: keepPreviousData,
  });
}

export function useInvoice(id: number) {
  return useQuery<InvoiceDetail>({
    queryKey: queryKeys.invoices.detail(id),
    queryFn: async () => {
      const { data } = await apiClient.get<InvoiceDetail>(`/invoices/${id}`);
      return data;
    },
    enabled: Number.isFinite(id) && id > 0,
  });
}

export function useRecentInvoices(limit = 10) {
  return useQuery<PaginatedInvoices>({
    queryKey: queryKeys.dashboard.recentInvoices,
    queryFn: async () => {
      const { data } = await apiClient.get<PaginatedInvoices>("/invoices", {
        params: { page: 1, page_size: limit },
      });
      return data;
    },
  });
}

/** Absolute URL for the invoice PDF (works in both mock and real modes). */
export function invoicePdfUrl(invoiceId: number): string {
  const useMock = process.env.NEXT_PUBLIC_USE_MOCK_API === "1";
  const base = process.env.NEXT_PUBLIC_API_URL ?? "";
  return useMock
    ? `/api/invoices/${invoiceId}/pdf`
    : `${base.replace(/\/$/, "")}/api/invoices/${invoiceId}/pdf`;
}
