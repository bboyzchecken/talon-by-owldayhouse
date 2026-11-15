import "./globals.css";
import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { colors } from "@odh/brand";
import { fontVariables } from "@odh/brand/fonts";
import { Providers } from "@/components/providers";

// Internal tools: never indexed, anywhere. public/robots.txt disallows the
// whole host as well.
export const metadata: Metadata = {
  title: {
    default: "เครื่องมือภายใน · Owl Day House",
    template: "%s · เครื่องมือภายใน ODH",
  },
  description: "ระบบเครื่องมือภายในของ Owl Day House",
  robots: {
    index: false,
    follow: false,
    nocache: true,
    googleBot: { index: false, follow: false },
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  // From the brand tokens — never a hex literal in a component.
  themeColor: colors.navy,
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    // suppressHydrationWarning: next-themes writes data-theme on <html>
    // before React hydrates, which is the whole point — no flash of the
    // wrong theme — and the attribute it adds is not in the served HTML.
    <html lang="th" className={fontVariables} suppressHydrationWarning>
      <body className="min-h-screen bg-background font-body text-foreground antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
