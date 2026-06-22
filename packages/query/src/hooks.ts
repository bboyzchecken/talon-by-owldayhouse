import {
  useMutation,
  useQuery,
  type UseMutationOptions,
  type UseMutationResult,
  type UseQueryOptions,
  type UseQueryResult,
} from "@tanstack/react-query";
import type { AxiosRequestConfig } from "axios";
import { api } from "./client";

/** GET hook — typed data, axios under the hood, TanStack caching on top. */
export function useApiQuery<TData>(
  key: readonly unknown[],
  url: string,
  config?: AxiosRequestConfig,
  options?: Omit<UseQueryOptions<TData, Error>, "queryKey" | "queryFn">,
): UseQueryResult<TData, Error> {
  return useQuery<TData, Error>({
    queryKey: key,
    queryFn: async () => {
      const res = await api.get<TData>(url, config);
      return res.data;
    },
    ...options,
  });
}

type MutationMethod = "post" | "put" | "patch" | "delete";

/** Mutation hook — POST/PUT/PATCH/DELETE with the request body as variables. */
export function useApiMutation<TData, TVariables = void>(
  url: string,
  method: MutationMethod = "post",
  options?: UseMutationOptions<TData, Error, TVariables>,
): UseMutationResult<TData, Error, TVariables> {
  return useMutation<TData, Error, TVariables>({
    mutationFn: async (variables) => {
      const res = await api.request<TData>({ url, method, data: variables });
      return res.data;
    },
    ...options,
  });
}
