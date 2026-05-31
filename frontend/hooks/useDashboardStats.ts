"use client";

import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import type { DashboardStats, SalesTrendPoint } from "@/types/api";

export function useDashboardStats() {
  return useQuery<DashboardStats>({
    queryKey: queryKeys.dashboard.stats,
    queryFn: async () => {
      const { data } = await apiClient.get<DashboardStats>("/dashboard/stats");
      return data;
    },
    refetchInterval: 60_000,
  });
}

export function useSalesTrend() {
  return useQuery<SalesTrendPoint[]>({
    queryKey: queryKeys.dashboard.salesTrend,
    queryFn: async () => {
      const { data } = await apiClient.get<SalesTrendPoint[]>(
        "/dashboard/sales-trend"
      );
      return data;
    },
  });
}
