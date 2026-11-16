"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Plus, Text, Trash2 } from "lucide-react";
import { Button, cn } from "@odh/ui";
import { Alert, Field, Input, Panel, Select, Textarea } from "@/components/odh";
import { ApiError, documents, type DocumentBody } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { adminDocTypes, docTypeLabels, money, salesDocTypes, todayISO, vatTypeLabels, isoDay } from "@/lib/docs";
import type { BillingContact, DocType, DocumentItem, DocumentRow, DocumentTotals } from "@/lib/types";

const blankLine = (): DocumentItem => ({
  description: "",
  is_description: false,
  quantity: "1",
  unit_name: "",
  price: "0",
  discount: "",
  vat_type: 3,
  withholding_rate: "0",
});

/** An emptied number field means 0; the API reads decimals, not "". */
function clean(items: DocumentItem[]): DocumentItem[] {
  const num = (v: string) => (v ?? "").toString().replace(/,/g, "").trim() || "0";
  return items.map((i) => ({ ...i, quantity: num(i.quantity), price: num(i.price), withholding_rate: num(i.withholding_rate) }));
}

/**
 * The document form: a new draft, or a draft being edited. The totals on the
 * right come from the API's own calculation (POST /api/docs/calculate), so
 * what is previewed is exactly what will be stored and printed.
 */
export function DocumentForm({ existing }: { existing?: DocumentRow }) {
  const router = useRouter();
  const { isAdmin } = useAuth();
  const allowedTypes = isAdmin ? adminDocTypes : salesDocTypes;

  const [docType, setDocType] = useState<DocType>(existing?.doc_type ?? 101);
  const [contact, setContact] = useState<BillingContact | undefined>(existing?.contact);
  const [search, setSearch] = useState("");
  const [issuedDate, setIssuedDate] = useState(isoDay(existing?.issued_date) || todayISO());
  const [dueDate, setDueDate] = useState(isoDay(existing?.due_date));
  const [reference, setReference] = useState(existing?.reference ?? "");
  const [remark, setRemark] = useState(existing?.remark ?? "");
  const [taxStatus, setTaxStatus] = useState(existing?.tax_status ?? 0);
  const [discount, setDiscount] = useState(
    existing && Number(existing.discount_total) > 0 ? existing.discount_total : "",
  );
  const [items, setItems] = useState<DocumentItem[]>(
    existing?.items?.length ? existing.items.map((i) => ({ ...i })) : [blankLine()],
  );
  const [taxInvoiceNo, setTaxInvoiceNo] = useState(existing?.received_tax_invoice_number ?? "");
  const [taxInvoiceDate, setTaxInvoiceDate] = useState(isoDay(existing?.received_tax_invoice_date));
  const [error, setError] = useState("");

  const isExpense = docType === 202;
  const side = isExpense ? "vendor" : "customer";

  const contacts = useQuery({
    queryKey: ["docs", "contacts", side, search],
    queryFn: () => documents.contacts(search, side),
    enabled: !contact,
  });

  // Live totals, debounced, from the API's own arithmetic.
  const calcInput = useMemo(() => ({ tax_status: taxStatus, discount, items: clean(items) }), [taxStatus, discount, items]);
  const [debounced, setDebounced] = useState(calcInput);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(calcInput), 350);
    return () => clearTimeout(timer);
  }, [calcInput]);
  const totals = useQuery<DocumentTotals, ApiError>({
    queryKey: ["docs", "calculate", debounced],
    queryFn: () => documents.calculate(debounced),
    retry: false,
  });

  const setItem = (index: number, patch: Partial<DocumentItem>) =>
    setItems((current) => current.map((item, i) => (i === index ? { ...item, ...patch } : item)));

  const body = (): DocumentBody => ({
    doc_type: docType,
    contact_id: contact?.id ?? 0,
    issued_date: issuedDate,
    due_date: dueDate || undefined,
    reference,
    remark,
    tax_status: taxStatus,
    discount,
    items: clean(items),
    ...(isExpense
      ? { received_tax_invoice_number: taxInvoiceNo, received_tax_invoice_date: taxInvoiceDate || undefined }
      : {}),
  });

  const save = useMutation({
    mutationFn: () => (existing ? documents.update(existing.id, body()) : documents.create(body())),
    onSuccess: (saved) => router.push(`/docs/detail/?id=${saved.id}`),
    onError: (caught) => setError((caught as ApiError).body?.error ?? "บันทึกไม่สำเร็จ"),
    meta: { success: existing ? "บันทึกร่างแล้ว" : "สร้างร่างแล้ว ยังไม่ออกเลข" },
  });

  const canSave = Boolean(contact) && items.length > 0 && !totals.isError;
  const calcError = totals.error?.body?.error;

  return (
    <form
      className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]"
      onSubmit={(event) => {
        event.preventDefault();
        setError("");
        save.mutate();
      }}
    >
      <div className="min-w-0 space-y-5">
        <Panel title="เอกสาร">
          <div className="grid gap-4 p-4 sm:grid-cols-2 sm:p-5">
            <Field label="ประเภท" required>
              <Select
                value={docType}
                disabled={Boolean(existing)}
                onChange={(event) => {
                  setDocType(Number(event.target.value) as DocType);
                  setContact(undefined);
                }}
              >
                {allowedTypes.map((t) => (
                  <option key={t} value={t}>
                    {docTypeLabels[t]}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="ราคาที่กรอก" required>
              <Select value={taxStatus} onChange={(event) => setTaxStatus(Number(event.target.value))}>
                <option value={0}>ยังไม่รวม VAT (บวก VAT เพิ่ม)</option>
                <option value={1}>รวม VAT แล้ว</option>
              </Select>
            </Field>
            <Field label="วันที่เอกสาร" required>
              <Input type="date" value={issuedDate} onChange={(event) => setIssuedDate(event.target.value)} required />
            </Field>
            <Field label={docType === 101 ? "ใช้ได้ถึง" : "ครบกำหนดชำระ"}>
              <Input type="date" value={dueDate} min={issuedDate} onChange={(event) => setDueDate(event.target.value)} />
            </Field>
            <Field label="อ้างอิง" hint="เช่น เลขใบสั่งซื้อของลูกค้า">
              <Input value={reference} maxLength={200} onChange={(event) => setReference(event.target.value)} />
            </Field>
            {isExpense ? (
              <>
                <Field label="เลขที่ใบกำกับภาษีของผู้ขาย" hint="ไม่มีใบกำกับภาษี = ภาษีซื้อเอามาหักไม่ได้">
                  <Input value={taxInvoiceNo} maxLength={60} onChange={(event) => setTaxInvoiceNo(event.target.value)} />
                </Field>
                <Field label="วันที่ใบกำกับภาษี">
                  <Input type="date" value={taxInvoiceDate} onChange={(event) => setTaxInvoiceDate(event.target.value)} />
                </Field>
              </>
            ) : null}
          </div>
        </Panel>

        <Panel title={isExpense ? "ผู้ขาย" : "ลูกค้า"}>
          <div className="p-4 sm:p-5">
            {contact ? (
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-display text-base font-semibold text-foreground">{contact.name}</p>
                  <p className="font-body text-sm text-muted-foreground">
                    {contact.code}
                    {contact.tax_number ? ` · เลขผู้เสียภาษี ${contact.tax_number}` : " · ยังไม่มีเลขผู้เสียภาษี"}
                    {contact.branch_code ? ` · สาขา ${contact.branch_code}` : ""}
                  </p>
                  <p className="font-body text-sm text-muted-foreground">
                    {[contact.address, contact.district, contact.province, contact.post_code].filter(Boolean).join(" ") ||
                      "ยังไม่มีที่อยู่"}
                  </p>
                </div>
                <Button type="button" size="sm" variant="line" onClick={() => setContact(undefined)}>
                  เปลี่ยน
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                <Input
                  placeholder="ค้นหาชื่อ รหัส หรือเลขผู้เสียภาษี"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  aria-label="ค้นหาผู้ติดต่อ"
                />
                <ul className="max-h-64 divide-y divide-border overflow-y-auto rounded-xl border border-border">
                  {(contacts.data?.items ?? []).map((c) => (
                    <li key={c.id}>
                      <button
                        type="button"
                        className="flex w-full flex-col items-start px-4 py-3 text-left hover:bg-muted"
                        onClick={() => setContact(c)}
                      >
                        <span className="font-display text-sm font-semibold text-foreground">{c.name}</span>
                        <span className="font-mono text-xs text-muted-foreground">
                          {c.code} {c.tax_number ? `· ${c.tax_number}` : ""}
                        </span>
                      </button>
                    </li>
                  ))}
                  {contacts.data && contacts.data.items.length === 0 ? (
                    <li className="px-4 py-3 font-body text-sm text-muted-foreground">
                      ไม่พบผู้ติดต่อ — ทะเบียนผู้ติดต่อเพิ่มได้ในขั้นถัดไปของระบบ ตอนนี้ให้แอดมินเพิ่มให้
                    </li>
                  ) : null}
                </ul>
              </div>
            )}
          </div>
        </Panel>

        <Panel
          title="รายการ"
          action={
            <div className="flex gap-2">
              <Button type="button" size="sm" variant="line" onClick={() => setItems((c) => [...c, blankLine()])}>
                <Plus className="size-4" aria-hidden /> รายการ
              </Button>
              <Button
                type="button"
                size="sm"
                variant="line"
                onClick={() => setItems((c) => [...c, { ...blankLine(), is_description: true, quantity: "0" }])}
              >
                <Text className="size-4" aria-hidden /> ข้อความ
              </Button>
            </div>
          }
        >
          <ol className="divide-y divide-border" aria-label="รายการในเอกสาร">
            {items.map((item, index) => (
              <li key={index} className="space-y-3 p-4 sm:p-5">
                <div className="flex items-start gap-2">
                  <span className="mt-3 w-6 shrink-0 font-mono text-xs text-muted-foreground">{index + 1}</span>
                  <Textarea
                    rows={item.is_description ? 1 : 2}
                    value={item.description}
                    maxLength={2000}
                    placeholder={item.is_description ? "ข้อความคั่น เช่น หัวข้อ หรือรายละเอียดเพิ่มเติม" : "รายละเอียดงาน"}
                    onChange={(event) => setItem(index, { description: event.target.value })}
                    aria-label={`รายละเอียดบรรทัด ${index + 1}`}
                  />
                  <button
                    type="button"
                    className="mt-2 rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-40"
                    onClick={() => setItems((c) => c.filter((_, i) => i !== index))}
                    disabled={items.length === 1}
                    aria-label={`ลบบรรทัด ${index + 1}`}
                  >
                    <Trash2 className="size-4" />
                  </button>
                </div>
                {item.is_description ? null : (
                  <div className="grid grid-cols-2 gap-2 pl-8 sm:grid-cols-3 2xl:grid-cols-6">
                    <LineField label="จำนวน">
                      <Input inputMode="decimal" value={item.quantity} onChange={(e) => setItem(index, { quantity: e.target.value })} />
                    </LineField>
                    <LineField label="หน่วย">
                      <Input value={item.unit_name} maxLength={50} onChange={(e) => setItem(index, { unit_name: e.target.value })} />
                    </LineField>
                    <LineField label="ราคาต่อหน่วย">
                      <Input inputMode="decimal" value={item.price} onChange={(e) => setItem(index, { price: e.target.value })} />
                    </LineField>
                    <LineField label="ส่วนลด">
                      <Input placeholder="100 หรือ 10%" value={item.discount} maxLength={20} onChange={(e) => setItem(index, { discount: e.target.value })} />
                    </LineField>
                    <LineField label="VAT">
                      <Select value={item.vat_type} onChange={(e) => setItem(index, { vat_type: Number(e.target.value) })}>
                        {[3, 1, 2].map((v) => (
                          <option key={v} value={v}>
                            {vatTypeLabels[v]}
                          </option>
                        ))}
                      </Select>
                    </LineField>
                    <LineField label="หัก ณ ที่จ่าย %">
                      <Select value={String(Number(item.withholding_rate))} onChange={(e) => setItem(index, { withholding_rate: e.target.value })}>
                        {["0", "1", "2", "3", "5"].map((r) => (
                          <option key={r} value={r}>
                            {r === "0" ? "ไม่หัก" : `${r}%`}
                          </option>
                        ))}
                      </Select>
                    </LineField>
                    <p className="col-span-2 text-right font-mono text-sm tabular-nums text-foreground sm:col-span-3 2xl:col-span-6">
                      {totals.data?.lines[index] ? money(totals.data.lines[index].line_amount) : "—"} บาท
                    </p>
                  </div>
                )}
              </li>
            ))}
          </ol>
        </Panel>

        <Panel title="หมายเหตุ">
          <div className="p-4 sm:p-5">
            <Textarea
              rows={4}
              value={remark}
              maxLength={2000}
              onChange={(event) => setRemark(event.target.value)}
              placeholder="เงื่อนไข ขอบเขตงาน ระยะเวลา — พิมพ์ลงช่องหมายเหตุของเอกสาร"
              aria-label="หมายเหตุ"
            />
          </div>
        </Panel>
      </div>

      <aside className="space-y-4 lg:sticky lg:top-20 lg:self-start">
        <Panel title="ยอดรวม">
          <div className="space-y-3 p-4 sm:p-5">
            <Field label="ส่วนลดท้ายบิล">
              <Input placeholder="1000 หรือ 5%" value={discount} maxLength={20} onChange={(e) => setDiscount(e.target.value)} />
            </Field>
            {calcError ? <Alert tone="stop">{calcError}</Alert> : null}
            <dl className="space-y-1.5 font-body text-sm">
              <Row label="รวมรายการ" value={totals.data?.subtotal} />
              <Row label="ส่วนลดท้ายบิล" value={totals.data?.discount_total} />
              <Row label="มูลค่าก่อน VAT" value={totals.data?.pre_tax_amount} />
              <Row label="VAT" value={totals.data?.vat_amount} />
              <Row label="รวมทั้งสิ้น" value={totals.data?.net_amount} strong />
              <Row label={isExpense ? "เราหัก ณ ที่จ่าย" : "ลูกค้าหัก ณ ที่จ่าย"} value={totals.data?.withholding_total} />
              <Row label={isExpense ? "ยอดที่โอนจริง" : "ยอดที่ลูกค้าโอนจริง"} value={totals.data?.payable_amount} strong />
            </dl>
            <p className="font-body text-xs text-muted-foreground">ตัวเลขนี้คำนวณโดยระบบ แบบเดียวกับที่จะบันทึกและพิมพ์</p>
          </div>
        </Panel>
        {error ? <Alert tone="stop">{error}</Alert> : null}
        <Button type="submit" className="w-full" disabled={!canSave || save.isPending}>
          {save.isPending ? "กำลังบันทึก…" : existing ? "บันทึกร่าง" : "บันทึกเป็นร่าง"}
        </Button>
        <p className="font-body text-xs text-muted-foreground">
          ร่างยังไม่มีเลขที่ แก้ไขหรือลบได้ เลขที่จะออกตอนกด “ออกเอกสาร” ในหน้าถัดไป
        </p>
      </aside>
    </form>
  );
}

function LineField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block min-w-0">
      <span className="mb-1 block font-display text-xs font-semibold text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}

function Row({ label, value, strong }: { label: string; value?: string; strong?: boolean }) {
  return (
    <div className={cn("flex items-baseline justify-between gap-3", strong ? "font-semibold text-foreground" : "text-muted-foreground")}>
      <dt>{label}</dt>
      <dd className="font-mono tabular-nums">{value === undefined ? "—" : money(value)}</dd>
    </div>
  );
}
