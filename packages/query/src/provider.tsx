"use client";

import { useState, type ReactNode } from "react";
import { QueryClientProvider, type QueryClient } from "@tanstack/react-query";
import { createQueryClient } from "./query-client";

export interface QueryProviderProps {
  children: ReactNode;
  /** The app's own client, when it adds caches or defaults of its own. */
  client?: QueryClient;
}

/** Wrap a dashboard app's root layout with this to enable @odh/query hooks. */
export function QueryProvider({ children, client }: QueryProviderProps) {
  const [fallback] = useState(createQueryClient);
  return <QueryClientProvider client={client ?? fallback}>{children}</QueryClientProvider>;
}
