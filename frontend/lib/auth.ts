"use client";

import { apiClient, IS_REAL_BACKEND, setStoredToken } from "@/lib/api-client";
import type { LoginRequest, LoginResponse, User } from "@/types/api";

export async function login(credentials: LoginRequest): Promise<LoginResponse> {
  if (IS_REAL_BACKEND) {
    const form = new URLSearchParams();
    form.set("username", credentials.email);
    form.set("password", credentials.password);
    const { data: token } = await apiClient.post<{
      access_token: string;
      token_type: string;
    }>("/auth/login", form, {
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
    });
    setStoredToken(token.access_token);
    const user = await fetchCurrentUser();
    return { access_token: token.access_token, token_type: "bearer", user };
  }

  const { data } = await apiClient.post<LoginResponse>(
    "/auth/login",
    credentials
  );
  setStoredToken(data.access_token);
  return data;
}

export async function logout(): Promise<void> {
  try {
    if (!IS_REAL_BACKEND) await apiClient.post("/auth/logout");
  } finally {
    setStoredToken(null);
  }
}

export async function fetchCurrentUser(): Promise<User> {
  const { data } = await apiClient.get<User>("/auth/me");
  return data;
}