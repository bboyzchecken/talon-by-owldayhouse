"use client";

import { Moon, Sun } from "lucide-react";
import { THEME_KEY } from "@/lib/theme";

export function ThemeToggle({ label }: { label: string }) {
  const toggle = () => {
    const root = document.documentElement;
    const dark = root.dataset.theme !== "dark";
    if (dark) root.dataset.theme = "dark";
    else delete root.dataset.theme;
    try {
      localStorage.setItem(THEME_KEY, dark ? "dark" : "light");
    } catch {
      // Storage can be blocked; the theme still applies to this page.
    }
  };

  // CSS picks the icon, so the server HTML matches whichever theme is saved.
  return (
    <button type="button" className="odh-theme" onClick={toggle} aria-label={label}>
      <Moon className="odh-theme__moon" size={18} aria-hidden />
      <Sun className="odh-theme__sun" size={18} aria-hidden />
    </button>
  );
}
