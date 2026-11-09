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
    <html lang="th" className={fontVariables}>
      <body className="min-h-screen bg-white font-body text-ink antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
