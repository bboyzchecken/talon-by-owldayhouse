"use client";

import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRef, useState } from "react";
import { FileUp } from "lucide-react";
import { Button, cn } from "@odh/ui";
import { AnnouncementCard } from "@/components/egp/announcement-card";
import { Alert, EmptyState, Panel, Spinner } from "@/components/ui";
import { ApiError, egp } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useMeta } from "@/lib/hooks";
import { leadHref } from "@/components/lead-card";
import type { EgpAnnouncement, EgpImportResult, EgpSendResult, EgpView } from "@/lib/types";

const tabs: { view: EgpView; label: string; hint: string }[] = [
  { view: "inbox", label: "น่าสนใจ", hint: "ผ่านตัวกรอง เรียงตามคะแนน" },
  { view: "flagged", label: "ติดป้ายระวัง", hint: "ผ่านตัวกรอง แต่มีสัญญาณควรระวัง" },
  { view: "excluded", label: "ไม่ผ่านตัวกรอง", hint: "ดูเหตุผล ไว้ปรับคำค้นในหน้าตั้งค่า" },
  {
    view: "closed",
    label: "ปิดแล้ว",
    hint: "ได้ผู้ชนะหรือยกเลิกแล้ว ยื่นไม่ได้ ใช้ดูว่าหน่วยงานไหนจ้างอะไร ราคาเท่าไร",
  },
  { view: "sent", label: "ส่งแล้ว", hint: "อยู่ใน Lead Tracker แล้ว" },
  { view: "skipped", label: "ข้าม", hint: "เอากลับมาพิจารณาได้" },
];

export default function RadarPage() {
  const { isAdmin, loading } = useAuth();
  const queryClient = useQueryClient();
  const { data: meta } = useMeta();
  const fileRef = useRef<HTMLInputElement>(null);

  const [view, setView] = useState<EgpView>("inbox");
  const [imported, setImported] = useState<EgpImportResult | null>(null);
  const [importError, setImportError] = useState("");
  const [lastSent, setLastSent] = useState<{ result: EgpSendResult; item: EgpAnnouncement } | null>(null);

  const list = useQuery({
    queryKey: ["egp", "list", view],
    queryFn: () => egp.list(view),
    enabled: isAdmin,
  });
  const settings = useQuery({ queryKey: ["egp", "settings"], queryFn: egp.settings, enabled: isAdmin });

  const importFile = useMutation({
    mutationFn: (file: File) => egp.importCSV(file),
    onSuccess: async (result) => {
      setImported(result);
      setImportError("");
      if (fileRef.current) fileRef.current.value = "";
      await queryClient.invalidateQueries({ queryKey: ["egp"] });
    },
    onError: (caught) => {
      setImported(null);
      setImportError((caught as ApiError).body?.error ?? "นำเข้าไม่สำเร็จ");
    },
  });

  if (loading) return <Spinner />;
  if (!isAdmin) return <Alert tone="stop">e-GP Radar ใช้ได้เฉพาะแอดมิน</Alert>;

  const counts = list.data?.counts;
  const items = list.data?.data ?? [];
  const sales = (meta?.users ?? []).filter((u) => u.role === "sales");
  const hideFlagged = settings.data?.settings.hide_flagged_by_default ?? true;
  const visibleTabs = tabs.filter((t) => t.view !== "flagged" || hideFlagged);

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold text-ink sm:text-3xl">e-GP Radar</h1>
          <p className="mt-1 max-w-2xl font-body text-sm text-muted">
            คัดประกาศจัดซื้อจัดจ้างภาครัฐที่ตรงกับงานของเรา แล้วส่งให้เซลส์ไป present และดูแลต่อ
          </p>
        </div>
        <Button asChild variant="line" size="sm">
          <Link href="/egp/settings">ตั้งค่าตัวกรอง</Link>
        </Button>
      </header>

      <Panel title="นำเข้าประกาศจาก e-GP (ทุกเช้า)">
        <ol className="list-decimal space-y-1 pl-5 font-body text-sm text-ink">
          <li>
            เปิด e-GP → <strong>ค้นหาขั้นสูง</strong> เลือก <strong>สถานะโครงการ</strong> เป็น “ประกาศเชิญชวน” หรือ
            “จัดทำ TOR / ร่างประกาศ” และเลือกวันที่ประกาศช่วงสั้น ๆ (เช่น 1–3 วันล่าสุด)
          </li>
          <li>
            กด <strong>Export .CSV</strong> บนหน้าผลค้นหาของ e-GP
          </li>
          <li>เลือกไฟล์นั้นที่ปุ่มด้านล่าง — นำเข้าไฟล์เดิมซ้ำได้ ระบบไม่สร้างรายการซ้ำ</li>
        </ol>
        <p className="mt-2 font-body text-xs text-muted">
          e-GP export ได้ครั้งละ 1,000 รายการแรกเท่านั้น ถ้าไม่กรองสถานะ ไฟล์จะเต็มไปด้วยงานที่ได้ผู้ชนะแล้ว
          (ระบบย้ายไปแท็บ “ปิดแล้ว”) และงานที่ยังเปิดรับอาจตกหล่น
        </p>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <input
            ref={fileRef}
            type="file"
            accept=".csv,text/csv"
            className="sr-only"
            id="egp-csv"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) importFile.mutate(file);
            }}
          />
          <Button size="sm" onClick={() => fileRef.current?.click()} disabled={importFile.isPending}>
            <FileUp className="size-4" aria-hidden />
            {importFile.isPending ? "กำลังนำเข้า…" : "เลือกไฟล์ CSV จาก e-GP"}
          </Button>
          <span className="font-body text-xs text-muted">
            ระบบไม่ล็อกอิน e-GP แทนคุณ และไม่ดึงข้อมูลเอง ใช้เฉพาะไฟล์ที่คุณดาวน์โหลด
          </span>
        </div>
        {importError ? (
          <div className="mt-3">
            <Alert tone="stop">{importError}</Alert>
          </div>
        ) : null}
        {imported ? (
          <div className="mt-3">
            <Alert>
              นำเข้าแล้ว: ใหม่ {imported.created} รายการ · อัปเดต {imported.updated} รายการ
              {imported.problems.length > 0
                ? ` · ข้าม ${imported.problems.length} บรรทัด (${imported.problems
                    .slice(0, 3)
                    .map((p) => `บรรทัด ${p.line}: ${p.reason}`)
                    .join(", ")}${imported.problems.length > 3 ? " …" : ""})`
                : ""}
            </Alert>
            {imported.maybe_truncated ? (
              <div className="mt-2">
                <Alert tone="stop">
                  ไฟล์นี้มีครบ 1,000 รายการ ซึ่งเป็นเพดานของ e-GP รายการหลังจากนั้นอาจไม่ได้มา ให้กรองสถานะโครงการหรือแบ่งช่วงวันที่ให้แคบลง
                  แล้ว export ใหม่
                </Alert>
              </div>
            ) : null}
          </div>
        ) : null}
      </Panel>

      <nav aria-label="หมวดของ Radar" className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
        <ul className="flex gap-2">
          {visibleTabs.map((tab) => (
            <li key={tab.view}>
              <button
                type="button"
                onClick={() => setView(tab.view)}
                aria-current={view === tab.view ? "page" : undefined}
                title={tab.hint}
                className={cn(
                  "whitespace-nowrap rounded-full px-4 py-2 font-display text-sm font-semibold transition-colors",
                  view === tab.view ? "bg-navy text-white" : "border border-line text-muted hover:border-ink",
                )}
              >
                {tab.label}
                {counts ? <span className="ml-1.5 font-mono text-xs opacity-80">{counts[tab.view]}</span> : null}
              </button>
            </li>
          ))}
        </ul>
      </nav>
      <p className="font-body text-xs text-muted">{tabs.find((t) => t.view === view)?.hint}</p>

      {lastSent ? (
        <Alert>
          ส่ง “{lastSent.item.title.slice(0, 80)}
          {lastSent.item.title.length > 80 ? "…" : ""}” แล้ว ·{" "}
          {lastSent.result.action === "created" ? "สร้างลูกค้าใหม่" : "แนบเข้าลูกค้ารายเดิม"} · ดูแลโดย{" "}
          {lastSent.result.owner_name} ·{" "}
          <Link href={leadHref(lastSent.result.lead_id)} className="font-semibold underline">
            เปิดลูกค้า
          </Link>
        </Alert>
      ) : null}

      {list.error ? <Alert tone="stop">{(list.error as Error).message}</Alert> : null}

      {list.isLoading ? (
        <Spinner />
      ) : items.length === 0 ? (
        <EmptyState
          title={view === "inbox" ? "ยังไม่มีประกาศที่น่าสนใจ" : "ไม่มีรายการในหมวดนี้"}
          hint={
            view === "inbox"
              ? "นำเข้าไฟล์ CSV จาก e-GP ด้านบน ถ้านำเข้าแล้วแต่ไม่มีอะไรเลย ดูแท็บ “ไม่ผ่านตัวกรอง” แล้วปรับคำค้นในหน้าตั้งค่า"
              : undefined
          }
        />
      ) : (
        <ul className="space-y-3">
          {items.map((item) => (
            <li key={item.id}>
              <AnnouncementCard
                item={item}
                users={sales}
                defaultAssigneeId={settings.data?.settings.default_assignee_id ?? null}
                onSent={(result, sentItem) => setLastSent({ result, item: sentItem })}
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
