"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Plus } from "lucide-react";
import { Button, cn } from "@odh/ui";
import { Alert, EmptyState, Input, Spinner } from "@/components/odh";
import { expenses, payments } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { money, todayISO } from "@/lib/docs";
import { formatDate } from "@/lib/format";

const tabs = [
  { key: "unpaid", label: "ค้างจ่าย", hint: "บิลผู้ขายที่ยังจ่ายไม่ครบ" },
  { key: "no_tax_invoice", label: "ยังไม่มีใบกำกับภาษี", hint: "จ่าย VAT ไปแล้วแต่ไม่มีใบกำกับภาษี ภาษีซื้อของรายการเหล่านี้เอามาหักไม่ได้ ตามขอใบกำกับจากผู้ขาย" },
  { key: "wht", label: "รอส่ง 50 ทวิ", hint: "เราหักภาษี ณ ที่จ่ายไว้แล้ว ต้องออกหนังสือรับรองให้ผู้รับเงิน แนบสำเนาแล้วกดส่งในหน้ารายจ่าย" },
  { key: "all", label: "ทั้งหมด", hint: "รายจ่ายที่บันทึกแล้วของเดือนที่เลือก" },
] as const;
type Tab = (typeof tabs)[number]["key"];

/** Vendor bills: what is still owed, input VAT that cannot be claimed, and certificates we owe (admin). */
export default function ExpensesPage() {
  const { isAdmin, loading } = useAuth();
  const [tab, setTab] = useState<Tab>("unpaid");
  const [month, setMonth] = useState(todayISO().slice(0, 7));

  const docs = useQuery({
    queryKey: ["docs", "expenses", tab, month],
    queryFn: () =>
      expenses.list({
        view: tab === "unpaid" || tab === "no_tax_invoice" ? tab : undefined,
        month: tab === "all" ? month : undefined,
      }),
    enabled: isAdmin && tab !== "wht",
  });
  const certs = useQuery({
    queryKey: ["docs", "payments", "out", "pending"],
    queryFn: () => payments.list({ direction: "out", wht_cert: "pending" }),
    enabled: isAdmin && tab === "wht",
  });

  if (loading) return <Spinner />;
  if (!isAdmin) return <Alert tone="stop">หน้านี้เปิดได้เฉพาะแอดมิน</Alert>;

  const sums = docs.data?.sums;
  const rows = docs.data?.items ?? [];

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold text-foreground sm:text-3xl">รายจ่าย</h1>
          <p className="mt-1 max-w-2xl font-body text-sm text-muted-foreground">
            บิลจากผู้ขายและผู้รับจ้าง ภาษีซื้อที่ใช้ได้ หัก ณ ที่จ่ายที่เราหัก และการจ่ายเงิน
          </p>
        </div>
        <Button asChild size="sm">
          <Link href="/docs/new/?type=202">
            <Plus className="size-4" aria-hidden /> บันทึกรายจ่าย
          </Link>
        </Button>
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
          </button>
        ))}
        {tab === "all" ? (
          <Input type="month" className="ml-auto w-48 py-2" value={month} onChange={(e) => setMonth(e.target.value)} aria-label="เดือน" />
        ) : null}
      </div>
      <p className="font-body text-xs text-muted-foreground">{tabs.find((t) => t.key === tab)?.hint}</p>

      {tab === "wht" ? (
        certs.isLoading ? (
          <Spinner />
        ) : (certs.data?.items.length ?? 0) === 0 ? (
          <EmptyState title="ไม่มีหนังสือรับรองที่ต้องส่ง" />
        ) : (
          <ul className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card">
            {certs.data!.items.map((p) => (
              <li key={p.id}>
                <Link href={`/docs/detail/?id=${p.document_id}`} className="grid grid-cols-[minmax(0,1fr)_auto] gap-x-4 px-4 py-3 hover:bg-muted sm:grid-cols-[110px_minmax(0,1fr)_100px_140px]">
                  <span className="font-body text-sm text-muted-foreground">{formatDate(p.payment_date)}</span>
                  <span className="col-start-1 truncate font-display text-sm font-semibold text-foreground sm:col-start-auto">
                    {p.document?.contact?.name ?? "—"} <span className="font-mono text-xs font-normal text-muted-foreground">{p.document?.code}</span>
                  </span>
                  <span className="hidden font-body text-xs text-muted-foreground sm:block">{p.wht_form === "pnd3" ? "ภ.ง.ด.3" : "ภ.ง.ด.53"}</span>
                  <span className="col-start-2 row-start-1 text-right font-mono text-sm tabular-nums text-foreground sm:col-start-auto sm:row-start-auto">{money(p.withholding_amount)}</span>
                </Link>
              </li>
            ))}
          </ul>
        )
      ) : (
        <>
          {sums ? (
            <dl className="grid grid-cols-2 gap-3 rounded-2xl border border-border bg-card p-4 font-body text-sm sm:grid-cols-4">
              <Sum label="ยอดบิลรวม" value={sums.net} />
              <Sum label="ภาษีซื้อที่ใช้ได้" value={sums.vat_claimable} strong />
              <Sum label="ภาษีซื้อที่ใช้ไม่ได้" value={sums.vat_not_claimable} />
              <Sum label={tab === "all" ? "ค้างจ่าย" : "ค้างจ่ายในรายการนี้"} value={sums.outstanding} />
            </dl>
          ) : null}
          {docs.error ? <Alert tone="stop">{(docs.error as Error).message}</Alert> : null}
          {docs.isLoading ? (
            <Spinner />
          ) : rows.length === 0 ? (
            <EmptyState title="ไม่มีรายการ" />
          ) : (
            <ul className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card">
              {rows.map((d) => (
                <li key={d.id}>
                  <Link href={`/docs/detail/?id=${d.id}`} className="grid grid-cols-[minmax(0,1fr)_auto] gap-x-4 gap-y-1 px-4 py-3 hover:bg-muted sm:grid-cols-[170px_minmax(0,1fr)_160px_130px]">
                    <span className="font-mono text-sm text-foreground">{d.code}</span>
                    <span className="col-start-1 truncate font-display text-sm font-semibold text-foreground sm:col-start-auto">
                      {d.contact?.name ?? "—"}
                      <span className="ml-2 font-body text-xs font-normal text-muted-foreground">{formatDate(d.issued_date)}</span>
                    </span>
                    <span className="hidden font-body text-xs text-muted-foreground sm:block">
                      {d.claimable ? `ใบกำกับ ${d.received_tax_invoice_number}` : Number(d.vat_amount) > 0 ? "ไม่มีใบกำกับภาษี" : "ไม่มี VAT"}
                    </span>
                    <span className="col-start-2 row-span-2 row-start-1 self-center text-right font-mono text-sm tabular-nums text-foreground sm:col-start-auto sm:row-span-1 sm:row-start-auto">
                      {money(tab === "unpaid" ? d.outstanding : d.net_amount)}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  );
}

function Sum({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div>
      <dt className="text-muted-foreground">{label}</dt>
      <dd className={cn("font-mono tabular-nums text-foreground", strong && "font-semibold")}>{money(value)}</dd>
    </div>
  );
}
