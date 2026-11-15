"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import { ChevronsUpDown, KeyRound, LogOut } from "lucide-react";
import { OwlLogo, OwlMark, cn } from "@odh/ui";
import { Spinner } from "@/components/odh";
import { RoleBadge } from "@/components/role-badge";
import { ThemeSwitch } from "@/components/theme-toggle";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Separator } from "@/components/ui/separator";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarProvider,
  SidebarRail,
  SidebarSeparator,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { useAuth } from "@/lib/auth";
import {
  adminPages,
  pageForPath,
  toolForPath,
  toolPages,
  visibleTools,
} from "@/lib/tools";

/**
 * The initials in the account avatar. Taken from the username, not the display
 * name: names here are Thai, and the first two Thai characters of a name are
 * often a vowel or a tone mark on its own.
 */
function initials(username: string): string {
  return username.slice(0, 2).toUpperCase();
}

/**
 * The signed-in shell.
 *
 * A collapsible sidebar is the frame: every tool is listed at once, the open
 * tool shows its pages beneath it, and everything an admin may do that a sales
 * account may not sits in one group of its own — so what your role unlocks is
 * visible, not something you discover by hitting a 403. On a phone the sidebar
 * becomes a sheet and the open tool keeps a bottom tab bar, because the sales
 * team works outside the office.
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
  const page = pageForPath(pathname);
  const openTools = visibleTools(isAdmin);
  const elevated = adminPages(isAdmin);
  const tabs = tool ? toolPages(tool) : [];

  return (
    <SidebarProvider>
      <Sidebar collapsible="icon">
        <SidebarHeader>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton
                asChild
                size="lg"
                tooltip="หน้ารวมเครื่องมือ"
                className="group-data-[collapsible=icon]:justify-center"
              >
                <Link href="/" aria-label="หน้ารวมเครื่องมือ">
                  {/* Wrapped in spans, never a bare <svg>: SidebarMenuButton
                      forces a direct child svg to 16px, which would squash the
                      logo into a line. The full logo gives way to the owl mark
                      when the rail collapses — the artwork is never altered,
                      only swapped for the other registered lockup. */}
                  <span className="flex items-center overflow-hidden group-data-[collapsible=icon]:hidden">
                    <OwlLogo height={22} />
                  </span>
                  <span className="hidden text-primary group-data-[collapsible=icon]:block">
                    <OwlMark size={20} />
                  </span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarHeader>

        <SidebarContent role="navigation" aria-label="เมนูหลัก">
          <SidebarGroup>
            <SidebarGroupLabel>เครื่องมือ</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {openTools.map((item) => {
                  const open = item.slug === tool?.slug;
                  const pages = toolPages(item);
                  return (
                    <SidebarMenuItem key={item.slug}>
                      <SidebarMenuButton
                        asChild
                        isActive={open}
                        tooltip={item.name}
                      >
                        <Link href={item.href}>
                          <item.icon aria-hidden />
                          <span className="font-display font-semibold">
                            {item.name}
                          </span>
                        </Link>
                      </SidebarMenuButton>

                      {open && pages.length > 0 ? (
                        <SidebarMenuSub>
                          {pages.map((sub) => (
                            <SidebarMenuSubItem key={sub.href}>
                              <SidebarMenuSubButton
                                asChild
                                isActive={pathname.startsWith(sub.href)}
                              >
                                <Link href={sub.href}>
                                  <sub.icon aria-hidden />
                                  <span>{sub.label}</span>
                                </Link>
                              </SidebarMenuSubButton>
                            </SidebarMenuSubItem>
                          ))}
                        </SidebarMenuSub>
                      ) : null}
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>

          {elevated.length > 0 ? (
            <>
              {/* The label disappears when the rail collapses to icons, so the
                  line is what keeps elevated pages visibly set apart there. */}
              <SidebarSeparator className="mx-2" />
              <SidebarGroup>
                <SidebarGroupLabel className="gap-1.5">
                  {/* The one gold point in the frame: everything below is elevated. */}
                  <span className="size-1.5 rounded-full bg-gold" aria-hidden />
                  ผู้ดูแลระบบ
                </SidebarGroupLabel>
                <SidebarGroupContent>
                  <SidebarMenu>
                    {elevated.map((item) => (
                      <SidebarMenuItem key={item.href}>
                        <SidebarMenuButton
                          asChild
                          isActive={pathname.startsWith(item.href)}
                          tooltip={`${item.tool.name} · ${item.label}`}
                        >
                          <Link href={item.href}>
                            <item.icon aria-hidden />
                            <span className="truncate">
                              {item.label}
                              <span className="text-muted-foreground">
                                {" "}
                                · {item.tool.name}
                              </span>
                            </span>
                          </Link>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    ))}
                  </SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>
            </>
          ) : null}
        </SidebarContent>

        <SidebarFooter>
          <ThemeSwitch />
          <SidebarMenu>
            <SidebarMenuItem>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <SidebarMenuButton
                    size="lg"
                    tooltip={`${user.name} · ${isAdmin ? "ผู้ดูแล" : "เซลส์"}`}
                  >
                    <Avatar className="size-8 rounded-lg">
                      <AvatarFallback className="rounded-lg bg-primary font-display text-xs font-semibold text-primary-foreground">
                        {initials(user.username)}
                      </AvatarFallback>
                    </Avatar>
                    <span className="grid flex-1 text-left leading-tight">
                      <span className="truncate font-display text-sm font-semibold">
                        {user.name}
                      </span>
                      <span className="truncate font-mono text-[10px] uppercase tracking-wide text-muted-foreground">
                        {isAdmin ? "ผู้ดูแล" : "เซลส์"}
                      </span>
                    </span>
                    <ChevronsUpDown className="ml-auto size-4" aria-hidden />
                  </SidebarMenuButton>
                </DropdownMenuTrigger>
                <DropdownMenuContent side="top" align="start" className="w-56">
                  <DropdownMenuLabel className="font-normal">
                    <div className="font-display text-sm font-semibold text-foreground">
                      {user.name}
                    </div>
                    <div className="mt-0.5 font-mono text-[11px] text-muted-foreground">
                      @{user.username}
                    </div>
                    <RoleBadge role={user.role} className="mt-2" />
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link href="/account">
                      <KeyRound aria-hidden />
                      เปลี่ยนรหัสผ่าน
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem onSelect={signOut}>
                    <LogOut aria-hidden />
                    ออกจากระบบ
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarFooter>

        <SidebarRail />
      </Sidebar>

      <SidebarInset className="min-w-0">
        <header className="sticky top-0 z-20 flex h-14 shrink-0 items-center gap-2 border-b border-border bg-background/95 px-3 backdrop-blur sm:px-4">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-1 !h-5" />
          <nav aria-label="ตำแหน่งปัจจุบัน" className="min-w-0">
            <ol className="flex items-center gap-1.5 font-display text-sm">
              <li className="shrink-0 text-muted-foreground">
                {tool?.name ?? "เครื่องมือภายใน"}
              </li>
              {page ? (
                <>
                  <li aria-hidden className="text-muted-foreground/60">
                    /
                  </li>
                  <li className="truncate font-semibold text-foreground">
                    {page.label}
                  </li>
                </>
              ) : null}
            </ol>
          </nav>
          <div className="ml-auto flex shrink-0 items-center">
            <RoleBadge role={user.role} />
          </div>
        </header>

        <div className="flex-1 px-3 pb-28 pt-4 sm:px-6 sm:pb-10">
          {children}
        </div>

        {tabs.length > 0 ? (
          <nav
            aria-label={`เมนู ${tool?.name ?? ""} (มือถือ)`}
            className="pb-safe fixed inset-x-0 bottom-0 z-30 border-t border-border bg-background/95 backdrop-blur md:hidden"
          >
            <ul className="flex items-stretch">
              {tabs.map((item) => {
                const active = pathname.startsWith(item.href);
                return (
                  <li key={item.href} className="flex-1">
                    <Link
                      href={item.href}
                      aria-current={active ? "page" : undefined}
                      className={cn(
                        "flex h-14 flex-col items-center justify-center gap-0.5 font-display text-[11px] font-semibold",
                        active ? "text-primary" : "text-muted-foreground",
                      )}
                    >
                      <item.icon className="size-5" aria-hidden />
                      {item.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>
        ) : null}
      </SidebarInset>
    </SidebarProvider>
  );
}

/** The tool menu on the home page. */
export function ToolMenu() {
  const { isAdmin } = useAuth();
  return (
    <ul className="grid gap-4 sm:grid-cols-2">
      {visibleTools(isAdmin).map((tool) => (
        <li key={tool.slug}>
          <Link
            href={tool.href}
            className="flex h-full flex-col gap-2 rounded-2xl border border-border bg-card p-5 transition-colors hover:border-primary"
          >
            <span className="flex size-10 items-center justify-center rounded-full bg-primary text-primary-foreground">
              <tool.icon className="size-5" aria-hidden />
            </span>
            <span className="font-display text-lg font-semibold text-foreground">
              {tool.name}
            </span>
            <span className="font-body text-sm text-muted-foreground">
              {tool.summary}
            </span>
            {tool.adminOnly ? (
              <span className="mt-auto inline-flex items-center gap-1.5 pt-2 font-mono text-[10px] uppercase tracking-wide text-muted-foreground">
                <span className="size-1.5 rounded-full bg-gold" aria-hidden />
                เฉพาะผู้ดูแล
              </span>
            ) : null}
          </Link>
        </li>
      ))}
    </ul>
  );
}
