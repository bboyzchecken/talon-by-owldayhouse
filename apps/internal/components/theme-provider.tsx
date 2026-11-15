"use client";

import { ThemeProvider as NextThemes } from "next-themes";
import type { ReactNode } from "react";

/**
 * Light, dark and system, stored per browser.
 *
 * `attribute="data-theme"` is the point: it writes data-theme on <html>, which
 * is the switch @odh/brand's own dark theme already listens for, so the whole
 * token set flips with it and nothing here restates a color.
 */
export function ThemeProvider({ children }: { children: ReactNode }) {
  return (
    <NextThemes
      attribute="data-theme"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
      storageKey="odh_theme"
    >
      {children}
    </NextThemes>
  );
}
