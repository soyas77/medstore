"use client";

import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { toast } from "sonner";
import { apiClient, getErrorMessage } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import type {
  Medicine,
  MedicineCreate,
  MedicineUpdate,
  PaginatedMedicines,
} from "@/types/api";

export interface MedicineListParams {
  search?: string;
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortDir?: "asc" | "desc";
}

export function useMedicines(params: MedicineListParams) {
  return useQuery<PaginatedMedicines>({
    queryKey: queryKeys.medicines.list(params),
    queryFn: async () => {
      const { data } = await apiClient.get<PaginatedMedicines>("/medicines", {
        params: {
          search: params.search || undefined,
          page: params.page ?? 1,
          page_size: params.pageSize ?? 10,
          sort_by: params.sortBy ?? "id",
          sort_dir: params.sortDir ?? "asc",
        },
      });
      return data;
    },
    placeholderData: keepPreviousData,
  });
}

/** Lightweight search used by the sales/restocks medicine picker. */
export function useMedicineSearch(search: string) {
  return useQuery<Medicine[]>({
    queryKey: queryKeys.medicines.list({ search, pageSize: 50 }),
    queryFn: async () => {
      const { data } = await apiClient.get<PaginatedMedicines>("/medicines", {
        params: { search: search || undefined, page: 1, page_size: 50 },
      });
      return data.items;
    },
    placeholderData: keepPreviousData,
  });
}

export function useLowStock(options?: { pollMs?: number }) {
  return useQuery<Medicine[]>({
    queryKey: queryKeys.medicines.lowStock,
    queryFn: async () => {
      const { data } = await apiClient.get<Medicine[]>("/medicines/low-stock");
      return data;
    },
    refetchInterval: options?.pollMs ?? 60_000,
  });
}

export function useCreateMedicine() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: MedicineCreate) => {
      const { data } = await apiClient.post<Medicine>("/medicines", payload);
      return data;
    },
    onSuccess: (med) => {
      toast.success(`Added "${med.name}"`);
      qc.invalidateQueries({ queryKey: queryKeys.medicines.all });
      qc.invalidateQueries({ queryKey: queryKeys.dashboard.stats });
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });
}

export function useUpdateMedicine() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (vars: { id: number; data: MedicineUpdate }) => {
      const { data } = await apiClient.patch<Medicine>(
        `/medicines/${vars.id}`,
        vars.data
      );
      return data;
    },
    // Optimistic update across all cached medicine lists.
    onMutate: async (vars) => {
      await qc.cancelQueries({ queryKey: queryKeys.medicines.all });
      const snapshots = qc.getQueriesData<PaginatedMedicines>({
        queryKey: queryKeys.medicines.all,
      });
      for (const [key, prev] of snapshots) {
        if (!prev || !("items" in prev)) continue;
        qc.setQueryData<PaginatedMedicines>(key, {
          ...prev,
          items: prev.items.map((m) =>
            m.id === vars.id ? { ...m, ...vars.data } : m
          ),
        });
      }
      return { snapshots };
    },
    onError: (err, _vars, ctx) => {
      ctx?.snapshots.forEach(([key, prev]) =>
        qc.setQueryData<PaginatedMedicines | undefined>(key, prev)
      );
      toast.error(getErrorMessage(err));
    },
    onSuccess: () => toast.success("Medicine updated"),
    onSettled: () => {
      qc.invalidateQueries({ queryKey: queryKeys.medicines.all });
      qc.invalidateQueries({ queryKey: queryKeys.medicines.lowStock });
      qc.invalidateQueries({ queryKey: queryKeys.dashboard.stats });
    },
  });
}

export function useDeleteMedicine() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      await apiClient.delete(`/medicines/${id}`);
      return id;
    },
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: queryKeys.medicines.all });
      const snapshots = qc.getQueriesData<PaginatedMedicines>({
        queryKey: queryKeys.medicines.all,
      });
      for (const [key, prev] of snapshots) {
        if (!prev || !("items" in prev)) continue;
        qc.setQueryData<PaginatedMedicines>(key, {
          ...prev,
          items: prev.items.filter((m) => m.id !== id),
          total: Math.max(0, prev.total - 1),
        });
      }
      return { snapshots };
    },
    onError: (err, _id, ctx) => {
      ctx?.snapshots.forEach(([key, prev]) =>
        qc.setQueryData<PaginatedMedicines | undefined>(key, prev)
      );
      toast.error(getErrorMessage(err));
    },
    onSuccess: () => toast.success("Medicine deleted"),
    onSettled: () => {
      qc.invalidateQueries({ queryKey: queryKeys.medicines.all });
      qc.invalidateQueries({ queryKey: queryKeys.medicines.lowStock });
      qc.invalidateQueries({ queryKey: queryKeys.dashboard.stats });
    },
  });
}
