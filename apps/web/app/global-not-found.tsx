import "./globals.css";
import type { Metadata } from "next";
import Link from "next/link";
import { fontVariables } from "@odh/brand/fonts";
import { OwlLogo } from "@odh/ui";

export const metadata: Metadata = {
  title: "ไม่พบหน้านี้ | Page not found",
  robots: { index: false, follow: true },
};

export default function GlobalNotFound() {
  return (
    <html lang="th" className={fontVariables}>
      <body className="bg-white font-body text-ink antialiased">
        <main className="odh-404">
          <OwlLogo height={26} />
          <h1 className="odh-h1">ไม่พบหน้าที่คุณกำลังหา</h1>
          <p className="odh-lead">Page not found. หน้านี้อาจถูกย้ายหรือลบไปแล้ว</p>
          <div className="flex flex-wrap gap-6">
            <Link className="odh-link" href="/">
              กลับหน้าแรก
            </Link>
            <Link className="odh-link" href="/en/">
              English home
            </Link>
          </div>
        </main>
      </body>
    </html>
  );
}
