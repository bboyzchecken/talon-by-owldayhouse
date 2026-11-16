"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Suspense, useState, type ReactNode } from "react";
import {
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  ChevronLeft,
  ChevronRight,
  Download,
  FileWarning,
  Landmark,
  Receipt,
  Send,
} from "lucide-react";
import { Button, cn } from "@odh/ui";
import {
  AgingBar,
  BarList,
  IncomeExpenseChart,
  monthLong,
} from "@/components/docs/finance-charts";
import { Alert, Input, Panel, Spinner } from "@/components/odh";
import { ApiError, finance } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { docTypeLabels, money, todayISO } from "@/lib/docs";
import { formatDate } from "@/lib/format";
import { interestLabels } from "@/lib/labels";
import type {
  Aging,
  FinanceOverview,
  MonthTotals,
  TaxFormView,
} from "@/lib/types";

const num = (v: string | number) => Number(v) || 0;
const shift = (month: string, n: number) => {
  const [y, m] = month.split("-").map(Number);
  return new Date(Date.UTC(y!, m! - 1 + n, 1)).toISOString().slice(0, 7);
};

export default function FinancePage() {
  return (
    <Suspense fallback={<Spinner />}>
      <FinanceOverviewPage />
    </Suspense>
  );
}

/**
 * The finance overview (admin): what to chase first, the month against the
 * one before, twelve months of revenue and expenses, what is owed both ways,
 * the month's tax, and where the money came from — PEAK's dashboard, on our
 * own documents. Every figure is defined in models.FinanceStore.
 */
function FinanceOverviewPage() {
  const { isAdmin, loading } = useAuth();
  const params = useSearchParams();
  const current = todayISO().slice(0, 7);
  const [month, setMonth] = useState(() => params.get("month") ?? current);
  const data = useQuery({
    queryKey: ["docs", "finance", month],
    queryFn: () => finance.overview(month),
    enabled: isAdmin,
  });
  const exportMonth = useMutation({
    mutationFn: () => finance.exportMonth(month),
    meta: { success: "ดาวน์โหลดไฟล์ส่งสำนักบัญชีแล้ว" },
  });

  if (loading) return <Spinner />;
  if (!isAdmin) return <Alert tone="stop">หน้านี้เปิดได้เฉพาะแอดมิน</Alert>;
  const d = data.data;

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-semibold text-foreground sm:text-3xl">
            ภาพรวมการเงิน
          </h1>
          <p className="mt-1 max-w-2xl font-body text-sm text-muted-foreground">
            รายได้ ค่าใช้จ่าย ยอดค้างรับ-ค้างจ่าย และภาษี
            จากเอกสารและรายการเงินในระบบ ยอดค้างนับถึงวันนี้
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center">
            <button
              type="button"
              onClick={() => setMonth(shift(month, -1))}
              className="rounded-full p-2 text-muted-foreground hover:bg-primary/5 hover:text-primary"
              aria-label="เดือนก่อน"
            >
              <ChevronLeft className="size-4" aria-hidden />
            </button>
            <Input
              type="month"
              className="w-44 py-2"
              value={month}
              max={current}
              onChange={(e) => e.target.value && setMonth(e.target.value)}
              aria-label="เดือน"
            />
            <button
              type="button"
              onClick={() => setMonth(shift(month, 1))}
              disabled={month >= current}
              className="rounded-full p-2 text-muted-foreground hover:bg-primary/5 hover:text-primary disabled:opacity-30"
              aria-label="เดือนถัดไป"
            >
              <ChevronRight className="size-4" aria-hidden />
            </button>
          </div>
          <Button
            size="sm"
            variant="line"
            onClick={() => exportMonth.mutate()}
            disabled={exportMonth.isPending}
          >
            <Download className="size-4" aria-hidden />{" "}
            {exportMonth.isPending ? "กำลังเตรียมไฟล์…" : "ไฟล์ส่งสำนักบัญชี"}
          </Button>
        </div>
      </header>
      {exportMonth.error ? (
        <Alert tone="stop">{(exportMonth.error as ApiError).message}</Alert>
      ) : null}
      {data.error ? (
        <Alert tone="stop">{(data.error as Error).message}</Alert>
      ) : null}
      {data.isLoading || !d ? (
        <Spinner />
      ) : (
        <>
          <FollowUps d={d} />
          <MonthTiles d={d} />
          <Panel
            title={`รายได้และค่าใช้จ่าย 12 เดือน ถึง ${monthLong(d.month)}`}
          >
            <IncomeExpenseChart series={d.series} selected={d.month} />
            <YearLine
              ytd={d.ytd}
              lastYtd={d.last_ytd}
              year={d.month.slice(0, 4)}
            />
          </Panel>
          <div className="grid gap-6 [&>*]:min-w-0 lg:grid-cols-2">
            <OwedPanel
              title="ลูกหนี้ค้างรับ"
              sub="ใบแจ้งหนี้และใบวางบิลที่ยังเก็บเงินไม่ครบ"
              aging={d.receivables}
              empty="ไม่มียอดค้างรับ"
            />
            <OwedPanel
              title="เจ้าหนี้ค้างจ่าย"
              sub="รายจ่ายที่ยังจ่ายผู้ขายไม่ครบ"
              aging={d.payables}
              empty="ไม่มียอดค้างจ่าย"
            />
          </div>
          <TaxPanel forms={d.tax} month={d.month} />
          <div className="grid gap-6 [&>*]:min-w-0 lg:grid-cols-2">
            <Panel title={`รายได้ตามบริการ · ปี ${d.month.slice(0, 4)}`}>
              <BarList
                label="รายได้ตามบริการ"
                rows={d.services.map((s) => ({
                  key: s.key,
                  name:
                    interestLabels[s.key as keyof typeof interestLabels] ??
                    "อื่น ๆ / ไม่ได้ผูกบริการ",
                  amount: s.amount,
                }))}
              />
              <p className="mt-3 font-body text-xs text-muted-foreground">
                แบ่งตามบริการของรายการขายในใบแจ้งหนี้ที่ใบเสร็จอ้างถึง
                บรรทัดที่ไม่ได้เลือกจากทะเบียนสินค้า/บริการนับเป็น “อื่น ๆ”
              </p>
            </Panel>
            <Panel title={`ลูกค้าที่รายได้สูงสุด · ปี ${d.month.slice(0, 4)}`}>
              <BarList
                label="ลูกค้าที่รายได้สูงสุด"
                rows={d.customers.map((c) => ({
                  key: String(c.id),
                  name: c.name || "—",
                  amount: c.amount,
                }))}
              />
            </Panel>
          </div>
          <div className="grid gap-6 [&>*]:min-w-0 xl:grid-cols-[3fr_2fr]">
            <JobsPanel d={d} />
            <MethodsPanel d={d} />
          </div>
          <Definitions />
        </>
      )}
    </div>
  );
}

function FollowUps({ d }: { d: FinanceOverview }) {
  const f = d.follow_up;
  const items: {
    show: boolean;
    icon: ReactNode;
    title: string;
    detail: string;
    href: string;
  }[] = [
    {
      show: f.overdue_invoices.count > 0,
      icon: <AlertTriangle className="size-4" aria-hidden />,
      title: `ใบแจ้งหนี้เกินกำหนด ${f.overdue_invoices.count} ใบ`,
      detail: `${money(f.overdue_invoices.amount)} บาท`,
      href: "#receivables",
    },
    {
      show: f.wht_to_receive.count > 0,
      icon: <Receipt className="size-4" aria-hidden />,
      title: `รอ 50 ทวิ จากลูกค้า ${f.wht_to_receive.count} ใบ`,
      detail: `ภาษีที่ถูกหัก ${money(f.wht_to_receive.amount)} บาท ใช้เป็นเครดิตได้เมื่อได้หนังสือรับรอง`,
      href: "/docs/payments",
    },
    {
      show: f.wht_to_send.count > 0,
      icon: <Send className="size-4" aria-hidden />,
      title: `ต้องส่ง 50 ทวิ ให้ผู้รับเงิน ${f.wht_to_send.count} ใบ`,
      detail: `ภาษีที่เราหัก ${money(f.wht_to_send.amount)} บาท`,
      href: "/docs/expenses",
    },
    {
      show: f.no_tax_invoice.count > 0,
      icon: <FileWarning className="size-4" aria-hidden />,
      title: `รายจ่ายไม่มีใบกำกับภาษี ${f.no_tax_invoice.count} ใบ`,
      detail: `ภาษีซื้อ ${money(f.no_tax_invoice.amount)} บาท ยังเอามาหักไม่ได้`,
      href: "/docs/expenses",
    },
    ...f.tax_due.map((t) => ({
      show: true,
      icon: <Landmark className="size-4" aria-hidden />,
      title: `${t.label} งวด ${t.period.slice(5)}/${t.period.slice(0, 4)} ${t.days_left < 0 ? "เลยกำหนด" : `อีก ${t.days_left} วัน`}`,
      detail:
        num(t.tax_amount) > 0
          ? `ต้องชำระ ${money(t.tax_amount)} บาท · ออนไลน์ภายใน ${formatDate(t.efiling_due_date)}`
          : `ออนไลน์ภายใน ${formatDate(t.efiling_due_date)}`,
      href: `/docs/tax/?month=${t.period}`,
    })),
  ].filter((i) => i.show);

  if (items.length === 0) {
    return (
      <p className="rounded-2xl border border-border bg-card px-4 py-3 font-body text-sm text-muted-foreground">
        ไม่มีเรื่องค้างที่ต้องตาม
      </p>
    );
  }
  return (
    <section aria-labelledby="follow-title">
      <h2
        id="follow-title"
        className="font-display text-sm font-semibold text-foreground"
      >
        ต้องตาม ({items.length})
      </h2>
      <ul className="mt-2 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
        {items.map((i) => (
          <li key={i.title}>
            <Link
              href={i.href}
              className="flex h-full items-start gap-3 rounded-2xl border border-gold bg-notice px-4 py-3 transition-colors hover:border-primary"
            >
              <span className="mt-0.5 text-primary">{i.icon}</span>
              <span className="min-w-0">
                <span className="block font-display text-sm font-semibold text-primary">
                  {i.title}
                </span>
                <span className="block font-body text-xs text-primary/80">
                  {i.detail}
                </span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

function Delta({
  now,
  before,
  invert,
}: {
  now: number;
  before: number;
  invert?: boolean;
}) {
  if (before === 0 && now === 0) return <span>เท่ากับเดือนก่อน</span>;
  if (before === 0) return <span>เดือนก่อนไม่มียอด</span>;
  const pct = ((now - before) / Math.abs(before)) * 100;
  const up = pct >= 0;
  const Icon = up ? ArrowUpRight : ArrowDownRight;
  // Words carry the meaning; the arrow only shows direction.
  return (
    <span className="inline-flex items-center gap-0.5">
      <Icon className="size-3.5" aria-hidden />
      {up ? "เพิ่ม" : "ลด"}{" "}
      {Math.abs(pct).toFixed(pct > -10 && pct < 10 ? 1 : 0)}% จากเดือนก่อน
      <span className="sr-only">
        {invert ? (up ? " (จ่ายมากขึ้น)" : " (จ่ายน้อยลง)") : ""}
      </span>
    </span>
  );
}

function MonthTiles({ d }: { d: FinanceOverview }) {
  const t = d.this_month;
  const l = d.last_month;
  const profit = num(t.revenue) - num(t.expense);
  const lastProfit = num(l.revenue) - num(l.expense);
  const margin = num(t.revenue) > 0 ? (profit / num(t.revenue)) * 100 : null;
  const tiles: {
    label: string;
    value: number;
    before: number;
    key?: boolean;
    sub?: ReactNode;
    invert?: boolean;
  }[] = [
    {
      label: "กำไรขั้นต้น",
      value: profit,
      before: lastProfit,
      key: true,
      sub: margin !== null ? `${margin.toFixed(1)}% ของรายได้` : undefined,
    },
    {
      label: "รายได้ (ก่อน VAT)",
      value: num(t.revenue),
      before: num(l.revenue),
    },
    {
      label: "ค่าใช้จ่าย",
      value: num(t.expense),
      before: num(l.expense),
      invert: true,
    },
    { label: "เงินเข้า", value: num(t.cash_in), before: num(l.cash_in) },
    {
      label: "เงินออก",
      value: num(t.cash_out),
      before: num(l.cash_out),
      invert: true,
    },
  ];
  return (
    <section aria-label={`ตัวเลขเดือน ${monthLong(d.month)}`}>
      <h2 className="font-display text-sm font-semibold text-foreground">
        เดือน {monthLong(d.month)}
      </h2>
      <div className="mt-2 grid grid-cols-2 gap-3 lg:grid-cols-5">
        {tiles.map((tile) => (
          <div
            key={tile.label}
            className={cn(
              "rounded-2xl border p-4",
              tile.key
                ? "col-span-2 border-primary bg-primary text-primary-foreground lg:col-span-1"
                : "border-border bg-card text-foreground",
            )}
          >
            <div
              className={cn(
                "font-mono text-[11px] tracking-wide",
                tile.key
                  ? "text-primary-foreground/70"
                  : "text-muted-foreground",
              )}
            >
              {tile.label}
            </div>
            <div className="mt-1 font-display text-2xl font-semibold tabular-nums">
              {money(tile.value)}
            </div>
            <div
              className={cn(
                "mt-1 space-y-0.5 font-body text-xs",
                tile.key
                  ? "text-primary-foreground/80"
                  : "text-muted-foreground",
              )}
            >
              {tile.sub ? <div>{tile.sub}</div> : null}
              <Delta
                now={tile.value}
                before={tile.before}
                invert={tile.invert}
              />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function YearLine({
  ytd,
  lastYtd,
  year,
}: {
  ytd: MonthTotals;
  lastYtd: MonthTotals;
  year: string;
}) {
  const profit = num(ytd.revenue) - num(ytd.expense);
  const lastRevenue = num(lastYtd.revenue);
  return (
    <dl className="mt-4 grid grid-cols-2 gap-3 border-t border-border pt-4 font-body text-sm sm:grid-cols-4">
      <div>
        <dt className="text-muted-foreground">
          รายได้ทั้งปี {year} ถึงเดือนนี้
        </dt>
        <dd className="font-mono tabular-nums text-foreground">
          {money(ytd.revenue)}
        </dd>
      </div>
      <div>
        <dt className="text-muted-foreground">ค่าใช้จ่ายทั้งปี</dt>
        <dd className="font-mono tabular-nums text-foreground">
          {money(ytd.expense)}
        </dd>
      </div>
      <div>
        <dt className="text-muted-foreground">กำไรขั้นต้นทั้งปี</dt>
        <dd className="font-mono font-semibold tabular-nums text-foreground">
          {money(profit)}
        </dd>
      </div>
      <div>
        <dt className="text-muted-foreground">เทียบช่วงเดียวกันปีก่อน</dt>
        <dd className="font-body text-foreground">
          {lastRevenue > 0
            ? `รายได้ ${num(ytd.revenue) >= lastRevenue ? "เพิ่ม" : "ลด"} ${Math.abs(((num(ytd.revenue) - lastRevenue) / lastRevenue) * 100).toFixed(1)}%`
            : "ปีก่อนยังไม่มีข้อมูลในระบบ"}
        </dd>
      </div>
    </dl>
  );
}

function OwedPanel({
  title,
  sub,
  aging,
  empty,
}: {
  title: string;
  sub: string;
  aging: Aging;
  empty: string;
}) {
  return (
    <section id={title === "ลูกหนี้ค้างรับ" ? "receivables" : "payables"}>
      <Panel
        title={
          <span className="flex flex-wrap items-baseline justify-between gap-2">
            <span>{title}</span>
            <span className="font-mono text-base tabular-nums">
              {money(aging.total)}
            </span>
          </span>
        }
      >
        <p className="-mt-1 mb-3 font-body text-xs text-muted-foreground">
          {sub} · {aging.count} ใบ
          {aging.overdue.count > 0
            ? ` · เกินกำหนด ${aging.overdue.count} ใบ ${money(aging.overdue.amount)} บาท`
            : ""}
        </p>
        {aging.count === 0 ? (
          <p className="font-body text-sm text-muted-foreground">{empty}</p>
        ) : (
          <>
            <AgingBar aging={aging} />
            <h3 className="mt-4 font-display text-xs font-semibold text-muted-foreground">
              ค้างนานที่สุด
            </h3>
            <ul className="mt-1 divide-y divide-border">
              {aging.items.map((it) => (
                <li key={it.id}>
                  <Link
                    href={`/docs/detail/?id=${it.id}`}
                    className="grid grid-cols-[minmax(0,1fr)_auto] gap-x-3 py-2 hover:bg-muted"
                  >
                    <span className="truncate font-body text-sm text-foreground">
                      {it.contact_name}
                      <span className="ml-2 font-mono text-xs text-muted-foreground">
                        {it.code}
                      </span>
                    </span>
                    <span className="text-right font-mono text-sm tabular-nums text-foreground">
                      {money(it.outstanding)}
                    </span>
                    <span className="font-body text-xs text-muted-foreground">
                      {docTypeLabels[it.doc_type]} ·{" "}
                      {it.due_date
                        ? `ครบกำหนด ${formatDate(it.due_date)}`
                        : `ลงวันที่ ${formatDate(it.issued_date)}`}
                    </span>
                    <span
                      className={cn(
                        "text-right font-body text-xs",
                        it.days_late > 0
                          ? "font-semibold text-foreground"
                          : "text-muted-foreground",
                      )}
                    >
                      {it.days_late > 0
                        ? `เกิน ${it.days_late} วัน`
                        : "ยังไม่ถึงกำหนด"}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </>
        )}
      </Panel>
    </section>
  );
}

function TaxPanel({ forms, month }: { forms: TaxFormView[]; month: string }) {
  const vat = forms.find((f) => f.form === "pp30");
  return (
    <Panel
      title={
        <span className="flex flex-wrap items-baseline justify-between gap-2">
          <span>ภาษีงวด {monthLong(month)}</span>
          <Link
            href={`/docs/tax/?month=${month}`}
            className="font-body text-sm font-normal text-primary underline"
          >
            เปิดหน้าภาษีรายเดือน
          </Link>
        </span>
      }
    >
      <div className="grid gap-4 md:grid-cols-[2fr_1fr_1fr]">
        {vat ? (
          <div className="rounded-xl border border-border p-3">
            <TaxHead view={vat} />
            <dl className="mt-2 grid grid-cols-2 gap-2 font-body text-sm sm:grid-cols-4">
              <Fig label="ภาษีขาย" value={vat.figures.output_vat} />
              <Fig label="ภาษีซื้อ" value={vat.figures.input_vat} />
              <Fig
                label="เครดิตยกมา"
                value={vat.figures.credit_brought_forward}
              />
              {num(vat.figures.credit_carried) > 0 ? (
                <Fig
                  label="เครดิตยกไป"
                  value={vat.figures.credit_carried}
                  strong
                />
              ) : (
                <Fig label="ต้องชำระ" value={vat.figures.tax_amount} strong />
              )}
            </dl>
          </div>
        ) : null}
        {forms
          .filter((f) => f.form !== "pp30")
          .map((f) => (
            <div key={f.form} className="rounded-xl border border-border p-3">
              <TaxHead view={f} />
              <dl className="mt-2 font-body text-sm">
                <Fig
                  label={`ภาษีที่หัก · ${f.figures.line_count} รายการ`}
                  value={f.figures.tax_amount}
                  strong
                />
              </dl>
            </div>
          ))}
      </div>
    </Panel>
  );
}

function TaxHead({ view }: { view: TaxFormView }) {
  const filed = view.filing?.status === "filed";
  const status = filed
    ? "ยื่นแล้ว"
    : !view.required
      ? "ไม่ต้องยื่น"
      : !view.closed
        ? "เดือนนี้ยังไม่จบ"
        : view.efiling_due_date < todayISO()
          ? "เลยกำหนด"
          : "รอยื่น";
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="font-display text-sm font-semibold text-foreground">
        {view.label}
      </span>
      <span
        className={cn(
          "rounded-full px-2 py-0.5 font-mono text-[11px]",
          filed
            ? "bg-primary text-primary-foreground"
            : status === "เลยกำหนด"
              ? "bg-foreground text-background"
              : "border border-border text-muted-foreground",
        )}
      >
        {status}
      </span>
    </div>
  );
}

function Fig({
  label,
  value,
  strong,
}: {
  label: string;
  value: string;
  strong?: boolean;
}) {
  return (
    <div>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd
        className={cn(
          "font-mono tabular-nums text-foreground",
          strong && "font-semibold",
        )}
      >
        {money(value)}
      </dd>
    </div>
  );
}

function JobsPanel({ d }: { d: FinanceOverview }) {
  return (
    <Panel title={`กำไรขั้นต้นต่องาน · ปี ${d.month.slice(0, 4)}`}>
      {d.jobs.length === 0 ? (
        <p className="font-body text-sm text-muted-foreground">
          ยังไม่มีงานที่ผูกรายได้หรือรายจ่ายไว้
          ผูกรายจ่ายกับลูกค้าในฟอร์มรายจ่าย แล้วงานจะขึ้นที่นี่
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[480px] font-body text-sm [&_td+td]:pl-4 [&_th+th]:pl-4">
            <thead>
              <tr className="border-b border-border text-right font-display text-xs text-muted-foreground">
                <th className="py-2 text-left font-semibold">ลูกค้า/งาน</th>
                <th className="py-2 font-semibold">รายได้</th>
                <th className="py-2 font-semibold">ต้นทุน</th>
                <th className="py-2 font-semibold">กำไรขั้นต้น</th>
                <th className="py-2 font-semibold">%</th>
              </tr>
            </thead>
            <tbody className="font-mono tabular-nums">
              {d.jobs.map((j) => {
                const profit = num(j.amount) - num(j.cost);
                return (
                  <tr
                    key={j.id}
                    className="border-b border-border text-right last:border-0"
                  >
                    <td className="max-w-56 truncate py-2 text-left font-body">
                      <Link
                        href={`/leads/detail/?id=${j.id}`}
                        className="text-foreground underline-offset-2 hover:underline"
                      >
                        {j.name}
                      </Link>
                    </td>
                    <td className="py-2">{money(j.amount)}</td>
                    <td className="py-2">{money(j.cost)}</td>
                    <td className="py-2 font-semibold">{money(profit)}</td>
                    <td className="py-2 text-muted-foreground">
                      {num(j.amount) > 0
                        ? `${((profit / num(j.amount)) * 100).toFixed(0)}%`
                        : "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </Panel>
  );
}

function MethodsPanel({ d }: { d: FinanceOverview }) {
  return (
    <Panel title={`เงินเข้า-ออกตามช่องทาง · ปี ${d.month.slice(0, 4)}`}>
      {d.methods.length === 0 ? (
        <p className="font-body text-sm text-muted-foreground">
          ยังไม่มีรายการเงิน
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[420px] font-body text-sm [&_td+td]:pl-4 [&_th+th]:pl-4">
            <thead>
              <tr className="border-b border-border text-right font-display text-xs text-muted-foreground">
                <th className="py-2 text-left font-semibold">ช่องทาง</th>
                <th className="py-2 font-semibold">เข้า</th>
                <th className="py-2 font-semibold">ออก</th>
                <th className="py-2 font-semibold">สุทธิ</th>
              </tr>
            </thead>
            <tbody className="font-mono tabular-nums">
              {d.methods.map((m) => (
                <tr
                  key={m.id}
                  className="border-b border-border text-right last:border-0"
                >
                  <td className="py-2 text-left font-body">{m.name}</td>
                  <td className="py-2">{money(m.in)}</td>
                  <td className="py-2">{money(m.out)}</td>
                  <td className="py-2 font-semibold">
                    {money(num(m.in) - num(m.out))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <p className="mt-3 font-body text-xs text-muted-foreground">
        ยอดเคลื่อนไหวในระบบ ไม่ใช่ยอดคงเหลือในบัญชีธนาคาร
      </p>
    </Panel>
  );
}

function Definitions() {
  return (
    <details className="rounded-2xl border border-border bg-card px-4 py-3 font-body text-sm text-muted-foreground">
      <summary className="cursor-pointer font-display text-sm font-semibold text-foreground">
        ตัวเลขในหน้านี้นับยังไง
      </summary>
      <ul className="mt-2 list-disc space-y-1 pl-5">
        <li>
          รายได้: ยอดก่อน VAT ของใบเสร็จ/ใบกำกับภาษีที่ออก (ออกหลังได้รับเงิน)
          บวกใบเพิ่มหนี้ หักใบลดหนี้ ตามวันที่เอกสาร
        </li>
        <li>
          ค่าใช้จ่าย: ยอดก่อน VAT ของรายจ่ายที่บันทึก รวม VAT
          ของรายจ่ายที่ไม่มีใบกำกับภาษี (เอามาหักไม่ได้ จึงเป็นต้นทุน)
        </li>
        <li>
          กำไรขั้นต้น: รายได้ − ค่าใช้จ่าย
          ยังไม่รวมเงินเดือนและค่าใช้จ่ายที่ไม่ได้บันทึกในระบบ
          ไม่ใช่กำไรตามงบการเงิน
        </li>
        <li>
          เงินเข้า/ออก: ยอดที่โอนจริงตามวันที่รับ/จ่าย
          (ไม่รวมภาษีที่ถูกหักหรือที่เราหัก)
        </li>
        <li>
          ค้างรับ: ใบแจ้งหนี้และใบวางบิลที่ยังไม่ได้รับเงินครบ
          นับอายุจากวันครบกำหนด (ไม่มีให้นับจากวันที่เอกสาร)
          ใบแจ้งหนี้ที่ทำใบวางบิลแล้วนับที่ใบวางบิล
        </li>
      </ul>
    </details>
  );
}
