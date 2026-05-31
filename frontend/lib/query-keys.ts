/**
 * query-keys.ts
 * Centralized TanStack Query key factory.
 * Use these everywhere so invalidation is consistent and typo-proof.
 */

import type { InvoiceFilters } from "@/types/api";

export const queryKeys = {
  auth: {
    me: ["auth", "me"] as const,
  },
  medicines: {
    all: ["medicines"] as const,
    list: (params: {
      search?: string;
      page?: number;
      pageSize?: number;
      sortBy?: string;
      sortDir?: "asc" | "desc";
    }) => ["medicines", "list", params] as const,
    lowStock: ["medicines", "low-stock"] as const,
    detail: (id: number) => ["medicines", "detail", id] as const,
  },
  invoices: {
    all: ["invoices"] as const,
    list: (filters: InvoiceFilters) => ["invoices", "list", filters] as const,
    detail: (id: number) => ["invoices", "detail", id] as const,
  },
  dashboard: {
    stats: ["dashboard", "stats"] as const,
    salesTrend: ["dashboard", "sales-trend"] as const,
    recentInvoices: ["dashboard", "recent-invoices"] as const,
  },
  users: {
    all: ["users"] as const,
    list: ["users", "list"] as const,
  },
  settings: {
    business: ["settings", "business"] as const,
  },
} as const;
