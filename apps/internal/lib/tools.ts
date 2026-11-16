import type { LucideIcon } from "lucide-react";
import {
  BarChart3,
  CalendarCheck,
  Building2,
  Columns3,
  Banknote,
  FilePlus2,
  Landmark,
  Package,
  FileText,
  Inbox,
  List,
  Plus,
  Radar,
  Settings,
  SlidersHorizontal,
  Users,
} from "lucide-react";

/**
 * The internal tool registry — the one file a new tool has to touch on the UI
 * side (plus its own route folder). The shell reads everything from here: the
 * sidebar, the mobile tab bar, the breadcrumb and the home grid.
 *
 * `nav` is the tool's own pages, in sidebar order. An `adminOnly` page is
 * lifted out of the tool's menu into the separate "ผู้ดูแลระบบ" group, so a
 * sales account never sees an elevated screen listed at all.
 */
export interface ToolNavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  adminOnly?: boolean;
}

export interface Tool {
  slug: string;
  name: string;
  summary: string;
  /** Where the tool opens: the screen the day starts on. */
  href: string;
  icon: LucideIcon;
  /** Only admins see an admin-only tool at all. */
  adminOnly?: boolean;
  /** A count shown next to the tool in the menu (see useToolBadge). */
  badge?: "inbox";
  nav: ToolNavItem[];
}

export const tools: Tool[] = [
  {
    slug: "inbox",
    name: "งานเข้า",
    summary: "คำขอใบเสนอราคาจากฟอร์มบน owldayhouse.com รอคนในทีมรับเข้า Lead Tracker หรือทิ้ง",
    href: "/inbox",
    icon: Inbox,
    badge: "inbox",
    // One screen, so no sub-menu and no phone tab bar.
    nav: [],
  },
  {
    slug: "leads",
    name: "Lead Tracker",
    summary: "รายชื่อลูกค้ากลางของทีมขาย ใครดูแลใคร มาจากไหน อยู่ขั้นไหน และ KPI",
    href: "/leads/today",
    icon: Users,
    nav: [
      { href: "/leads/today", label: "วันนี้", icon: CalendarCheck },
      { href: "/leads/list", label: "รายชื่อ", icon: List },
      { href: "/leads/new", label: "เพิ่มลูกค้า", icon: Plus },
      { href: "/leads/pipeline", label: "Pipeline", icon: Columns3 },
      { href: "/leads/kpi", label: "KPI", icon: BarChart3 },
      { href: "/leads/admin", label: "ตั้งค่าและทีม", icon: Settings, adminOnly: true },
    ],
  },
  {
    slug: "docs",
    name: "เอกสาร",
    summary: "ใบเสนอราคา ใบแจ้งหนี้ ใบเสร็จ/ใบกำกับภาษี เลขที่รันเอง ไม่ซ้ำไม่ข้าม พิมพ์จากเทมเพลตเดิม",
    href: "/docs/list",
    icon: FileText,
    nav: [
      { href: "/docs/list", label: "รายการเอกสาร", icon: List },
      { href: "/docs/new", label: "สร้างเอกสาร", icon: FilePlus2 },
      { href: "/docs/contacts", label: "ผู้ติดต่อ", icon: Building2 },
      { href: "/docs/payments", label: "รับเงิน", icon: Banknote, adminOnly: true },
      { href: "/docs/products", label: "สินค้า/บริการ", icon: Package, adminOnly: true },
      { href: "/docs/payment-methods", label: "ช่องทางรับเงิน", icon: Landmark, adminOnly: true },
    ],
  },
  {
    slug: "egp",
    name: "e-GP Radar",
    summary: "คัดประกาศจัดซื้อจัดจ้างภาครัฐจากไฟล์ e-GP ให้คะแนน ติดป้ายระวัง แล้วส่งให้เซลส์",
    href: "/egp/radar",
    icon: Radar,
    adminOnly: true,
    nav: [
      { href: "/egp/radar", label: "Radar", icon: Radar },
      { href: "/egp/settings", label: "เกณฑ์การคัดกรอง", icon: SlidersHorizontal, adminOnly: true },
    ],
  },
];

/** The tools an account may open. */
export function visibleTools(isAdmin: boolean): Tool[] {
  return tools.filter((tool) => !tool.adminOnly || isAdmin);
}

export function toolForPath(pathname: string): Tool | undefined {
  return tools.find((tool) => pathname.startsWith(`/${tool.slug}`));
}

/** The tool's everyday pages — what the sidebar sub-menu and the phone tabs show. */
export function toolPages(tool: Tool): ToolNavItem[] {
  return tool.nav.filter((item) => !item.adminOnly);
}

/**
 * Every admin-only page across every tool, each tagged with the tool it
 * belongs to, for the one group that is visibly separate in the sidebar.
 */
export function adminPages(isAdmin: boolean): Array<ToolNavItem & { tool: Tool }> {
  if (!isAdmin) return [];
  return visibleTools(isAdmin).flatMap((tool) =>
    tool.nav.filter((item) => item.adminOnly).map((item) => ({ ...item, tool })),
  );
}

/** The current page inside its tool, for the breadcrumb. */
export function pageForPath(pathname: string): ToolNavItem | undefined {
  const tool = toolForPath(pathname);
  if (!tool) return undefined;
  // Longest match first: /leads/list wins over a hypothetical /leads prefix.
  return [...tool.nav]
    .sort((a, b) => b.href.length - a.href.length)
    .find((item) => pathname.startsWith(item.href));
}
