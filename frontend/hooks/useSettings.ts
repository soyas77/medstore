"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { apiClient, getErrorMessage } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import type { BusinessSettings } from "@/types/api";

export function useSettings() {
  return useQuery<BusinessSettings>({
    queryKey: queryKeys.settings.business,
    queryFn: async () => {
      const { data } = await apiClient.get<BusinessSettings>("/settings");
      return data;
    },
  });
}

export function useUpdateSettings() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: Partial<BusinessSettings>) => {
      const { data } = await apiClient.put<BusinessSettings>(
        "/settings",
        payload
      );
      return data;
    },
    onSuccess: (data) => {
      qc.setQueryData(queryKeys.settings.business, data);
      toast.success("Settings saved");
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });
}
