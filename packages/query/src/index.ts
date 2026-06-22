// @odh/query — shared data-fetching layer (axios + TanStack Query) for the
// Talon admin dashboard / Go API. NOT used by the static marketing site.
export { api, setAuthToken } from "./client";
export { createQueryClient } from "./query-client";
export { QueryProvider, type QueryProviderProps } from "./provider";
export { useApiQuery, useApiMutation } from "./hooks";

// Re-export the most-used TanStack primitives so consumers import from one place.
export { useQueryClient, useInfiniteQuery, type QueryClient } from "@tanstack/react-query";
