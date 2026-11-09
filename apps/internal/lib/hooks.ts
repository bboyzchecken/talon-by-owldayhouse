"use client";

import { useQuery, type UseQueryResult } from "@tanstack/react-query";
import { meta as metaApi } from "./api";
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
