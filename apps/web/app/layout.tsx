import "./globals.css";
import type { Metadata } from "next";
import type { ReactNode } from "react";
import { fontVariables } from "@odh/brand/fonts";

export const metadata: Metadata = {
  metadataBase: new URL("https://owldayhouse.com"),
  title: {
    default: "Owl Day House — รับทำเว็บไซต์ เชียงใหม่",
    template: "%s | Owl Day House",
  },
  description:
    "ซอฟต์แวร์เฮาส์เชียงใหม่ รับทำเว็บไซต์ เว็บแอป และระบบองค์กร เริ่มต้นด้วย Talon เว็บไว AI ฿3,900 — ทีมคนไทยดูแลจริง",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="th" className={fontVariables}>
      <body className="min-h-screen bg-paper font-body text-ink antialiased">{children}</body>
    </html>
  );
}
