"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { apiClient, getErrorMessage } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import type { InviteUserRequest, User } from "@/types/api";

export function useUsers() {
  return useQuery<User[]>({
    queryKey: queryKeys.users.list,
    queryFn: async () => {
      const { data } = await apiClient.get<User[]>("/users");
      return data;
    },
  });
}

export function useInviteUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: InviteUserRequest) => {
      const { data } = await apiClient.post<User>("/users", payload);
      return data;
    },
    onSuccess: (user) => {
      toast.success(`Invitation sent to ${user.email}`);
      qc.invalidateQueries({ queryKey: queryKeys.users.all });
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });
}

export function useToggleUserActive() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (vars: { id: number; is_active: boolean }) => {
      const { data } = await apiClient.patch<User>(`/users/${vars.id}`, {
        is_active: vars.is_active,
      });
      return data;
    },
    onSuccess: (user) => {
      toast.success(
        `${user.full_name} ${user.is_active ? "activated" : "deactivated"}`
      );
      qc.invalidateQueries({ queryKey: queryKeys.users.all });
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });
}
