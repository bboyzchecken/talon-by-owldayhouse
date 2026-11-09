import "./globals.css";
import type { Metadata } from "next";
import { fontVariables } from "@odh/brand/fonts";
import { Analytics } from "@/components/Analytics";
import { NotFoundPage } from "@/components/site/NotFoundPage";

export const metadata: Metadata = {
  title: "ไม่พบหน้านี้ / Page not found | Owl Day House",
  robots: { index: false, follow: true },
};

export default function GlobalNotFound() {
  return (
    <html lang="th" className={fontVariables}>
      <body className="flex min-h-screen flex-col bg-white font-body text-ink antialiased">
        <NotFoundPage />
        <Analytics />
      </body>
    </html>
  );
}
