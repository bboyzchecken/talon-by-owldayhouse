"use client";

import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRef, useState } from "react";
import { FileCheck2, Paperclip, Receipt, XCircle } from "lucide-react";
import { Button, cn } from "@odh/ui";
import { Alert, Field, Input, Panel, Select } from "@/components/odh";
import { ApiError, files, payments, registers } from "@/lib/api";
import { money, todayISO, whtCertLabels } from "@/lib/docs";
import { formatDate } from "@/lib/format";
import type { DocumentPayments, DocumentRow, Payment } from "@/lib/types";

const round2 = (n: number) => Math.round(n * 100) / 100;

/**
 * Money received against a quotation, invoice or billing note. Recording a
 * payment issues its receipt/tax invoice (the company issues receipts only
 * after the money is in); what the customer withheld waits for their 50 ทวิ
 * certificate, which has to be attached before it can be marked received.
 */
export function PaymentsPanel({ doc, data, isAdmin }: { doc: DocumentRow; data: DocumentPayments; isAdmin: boolean }) {
  const queryClient = useQueryClient();
  const outstanding = Number(data.outstanding);
  const active = data.items.filter((p) => p.status === "active");
  const refresh = () => queryClient.invalidateQueries({ queryKey: ["docs"] });

  return (
    <Panel title="รับเงิน">
      <div className="space-y-4 p-4 sm:p-5">
        <dl className="grid grid-cols-3 gap-2 font-body text-sm">
          <Figure label="ยอดเอกสาร" value={doc.net_amount} />
          <Figure label="รับแล้ว" value={data.settled} />
          <Figure label="ค้างรับ" value={data.outstanding} strong={outstanding > 0} />
        </dl>

        {data.items.length > 0 ? (
          <ul className="space-y-3">
            {data.items.map((p) => (
              <PaymentRow key={p.id} payment={p} isAdmin={isAdmin} onChange={refresh} />
            ))}
          </ul>
        ) : null}

        {isAdmin && doc.status === "issued" && outstanding > 0 ? (
          <RecordPayment doc={doc} outstanding={outstanding} firstPayment={active.length === 0} onDone={refresh} />
        ) : null}
        {!isAdmin && outstanding > 0 ? (
          <p className="font-body text-xs text-muted-foreground">แอดมินเป็นคนบันทึกรับเงินและออกใบเสร็จ/ใบกำกับภาษี</p>
        ) : null}
      </div>
    </Panel>
  );
}

function Figure({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div>
      <dt className="font-mono text-[11px] uppercase tracking-wide text-muted-foreground">{label}</dt>
      <dd className={cn("font-mono tabular-nums", strong ? "font-semibold text-foreground" : "text-muted-foreground")}>
        {money(value)}
      </dd>
    </div>
  );
}

function RecordPayment({
  doc,
  outstanding,
  firstPayment,
  onDone,
}: {
  doc: DocumentRow;
  outstanding: number;
  firstPayment: boolean;
  onDone: () => Promise<unknown>;
}) {
  const methods = useQuery({ queryKey: ["registers", "payment-methods", "active"], queryFn: () => registers.paymentMethods(false) });
  // On the first payment of the whole amount, expect the withholding the
  // document itself shows; anything else starts at nothing withheld.
  const expectedWht = firstPayment ? Number(doc.withholding_total) : 0;
  const [date, setDate] = useState(todayISO());
  const [methodId, setMethodId] = useState("");
  const [withheld, setWithheld] = useState(expectedWht ? String(expectedWht) : "0");
  const [received, setReceived] = useState(String(round2(outstanding - expectedWht)));
  const [issueReceipt, setIssueReceipt] = useState(true);
  const [note, setNote] = useState("");
  const [error, setError] = useState("");

  const settled = round2((Number(received) || 0) + (Number(withheld) || 0));
  const method = methodId || (methods.data?.items[0] ? String(methods.data.items[0].id) : "");

  const record = useMutation({
    mutationFn: () =>
      payments.record(doc.id, {
        payment_date: date,
        payment_method_id: Number(method),
        received_amount: received || "0",
        withholding_amount: withheld || "0",
        note,
        issue_receipt: issueReceipt,
      }),
    onSuccess: async () => {
      setError("");
      await onDone();
    },
    onError: (caught) => setError((caught as ApiError).body?.error ?? "บันทึกไม่สำเร็จ"),
    meta: { success: issueReceipt ? "บันทึกรับเงินและออกใบเสร็จ/ใบกำกับภาษีแล้ว" : "บันทึกรับเงินแล้ว" },
  });

  if (methods.data && methods.data.items.length === 0) {
    return (
      <Alert>
        ยังไม่มีช่องทางรับเงิน —{" "}
        <Link className="font-semibold underline" href="/docs/payment-methods">
          เพิ่มบัญชีธนาคารก่อน
        </Link>
      </Alert>
    );
  }

  return (
    <form
      className="space-y-3 rounded-xl border border-border p-3"
      onSubmit={(e) => {
        e.preventDefault();
        record.mutate();
      }}
    >
      <p className="font-display text-sm font-semibold text-foreground">บันทึกรับเงิน</p>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="วันที่ได้รับเงิน" required>
          <Input type="date" value={date} max={todayISO()} onChange={(e) => setDate(e.target.value)} required />
        </Field>
        <Field label="เข้าช่องทาง" required>
          <Select value={method} onChange={(e) => setMethodId(e.target.value)}>
            {(methods.data?.items ?? []).map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="ยอดที่เงินเข้าจริง" required>
          <Input inputMode="decimal" value={received} onChange={(e) => setReceived(e.target.value)} />
        </Field>
        <Field label="ลูกค้าหัก ณ ที่จ่าย" hint="ใส่ 0 ถ้าไม่หัก">
          <Input inputMode="decimal" value={withheld} onChange={(e) => setWithheld(e.target.value)} />
        </Field>
      </div>
      <p className="font-body text-sm text-muted-foreground">
        ตัดยอดเอกสาร <span className="font-mono font-semibold text-foreground">{money(settled)}</span> จากค้างรับ{" "}
        <span className="font-mono">{money(outstanding)}</span>
        {settled > outstanding ? <span className="font-semibold text-foreground"> — เกินยอดค้าง</span> : null}
      </p>
      <Input placeholder="หมายเหตุ เช่น งวดมัดจำ 50%" value={note} maxLength={500} onChange={(e) => setNote(e.target.value)} aria-label="หมายเหตุการรับเงิน" />
      <label className="flex items-start gap-2 font-body text-sm text-foreground">
        <input type="checkbox" className="mt-1 size-4" checked={issueReceipt} onChange={(e) => setIssueReceipt(e.target.checked)} />
        <span>
          ออกใบเสร็จ/ใบกำกับภาษีให้เลย
          <span className="block text-xs text-muted-foreground">
            ปิดไว้ได้ถ้าข้อมูลภาษีของลูกค้ายังไม่ครบ แล้วกดออกใบเสร็จทีหลังจากรายการรับเงิน
          </span>
        </span>
      </label>
      {error ? <Alert tone="stop">{error}</Alert> : null}
      <Button type="submit" size="sm" disabled={record.isPending || !method || settled <= 0}>
        {record.isPending ? "กำลังบันทึก…" : "บันทึกรับเงิน"}
      </Button>
    </form>
  );
}

function PaymentRow({ payment, isAdmin, onChange }: { payment: Payment; isAdmin: boolean; onChange: () => Promise<unknown> }) {
  const [voiding, setVoiding] = useState(false);
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");
  const fail = (caught: unknown) => setError((caught as ApiError).body?.error ?? (caught as Error).message);
  const voided = payment.status === "voided";

  const receipt = useMutation({
    mutationFn: () => payments.issueReceipt(payment.id),
    onSuccess: onChange,
    onError: fail,
    meta: { success: "ออกใบเสร็จ/ใบกำกับภาษีแล้ว" },
  });
  const voidIt = useMutation({
    mutationFn: () => payments.void(payment.id, reason),
    onSuccess: async () => {
      setVoiding(false);
      await onChange();
    },
    onError: fail,
    meta: { success: "ยกเลิกการรับเงินแล้ว ใบเสร็จของรายการนี้ถูกยกเลิกด้วย" },
  });
  const cert = useMutation({
    mutationFn: () => payments.whtCertReceived(payment.id),
    onSuccess: onChange,
    onError: fail,
    meta: { success: "บันทึกว่าได้รับหนังสือรับรองแล้ว" },
  });

  return (
    <li className={cn("space-y-2 rounded-xl border border-border p-3 font-body text-sm", voided && "opacity-60")}>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <span className="text-foreground">
          {formatDate(payment.payment_date)} · {payment.payment_method?.name ?? "—"}
          {voided ? <span className="ml-2 text-xs font-semibold">ยกเลิกแล้ว · {payment.void_reason}</span> : null}
        </span>
        <span className="font-mono tabular-nums text-foreground">{money(payment.settled_amount)}</span>
      </div>
      <p className="font-mono text-xs text-muted-foreground">
        เงินเข้า {money(payment.received_amount)}
        {Number(payment.withholding_amount) > 0 ? ` + หัก ณ ที่จ่าย ${money(payment.withholding_amount)}` : ""}
        {payment.note ? ` · ${payment.note}` : ""}
      </p>

      <div className="flex flex-wrap items-center gap-2">
        {payment.receipt ? (
          <Link href={`/docs/detail/?id=${payment.receipt.id}`} className="inline-flex items-center gap-1 font-display text-xs font-semibold text-primary underline">
            <Receipt className="size-3.5" aria-hidden /> {payment.receipt.code}
          </Link>
        ) : !voided && isAdmin ? (
          <Button size="sm" variant="line" onClick={() => receipt.mutate()} disabled={receipt.isPending}>
            <Receipt className="size-4" aria-hidden /> ออกใบเสร็จ/ใบกำกับภาษี
          </Button>
        ) : null}
        {payment.wht_cert_status !== "none" ? (
          <span
            className={cn(
              "rounded-full px-2.5 py-1 font-display text-xs font-semibold",
              payment.wht_cert_status === "pending" ? "bg-primary/10 text-primary" : "border border-border text-muted-foreground",
            )}
          >
            {whtCertLabels[payment.wht_cert_status]}
          </span>
        ) : null}
      </div>

      {isAdmin && !voided ? (
        <div className="space-y-2 border-t border-border pt-2">
          <Evidence ownerType="payment" ownerId={payment.id} label="สลิปโอนเงิน" />
          {Number(payment.withholding_amount) > 0 ? (
            <div className="space-y-2">
              <Evidence ownerType="payment_wht" ownerId={payment.id} label="หนังสือรับรอง 50 ทวิ" />
              {payment.wht_cert_status === "pending" ? (
                <Button size="sm" variant="line" onClick={() => cert.mutate()} disabled={cert.isPending}>
                  <FileCheck2 className="size-4" aria-hidden /> ได้รับหนังสือรับรองแล้ว
                </Button>
              ) : null}
            </div>
          ) : null}
          {voiding ? (
            <div className="flex flex-wrap gap-2">
              <Input className="min-w-0 flex-1 py-2 text-sm" placeholder="เหตุผลที่ยกเลิก" value={reason} maxLength={500} onChange={(e) => setReason(e.target.value)} aria-label="เหตุผลที่ยกเลิกการรับเงิน" />
              <Button size="sm" disabled={!reason.trim() || voidIt.isPending} onClick={() => voidIt.mutate()}>ยืนยันยกเลิก</Button>
              <Button size="sm" variant="line" onClick={() => setVoiding(false)}>ไม่ยกเลิก</Button>
            </div>
          ) : (
            <button type="button" className="inline-flex items-center gap-1 font-body text-xs text-muted-foreground underline" onClick={() => setVoiding(true)}>
              <XCircle className="size-3.5" aria-hidden /> ยกเลิกการรับเงินนี้ (ใบเสร็จของรายการนี้จะถูกยกเลิกด้วย)
            </button>
          )}
        </div>
      ) : null}
      {error ? <Alert tone="stop">{error}</Alert> : null}
    </li>
  );
}

/** The files attached to a payment as one kind of evidence, and an upload button. */
function Evidence({ ownerType, ownerId, label }: { ownerType: "payment" | "payment_wht"; ownerId: number; label: string }) {
  const queryClient = useQueryClient();
  const input = useRef<HTMLInputElement>(null);
  const list = useQuery({ queryKey: ["files", ownerType, ownerId], queryFn: () => files.list(ownerType, ownerId) });
  const [error, setError] = useState("");
  const upload = useMutation({
    mutationFn: (file: File) => files.upload(ownerType, ownerId, file),
    onSuccess: async () => {
      setError("");
      if (input.current) input.current.value = "";
      await queryClient.invalidateQueries({ queryKey: ["files", ownerType, ownerId] });
    },
    onError: (caught) => setError((caught as ApiError).body?.error ?? "อัปโหลดไม่สำเร็จ"),
    meta: { success: `แนบ${label}แล้ว` },
  });
  const open = async (id: number) => {
    const { download_url } = await files.downloadURL(id, true);
    window.open(download_url, "_blank", "noopener");
  };
  const ready = (list.data?.data ?? []).filter((f) => f.status === "ready");

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="font-display text-xs font-semibold text-muted-foreground">{label}:</span>
      {ready.length === 0 ? <span className="text-xs text-muted-foreground">ยังไม่แนบ</span> : null}
      {ready.map((f) => (
        <button key={f.id} type="button" className="text-xs text-primary underline" onClick={() => void open(f.id)}>
          {f.filename}
        </button>
      ))}
      <input
        ref={input}
        type="file"
        className="sr-only"
        accept="image/*,application/pdf"
        aria-label={`แนบ${label}`}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) upload.mutate(file);
        }}
      />
      <Button size="sm" variant="line" onClick={() => input.current?.click()} disabled={upload.isPending}>
        <Paperclip className="size-3.5" aria-hidden /> {upload.isPending ? "กำลังแนบ…" : "แนบไฟล์"}
      </Button>
      {error ? <span className="text-xs font-semibold text-foreground">{error}</span> : null}
    </div>
  );
}
