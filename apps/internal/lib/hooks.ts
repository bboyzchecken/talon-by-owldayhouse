"use client";

import { useQuery, type UseQueryResult } from "@tanstack/react-query";
import { inbox, meta as metaApi } from "./api";
import type { Meta } from "./types";

/**
 * The enums, the sales roster, the cut-off and the upload limits all come from
 * the API, so the UI never hardcodes a list that lives in the backend.
 */
export function useMeta(): UseQueryResult<Meta, Error> {
  return useQuery({
    queryKey: ["meta"],
    queryFn: metaApi.get,
    staleTime: 5 * 60_000,
  });
}

/**
 * How many website requests are waiting. This number on the menu is the whole
 * notification: the system sends no e-mail, so nothing is pushed anywhere.
 */
export function useInboxCount(enabled = true): number {
  const { data } = useQuery({
    queryKey: ["inbox", "counts"],
    queryFn: inbox.counts,
    enabled,
    refetchInterval: 60_000,
    staleTime: 30_000,
  });
  return data?.new ?? 0;
}
