import axios, { type AxiosInstance } from "axios";

/**
 * Shared axios instance for the ODH Go API (Talon dashboard / lead pipeline).
 * Base URL comes from NEXT_PUBLIC_API_URL so it works across environments.
 * The Go API returns errors as { "error": "..." } (see PROJECT_TEMPLATE.md).
 */
const baseURL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5000";

export const api: AxiosInstance = axios.create({
  baseURL,
  headers: { "Content-Type": "application/json" },
});

const TOKEN_KEY = "odh_token";

/** Attach the bearer token (set after login) on the client side. */
api.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const token = window.localStorage.getItem(TOKEN_KEY);
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

export function setAuthToken(token: string | null): void {
  if (typeof window === "undefined") return;
  if (token) {
    window.localStorage.setItem(TOKEN_KEY, token);
  } else {
    window.localStorage.removeItem(TOKEN_KEY);
  }
}
