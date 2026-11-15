import type { ReactNode } from "react";
import { AppShell } from "@/components/app-shell";

export const metadata = { title: "บัญชีของฉัน" };

export default function AccountLayout({ children }: { children: ReactNode }) {
  return <AppShell>{children}</AppShell>;
}
