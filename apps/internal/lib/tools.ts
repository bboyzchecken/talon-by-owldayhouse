import type { LucideIcon } from "lucide-react";
import { Users } from "lucide-react";

/**
 * The internal tool registry. Today there is one tool; the next one adds an
 * entry here and its own route folder, and the menu and shell pick it up.
 */
export interface Tool {
  slug: string;
  name: string;
  summary: string;
  href: string;
  icon: LucideIcon;
  /** Only admins see an admin-only tool. */
  adminOnly?: boolean;
}

export const tools: Tool[] = [
  {
    slug: "leads",
    name: "Lead Tracker",
    summary: "รายชื่อลูกค้ากลางของทีมขาย ใครดูแลใคร มาจากไหน อยู่ขั้นไหน และ KPI",
    href: "/leads/today",
    icon: Users,
  },
];

export function toolForPath(pathname: string): Tool | undefined {
  return tools.find((tool) => pathname.startsWith(`/${tool.slug}`));
}
