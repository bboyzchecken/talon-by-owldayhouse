"use client";

import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { CheckSquare, Download, Search, X } from "lucide-react";
import { Button } from "@odh/ui";
import { LeadCard } from "@/components/lead-card";
import { Alert, EmptyState, Input, Panel, Select, Spinner } from "@/components/ui";
import { ApiError, csv, leads as leadsApi, type LeadListFilters } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useMeta } from "@/lib/hooks";
import { industryLabels, labelOf, ownerTypeLabels, sourceLabels, stageLabels } from "@/lib/labels";

const PAGE_SIZE = 20;
// The API returns at most 200 rows a page, and one bulk move takes 200.
const SELECT_ALL_LIMIT = 200;

export default function LeadListPage() {
  const { isAdmin, user } = useAuth();
  const { data: meta } = useMeta();

  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState<LeadListFilters>({ sort: "updated" });
  const [exportError, setExportError] = useState("");

  // Selection mode: tick leads (across pages) and move them to ไม่รับงาน.
  const queryClient = useQueryClient();
  const [selecting, setSelecting] = useState(false);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [reason, setReason] = useState("");
  const [confirming, setConfirming] = useState(false);
  const [moveResult, setMoveResult] = useState<{ tone: "warn" | "stop"; text: string } | null>(null);
  const [selectingAll, setSelectingAll] = useState(false);

  const toggle = (id: number) =>
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const stopSelecting = () => {
    setSelecting(false);
    setSelected(new Set());
    setConfirming(false);
    setReason("");
  };

  async function selectAllMatching() {
    setSelectingAll(true);
    try {
      const all = await leadsApi.list({ ...query, page: 1, limit: SELECT_ALL_LIMIT });
      setSelected(new Set(all.data.map((lead) => lead.id)));
      if ((all.pagination?.total ?? 0) > SELECT_ALL_LIMIT) {
        setMoveResult({ tone: "warn", text: `เลือกได้ครั้งละ ${SELECT_ALL_LIMIT} รายแรก ย้ายชุดนี้ก่อนแล้วค่อยเลือกชุดถัดไป` });
      }
    } finally {
      setSelectingAll(false);
    }
  }

  const decline = useMutation({
    mutationFn: () => leadsApi.decline([...selected], reason.trim()),
    onSuccess: async (result) => {
      const skipped = result.skipped.length
        ? ` · ข้าม ${result.skipped.length} ราย (${[...new Set(result.skipped.map((s) => s.reason))].join(", ")})`
        : "";
      setMoveResult({ tone: "warn", text: `ย้ายไป “ไม่รับงาน” แล้ว ${result.updated} ราย${skipped}` });
      stopSelecting();
      await queryClient.invalidateQueries({ queryKey: ["leads"] });
      await queryClient.invalidateQueries({ queryKey: ["calendar"] });
    },
    onError: (caught) => {
      setConfirming(false);
      setMoveResult({ tone: "stop", text: (caught as ApiError).body?.error ?? "ย้ายไม่สำเร็จ" });
    },
  });

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
              placeholder="ค้นหาชื่อบริษัท ชื่องาน เลข e-GP หรือเลขผู้เสียภาษี"
              aria-label="ค้นหาลูกค้า"
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
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="font-mono text-xs text-muted">
              ทั้งหมด {pagination?.total ?? rows.length} ราย
              {isFetching ? " · กำลังอัปเดต…" : ""}
            </p>
            {selecting ? null : (
              <Button
                variant="line"
                size="sm"
                onClick={() => {
                  setMoveResult(null);
                  setSelecting(true);
                }}
              >
                <CheckSquare className="size-4" aria-hidden />
                เลือกเพื่อย้ายไป ไม่รับงาน
              </Button>
            )}
          </div>

          {moveResult ? <Alert tone={moveResult.tone}>{moveResult.text}</Alert> : null}

          {selecting ? (
            <div className="sticky bottom-20 z-10 space-y-3 rounded-2xl border border-navy bg-white p-4 shadow-lg sm:bottom-4">
              <div className="flex flex-wrap items-center gap-2">
                <p className="mr-auto font-display text-sm font-semibold text-ink">เลือกแล้ว {selected.size} ราย</p>
                <Button
                  variant="line"
                  size="sm"
                  onClick={() => setSelected((current) => new Set([...current, ...rows.map((lead) => lead.id)]))}
                >
                  เลือกทั้งหน้านี้
                </Button>
                <Button variant="line" size="sm" onClick={selectAllMatching} disabled={selectingAll}>
                  {selectingAll ? "กำลังเลือก…" : `เลือกทั้งหมดตามตัวกรอง (${Math.min(pagination?.total ?? 0, SELECT_ALL_LIMIT)})`}
                </Button>
                <button
                  type="button"
                  onClick={stopSelecting}
                  className="rounded-full p-2 text-muted hover:bg-navy/5 hover:text-ink"
                  aria-label="เลิกเลือก"
                >
                  <X className="size-4" aria-hidden />
                </button>
              </div>
              <Input
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                placeholder="เหตุผล (ไม่บังคับ) เช่น วงเงินเกินผลงานเรา / งานต่อเนื่องจากระยะ 1"
                aria-label="เหตุผลที่ไม่รับงาน"
                maxLength={512}
              />
              {confirming ? (
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-body text-sm text-ink">
                    ย้าย {selected.size} รายไป “ไม่รับงาน”? ย้ายกลับได้ทีละรายในหน้าลูกค้า
                  </p>
                  <Button size="sm" onClick={() => decline.mutate()} disabled={decline.isPending}>
                    {decline.isPending ? "กำลังย้าย…" : "ยืนยัน"}
                  </Button>
                  <Button variant="line" size="sm" onClick={() => setConfirming(false)}>
                    ยกเลิก
                  </Button>
                </div>
              ) : (
                <Button size="sm" onClick={() => setConfirming(true)} disabled={selected.size === 0}>
                  ย้ายไป ไม่รับงาน ({selected.size})
                </Button>
              )}
            </div>
          ) : null}

          <ul className="space-y-3">
            {rows.map((lead) => (
              <li key={lead.id} className={selecting ? "flex items-center gap-3" : undefined}>
                {selecting ? (
                  // The label pads the tap target; the card itself still opens the lead.
                  <label className="-m-2 flex shrink-0 cursor-pointer items-center p-2">
                    <input
                      type="checkbox"
                      checked={selected.has(lead.id)}
                      onChange={() => toggle(lead.id)}
                      aria-label={`เลือก ${lead.name}`}
                      className="size-5 rounded border-line-control accent-navy"
                    />
                  </label>
                ) : null}
                <LeadCard lead={lead} className={selecting ? "min-w-0 flex-1" : undefined} />
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
