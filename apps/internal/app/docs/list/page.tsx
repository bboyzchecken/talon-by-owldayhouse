"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { FilePlus2, Search } from "lucide-react";
import { Button, cn } from "@odh/ui";
import { DocStatusBadge } from "@/components/docs/status-badge";
import { Alert, EmptyState, Input, Select, Spinner } from "@/components/odh";
import { documents, type DocumentListFilters } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { adminDocTypes, docTypeLabels, money, salesDocTypes } from "@/lib/docs";
import { formatDate } from "@/lib/format";
import type { DocStatus, DocType } from "@/lib/types";

const PAGE_SIZE = 30;

export default function DocumentListPage() {
  const { isAdmin } = useAuth();
  const [filters, setFilters] = useState<DocumentListFilters>({});
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const list = useQuery({
    queryKey: ["docs", "list", filters, search, page],
    queryFn: () => documents.list({ ...filters, search: search || undefined, page, limit: PAGE_SIZE }),
  });
  const types = isAdmin ? adminDocTypes : salesDocTypes;
  const rows = list.data?.items ?? [];
  const total = list.data?.total ?? 0;

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold text-foreground sm:text-3xl">เอกสาร</h1>
          <p className="mt-1 font-body text-sm text-muted-foreground">
            {isAdmin ? "เอกสารทั้งหมดของบริษัท" : "เอกสารของลูกค้าที่คุณดูแล"} · เลขที่ออกตอนกดออกเอกสาร ไม่ซ้ำ ไม่ข้าม
          </p>
        </div>
        <Button asChild size="sm">
          <Link href="/docs/new">
            <FilePlus2 className="size-4" aria-hidden /> สร้างเอกสาร
          </Link>
        </Button>
      </header>

      <div className="grid gap-2 sm:grid-cols-4">
        <div className="relative sm:col-span-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
          <Input
            className="pl-9"
            placeholder="เลขที่ ลูกค้า หรืออ้างอิง"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            aria-label="ค้นหาเอกสาร"
          />
        </div>
        <Select
          value={filters.doc_type ?? ""}
          onChange={(e) => {
            setFilters((f) => ({ ...f, doc_type: e.target.value ? (Number(e.target.value) as DocType) : undefined }));
            setPage(1);
          }}
          aria-label="ประเภท"
        >
          <option value="">ทุกประเภท</option>
          {types.map((t) => (
            <option key={t} value={t}>
              {docTypeLabels[t]}
            </option>
          ))}
        </Select>
        <Select
          value={filters.status ?? ""}
          onChange={(e) => {
            setFilters((f) => ({ ...f, status: (e.target.value || undefined) as DocStatus | undefined }));
            setPage(1);
          }}
          aria-label="สถานะ"
        >
          <option value="">ทุกสถานะ</option>
          <option value="draft">ร่าง</option>
          <option value="issued">ออกแล้ว</option>
          <option value="voided">ยกเลิก</option>
        </Select>
        <Input
          type="month"
          value={filters.month ?? ""}
          onChange={(e) => {
            setFilters((f) => ({ ...f, month: e.target.value || undefined }));
            setPage(1);
          }}
          aria-label="เดือน"
        />
      </div>

      {list.error ? <Alert tone="stop">{(list.error as Error).message}</Alert> : null}
      {list.isLoading ? (
        <Spinner />
      ) : rows.length === 0 ? (
        <EmptyState title="ยังไม่มีเอกสาร" hint="กด “สร้างเอกสาร” เพื่อเริ่มใบเสนอราคาใบแรก" />
      ) : (
        <ul className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card">
          {rows.map((doc) => (
            <li key={doc.id}>
              <Link
                href={`/docs/detail/?id=${doc.id}`}
                className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-1 px-4 py-3 hover:bg-muted sm:grid-cols-[180px_minmax(0,1fr)_120px_140px_90px]"
              >
                <span className="font-mono text-sm font-medium text-foreground">
                  {doc.code || <span className="text-muted-foreground">ร่าง #{doc.id}</span>}
                </span>
                <span className="col-start-1 row-start-2 min-w-0 truncate font-body text-sm text-foreground sm:col-start-auto sm:row-start-auto">
                  <span className="text-muted-foreground">{docTypeLabels[doc.doc_type]} · </span>
                  {doc.contact?.name ?? "—"}
                </span>
                <span className="hidden font-body text-sm text-muted-foreground sm:block">{formatDate(doc.issued_date)}</span>
                <span className={cn("text-right font-mono text-sm tabular-nums", doc.status === "voided" ? "text-muted-foreground line-through" : "text-foreground")}>
                  {money(doc.net_amount)}
                </span>
                <span className="col-start-2 row-span-2 row-start-1 justify-self-end sm:col-start-auto sm:row-span-1 sm:row-start-auto">
                  <DocStatusBadge status={doc.status} />
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
      {total > PAGE_SIZE ? (
        <div className="flex items-center justify-between font-body text-sm text-muted-foreground">
          <span>
            {total} ใบ · หน้า {page} / {Math.ceil(total / PAGE_SIZE)}
          </span>
          <div className="flex gap-2">
            <Button size="sm" variant="line" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>
              ก่อนหน้า
            </Button>
            <Button size="sm" variant="line" disabled={page * PAGE_SIZE >= total} onClick={() => setPage((p) => p + 1)}>
              ถัดไป
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
