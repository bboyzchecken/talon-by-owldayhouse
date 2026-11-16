"use client";

import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Check, ClipboardCopy, Download, FileCheck2, Hourglass, Send } from "lucide-react";
import { Button, cn } from "@odh/ui";
import { monthLong } from "@/components/docs/finance-charts";
import { Evidence } from "@/components/docs/payments-panel";
import { Alert, EmptyState, Input, Panel, Spinner } from "@/components/odh";
import { accounting, ApiError, finance, payments, tax } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { issuer, money, todayISO } from "@/lib/docs";
import { formatDate } from "@/lib/format";
import type { TaxFormView, WhtRequest } from "@/lib/types";

// Working with the accounting firm. The firm does not sign in here: the team
// talks to it on LINE. This page writes the messages to paste there and keeps
// track of what was asked and what came back. Only the firm issues a 50 ทวิ.

const company = issuer.isName.replace(" (สำนักงานใหญ่)", "");
const formLabel = { pnd3: "ภ.ง.ด.3", pnd53: "ภ.ง.ด.53", pp30: "ภ.พ.30" } as const;
const num = (v: string | number) => Number(v) || 0;

/** Copy to the clipboard, with a fallback for browsers that refuse the API. */
async function copyText(text: string) {
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    const area = document.createElement("textarea");
    area.value = text;
    document.body.appendChild(area);
    area.select();
    document.execCommand("copy");
    area.remove();
  }
}

function whtRequestMessage(rows: WhtRequest[]) {
  const lines = [`ขอออกหนังสือรับรองการหักภาษี ณ ที่จ่าย (50 ทวิ) ${rows.length} ใบ`, `ผู้จ่ายเงิน: ${company} เลขผู้เสียภาษี ${issuer.isTax}`, ""];
  rows.forEach((r, i) => {
    lines.push(
      `${i + 1}) ${r.payee_name}`,
      `   เลขผู้เสียภาษี ${r.payee_tax_number || "-"} สาขา ${r.payee_branch || "-"}`,
      `   ที่อยู่ ${r.payee_address || "-"}`,
      `   วันที่จ่าย ${formatDate(r.payment_date)} · ยื่น ${formLabel[r.wht_form] ?? r.wht_form}`,
      `   ประเภทเงินได้: ${r.income_type || "-"}`,
      `   จำนวนเงินที่จ่าย ${money(r.base)} บาท · หัก ${r.rate}% = ${money(r.withheld)} บาท`,
      `   อ้างอิง ${r.document_code}${r.invoice_no ? ` / ใบกำกับ ${r.invoice_no}` : ""}`,
      "",
    );
  });
  lines.push("ออกแล้วรบกวนส่งไฟล์ 50 ทวิ กลับมาในกลุ่มนี้ครับ");
  return lines.join("\n");
}

function whtReminderMessage(rows: WhtRequest[]) {
  return [
    `ติดตาม 50 ทวิ ที่ขอไว้ ${rows.length} ใบ`,
    ...rows.map((r, i) => `${i + 1}) ${r.payee_name} หัก ${money(r.withheld)} บาท (จ่าย ${formatDate(r.payment_date)}, ขอเมื่อ ${formatDate(r.requested_at)})`),
    "",
    "รบกวนส่งไฟล์กลับมาในกลุ่มนี้ครับ",
  ].join("\n");
}

function taxMonthMessage(month: string, forms: TaxFormView[]) {
  const lines = [`ข้อมูลภาษีงวด ${monthLong(month)} · ${company}`, ""];
  for (const f of forms) {
    const fig = f.figures;
    if (f.form === "pp30") {
      lines.push(
        `ภ.พ.30: ภาษีขาย ${money(fig.output_vat)} · ภาษีซื้อ ${money(fig.input_vat)} · เครดิตยกมา ${money(fig.credit_brought_forward)}`,
        num(fig.credit_carried) > 0 ? `   ไม่มียอดชำระ เครดิตยกไป ${money(fig.credit_carried)} บาท` : `   ต้องชำระ ${money(fig.tax_amount)} บาท`,
      );
    } else {
      lines.push(`${f.label}: หัก ณ ที่จ่าย ${money(fig.tax_amount)} บาท (${fig.line_count} รายการ)`);
    }
  }
  lines.push(
    "",
    `รายงานภาษีขาย/ซื้อ รายการหัก ณ ที่จ่าย และหลักฐาน อยู่ในไฟล์ odh-accounting-${month}.zip ที่แนบ`,
    "ยื่นแล้วรบกวนส่ง QR ชำระภาษี (e-tax) กลับมาในกลุ่มนี้ครับ",
  );
  return lines.join("\n");
}

export default function AccountingPage() {
  const { isAdmin, loading } = useAuth();
  const data = useQuery({ queryKey: ["docs", "accounting"], queryFn: () => accounting.overview(), enabled: isAdmin });

  if (loading) return <Spinner />;
  if (!isAdmin) return <Alert tone="stop">หน้านี้เปิดได้เฉพาะแอดมิน</Alert>;
  const d = data.data;

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-display text-2xl font-semibold text-foreground sm:text-3xl">งานกับสำนักบัญชี</h1>
        <p className="mt-1 max-w-2xl font-body text-sm text-muted-foreground">
          สำนักบัญชีเป็นคนออก 50 ทวิ และยื่นภาษี หน้านี้เตรียมข้อความให้คัดลอกไปวางในกลุ่ม LINE และจดว่าแต่ละเรื่องไปถึงไหนแล้ว
        </p>
      </header>
      {data.error ? <Alert tone="stop">{(data.error as Error).message}</Alert> : null}
      {data.isLoading || !d ? (
        <Spinner />
      ) : (
        <>
          <ol className="grid gap-3 sm:grid-cols-3" aria-label="ภาพรวม">
            <Count label="ต้องขอ 50 ทวิ" value={d.wht_to_request.length} strong={d.wht_to_request.length > 0} />
            <Count label="รอบัญชีส่ง 50 ทวิ กลับ" value={d.wht_waiting.length} />
            <Count label="งวดภาษีที่ยังไม่จบ" value={d.tax_months.filter((m) => m.forms.some((f) => f.filing?.status !== "filed")).length} strong />
          </ol>
          <WhtToRequest rows={d.wht_to_request} />
          <WhtWaiting rows={d.wht_waiting} />
          <WhtToSend rows={d.wht_to_send} />
          <Panel title="ภาษีรายเดือน (สำนักบัญชียื่น เราจ่ายตาม QR)">
            {d.tax_months.length === 0 ? (
              <EmptyState title="ยังไม่มีงวดที่ต้องยื่น" />
            ) : (
              <div className="space-y-4">
                {d.tax_months.map((m) => (
                  <TaxMonth key={m.month} month={m.month} forms={m.forms} />
                ))}
              </div>
            )}
          </Panel>
        </>
      )}
    </div>
  );
}

function Count({ label, value, strong }: { label: string; value: number; strong?: boolean }) {
  return (
    <li className={cn("rounded-2xl border p-4", strong && value > 0 ? "border-gold bg-notice" : "border-border bg-card")}>
      <div className="font-mono text-[11px] text-muted-foreground">{label}</div>
      <div className="mt-1 font-display text-2xl font-semibold tabular-nums text-foreground">{value}</div>
    </li>
  );
}

function Message({ text }: { text: string }) {
  return (
    <pre className="max-h-72 overflow-auto whitespace-pre-wrap rounded-xl border border-border bg-muted p-3 font-body text-xs leading-relaxed text-foreground">{text}</pre>
  );
}

function PayeeLine({ r }: { r: WhtRequest }) {
  return (
    <div className="min-w-0">
      <p className="truncate font-display text-sm font-semibold text-foreground">{r.payee_name}</p>
      <p className="font-body text-xs text-muted-foreground">
        จ่าย {formatDate(r.payment_date)} · {formLabel[r.wht_form] ?? r.wht_form} · ฐาน {money(r.base)} × {r.rate}% ={" "}
        <span className="font-semibold text-foreground">{money(r.withheld)}</span> ·{" "}
        <Link href={`/docs/detail/?id=${r.document_id}`} className="font-mono underline">
          {r.document_code}
        </Link>
      </p>
    </div>
  );
}

function WhtToRequest({ rows }: { rows: WhtRequest[] }) {
  const queryClient = useQueryClient();
  const [unchecked, setUnchecked] = useState<Set<number>>(new Set());
  const [copied, setCopied] = useState(false);
  const chosen = useMemo(() => rows.filter((r) => !unchecked.has(r.payment_id)), [rows, unchecked]);
  const message = whtRequestMessage(chosen);
  const mark = useMutation({
    mutationFn: () => accounting.whtRequested(chosen.map((r) => r.payment_id)),
    onSuccess: async () => {
      setCopied(false);
      setUnchecked(new Set());
      await queryClient.invalidateQueries({ queryKey: ["docs", "accounting"] });
    },
    meta: { success: "บันทึกว่าขอ 50 ทวิ แล้ว" },
  });
  const missing = chosen.filter((r) => !r.payee_tax_number || !r.payee_address);

  return (
    <Panel title={`1 · ขอสำนักบัญชีออก 50 ทวิ (${rows.length})`}>
      {rows.length === 0 ? (
        <p className="font-body text-sm text-muted-foreground">ไม่มีรายการที่ต้องขอ ทุกครั้งที่บันทึกจ่ายเงินผู้ขายพร้อมหัก ณ ที่จ่าย รายการจะมาขึ้นที่นี่</p>
      ) : (
        <div className="space-y-3">
          <ul className="divide-y divide-border">
            {rows.map((r) => (
              <li key={r.payment_id} className="flex items-start gap-3 py-2">
                <input
                  type="checkbox"
                  className="mt-1 size-4 accent-[var(--color-primary)]"
                  checked={!unchecked.has(r.payment_id)}
                  onChange={(e) =>
                    setUnchecked((prev) => {
                      const next = new Set(prev);
                      if (e.target.checked) next.delete(r.payment_id);
                      else next.add(r.payment_id);
                      return next;
                    })
                  }
                  aria-label={`ขอ 50 ทวิ ของ ${r.payee_name}`}
                />
                <PayeeLine r={r} />
              </li>
            ))}
          </ul>
          {missing.length > 0 ? (
            <Alert>
              ข้อมูลผู้รับเงินยังไม่ครบ {missing.length} ราย (เลขผู้เสียภาษีหรือที่อยู่) บัญชีต้องใช้ออก 50 ทวิ แก้ในทะเบียนผู้ติดต่อก่อนออกรายจ่าย หรือพิมพ์เพิ่มในข้อความ
            </Alert>
          ) : null}
          {chosen.length > 0 ? <Message text={message} /> : null}
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              disabled={chosen.length === 0}
              onClick={async () => {
                await copyText(message);
                setCopied(true);
              }}
            >
              <ClipboardCopy className="size-4" aria-hidden /> {copied ? "คัดลอกแล้ว" : `คัดลอกข้อความ (${chosen.length} ใบ)`}
            </Button>
            <Button size="sm" variant="line" disabled={chosen.length === 0 || mark.isPending} onClick={() => mark.mutate()}>
              <Send className="size-4" aria-hidden /> ส่งใน LINE แล้ว
            </Button>
          </div>
          <p className="font-body text-xs text-muted-foreground">คัดลอกไปวางในกลุ่ม LINE กับสำนักบัญชี แล้วกด “ส่งใน LINE แล้ว” รายการจะย้ายไปรอบัญชีส่งกลับ</p>
          {mark.error ? <Alert tone="stop">{(mark.error as ApiError).message}</Alert> : null}
        </div>
      )}
    </Panel>
  );
}

function WhtWaiting({ rows }: { rows: WhtRequest[] }) {
  const queryClient = useQueryClient();
  const [copied, setCopied] = useState(false);
  const refresh = () => void queryClient.invalidateQueries({ queryKey: ["docs", "accounting"] });
  const today = todayISO();
  return (
    <Panel title={`2 · รอสำนักบัญชีส่ง 50 ทวิ กลับมา (${rows.length})`}>
      {rows.length === 0 ? (
        <p className="font-body text-sm text-muted-foreground">ไม่มีรายการที่รออยู่</p>
      ) : (
        <div className="space-y-3">
          <ul className="divide-y divide-border">
            {rows.map((r) => {
              const days = r.requested_at ? Math.floor((Date.parse(today) - Date.parse(r.requested_at.slice(0, 10))) / 86_400_000) : 0;
              return (
                <li key={r.payment_id} className="space-y-2 py-3">
                  <div className="flex items-start justify-between gap-3">
                    <PayeeLine r={r} />
                    <span className={cn("inline-flex shrink-0 items-center gap-1 font-body text-xs", days >= 7 ? "font-semibold text-foreground" : "text-muted-foreground")}>
                      <Hourglass className="size-3.5" aria-hidden /> ขอไป {days} วัน
                    </span>
                  </div>
                  <Evidence ownerType="payment_wht" ownerId={r.payment_id} label="50 ทวิ จากสำนักบัญชี" onUploaded={refresh} />
                </li>
              );
            })}
          </ul>
          <Button
            size="sm"
            variant="line"
            onClick={async () => {
              await copyText(whtReminderMessage(rows));
              setCopied(true);
            }}
          >
            <ClipboardCopy className="size-4" aria-hidden /> {copied ? "คัดลอกแล้ว" : "คัดลอกข้อความทวงถาม"}
          </Button>
        </div>
      )}
    </Panel>
  );
}

function WhtToSend({ rows }: { rows: WhtRequest[] }) {
  const queryClient = useQueryClient();
  const done = useMutation({
    mutationFn: (paymentId: number) => payments.whtCertReceived(paymentId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["docs", "accounting"] }),
    meta: { success: "บันทึกว่าส่ง 50 ทวิ ให้ผู้รับเงินแล้ว" },
  });
  if (rows.length === 0) return null;
  return (
    <Panel title={`3 · ได้ 50 ทวิ แล้ว ส่งต่อให้ผู้รับเงิน (${rows.length})`}>
      <ul className="divide-y divide-border">
        {rows.map((r) => (
          <li key={r.payment_id} className="flex flex-wrap items-center justify-between gap-3 py-3">
            <PayeeLine r={r} />
            <div className="flex flex-wrap items-center gap-2">
              <Evidence ownerType="payment_wht" ownerId={r.payment_id} label="50 ทวิ" />
              <Button size="sm" disabled={done.isPending} onClick={() => done.mutate(r.payment_id)}>
                <FileCheck2 className="size-4" aria-hidden /> ส่งให้ผู้รับเงินแล้ว
              </Button>
            </div>
          </li>
        ))}
      </ul>
      {done.error ? <Alert tone="stop">{(done.error as ApiError).message}</Alert> : null}
    </Panel>
  );
}

const steps = ["ส่งข้อมูลให้บัญชี", "ได้ QR จากบัญชี", "จ่ายแล้ว"] as const;

function stepOf(f: TaxFormView) {
  if (f.filing?.status === "filed") return 3;
  if (f.filing?.due_set_at) return 2;
  if (f.filing?.sent_at) return 1;
  return 0;
}

function TaxMonth({ month, forms }: { month: string; forms: TaxFormView[] }) {
  const queryClient = useQueryClient();
  const [copied, setCopied] = useState(false);
  const allDone = forms.every((f) => f.filing?.status === "filed");
  const sent = forms.every((f) => f.filing?.sent_at || f.filing?.status === "filed");
  // Only what is still open goes to the firm; a paid form is done.
  const message = taxMonthMessage(month, forms.filter((f) => f.filing?.status !== "filed"));
  const markSent = useMutation({
    mutationFn: async () => {
      for (const f of forms) {
        if (f.filing?.status === "filed" || f.filing?.sent_at) continue;
        const row = f.filing ?? (await tax.open(f.form, f.period));
        await accounting.taxSent(row.id);
      }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["docs", "accounting"] }),
    meta: { success: `บันทึกว่าส่งข้อมูลงวด ${monthLong(month)} แล้ว` },
  });
  const download = useMutation({ mutationFn: () => finance.exportMonth(month) });

  return (
    <section className={cn("rounded-2xl border p-4", allDone ? "border-border" : "border-primary/40")} aria-label={`งวด ${monthLong(month)}`}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="font-display text-base font-semibold text-foreground">งวด {monthLong(month)}</h3>
        <Link href={`/docs/tax/?month=${month}`} className="font-body text-sm text-primary underline">
          เปิดหน้าภาษีรายเดือน
        </Link>
      </div>

      <ul className="mt-3 space-y-3">
        {forms.map((f) => (
          <TaxFormRow key={f.form} f={f} />
        ))}
      </ul>

      {!allDone ? (
        <div className="mt-4 space-y-2 border-t border-border pt-4">
          <p className="font-display text-xs font-semibold text-muted-foreground">ส่งข้อมูลงวดนี้ให้บัญชี{sent ? " (ส่งแล้ว ส่งซ้ำได้)" : ""}</p>
          <Message text={message} />
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              variant={sent ? "line" : undefined}
              onClick={async () => {
                await copyText(message);
                setCopied(true);
              }}
            >
              <ClipboardCopy className="size-4" aria-hidden /> {copied ? "คัดลอกแล้ว" : "คัดลอกข้อความ"}
            </Button>
            <Button size="sm" variant="line" disabled={download.isPending} onClick={() => download.mutate()}>
              <Download className="size-4" aria-hidden /> {download.isPending ? "กำลังเตรียมไฟล์…" : "ดาวน์โหลดไฟล์แนบ"}
            </Button>
            {!sent ? (
              <Button size="sm" variant="line" disabled={markSent.isPending} onClick={() => markSent.mutate()}>
                <Send className="size-4" aria-hidden /> ส่งใน LINE แล้ว
              </Button>
            ) : null}
          </div>
          {markSent.error ? <Alert tone="stop">{(markSent.error as ApiError).message}</Alert> : null}
          {download.error ? <Alert tone="stop">{(download.error as ApiError).message}</Alert> : null}
        </div>
      ) : null}
    </section>
  );
}

function TaxFormRow({ f }: { f: TaxFormView }) {
  const queryClient = useQueryClient();
  const step = stepOf(f);
  const ours = num(f.figures.tax_amount);
  const [amount, setAmount] = useState(f.filing?.due_set_at ? f.filing.due_amount : String(ours));
  const save = useMutation({
    mutationFn: async () => {
      const row = f.filing ?? (await tax.open(f.form, f.period));
      return accounting.taxDue(row.id, amount || "0");
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["docs", "accounting"] }),
    meta: { success: `บันทึกยอดตาม QR ของ ${f.label} แล้ว` },
  });
  const due = f.filing?.due_set_at ? num(f.filing.due_amount) : null;

  return (
    <li className="rounded-xl bg-muted/50 p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="font-display text-sm font-semibold text-foreground">
          {f.label}
          <span className="ml-2 font-mono text-sm font-normal tabular-nums">
            {num(f.figures.credit_carried) > 0 ? `เครดิตยกไป ${money(f.figures.credit_carried)}` : `ยอดของเรา ${money(ours)}`}
          </span>
        </span>
        <span className="font-body text-xs text-muted-foreground">ออนไลน์ภายใน {formatDate(f.efiling_due_date)}</span>
      </div>
      <ol className="mt-2 flex flex-wrap gap-1.5" aria-label={`ขั้นของ ${f.label}`}>
        {steps.map((label, i) => (
          <li
            key={label}
            className={cn(
              "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 font-body text-xs",
              i < step ? "bg-primary text-primary-foreground" : i === step ? "border border-primary text-primary" : "border border-border text-muted-foreground",
            )}
          >
            {i < step ? <Check className="size-3" aria-hidden /> : null}
            {label}
          </li>
        ))}
      </ol>

      {step === 1 || step === 2 ? (
        <div className="mt-3 flex flex-wrap items-end gap-2">
          <label className="font-body text-xs text-muted-foreground">
            ยอดตาม QR ที่บัญชีส่งมา
            <Input inputMode="decimal" className="mt-1 w-40 py-1.5" value={amount} onChange={(e) => setAmount(e.target.value)} />
          </label>
          <Button size="sm" variant="line" disabled={save.isPending} onClick={() => save.mutate()}>
            บันทึกยอด
          </Button>
          {step === 2 ? (
            <Button asChild size="sm">
              <Link href={`/docs/tax/?month=${f.period}`}>บันทึกว่าจ่ายแล้ว</Link>
            </Button>
          ) : null}
        </div>
      ) : null}
      {due !== null && step < 3 && Math.abs(due - ours) >= 0.01 ? (
        <p className="mt-2 font-body text-xs font-semibold text-foreground">
          ยอดตาม QR {money(due)} ไม่ตรงกับยอดของเรา {money(ours)} (ต่าง {money(due - ours)}) ถามบัญชีก่อนจ่าย อาจมีเงินเพิ่มหรือรายการที่ขาด
        </p>
      ) : null}
      {step === 3 && f.filing ? (
        <p className="mt-2 font-body text-xs text-muted-foreground">
          จ่ายแล้ว {formatDate(f.filing.paid_date)} · {money(f.filing.paid_amount)} บาท{f.filing.reference ? ` · ${f.filing.reference}` : ""}
        </p>
      ) : null}
      {save.error ? <Alert tone="stop">{(save.error as ApiError).message}</Alert> : null}
    </li>
  );
}
