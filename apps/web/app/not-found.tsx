import Link from "next/link";
import type { Metadata } from "next";
import { Button } from "@odh/ui";

export const metadata: Metadata = {
  title: "ไม่พบหน้านี้",
  robots: { index: false, follow: true },
};

const links = [
  { href: "/talon", label: "Talon เว็บไซต์ ฿3,900" },
  { href: "/services", label: "บริการของเรา" },
  { href: "/packages", label: "แพ็กเกจและราคา" },
  { href: "/news", label: "บทความ" },
  { href: "/contact", label: "ติดต่อเรา" },
];

export default function NotFound() {
  return (
    <main className="mx-auto max-w-2xl px-6 py-28 text-center">
      <p className="font-display text-sm font-semibold uppercase tracking-[0.25em] text-gold">404</p>
      <h1 className="mt-4 font-display text-3xl font-bold text-navy sm:text-4xl">ไม่พบหน้าที่คุณกำลังหา</h1>
      <p className="mt-4 text-muted">หน้านี้อาจถูกย้ายหรือลบไปแล้ว ลองกลับหน้าแรก หรือเลือกดูหน้าด้านล่างได้เลย</p>
      <Button variant="gold" size="lg" className="mt-8" asChild>
        <Link href="/">กลับหน้าแรก</Link>
      </Button>
      <ul className="mt-10 flex flex-wrap justify-center gap-x-6 gap-y-3 text-sm">
        {links.map((link) => (
          <li key={link.href}>
            <Link
              href={link.href}
              className="font-display text-navy underline decoration-gold decoration-2 underline-offset-4 transition-colors hover:text-gold"
            >
              {link.label}
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
