"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { fetchCurrentUser, login, logout } from "@/lib/auth";
import { queryKeys } from "@/lib/query-keys";
import { getErrorMessage } from "@/lib/api-client";
import type { LoginRequest, User } from "@/types/api";

export function useCurrentUser() {
  return useQuery<User>({
    queryKey: queryKeys.auth.me,
    queryFn: fetchCurrentUser,
    retry: false,
    staleTime: 5 * 60_000,
  });
}

export function useLogin() {
  const router = useRouter();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (creds: LoginRequest) => login(creds),
    onSuccess: (data, _vars) => {
      qc.setQueryData(queryKeys.auth.me, data.user);
      toast.success(`Welcome back, ${data.user.full_name.split(" ")[0]}!`);
      router.push("/dashboard");
      router.refresh();
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });
}

export function useLogout() {
  const router = useRouter();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: () => logout(),
    onSuccess: () => {
      qc.clear();
      toast.success("Signed out");
      router.push("/login");
      router.refresh();
    },
  });
}

export function useIsAdmin(): boolean {
  const { data } = useCurrentUser();
  return data?.role === "admin";
}
