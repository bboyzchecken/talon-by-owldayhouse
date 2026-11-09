"use client";

import { useState } from "react";
import { cn } from "@odh/ui";
import { DoNotPitchPanel } from "@/components/admin/do-not-pitch-panel";
import { ImportPanel } from "@/components/admin/import-panel";
import { OwnershipHistoryPanel } from "@/components/admin/ownership-history-panel";
import { SettingsPanel } from "@/components/admin/settings-panel";
import { TargetsPanel } from "@/components/admin/targets-panel";
import { UsersPanel } from "@/components/admin/users-panel";
import { Alert, Spinner } from "@/components/ui";
import { useAuth } from "@/lib/auth";

const tabs = [
  { id: "users", label: "ผู้ใช้" },
  { id: "targets", label: "เป้ารายไตรมาส" },
  { id: "cutoff", label: "วันหมดเขต" },
  { id: "do-not-pitch", label: "ห้ามเสนอขายตรง" },
  { id: "import", label: "นำเข้า CSV" },
  { id: "ownership", label: "ประวัติเจ้าของ" },
] as const;

type TabId = (typeof tabs)[number]["id"];

export default function AdminPage() {
  const { isAdmin, loading } = useAuth();
  const [tab, setTab] = useState<TabId>("users");

  if (loading) return <Spinner />;
  if (!isAdmin) {
    return <Alert tone="stop">หน้านี้สำหรับแอดมินเท่านั้น</Alert>;
  }

  return (
    <div className="space-y-5">
      <header>
        <h1 className="font-display text-2xl font-semibold text-ink sm:text-3xl">Admin</h1>
        <p className="mt-1 font-body text-sm text-muted">
          บัญชีผู้ใช้ เป้า วันหมดเขต รายการห้ามเสนอขายตรง นำเข้า CSV และประวัติการเปลี่ยนเจ้าของ
        </p>
      </header>

      <nav aria-label="หมวดของหน้า Admin" className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
        <ul className="flex gap-2">
          {tabs.map((item) => (
            <li key={item.id}>
              <button
                type="button"
                onClick={() => setTab(item.id)}
                aria-current={tab === item.id ? "page" : undefined}
                className={cn(
                  "whitespace-nowrap rounded-full px-4 py-2 font-display text-sm font-semibold transition-colors",
                  tab === item.id ? "bg-navy text-white" : "border border-line text-muted hover:border-ink",
                )}
              >
                {item.label}
              </button>
            </li>
          ))}
        </ul>
      </nav>

      {tab === "users" ? <UsersPanel /> : null}
      {tab === "targets" ? <TargetsPanel /> : null}
      {tab === "cutoff" ? <SettingsPanel /> : null}
      {tab === "do-not-pitch" ? <DoNotPitchPanel /> : null}
      {tab === "import" ? <ImportPanel /> : null}
      {tab === "ownership" ? <OwnershipHistoryPanel /> : null}
    </div>
  );
}
