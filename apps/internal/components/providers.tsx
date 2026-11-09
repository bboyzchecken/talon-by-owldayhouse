"use client";

import type { ReactNode } from "react";
import { QueryProvider } from "@odh/query";
import { AuthProvider } from "@/lib/auth";

/** Client-side providers for the whole internal app. */
export function Providers({ children }: { children: ReactNode }) {
  return (
    <QueryProvider>
      <AuthProvider>{children}</AuthProvider>
    </QueryProvider>
  );
}
