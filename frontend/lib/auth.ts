"use client";

import { apiClient, setStoredToken } from "@/lib/api-client";
import type { LoginRequest, LoginResponse, User } from "@/types/api";

/**
 * auth.ts
 * Login/logout helpers.
 *
 * Flow:
 *  1. POST /api/auth/login authenticates and returns { access_token, user }.
 *     The Next route handler ALSO sets an httpOnly cookie used by middleware.
 *  2. We mirror the token to localStorage so the axios client can attach a
 *     Bearer header for client-side calls (and for a real backend).
 *  3. logout() clears the httpOnly cookie (route handler) + localStorage.
 */

export async function login(credentials: LoginRequest): Promise<LoginResponse> {
  const { data } = await apiClient.post<LoginResponse>(
    "/auth/login",
    credentials
  );
  setStoredToken(data.access_token);
  return data;
}

export async function logout(): Promise<void> {
  try {
    await apiClient.post("/auth/logout");
  } finally {
    setStoredToken(null);
  }
}

export async function fetchCurrentUser(): Promise<User> {
  const { data } = await apiClient.get<User>("/auth/me");
  return data;
}
