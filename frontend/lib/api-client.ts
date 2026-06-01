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
 * - Mock mode (NEXT_PUBLIC_USE_MOCK_API=1): same-origin Next route handlers /api.
 * - Real mode: NEXT_PUBLIC_API_URL (FastAPI backend, served under /api/v1).
 */

const USE_MOCK = process.env.NEXT_PUBLIC_USE_MOCK_API === "1";
const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export const TOKEN_STORAGE_KEY = "medstore_token";
export const ROLE_COOKIE = "medstore_role";

export function getStoredToken(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(TOKEN_STORAGE_KEY);
}

/** Set or clear a browser cookie (used so middleware can see auth state). */
export function setCookie(name: string, value: string | null): void {
  if (typeof document === "undefined") return;
  const secure = window.location.protocol === "https:" ? "; Secure" : "";
  if (value) {
    document.cookie = `${name}=${value}; Path=/; Max-Age=604800; SameSite=Lax${secure}`;
  } else {
    document.cookie = `${name}=; Path=/; Max-Age=0; SameSite=Lax${secure}`;
  }
}

export function setStoredToken(token: string | null): void {
  if (typeof window === "undefined") return;
  if (token) {
    window.localStorage.setItem(TOKEN_STORAGE_KEY, token);
    // Mirror to a cookie so middleware.ts can detect the session.
    setCookie(TOKEN_STORAGE_KEY, token);
  } else {
    window.localStorage.removeItem(TOKEN_STORAGE_KEY);
    setCookie(TOKEN_STORAGE_KEY, null);
    setCookie(ROLE_COOKIE, null);
  }
}

export const apiClient: AxiosInstance = axios.create({
  // Mock mode hits same-origin Next route handlers under `/api`.
  // Real mode hits the FastAPI backend, which serves under `/api/v1`.
  baseURL: USE_MOCK ? "/api" : `${API_URL.replace(/\/$/, "")}/api/v1`,
  withCredentials: true,
  headers: { "Content-Type": "application/json" },
});

/** True when talking to the real FastAPI backend (not the in-app mock). */
export const IS_REAL_BACKEND = !USE_MOCK;

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
      if (!window.location.pathname.startsWith("/login")) {
        window.location.href = "/login";
      }
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