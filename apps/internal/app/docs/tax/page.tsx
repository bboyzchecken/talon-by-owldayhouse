"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Suspense, useState } from "react";
import { CalendarCheck, ChevronLeft, ChevronRight, Settings2 } from "lucide-react";
import { Button, cn } from "@odh/ui";
import { Evidence } from "@/components/docs/payments-panel";
import { Alert, Field, Input, Panel, Spinner } from "@/components/odh";
import { ApiError, tax } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { eventLabels, money, todayISO } from "@/lib/docs";
import { formatDate } from "@/lib/format";
import type { TaxFormView, TaxLine, TaxSettings } from "@/lib/types";

const monthName = new Intl.DateTimeFormat("th-TH", { month: "long", year: "numeric", calendar: "gregory", numberingSystem: "latn" });
const monthTitle = (month: string) => monthName.format(new Date(`${month}-01T00:00:00`));
const shift = (month: string, n: number) => {
  const [y, m] = month.split("-").map(Number);
  const d = new Date(Date.UTC(y!, m! - 1 + n, 1));
  return d.toISOString().slice(0, 7);
};

const lineKinds: Record<TaxLine["kind"], string> = {
  output: "ใบกำกับภาษีขาย",
  credit_note: "ใบลดหนี้",
  debit_note: "ใบเพิ่มหนี้",
  input: "ใบกำกับภาษีซื้อ",
  withheld: "จ่ายเงินและหัก ณ ที่จ่าย",
};

export default function TaxPage() {
  return (
    <Suspense fallback={<Spinner />}>
      <TaxMonthPage />
    </Suspense>
  );
}

/** ภ.พ.30 / ภ.ง.ด.3 / ภ.ง.ด.53 of one month: the figures, the documents behind them, and "filed" with the receipt (admin). */
function TaxMonthPage() {
  const { isAdmin, loading } = useAuth();
  const params = useSearchParams();
  const [month, setMonth] = useState(() => params.get("month") ?? shift(todayISO().slice(0, 7), -1));
  const [showSettings, setShowSettings] = useState(false);
  const data = useQuery({ queryKey: ["docs", "tax", month], queryFn: () => tax.month(month), enabled: isAdmin });

  if (loading) return <Spinner />;
  if (!isAdmin) return <Alert tone="stop">หน้านี้เปิดได้เฉพาะแอดมิน</Alert>;

  const current = todayISO().slice(0, 7);
  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold text-foreground sm:text-3xl">ภาษีรายเดือน</h1>
          <p className="mt-1 max-w-2xl font-body text-sm text-muted-foreground">
            ยอดที่ต้องยื่นของแต่ละเดือน คำนวณจากเอกสารและรายการเงินที่บันทึกไว้ ระบบไม่ยื่นและไม่จ่ายเอง ยื่นที่เว็บกรมสรรพากรแล้วกลับมากดบันทึกพร้อมแนบใบเสร็จ
          </p>
        </div>
        <Button size="sm" variant="line" onClick={() => setShowSettings((v) => !v)} aria-expanded={showSettings}>
          <Settings2 className="size-4" aria-hidden /> ตั้งค่า
        </Button>
      </header>

      {showSettings && data.data ? (
        <SettingsPanel settings={data.data.settings} start={data.data.first_period} onDone={() => setShowSettings(false)} />
      ) : null}

      <div className="flex items-center gap-1">
        <button type="button" onClick={() => setMonth(shift(month, -1))} className="rounded-full p-2 text-muted-foreground hover:bg-primary/5 hover:text-primary" aria-label="เดือนก่อน">
          <ChevronLeft className="size-4" aria-hidden />
        </button>
        <h2 className="min-w-40 text-center font-display text-lg font-semibold text-foreground">งวด {monthTitle(month)}</h2>
        <button
          type="button"
          onClick={() => setMonth(shift(month, 1))}
          disabled={month >= current}
          className="rounded-full p-2 text-muted-foreground hover:bg-primary/5 hover:text-primary disabled:opacity-30"
          aria-label="เดือนถัดไป"
        >
          <ChevronRight className="size-4" aria-hidden />
        </button>
        <Input type="month" className="ml-auto w-44 py-2" value={month} max={current} onChange={(e) => e.target.value && setMonth(e.target.value)} aria-label="เลือกงวด" />
      </div>

      {data.error ? <Alert tone="stop">{(data.error as Error).message}</Alert> : null}
      {data.isLoading ? <Spinner /> : null}
      {data.data && month < data.data.first_period ? (
        <Alert>งวดนี้อยู่ก่อนงวดแรกที่ใช้ระบบนี้ ({monthTitle(data.data.first_period)}) ยื่นจากที่อื่นแล้ว ตัวเลขแสดงไว้ดูเท่านั้น</Alert>
      ) : null}
      {data.data?.forms.map((view) => <FormCard key={view.form} view={view} />)}
    </div>
  );
}

function FormCard({ view }: { view: TaxFormView }) {
  const filed = view.filing?.status === "filed";
  const f = view.figures;
  const isVat = view.form === "pp30";
  const [showLines, setShowLines] = useState(false);
  return (
    <Panel
      title={
        <span className="flex flex-wrap items-center gap-2">
          {view.label}
          <Badge view={view} />
        </span>
      }
    >
      {!view.required && !filed && !view.before_first ? (
        <p className="font-body text-sm text-muted-foreground">ไม่มีการหัก ณ ที่จ่ายในเดือนนี้ ไม่ต้องยื่น</p>
      ) : (
        <>
          <dl className="grid grid-cols-2 gap-3 font-body text-sm sm:grid-cols-4">
            {isVat ? (
              <>
                <Sum label="ภาษีขาย" value={f.output_vat} />
                <Sum label="ภาษีซื้อ" value={f.input_vat} />
                <Sum label="เครดิตยกมา" value={f.credit_brought_forward} />
                {Number(f.credit_carried) > 0 ? (
                  <Sum label="เครดิตยกไปเดือนหน้า" value={f.credit_carried} strong />
                ) : (
                  <Sum label="ต้องชำระ" value={f.tax_amount} strong />
                )}
              </>
            ) : (
              <>
                <Sum label="ภาษีที่หักไว้" value={f.tax_amount} strong />
                <div>
                  <dt className="text-muted-foreground">จำนวนรายการ</dt>
                  <dd className="font-mono tabular-nums text-foreground">{f.line_count}</dd>
                </div>
              </>
            )}
          </dl>
          <p className="mt-3 font-body text-xs text-muted-foreground">
            กำหนดยื่น: กระดาษ {formatDate(view.due_date)} · ออนไลน์ {formatDate(view.efiling_due_date)}
          </p>

          {view.filing && view.filing.status !== "filed" && (view.filing.sent_at || view.filing.due_set_at) ? (
            <p className="mt-2 font-body text-xs text-muted-foreground">
              {view.filing.sent_at ? `ส่งข้อมูลให้สำนักบัญชีแล้ว ${formatDate(view.filing.sent_at)}` : ""}
              {view.filing.due_set_at ? ` · ยอดตาม QR ${money(view.filing.due_amount)} บาท` : " · รอ QR จากบัญชี"}
            </p>
          ) : null}

          {view.differs && view.filing ? (
            <div className="mt-3">
              <Alert>
                ยอดคำนวณใหม่ไม่ตรงกับที่ยื่น — ยื่นไว้ {money(view.filing.tax_amount)} บาท
                {isVat ? ` (ภาษีขาย ${money(view.filing.output_vat)} ภาษีซื้อ ${money(view.filing.input_vat)})` : ""}
                {" "}ตอนนี้คำนวณได้ {money(f.tax_amount)} บาท มีการแก้รายการหลังยื่น ให้นักบัญชีดูว่าต้องยื่นเพิ่มเติมหรือไม่
              </Alert>
            </div>
          ) : null}

          {filed && view.filing ? <FiledBlock view={view} /> : view.closed && !view.before_first ? <FileForm view={view} /> : null}
          {!view.closed ? <p className="mt-3 font-body text-xs text-muted-foreground">เดือนนี้ยังไม่จบ ยื่นได้หลังสิ้นเดือน</p> : null}

          <button type="button" className="mt-4 font-body text-sm text-primary underline" onClick={() => setShowLines((v) => !v)} aria-expanded={showLines}>
            {showLines ? "ซ่อนรายการ" : `ดูรายการที่นับ (${view.lines.length})`}
          </button>
          {showLines ? <Lines lines={view.lines} /> : null}
        </>
      )}
    </Panel>
  );
}

function Badge({ view }: { view: TaxFormView }) {
  const filed = view.filing?.status === "filed";
  const overdue = !filed && view.required && view.closed && view.efiling_due_date < todayISO();
  const text = filed ? "ยื่นแล้ว" : !view.required ? "ไม่ต้องยื่น" : overdue ? "เลยกำหนด" : view.closed ? "รอยื่น" : "เดือนนี้";
  return (
    <span
      className={cn(
        "rounded-full px-2.5 py-0.5 font-mono text-[11px] font-normal",
        filed ? "bg-primary text-primary-foreground" : overdue ? "bg-foreground text-background" : "border border-border text-muted-foreground",
      )}
    >
      {text}
    </span>
  );
}

function FiledBlock({ view }: { view: TaxFormView }) {
  const filing = view.filing!;
  const queryClient = useQueryClient();
  const [reopening, setReopening] = useState(false);
  const [reason, setReason] = useState("");
  const reopen = useMutation({
    mutationFn: () => tax.reopen(filing.id, reason),
    onSuccess: async () => {
      setReopening(false);
      setReason("");
      await queryClient.invalidateQueries({ queryKey: ["docs", "tax"] });
    },
    meta: { success: "เปิดแก้ไขงวดแล้ว" },
  });
  return (
    <div className="mt-4 space-y-3 rounded-xl border border-border p-3">
      <p className="flex flex-wrap items-center gap-2 font-body text-sm text-foreground">
        <CalendarCheck className="size-4 text-primary" aria-hidden />
        ยื่นแล้ว {filing.paid_date ? formatDate(filing.paid_date) : ""} · ชำระ {money(filing.paid_amount)} บาท
        {filing.reference ? ` · อ้างอิง ${filing.reference}` : ""}
        {filing.filer ? ` · บันทึกโดย ${filing.filer.name}` : ""}
      </p>
      {filing.note ? <p className="font-body text-xs text-muted-foreground">{filing.note}</p> : null}
      <Evidence ownerType="tax_filing" ownerId={filing.id} label="ใบเสร็จ/หลักฐานการยื่น" />
      {view.events.length > 0 ? (
        <ul className="space-y-1 font-body text-xs text-muted-foreground">
          {view.events.map((e) => (
            <li key={e.id}>
              {formatDate(e.created_at)} · {eventLabels[e.action] ?? e.action} · {e.user?.name ?? ""} — {e.note}
            </li>
          ))}
        </ul>
      ) : null}
      {reopening ? (
        <div className="flex flex-wrap gap-2">
          <Input className="min-w-0 flex-1 py-2 text-sm" placeholder="เหตุผล เช่น ยื่นเพิ่มเติม" value={reason} maxLength={400} onChange={(e) => setReason(e.target.value)} aria-label="เหตุผลที่เปิดแก้ไข" />
          <Button size="sm" disabled={!reason.trim() || reopen.isPending} onClick={() => reopen.mutate()}>
            ยืนยันเปิดแก้ไข
          </Button>
          <Button size="sm" variant="line" onClick={() => setReopening(false)}>
            ไม่เปิด
          </Button>
        </div>
      ) : (
        <button type="button" className="font-body text-xs text-muted-foreground underline" onClick={() => setReopening(true)}>
          เปิดแก้ไขงวดนี้ (บันทึกผิด หรือจะยื่นเพิ่มเติม)
        </button>
      )}
      {reopen.error ? <Alert tone="stop">{(reopen.error as ApiError).message}</Alert> : null}
    </div>
  );
}

/** Attach the receipt, then say it was filed. The row is opened on the first visit to this form. */
function FileForm({ view }: { view: TaxFormView }) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [paidAmount, setPaidAmount] = useState(view.filing?.due_set_at ? view.filing.due_amount : view.figures.tax_amount);
  const [paidDate, setPaidDate] = useState(todayISO());
  const [reference, setReference] = useState("");
  const [note, setNote] = useState("");
  const row = useQuery({
    queryKey: ["docs", "tax", "filing", view.form, view.period],
    queryFn: () => (view.filing ? Promise.resolve(view.filing) : tax.open(view.form, view.period)),
    enabled: open,
  });
  const save = useMutation({
    mutationFn: () => tax.file(row.data!.id, { paid_amount: paidAmount || "0", paid_date: paidDate, reference, note }),
    onSuccess: async () => {
      setOpen(false);
      await queryClient.invalidateQueries({ queryKey: ["docs", "tax"] });
    },
    meta: { success: `บันทึกว่ายื่น ${view.label} แล้ว` },
  });

  if (!open) {
    return (
      <div className="mt-4">
        <Button size="sm" onClick={() => setOpen(true)}>
          บันทึกว่ายื่น/ชำระแล้ว
        </Button>
      </div>
    );
  }
  return (
    <div className="mt-4 space-y-3 rounded-xl border border-border p-3">
      {row.isLoading ? <Spinner /> : null}
      {row.error ? <Alert tone="stop">{(row.error as Error).message}</Alert> : null}
      {row.data ? (
        <>
          <div className="grid gap-3 sm:grid-cols-3">
            <Field label="วันที่ยื่น/ชำระ" required>
              <Input type="date" value={paidDate} max={todayISO()} onChange={(e) => setPaidDate(e.target.value)} />
            </Field>
            <Field label="ยอดที่ชำระจริง" hint="รวมเงินเพิ่ม/เบี้ยปรับ ถ้ามี">
              <Input inputMode="decimal" value={paidAmount} onChange={(e) => setPaidAmount(e.target.value)} />
            </Field>
            <Field label="เลขอ้างอิงจากกรมสรรพากร">
              <Input value={reference} maxLength={100} onChange={(e) => setReference(e.target.value)} />
            </Field>
          </div>
          <Field label="หมายเหตุ">
            <Input value={note} maxLength={500} onChange={(e) => setNote(e.target.value)} />
          </Field>
          <Evidence ownerType="tax_filing" ownerId={row.data.id} label="ใบเสร็จ/หลักฐานการยื่น" />
          <p className="font-body text-xs text-muted-foreground">
            ตอนกดบันทึก ระบบล็อกยอดของงวดนี้ไว้ ถ้ามีคนแก้รายการในงวดทีหลัง ยอดที่ยื่นจะไม่เปลี่ยน แต่จะขึ้นป้ายว่าไม่ตรง
          </p>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" disabled={!paidDate || save.isPending} onClick={() => save.mutate()}>
              {save.isPending ? "กำลังบันทึก…" : "บันทึกว่ายื่นแล้ว"}
            </Button>
            <Button size="sm" variant="line" onClick={() => setOpen(false)}>
              ยกเลิก
            </Button>
          </div>
          {save.error ? <Alert tone="stop">{(save.error as ApiError).message}</Alert> : null}
        </>
      ) : null}
    </div>
  );
}

function Lines({ lines }: { lines: TaxLine[] }) {
  if (lines.length === 0) return <p className="mt-2 font-body text-sm text-muted-foreground">ไม่มีรายการ</p>;
  return (
    <div className="mt-2 overflow-x-auto">
      <table className="w-full min-w-[560px] font-body text-sm">
        <thead>
          <tr className="border-b border-border text-left font-display text-xs text-muted-foreground">
            <th className="py-2 pr-3 font-semibold">วันที่</th>
            <th className="py-2 pr-3 font-semibold">เอกสาร</th>
            <th className="py-2 pr-3 font-semibold">คู่ค้า</th>
            <th className="py-2 pr-3 text-right font-semibold">ฐาน</th>
            <th className="py-2 text-right font-semibold">ภาษี</th>
          </tr>
        </thead>
        <tbody>
          {lines.map((l, i) => (
            <tr key={`${l.kind}-${l.document_id}-${l.payment_id ?? ""}-${i}`} className="border-b border-border last:border-0">
              <td className="py-2 pr-3 text-muted-foreground">{formatDate(l.date)}</td>
              <td className="py-2 pr-3">
                <Link href={`/docs/detail/?id=${l.document_id}`} className="font-mono text-xs text-primary underline">
                  {l.code}
                </Link>
                <div className="text-xs text-muted-foreground">
                  {lineKinds[l.kind]}
                  {l.invoice_no ? ` · ใบกำกับ ${l.invoice_no}` : ""}
                  {l.kind === "withheld" ? (l.wht_cert_done ? " · ส่ง 50 ทวิ แล้ว" : " · ยังไม่ส่ง 50 ทวิ") : ""}
                </div>
              </td>
              <td className="py-2 pr-3">
                {l.name}
                {l.tax_number ? <div className="font-mono text-xs text-muted-foreground">{l.tax_number}</div> : null}
              </td>
              <td className="py-2 pr-3 text-right font-mono tabular-nums">{money(l.base)}</td>
              <td className="py-2 text-right font-mono tabular-nums">{money(l.amount)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function SettingsPanel({ settings, start, onDone }: { settings: TaxSettings; start: string; onDone: () => void }) {
  const queryClient = useQueryClient();
  const [first, setFirst] = useState(settings.first_period || start);
  const [opening, setOpening] = useState(settings.opening_vat_credit);
  const [extra, setExtra] = useState(String(settings.efiling_extra_days));
  const save = useMutation({
    mutationFn: () => tax.saveSettings({ first_period: first, opening_vat_credit: opening || "0", efiling_extra_days: Number(extra) }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["docs", "tax"] });
      onDone();
    },
    meta: { success: "บันทึกการตั้งค่าภาษีแล้ว" },
  });
  return (
    <Panel title="ตั้งค่าภาษีรายเดือน">
      {!settings.first_period ? (
        <div className="mb-3">
          <Alert>ยังไม่ได้ตั้งงวดแรก ระบบใช้เดือนแรกที่มีรายการภาษี ({monthTitle(start)}) ไปก่อน ตั้งเป็นงวดถัดจากงวดสุดท้ายที่ยื่นจากที่อื่น</Alert>
        </div>
      ) : null}
      <div className="grid gap-3 sm:grid-cols-3">
        <Field label="งวดแรกที่ใช้ระบบนี้" hint="งวดก่อนหน้านี้ถือว่ายื่นจากที่อื่นแล้ว">
          <Input type="month" value={first} onChange={(e) => setFirst(e.target.value)} />
        </Field>
        <Field label="เครดิต VAT ยกมาเข้างวดแรก" hint="จาก ภ.พ.30 งวดสุดท้ายที่ยื่นจากที่อื่น">
          <Input inputMode="decimal" value={opening} onChange={(e) => setOpening(e.target.value)} />
        </Field>
        <Field label="ยื่นออนไลน์ได้ช้ากว่ากี่วัน" hint="กรมสรรพากรขยายเป็นรอบ ๆ ตรวจทุกปี">
          <Input type="number" min={0} max={31} value={extra} onChange={(e) => setExtra(e.target.value)} />
        </Field>
      </div>
      <div className="mt-3 flex gap-2">
        <Button size="sm" disabled={save.isPending} onClick={() => save.mutate()}>
          บันทึก
        </Button>
        <Button size="sm" variant="line" onClick={onDone}>
          ปิด
        </Button>
      </div>
      {save.error ? (
        <div className="mt-3">
          <Alert tone="stop">{(save.error as ApiError).message}</Alert>
        </div>
      ) : null}
    </Panel>
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
