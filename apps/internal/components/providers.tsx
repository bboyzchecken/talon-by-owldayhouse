"use client";

import { useState, type ReactNode } from "react";
import { QueryProvider } from "@odh/query";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/sonner";
import { AuthProvider } from "@/lib/auth";
import { createInternalQueryClient } from "@/lib/query-client";

/** Client-side providers for the whole internal app. */
export function Providers({ children }: { children: ReactNode }) {
  const [client] = useState(createInternalQueryClient);
  return (
    <ThemeProvider>
      <QueryProvider client={client}>
        <AuthProvider>{children}</AuthProvider>
        {/* Bottom centre: the sidebar owns the left and the phone's tab bar
            owns the bottom edge, so a corner toast would land on one of them.
            The mobile offset clears the 56px tab bar and the safe area. */}
        <Toaster
          position="bottom-center"
          richColors
          closeButton
          mobileOffset={{ bottom: "calc(env(safe-area-inset-bottom, 0px) + 4.5rem)" }}
        />
      </QueryProvider>
    </ThemeProvider>
  );
}
