"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Suspense, useState } from "react";
import { ArrowRight, Copy, FileCheck2, Mail, Pencil, Printer, Send, Trash2, XCircle } from "lucide-react";
import { Button } from "@odh/ui";
import { PaymentsPanel } from "@/components/docs/payments-panel";
import { DocStatusBadge } from "@/components/docs/status-badge";
import { leadHref } from "@/components/lead-card";
import { Alert, EmptyState, Input, Panel, Spinner, Textarea } from "@/components/odh";
import { ApiError, documents } from "@/lib/api";
import { docTypeLabels, eventLabels, money, openPrint, printableTypes, salesDocTypes, vatTypeLabels } from "@/lib/docs";
import { useAuth } from "@/lib/auth";
import { formatDate, formatDateTime } from "@/lib/format";
import type { DocumentRow } from "@/lib/types";

export default function DocumentDetailPage() {
  return (
    <Suspense fallback={<Spinner />}>
      <DocumentDetail />
    </Suspense>
  );
}

function DocumentDetail() {
  const id = Number(useSearchParams().get("id"));
  const router = useRouter();
  const queryClient = useQueryClient();
  const { isAdmin } = useAuth();
  const detail = useQuery({
    queryKey: ["docs", id, "detail"],
    queryFn: () => documents.get(id),
    enabled: Number.isFinite(id) && id > 0,
  });

  const [error, setError] = useState("");
  const [voiding, setVoiding] = useState(false);
  const [reason, setReason] = useState("");
  const [mail, setMail] = useState<{ to: string; subject: string; body: string } | null>(null);

  const refresh = () => queryClient.invalidateQueries({ queryKey: ["docs"] });
  const fail = (caught: unknown) => setError((caught as ApiError).body?.error ?? (caught as Error).message);

  const issue = useMutation({
    mutationFn: () => documents.issue(id),
    onSuccess: async () => {
      setError("");
      await refresh();
    },
    onError: fail,
    meta: { success: "ออกเอกสารแล้ว" },
  });
  const voidDoc = useMutation({
    mutationFn: () => documents.void(id, reason),
    onSuccess: async () => {
      setVoiding(false);
      setError("");
      await refresh();
    },
    onError: fail,
    meta: { success: "ยกเลิกเอกสารแล้ว เลขที่ยังอยู่และไม่ถูกใช้ซ้ำ" },
  });
  const remove = useMutation({
    mutationFn: () => documents.remove(id),
    onSuccess: async () => {
      await refresh();
      router.push("/docs/list");
    },
    onError: fail,
    meta: { success: "ลบร่างแล้ว" },
  });
  const next = useMutation({
    mutationFn: (docType: DocumentRow["doc_type"]) => documents.next(id, docType),
    onSuccess: async (created) => {
      await refresh();
      router.push(`/docs/detail/?id=${created.id}`);
    },
    onError: fail,
    meta: { success: "สร้างร่างใบถัดไปแล้ว" },
  });
  const draftMail = useMutation({
    mutationFn: () => documents.emailDraft(id),
    onSuccess: async (draft) => {
      setMail(draft);
      await refresh();
    },
    onError: fail,
  });
  const markSent = useMutation({
    mutationFn: () => documents.markSent(id),
    onSuccess: refresh,
    onError: fail,
    meta: { success: "บันทึกว่าส่งให้ลูกค้าแล้ว" },
  });

  if (!Number.isFinite(id) || id <= 0) return <EmptyState title="ไม่พบเอกสาร" />;
  if (detail.isLoading) return <Spinner />;
  if (detail.error || !detail.data) return <Alert tone="stop">{(detail.error as Error)?.message ?? "ไม่พบเอกสาร"}</Alert>;

  const { document: doc, events, next: nextTypes, payments: moneyIn } = detail.data;
  const busy = issue.isPending || voidDoc.isPending || remove.isPending || next.isPending;
  const contact = doc.contact;
  const isExpense = doc.doc_type === 202;
  // An issued document shows the buyer as recorded at issue, as it prints.
  const issuedBuyer = doc.status !== "draft" && Boolean(doc.buyer_name);

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-display text-sm font-semibold text-muted-foreground">{docTypeLabels[doc.doc_type]}</p>
          <h1 className="mt-1 flex flex-wrap items-center gap-3 font-display text-2xl font-semibold text-foreground sm:text-3xl">
            <span className="font-mono">{doc.code || "ร่าง — ยังไม่มีเลขที่"}</span>
            <DocStatusBadge status={doc.status} />
          </h1>
          <p className="mt-1 font-body text-sm text-muted-foreground">
            ลงวันที่ {formatDate(doc.issued_date)}
            {doc.due_date ? ` · ${doc.doc_type === 101 ? "ใช้ได้ถึง" : "ครบกำหนด"} ${formatDate(doc.due_date)}` : ""}
            {doc.source_document ? (
              <>
                {" · สร้างต่อจาก "}
                <Link className="font-semibold text-primary underline" href={`/docs/detail/?id=${doc.source_document.id}`}>
                  {doc.source_document.code}
                </Link>
              </>
            ) : null}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {printableTypes.includes(doc.doc_type) ? (
            <Button size="sm" variant="line" onClick={() => openPrint(doc)}>
              <Printer className="size-4" aria-hidden /> {doc.status === "draft" ? "ดูตัวอย่าง" : "พิมพ์"}
            </Button>
          ) : null}
          {doc.status === "draft" ? (
            <>
              <Button asChild size="sm" variant="line">
                <Link href={`/docs/new/?id=${doc.id}`}>
                  <Pencil className="size-4" aria-hidden /> แก้ไข
                </Link>
              </Button>
              <Button
                size="sm"
                disabled={busy}
                onClick={() => {
                  if (window.confirm(`ออก${docTypeLabels[doc.doc_type]}ใบนี้?\nได้เลขที่แล้วจะแก้ไขไม่ได้ ต้องยกเลิกแล้วออกใหม่`)) issue.mutate();
                }}
              >
                <FileCheck2 className="size-4" aria-hidden /> ออกเอกสาร
              </Button>
            </>
          ) : null}
        </div>
      </header>

      {error ? <Alert tone="stop">{error}</Alert> : null}
      {doc.status === "voided" ? (
        <Alert tone="stop">
          ยกเลิกเมื่อ {formatDateTime(doc.voided_at)} · {doc.void_reason}
        </Alert>
      ) : null}

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="min-w-0 space-y-5">
          <Panel title={isExpense ? "ผู้ขาย" : "ลูกค้า"}>
            <div className="space-y-1 p-4 font-body text-sm sm:p-5">
              {issuedBuyer ? (
                <>
                  <p className="font-display text-base font-semibold text-foreground">{doc.buyer_name}</p>
                  <p className="text-muted-foreground">
                    {doc.buyer_tax_number ? `เลขผู้เสียภาษี ${doc.buyer_tax_number} · สาขา ${doc.buyer_branch_code}` : "ไม่มีเลขผู้เสียภาษี"}
                  </p>
                  <p className="text-muted-foreground">{doc.buyer_address || "ไม่มีที่อยู่"}</p>
                  <p className="pt-1 text-xs text-muted-foreground">
                    ตามข้อมูลตอนออกเอกสาร
                    {contact && contact.name !== doc.buyer_name ? ` · ปัจจุบันในทะเบียนชื่อ ${contact.name}` : ""}
                  </p>
                </>
              ) : (
                <>
                  <p className="font-display text-base font-semibold text-foreground">{contact?.name ?? "—"}</p>
                  <p className="text-muted-foreground">
                    {contact?.tax_number ? `เลขผู้เสียภาษี ${contact.tax_number} · สาขา ${contact.branch_code}` : "ยังไม่มีเลขผู้เสียภาษี"}
                  </p>
                  <p className="text-muted-foreground">
                    {[contact?.address, contact?.sub_district, contact?.district, contact?.province, contact?.post_code].filter(Boolean).join(" ") || "ยังไม่มีที่อยู่"}
                  </p>
                </>
              )}
              {contact && !issuedBuyer ? (
                <Link className="inline-block pt-1 pr-4 font-display font-semibold text-primary underline" href={`/docs/contacts/edit/?id=${contact.id}`}>
                  แก้ไขผู้ติดต่อ
                </Link>
              ) : null}
              {doc.lead_id ? (
                <Link className="inline-block pt-1 font-display font-semibold text-primary underline" href={leadHref(doc.lead_id)}>
                  {isExpense ? "เปิดงานของลูกค้าที่รายจ่ายนี้เป็นต้นทุน" : "เปิดลูกค้าใน Lead Tracker"}
                </Link>
              ) : null}
              {isExpense && doc.received_tax_invoice_number ? (
                <p className="pt-1 text-foreground">
                  ใบกำกับภาษีผู้ขาย {doc.received_tax_invoice_number} ลงวันที่ {formatDate(doc.received_tax_invoice_date)} ·
                  ใช้ภาษีซื้อเดือน {doc.input_vat_period?.slice(0, 7)}
                </p>
              ) : null}
            </div>
          </Panel>

          <Panel title="รายการ">
            <ol className="divide-y divide-border">
              {(doc.items ?? []).map((item) => (
                <li key={item.id} className="flex gap-3 px-4 py-3 sm:px-5">
                  <span className="w-6 shrink-0 font-mono text-xs text-muted-foreground">{item.position}</span>
                  <div className="min-w-0 flex-1">
                    <p className={item.is_description ? "whitespace-pre-line font-body text-sm text-muted-foreground" : "whitespace-pre-line font-body text-sm text-foreground"}>
                      {item.description}
                    </p>
                    {item.is_description ? null : (
                      <p className="mt-1 font-mono text-xs text-muted-foreground">
                        {Number(item.quantity)} {item.unit_name} × {money(item.price)}
                        {item.discount ? ` · ส่วนลด ${item.discount}` : ""} · {vatTypeLabels[item.vat_type]}
                        {Number(item.withholding_rate) > 0 ? ` · หัก ${Number(item.withholding_rate)}%` : ""}
                      </p>
                    )}
                  </div>
                  {item.is_description ? null : (
                    <span className="shrink-0 font-mono text-sm tabular-nums text-foreground">{money(item.line_amount)}</span>
                  )}
                </li>
              ))}
            </ol>
          </Panel>

          {moneyIn && doc.status !== "draft" ? <PaymentsPanel doc={doc} data={moneyIn} isAdmin={isAdmin} /> : null}

          {doc.remark ? (
            <Panel title="หมายเหตุ">
              <p className="whitespace-pre-line p-4 font-body text-sm text-foreground sm:p-5">{doc.remark}</p>
            </Panel>
          ) : null}
        </div>

        <aside className="space-y-4">
          <Panel title="ยอดรวม">
            <dl className="space-y-1.5 p-4 font-body text-sm sm:p-5">
              <Sum label="ส่วนลดท้ายบิล" value={doc.discount_total} />
              <Sum label="มูลค่าก่อน VAT" value={doc.pre_tax_amount} />
              <Sum label="VAT" value={doc.vat_amount} />
              <Sum label="รวมทั้งสิ้น" value={doc.net_amount} strong />
              <Sum label="หัก ณ ที่จ่าย" value={doc.withholding_total} />
              <Sum
                label="ยอดโอนจริง"
                value={String(Math.round((Number(doc.net_amount) - Number(doc.withholding_total)) * 100) / 100)}
                strong
              />
            </dl>
          </Panel>

          {doc.status === "issued" ? (
            <Panel title="ทำต่อ">
              <div className="space-y-3 p-4 sm:p-5">
                {(nextTypes ?? []).filter((t) => isAdmin || salesDocTypes.includes(t)).map((t) => (
                  <Button key={t} size="sm" variant="line" className="w-full justify-between" disabled={busy} onClick={() => next.mutate(t)}>
                    สร้าง{docTypeLabels[t]}ต่อ <ArrowRight className="size-4" aria-hidden />
                  </Button>
                ))}
                {!isExpense ? (
                  <>
                    <Button size="sm" variant="line" className="w-full justify-between" onClick={() => draftMail.mutate()}>
                      ร่างอีเมลถึงลูกค้า <Mail className="size-4" aria-hidden />
                    </Button>
                    <Button size="sm" variant="line" className="w-full justify-between" onClick={() => markSent.mutate()}>
                      ส่งให้ลูกค้าแล้ว <Send className="size-4" aria-hidden />
                    </Button>
                  </>
                ) : null}
                {voiding ? (
                  <div className="space-y-2 rounded-xl border border-border p-3">
                    <Input placeholder="เหตุผลที่ยกเลิก" value={reason} maxLength={500} onChange={(e) => setReason(e.target.value)} aria-label="เหตุผลที่ยกเลิก" />
                    <div className="flex gap-2">
                      <Button size="sm" disabled={!reason.trim() || busy} onClick={() => voidDoc.mutate()}>
                        ยืนยันยกเลิก
                      </Button>
                      <Button size="sm" variant="line" onClick={() => setVoiding(false)}>
                        ไม่ยกเลิก
                      </Button>
                    </div>
                    <p className="font-body text-xs text-muted-foreground">
                      เลขที่ยังอยู่และไม่ถูกใช้ซ้ำ ใบกำกับภาษีที่ยอดผิด ให้ยกเลิกแล้วออกใบใหม่ (บริษัทไม่ใช้ใบลดหนี้/เพิ่มหนี้)
                    </p>
                  </div>
                ) : (
                  <Button size="sm" variant="line" className="w-full justify-between" onClick={() => setVoiding(true)}>
                    ยกเลิกเอกสาร <XCircle className="size-4" aria-hidden />
                  </Button>
                )}
              </div>
            </Panel>
          ) : null}

          {doc.status === "draft" ? (
            <Button
              size="sm"
              variant="line"
              className="w-full"
              disabled={busy}
              onClick={() => {
                if (window.confirm("ลบร่างนี้?")) remove.mutate();
              }}
            >
              <Trash2 className="size-4" aria-hidden /> ลบร่าง
            </Button>
          ) : null}

          <Panel title="ประวัติ">
            <ol className="space-y-2 p-4 font-body text-sm sm:p-5">
              {events.map((e) => (
                <li key={e.id} className="flex flex-col">
                  <span className="text-foreground">
                    {eventLabels[e.action] ?? e.action}
                    {e.note ? <span className="text-muted-foreground"> · {e.note}</span> : null}
                  </span>
                  <span className="font-mono text-xs text-muted-foreground">
                    {e.user?.name ?? "—"} · {formatDateTime(e.created_at)}
                  </span>
                </li>
              ))}
            </ol>
          </Panel>
        </aside>
      </div>

      {mail ? <MailDraft mail={mail} onClose={() => setMail(null)} /> : null}
    </div>
  );
}

function Sum({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className={strong ? "flex justify-between gap-3 font-semibold text-foreground" : "flex justify-between gap-3 text-muted-foreground"}>
      <dt>{label}</dt>
      <dd className="font-mono tabular-nums">{money(value)}</dd>
    </div>
  );
}

/**
 * The e-mail draft. Nothing is sent from here: the person copies it or opens
 * their own mail program, sends it, and comes back to press "ส่งให้ลูกค้าแล้ว".
 */
function MailDraft({ mail, onClose }: { mail: { to: string; subject: string; body: string }; onClose: () => void }) {
  const copy = (text: string) => void navigator.clipboard?.writeText(text);
  const mailto = `mailto:${encodeURIComponent(mail.to)}?subject=${encodeURIComponent(mail.subject)}&body=${encodeURIComponent(mail.body)}`;
  return (
    <Panel title="ร่างอีเมล — ส่งเองจากอีเมลของคุณ" action={<Button size="sm" variant="line" onClick={onClose}>ปิด</Button>}>
      <div className="space-y-3 p-4 sm:p-5">
        <Input readOnly value={mail.to} aria-label="ถึง" />
        <Input readOnly value={mail.subject} aria-label="หัวเรื่อง" />
        <Textarea readOnly rows={9} value={mail.body} aria-label="เนื้อความ" />
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="line" onClick={() => copy(`${mail.subject}\n\n${mail.body}`)}>
            <Copy className="size-4" aria-hidden /> คัดลอก
          </Button>
          <Button asChild size="sm" variant="line">
            <a href={mailto}>
              <Mail className="size-4" aria-hidden /> เปิดในโปรแกรมอีเมล
            </a>
          </Button>
        </div>
        <p className="font-body text-xs text-muted-foreground">
          ระบบไม่ส่งอีเมลเอง แนบไฟล์ PDF จากปุ่ม “พิมพ์” แล้วส่งเอง จากนั้นกด “ส่งให้ลูกค้าแล้ว”
        </p>
      </div>
    </Panel>
  );
}
