"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import { BarChart3, CalendarCheck, Columns3, List, LogOut, Plus, Radar, Settings, SlidersHorizontal } from "lucide-react";
import { OwlLogo, cn } from "@odh/ui";
import { Spinner } from "@/components/ui";
import { useAuth } from "@/lib/auth";
import { roleLabels } from "@/lib/labels";
import { toolForPath, tools } from "@/lib/tools";

interface NavItem {
  href: string;
  label: string;
  icon: typeof List;
  adminOnly?: boolean;
}

/** The Lead Tracker's own pages. Another tool brings its own list. */
const leadNav: NavItem[] = [
  { href: "/leads/today", label: "วันนี้", icon: CalendarCheck },
  { href: "/leads/list", label: "รายชื่อ", icon: List },
  { href: "/leads/new", label: "เพิ่มลูกค้า", icon: Plus },
  { href: "/leads/pipeline", label: "Pipeline", icon: Columns3 },
  { href: "/leads/kpi", label: "KPI", icon: BarChart3 },
  { href: "/leads/admin", label: "Admin", icon: Settings, adminOnly: true },
];

/** e-GP Radar is admin only, so every item is too. */
const egpNav: NavItem[] = [
  { href: "/egp/radar", label: "Radar", icon: Radar, adminOnly: true },
  { href: "/egp/settings", label: "ตั้งค่า", icon: SlidersHorizontal, adminOnly: true },
];

export function navForTool(slug: string | undefined): NavItem[] {
  if (slug === "leads") return leadNav;
  if (slug === "egp") return egpNav;
  return [];
}

/**
 * The signed-in shell: header, tool navigation and — on a phone — a bottom tab
 * bar, because the sales team uses this outside the office.
 *
 * It also guards the page: with no valid session it sends you to /login.
 */
export function AppShell({ children }: { children: ReactNode }) {
  const { user, loading, isAdmin, signOut } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/login");
    }
  }, [loading, user, router]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Spinner label="กำลังตรวจสอบการเข้าสู่ระบบ…" />
      </div>
    );
  }
  if (!user) {
    return null;
  }

  const tool = toolForPath(pathname);
  const nav = navForTool(tool?.slug).filter((item) => !item.adminOnly || isAdmin);

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-30 border-b border-line bg-white/95 backdrop-blur">
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center gap-3 px-4 sm:px-6">
          <Link href="/" className="flex items-center gap-2" aria-label="หน้ารวมเครื่องมือ">
            <OwlLogo className="h-7 w-auto" />
          </Link>

          {tool ? (
            <span className="hidden font-display text-sm font-semibold text-muted sm:inline">
              / {tool.name}
            </span>
          ) : null}

          <div className="ml-auto flex items-center gap-3">
            <div className="text-right">
              <div className="font-display text-sm font-semibold leading-tight text-ink">{user.name}</div>
              <div className="font-mono text-[11px] uppercase tracking-wide text-muted">
                {roleLabels[user.role]}
              </div>
            </div>
            <button
              type="button"
              onClick={signOut}
              className="flex size-10 items-center justify-center rounded-full border border-line text-muted transition-colors hover:border-ink hover:text-ink"
              aria-label="ออกจากระบบ"
              title="ออกจากระบบ"
            >
              <LogOut className="size-4" aria-hidden />
            </button>
          </div>
        </div>

        {nav.length > 0 ? (
          <nav
            aria-label={`เมนู ${tool?.name ?? ""}`}
            className="mx-auto hidden w-full max-w-6xl gap-1 px-4 pb-2 sm:flex sm:px-6"
          >
            {nav.map((item) => {
              const active = pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "flex items-center gap-2 rounded-full px-4 py-2 font-display text-sm font-semibold transition-colors",
                    active ? "bg-navy text-white" : "text-muted hover:bg-navy/5 hover:text-navy",
                  )}
                >
                  <item.icon className="size-4" aria-hidden />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        ) : null}
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 pb-28 pt-5 sm:px-6 sm:pb-12">{children}</main>

      {nav.length > 0 ? (
        <nav
          aria-label={`เมนู ${tool?.name ?? ""} (มือถือ)`}
          className="pb-safe fixed inset-x-0 bottom-0 z-30 border-t border-line bg-white/95 backdrop-blur sm:hidden"
        >
          <ul className="flex items-stretch">
            {nav.map((item) => {
              const active = pathname.startsWith(item.href);
              return (
                <li key={item.href} className="flex-1">
                  <Link
                    href={item.href}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "flex h-14 flex-col items-center justify-center gap-0.5 font-display text-[11px] font-semibold",
                      active ? "text-navy" : "text-muted",
                    )}
                  >
                    <item.icon className={cn("size-5", active && "text-navy")} aria-hidden />
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      ) : null}
    </div>
  );
}

/** The tool menu on the home page. */
export function ToolMenu() {
  const { isAdmin } = useAuth();
  return (
    <ul className="grid gap-4 sm:grid-cols-2">
      {tools
        .filter((tool) => !tool.adminOnly || isAdmin)
        .map((tool) => (
          <li key={tool.slug}>
            <Link
              href={tool.href}
              className="flex h-full flex-col gap-2 rounded-2xl border border-line bg-white p-5 transition-colors hover:border-navy"
            >
              <span className="flex size-10 items-center justify-center rounded-full bg-navy text-white">
                <tool.icon className="size-5" aria-hidden />
              </span>
              <span className="font-display text-lg font-semibold text-ink">{tool.name}</span>
              <span className="font-body text-sm text-muted">{tool.summary}</span>
            </Link>
          </li>
        ))}
    </ul>
  );
}
