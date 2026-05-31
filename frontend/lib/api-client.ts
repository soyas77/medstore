"use client";

import axios, {
  AxiosError,
  AxiosInstance,
  InternalAxiosRequestConfig,
} from "axios";

/**
 * api-client.ts
 * Central axios instance.
 *
 * - In mock mode (NEXT_PUBLIC_USE_MOCK_API=1) requests go to the in-app
 *   Next.js route handlers under `/api/*` (same origin).
 * - Otherwise requests go to NEXT_PUBLIC_API_URL (the real FastAPI backend).
 *
 * The Bearer token is attached from a non-httpOnly mirror cookie/localStorage
 * for client-side requests. The canonical auth cookie is httpOnly and is used
 * by middleware + Next route handlers; this client mirror is only for the
 * Authorization header convenience when calling a real backend directly.
 */

const USE_MOCK = process.env.NEXT_PUBLIC_USE_MOCK_API === "1";
const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export const TOKEN_STORAGE_KEY = "medstore_token";

export function getStoredToken(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(TOKEN_STORAGE_KEY);
}

export function setStoredToken(token: string | null): void {
  if (typeof window === "undefined") return;
  if (token) window.localStorage.setItem(TOKEN_STORAGE_KEY, token);
  else window.localStorage.removeItem(TOKEN_STORAGE_KEY);
}

export const apiClient: AxiosInstance = axios.create({
  // Mock mode hits same-origin Next route handlers; real mode hits the backend.
  baseURL: USE_MOCK ? "/api" : `${API_URL.replace(/\/$/, "")}/api`,
  withCredentials: true,
  headers: { "Content-Type": "application/json" },
});

// Request interceptor: attach Bearer token.
apiClient.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = getStoredToken();
  if (token) {
    config.headers.set("Authorization", `Bearer ${token}`);
  }
  return config;
});

// Response interceptor: on 401, clear session and bounce to /login.
apiClient.interceptors.response.use(
  (res) => res,
  (error: AxiosError) => {
    if (error.response?.status === 401 && typeof window !== "undefined") {
      setStoredToken(null);
      // Best-effort server-side cookie clear, then redirect.
      fetch("/api/auth/logout", { method: "POST" }).finally(() => {
        if (!window.location.pathname.startsWith("/login")) {
          window.location.href = "/login";
        }
      });
    }
    return Promise.reject(error);
  }
);

/** Normalize an axios error into a human-readable message for toasts. */
export function getErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const detail = (error.response?.data as { detail?: string } | undefined)
      ?.detail;
    return detail ?? error.message ?? "Something went wrong";
  }
  if (error instanceof Error) return error.message;
  return "Something went wrong";
}
