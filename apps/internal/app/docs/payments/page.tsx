"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { cn } from "@odh/ui";
import { Alert, EmptyState, Input, Spinner } from "@/components/odh";
import { payments } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { money, whtCertLabels } from "@/lib/docs";
import { formatDate } from "@/lib/format";

const tabs = [
  { key: "pending", label: "รอหนังสือรับรอง 50 ทวิ", hint: "ลูกค้าหักภาษีไว้แล้วแต่เรายังไม่ได้หนังสือรับรอง ยอดที่ถูกหักใช้เป็นเครดิตภาษีสิ้นปีได้ก็ต่อเมื่อมีหนังสือนี้" },
  { key: "all", label: "รับเงินทั้งหมด", hint: "ทุกรายการรับเงินที่ยังไม่ถูกยกเลิก เลือกเดือนเพื่อดูยอดรวม" },
] as const;

/** Money in, and the withholding certificates customers still owe us (admin). */
export default function PaymentsPage() {
  const { isAdmin, loading } = useAuth();
  const [tab, setTab] = useState<(typeof tabs)[number]["key"]>("pending");
  const [month, setMonth] = useState("");
  const list = useQuery({
    queryKey: ["docs", "payments", tab, month],
    queryFn: () => payments.list({ wht_cert: tab === "pending" ? "pending" : undefined, month: month || undefined }),
    enabled: isAdmin,
  });

  if (loading) return <Spinner />;
  if (!isAdmin) return <Alert tone="stop">หน้านี้เปิดได้เฉพาะแอดมิน</Alert>;

  const rows = list.data?.items ?? [];
  const sums = list.data?.page_sums;

  return (
    <div className="space-y-5">
      <header>
        <h1 className="font-display text-2xl font-semibold text-foreground sm:text-3xl">รับเงิน</h1>
        <p className="mt-1 max-w-2xl font-body text-sm text-muted-foreground">
          บันทึกรับเงินจากหน้าเอกสาร (ใบแจ้งหนี้ หรือใบเสนอราคา) ระบบออกใบเสร็จ/ใบกำกับภาษีให้ตอนบันทึก
        </p>
      </header>

      <div className="flex flex-wrap items-center gap-2">
        {tabs.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            aria-current={tab === t.key ? "page" : undefined}
            className={cn(
              "rounded-full px-4 py-2 font-display text-sm font-semibold",
              tab === t.key ? "bg-primary text-primary-foreground" : "border border-border text-muted-foreground hover:border-foreground",
            )}
          >
            {t.label}
            {t.key === "pending" && tab === "pending" && list.data ? <span className="ml-1.5 font-mono text-xs opacity-80">{list.data.total}</span> : null}
          </button>
        ))}
        <Input type="month" className="ml-auto w-48 py-2" value={month} onChange={(e) => setMonth(e.target.value)} aria-label="เดือน" />
      </div>
      <p className="font-body text-xs text-muted-foreground">{tabs.find((t) => t.key === tab)?.hint}</p>

      {sums ? (
        <dl className="grid grid-cols-3 gap-3 rounded-2xl border border-border bg-card p-4 font-body text-sm">
          <div>
            <dt className="text-muted-foreground">เงินเข้า</dt>
            <dd className="font-mono tabular-nums text-foreground">{money(sums.received)}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">ถูกหัก ณ ที่จ่าย</dt>
            <dd className="font-mono tabular-nums text-foreground">{money(sums.withholding)}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">ตัดยอดเอกสาร</dt>
            <dd className="font-mono font-semibold tabular-nums text-foreground">{money(sums.settled)}</dd>
          </div>
        </dl>
      ) : null}

      {list.error ? <Alert tone="stop">{(list.error as Error).message}</Alert> : null}
      {list.isLoading ? (
        <Spinner />
      ) : rows.length === 0 ? (
        <EmptyState title={tab === "pending" ? "ไม่มีหนังสือรับรองที่รออยู่" : "ยังไม่มีรายการรับเงิน"} />
      ) : (
        <ul className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card">
          {rows.map((p) => (
            <li key={p.id}>
              <Link
                href={`/docs/detail/?id=${p.document_id}`}
                className="grid grid-cols-[minmax(0,1fr)_auto] gap-x-4 gap-y-1 px-4 py-3 hover:bg-muted sm:grid-cols-[110px_minmax(0,1fr)_150px_140px]"
              >
                <span className="font-body text-sm text-muted-foreground">{formatDate(p.payment_date)}</span>
                <span className="col-start-1 min-w-0 truncate font-display text-sm font-semibold text-foreground sm:col-start-auto">
                  {p.document?.contact?.name ?? "—"}
                  <span className="ml-2 font-mono text-xs font-normal text-muted-foreground">
                    {p.document?.code}
                    {p.receipt ? ` → ${p.receipt.code}` : " · ยังไม่ออกใบเสร็จ"}
                  </span>
                </span>
                <span className="hidden font-body text-xs text-muted-foreground sm:block">{whtCertLabels[p.wht_cert_status]}</span>
                <span className="col-start-2 row-span-2 row-start-1 self-center text-right font-mono text-sm tabular-nums text-foreground sm:col-start-auto sm:row-span-1 sm:row-start-auto">
                  {money(tab === "pending" ? p.withholding_amount : p.settled_amount)}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
