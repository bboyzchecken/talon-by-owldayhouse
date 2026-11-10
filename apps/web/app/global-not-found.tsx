import "./globals.css";
import type { Metadata } from "next";
import { fontVariables } from "@odh/brand/fonts";
import { Analytics } from "@/components/Analytics";
import { NotFoundPage } from "@/components/site/NotFoundPage";
import { themeInitScript } from "@/lib/theme";

export const metadata: Metadata = {
  title: "ไม่พบหน้านี้ / Page not found | Owl Day House",
  robots: { index: false, follow: true },
};

export default function GlobalNotFound() {
  return (
    <html lang="th" className={fontVariables} suppressHydrationWarning>
      <body className="flex min-h-screen flex-col bg-[var(--surface)] font-body text-ink antialiased">
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
        <NotFoundPage />
        <Analytics />
      </body>
    </html>
  );
}
