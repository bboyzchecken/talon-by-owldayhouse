"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Plus, Search, UserPlus } from "lucide-react";
import { Button, cn } from "@odh/ui";
import { Alert, EmptyState, Input, Panel, Select, Spinner } from "@/components/odh";
import { leads as leadsApi, registers } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { contactTypeLabels, financeSideLabels } from "@/lib/docs";

const PAGE_SIZE = 30;

/**
 * The billing-contact register: customers and vendors, one list as in PEAK.
 * A sales account sees the customers of its own leads and can add them; vendors
 * are the admin's.
 */
export default function ContactsPage() {
  const { isAdmin } = useAuth();
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [side, setSide] = useState("");
  const [page, setPage] = useState(1);
  const [leadSearch, setLeadSearch] = useState("");

  const list = useQuery({
    queryKey: ["registers", "contacts", search, side, page],
    queryFn: () => registers.contacts({ search: search || undefined, side: side || undefined, page, limit: PAGE_SIZE }),
  });
  const leadResults = useQuery({
    queryKey: ["registers", "lead-search", leadSearch],
    queryFn: () => leadsApi.list({ search: leadSearch, page: 1, limit: 8, ...(isAdmin ? {} : { mine: true }) }),
    enabled: leadSearch.trim().length >= 2,
  });

  const rows = list.data?.items ?? [];
  const total = list.data?.total ?? 0;

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold text-foreground sm:text-3xl">ผู้ติดต่อ</h1>
          <p className="mt-1 max-w-2xl font-body text-sm text-muted-foreground">
            ชื่อ เลขผู้เสียภาษี สาขา และที่อยู่ที่ใช้ออกเอกสาร ลูกค้าและผู้ขายอยู่ทะเบียนเดียวกันแบบ PEAK รหัสรันเอง C-0001 / V-0001
            หรือตั้งให้ตรงกับรหัสใน PEAK ก็ได้
          </p>
        </div>
        <Button asChild size="sm">
          <Link href="/docs/contacts/edit/">
            <Plus className="size-4" aria-hidden /> เพิ่มผู้ติดต่อ
          </Link>
        </Button>
      </header>

      <Panel title="สร้างจากลูกค้าใน Lead Tracker">
        <div className="space-y-2 p-4 sm:p-5">
          <Input
            placeholder="พิมพ์ชื่อลูกค้าอย่างน้อย 2 ตัวอักษร"
            value={leadSearch}
            onChange={(e) => setLeadSearch(e.target.value)}
            aria-label="ค้นหาลูกค้าใน Lead Tracker"
          />
          {leadResults.data?.data?.length ? (
            <ul className="divide-y divide-border rounded-xl border border-border">
              {leadResults.data.data.map((lead) => (
                <li key={lead.id}>
                  <button
                    type="button"
                    className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left hover:bg-muted"
                    onClick={() => router.push(`/docs/contacts/edit/?lead_id=${lead.id}`)}
                  >
                    <span className="font-display text-sm font-semibold text-foreground">{lead.name}</span>
                    <UserPlus className="size-4 text-muted-foreground" aria-hidden />
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
          <p className="font-body text-xs text-muted-foreground">ระบบเติมชื่อบริษัทและผู้ติดต่อคนแรกให้ เหลือกรอกเลขผู้เสียภาษีและที่อยู่ออกบิล</p>
        </div>
      </Panel>

      <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_220px]">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
          <Input
            className="pl-9"
            placeholder="ชื่อ รหัส หรือเลขผู้เสียภาษี"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            aria-label="ค้นหาผู้ติดต่อ"
          />
        </div>
        <Select value={side} onChange={(e) => { setSide(e.target.value); setPage(1); }} aria-label="ฝั่ง">
          <option value="">ทุกฝั่ง</option>
          <option value="customer">ลูกค้า</option>
          {isAdmin ? <option value="vendor">ผู้ขาย/ผู้รับจ้าง</option> : null}
        </Select>
      </div>

      {list.error ? <Alert tone="stop">{(list.error as Error).message}</Alert> : null}
      {list.isLoading ? (
        <Spinner />
      ) : rows.length === 0 ? (
        <EmptyState title="ยังไม่มีผู้ติดต่อ" hint="เพิ่มเองหรือสร้างจากลูกค้าใน Lead Tracker ด้านบน" />
      ) : (
        <ul className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card">
          {rows.map((c) => (
            <li key={c.id}>
              <Link
                href={`/docs/contacts/edit/?id=${c.id}`}
                className="grid grid-cols-[minmax(0,1fr)_auto] gap-x-4 gap-y-1 px-4 py-3 hover:bg-muted sm:grid-cols-[110px_minmax(0,1fr)_170px_140px]"
              >
                <span className="font-mono text-sm text-muted-foreground">{c.code}</span>
                <span className="col-start-1 min-w-0 truncate font-display text-sm font-semibold text-foreground sm:col-start-auto">
                  {c.name}
                  <span className="ml-2 font-body text-xs font-normal text-muted-foreground">{contactTypeLabels[c.contact_type]}</span>
                </span>
                <span className="hidden font-mono text-xs text-muted-foreground sm:block">
                  {c.tax_number || "ยังไม่มีเลขผู้เสียภาษี"}
                </span>
                <span
                  className={cn(
                    "col-start-2 row-span-2 row-start-1 self-center justify-self-end rounded-full px-2.5 py-1 font-display text-xs font-semibold sm:col-start-auto sm:row-span-1 sm:row-start-auto",
                    c.finance_side === "vendor" ? "border border-border text-muted-foreground" : "bg-primary/10 text-primary",
                  )}
                >
                  {financeSideLabels[c.finance_side]}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
      {total > PAGE_SIZE ? (
        <div className="flex items-center justify-between font-body text-sm text-muted-foreground">
          <span>{total} ราย</span>
          <div className="flex gap-2">
            <Button size="sm" variant="line" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>ก่อนหน้า</Button>
            <Button size="sm" variant="line" disabled={page * PAGE_SIZE >= total} onClick={() => setPage((p) => p + 1)}>ถัดไป</Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
