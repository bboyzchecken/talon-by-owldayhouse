import "../globals.css";
import type { ReactNode } from "react";
import { SiteShell } from "@/components/site/SiteShell";
import { rootMetadata, rootViewport } from "@/lib/site-metadata";

export const metadata = rootMetadata("th");
export const viewport = rootViewport;

export default function Layout({ children }: { children: ReactNode }) {
  return <SiteShell locale="th">{children}</SiteShell>;
}
