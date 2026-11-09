"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Download, Search } from "lucide-react";
import { Button } from "@odh/ui";
import { LeadCard } from "@/components/lead-card";
import { Alert, EmptyState, Panel, Select, Spinner } from "@/components/ui";
import { csv, leads as leadsApi, type LeadListFilters } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useMeta } from "@/lib/hooks";
import { industryLabels, labelOf, ownerTypeLabels, sourceLabels, stageLabels } from "@/lib/labels";

const PAGE_SIZE = 20;

export default function LeadListPage() {
  const { isAdmin, user } = useAuth();
  const { data: meta } = useMeta();

  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState<LeadListFilters>({ sort: "updated" });
  const [exportError, setExportError] = useState("");

  const query = useMemo<LeadListFilters>(
    () => ({ ...filters, search: search.trim() || undefined, page, limit: PAGE_SIZE }),
    [filters, search, page],
  );

  const { data, isLoading, error, isFetching } = useQuery({
    queryKey: ["leads", "list", query],
    queryFn: () => leadsApi.list(query),
  });

  function update(patch: Partial<LeadListFilters>) {
    setPage(1);
    setFilters((current) => ({ ...current, ...patch }));
  }

  const rows = data?.data ?? [];
  const pagination = data?.pagination;

  async function onExport() {
    setExportError("");
    try {
      await csv.exportLeads(filters);
    } catch {
      setExportError("ดาวน์โหลด CSV ไม่สำเร็จ");
    }
  }

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold text-ink sm:text-3xl">รายชื่อลูกค้า</h1>
          <p className="mt-1 font-body text-sm text-muted">
            รายชื่อชุดเดียวกันทั้งทีม ป้ายบอกว่าใครดูแล และใครห้ามเสนอขายตรง
          </p>
        </div>
        <div className="flex gap-2">
          {isAdmin ? (
            <Button variant="line" size="sm" onClick={onExport}>
              <Download className="size-4" aria-hidden />
              ส่งออก CSV
            </Button>
          ) : null}
          <Button asChild size="sm">
            <Link href="/leads/new">เพิ่มลูกค้า</Link>
          </Button>
        </div>
      </header>

      {exportError ? <Alert>{exportError}</Alert> : null}

      <Panel>
        <div className="space-y-3">
          <div className="relative">
            <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted" aria-hidden />
            <input
              type="search"
              value={search}
              onChange={(event) => {
                setPage(1);
                setSearch(event.target.value);
              }}
              placeholder="ค้นหาชื่อบริษัท หรือเลขผู้เสียภาษี"
              aria-label="ค้นหาชื่อบริษัท"
              className="w-full rounded-xl border border-line bg-white py-3 pl-11 pr-4 font-body text-base text-ink placeholder:text-muted/70 focus:border-navy focus:outline-none focus:ring-2 focus:ring-navy/20"
            />
          </div>

          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
            <Select
              aria-label="กรองตามเจ้าของ"
              value={filters.mine ? "mine" : filters.owner_user_id ? String(filters.owner_user_id) : ""}
              onChange={(event) => {
                const value = event.target.value;
                if (value === "mine") update({ mine: true, owner_user_id: undefined });
                else if (value === "") update({ mine: undefined, owner_user_id: undefined });
                else update({ mine: undefined, owner_user_id: Number(value) });
              }}
            >
              <option value="">เจ้าของ: ทุกคน</option>
              <option value="mine">ของฉัน ({user?.name})</option>
              {(meta?.users ?? []).map((person) => (
                <option key={person.id} value={person.id}>
                  {person.name}
                </option>
              ))}
            </Select>

            <Select
              aria-label="กรองตามประเภทเจ้าของ"
              value={filters.owner_type ?? ""}
              onChange={(event) => update({ owner_type: event.target.value || undefined })}
            >
              <option value="">ที่มา: ทั้งหมด</option>
              {(meta?.owner_types ?? []).map((value) => (
                <option key={value} value={value}>
                  {labelOf(ownerTypeLabels, value)}
                </option>
              ))}
            </Select>

            <Select
              aria-label="กรองตามขั้น"
              value={filters.stage ?? ""}
              onChange={(event) => update({ stage: event.target.value || undefined })}
            >
              <option value="">ขั้น: ทั้งหมด</option>
              {(meta?.stages ?? []).map((value) => (
                <option key={value} value={value}>
                  {labelOf(stageLabels, value)}
                </option>
              ))}
            </Select>

            <Select
              aria-label="กรองตามกลุ่มธุรกิจ"
              value={filters.industry ?? ""}
              onChange={(event) => update({ industry: event.target.value || undefined })}
            >
              <option value="">กลุ่มธุรกิจ: ทั้งหมด</option>
              {(meta?.industries ?? []).map((value) => (
                <option key={value} value={value}>
                  {labelOf(industryLabels, value)}
                </option>
              ))}
            </Select>

            <Select
              aria-label="กรองตามแหล่งที่มา"
              value={filters.source ?? ""}
              onChange={(event) => update({ source: event.target.value || undefined })}
            >
              <option value="">แหล่งที่มา: ทั้งหมด</option>
              {(meta?.sources ?? []).map((value) => (
                <option key={value} value={value}>
                  {labelOf(sourceLabels, value)}
                </option>
              ))}
            </Select>
          </div>

          <div className="flex flex-wrap items-center gap-4">
            <label className="flex items-center gap-2 font-body text-sm text-ink">
              <input
                type="checkbox"
                checked={Boolean(filters.due_today)}
                onChange={(event) => update({ due_today: event.target.checked || undefined })}
                className="size-4 rounded border-line-control accent-navy"
              />
              ถึงกำหนดตามต่อ
            </label>
            <label className="flex items-center gap-2 font-body text-sm text-ink">
              <input
                type="checkbox"
                checked={Boolean(filters.do_not_pitch)}
                onChange={(event) => update({ do_not_pitch: event.target.checked || undefined })}
                className="size-4 rounded border-line-control accent-navy"
              />
              เฉพาะที่ห้ามเสนอขายตรง
            </label>
            <Select
              aria-label="เรียงลำดับ"
              className="ml-auto w-auto min-w-44"
              value={filters.sort ?? "updated"}
              onChange={(event) => update({ sort: event.target.value })}
            >
              <option value="updated">เรียง: อัปเดตล่าสุด</option>
              <option value="next_action">เรียง: วันที่ต้องตามต่อ</option>
              <option value="name">เรียง: ชื่อบริษัท</option>
              <option value="value">เรียง: มูลค่าที่คาด</option>
              <option value="oldest">เรียง: ลงทะเบียนก่อน</option>
            </Select>
          </div>
        </div>
      </Panel>

      {error ? <Alert>{error.message}</Alert> : null}

      {isLoading ? (
        <Spinner />
      ) : rows.length === 0 ? (
        <EmptyState
          title="ไม่พบลูกค้าตามเงื่อนไขนี้"
          hint="ลองล้างตัวกรอง หรือเพิ่มลูกค้ารายใหม่"
          action={
            <Button asChild size="sm">
              <Link href="/leads/new">เพิ่มลูกค้า</Link>
            </Button>
          }
        />
      ) : (
        <>
          <p className="font-mono text-xs text-muted">
            ทั้งหมด {pagination?.total ?? rows.length} ราย
            {isFetching ? " · กำลังอัปเดต…" : ""}
          </p>
          <ul className="space-y-3">
            {rows.map((lead) => (
              <li key={lead.id}>
                <LeadCard lead={lead} />
              </li>
            ))}
          </ul>

          {pagination && pagination.total_pages > 1 ? (
            <nav className="flex items-center justify-between gap-3" aria-label="หน้า">
              <Button
                variant="line"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage((current) => Math.max(1, current - 1))}
              >
                ก่อนหน้า
              </Button>
              <span className="font-mono text-xs text-muted">
                หน้า {pagination.current_page} / {pagination.total_pages}
              </span>
              <Button
                variant="line"
                size="sm"
                disabled={page >= pagination.total_pages}
                onClick={() => setPage((current) => current + 1)}
              >
                ถัดไป
              </Button>
            </nav>
          ) : null}
        </>
      )}
    </div>
  );
}
