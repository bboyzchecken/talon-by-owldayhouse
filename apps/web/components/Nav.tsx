"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { Button, OwlLogo, cn } from "@odh/ui";
import { navLinks } from "@/content/site";

export function Nav() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-50 border-b border-gold/20 bg-navy-deep text-paper shadow-lg shadow-black/30">
      <nav className="mx-auto flex h-16 max-w-6xl items-center gap-4 px-6">
        <Link href="/" className="flex items-center" onClick={() => setOpen(false)} aria-label="Owl Day House — หน้าแรก">
          <OwlLogo height={30} className="text-paper" />
        </Link>

        <ul className="ml-auto hidden items-center gap-6 lg:flex">
          {navLinks.map((link) => {
            const active = pathname === link.href;
            return (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className={cn(
                    "font-display text-sm transition-colors",
                    active ? "text-gold" : "text-paper/80 hover:text-gold",
                  )}
                >
                  {link.label}
                </Link>
              </li>
            );
          })}
        </ul>

        <div className="ml-auto flex items-center gap-2 lg:ml-6">
          <Button variant="gold" size="sm" asChild className="hidden sm:inline-flex">
            <Link href="/talon">เริ่มเลย ฿3,900</Link>
          </Button>
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="-mr-2 p-2 text-paper lg:hidden"
            aria-label="เปิด/ปิดเมนู"
            aria-expanded={open}
          >
            {open ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </nav>

      {open ? (
        <div className="border-t border-white/10 bg-navy-deep lg:hidden">
          <ul className="mx-auto flex max-w-6xl flex-col px-6 py-3">
            {navLinks.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  onClick={() => setOpen(false)}
                  className="block py-2.5 font-display text-paper/90 hover:text-gold"
                >
                  {link.label}
                </Link>
              </li>
            ))}
            <li className="py-2">
              <Button variant="gold" asChild className="w-full">
                <Link href="/talon" onClick={() => setOpen(false)}>
                  เริ่มเลย ฿3,900
                </Link>
              </Button>
            </li>
          </ul>
        </div>
      ) : null}
    </header>
  );
}
