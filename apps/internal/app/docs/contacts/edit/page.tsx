"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Suspense, useEffect, useState } from "react";
import { Trash2 } from "lucide-react";
import { Button } from "@odh/ui";
import { leadHref } from "@/components/lead-card";
import { Alert, Field, Input, Panel, Select, Spinner } from "@/components/odh";
import { ApiError, registers, type BillingContactBody } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { contactTypeLabels, defaultWhtForm, financeSideLabels, namePrefixLabels } from "@/lib/docs";
import type { BillingContact } from "@/lib/types";

export default function ContactEditPage() {
  return (
    <Suspense fallback={<Spinner />}>
      <ContactEdit />
    </Suspense>
  );
}

const empty: BillingContactBody = {
  code: "",
  name: "",
  contact_type: 2,
  name_prefix: 0,
  finance_side: "customer",
  wht_form: "pnd53",
  tax_number: "",
  branch_code: "00000",
  address: "",
  sub_district: "",
  district: "",
  province: "",
  post_code: "",
  country: "Thailand",
  person_first_name: "",
  person_last_name: "",
  person_position: "",
  person_phone: "",
  person_email: "",
  lead_id: null,
};

function toBody(c: BillingContact): BillingContactBody {
  const { id, created_at, ...rest } = c;
  void id;
  void created_at;
  return { ...empty, ...rest, lead_id: c.lead_id ?? null };
}

/** /docs/contacts/edit/ adds; ?id= edits; ?lead_id= starts from a Lead Tracker customer. */
function ContactEdit() {
  const params = useSearchParams();
  const id = Number(params.get("id")) || 0;
  const leadId = Number(params.get("lead_id")) || 0;
  const router = useRouter();
  const queryClient = useQueryClient();
  const { isAdmin } = useAuth();

  const existing = useQuery({ queryKey: ["registers", "contact", id], queryFn: () => registers.contact(id), enabled: id > 0 });
  const prefill = useQuery({
    queryKey: ["registers", "from-lead", leadId],
    queryFn: () => registers.contactFromLead(leadId),
    enabled: id === 0 && leadId > 0,
  });

  const [form, setForm] = useState<BillingContactBody>(empty);
  const [whtTouched, setWhtTouched] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    if (existing.data) {
      setForm(toBody(existing.data));
      setWhtTouched(true);
    } else if (prefill.data) {
      setForm(toBody({ ...prefill.data, id: 0 }));
    }
  }, [existing.data, prefill.data]);

  const set = <K extends keyof BillingContactBody>(key: K, value: BillingContactBody[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const save = useMutation({
    mutationFn: () => (id ? registers.updateContact(id, form) : registers.createContact(form)),
    onSuccess: async (saved) => {
      await queryClient.invalidateQueries({ queryKey: ["registers"] });
      await queryClient.invalidateQueries({ queryKey: ["docs"] });
      router.push(`/docs/contacts/edit/?id=${saved.id}`);
    },
    onError: (caught) => setError((caught as ApiError).body?.error ?? "บันทึกไม่สำเร็จ"),
    meta: { success: id ? "บันทึกผู้ติดต่อแล้ว" : "เพิ่มผู้ติดต่อแล้ว" },
  });
  const remove = useMutation({
    mutationFn: () => registers.deleteContact(id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["registers"] });
      router.push("/docs/contacts");
    },
    onError: (caught) => setError((caught as ApiError).body?.error ?? "ลบไม่สำเร็จ"),
    meta: { success: "ลบผู้ติดต่อแล้ว" },
  });

  if ((id && existing.isLoading) || (leadId && prefill.isLoading)) return <Spinner />;
  if (existing.error) return <Alert tone="stop">{(existing.error as Error).message}</Alert>;

  const person = form.contact_type === 5;

  return (
    <form
      className="space-y-5"
      onSubmit={(e) => {
        e.preventDefault();
        setError("");
        save.mutate();
      }}
    >
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold text-foreground sm:text-3xl">
            {id ? form.name || "ผู้ติดต่อ" : "เพิ่มผู้ติดต่อ"}
          </h1>
          <p className="mt-1 font-body text-sm text-muted-foreground">
            {id ? `รหัส ${form.code}` : "เว้นรหัสว่างไว้ ระบบรันให้เอง"}
            {form.lead_id ? (
              <>
                {" · "}
                <Link className="font-semibold text-primary underline" href={leadHref(form.lead_id)}>
                  ลูกค้าใน Lead Tracker
                </Link>
              </>
            ) : null}
          </p>
        </div>
        <div className="flex gap-2">
          {id ? (
            <Button
              type="button"
              size="sm"
              variant="line"
              disabled={remove.isPending}
              onClick={() => {
                if (window.confirm("ลบผู้ติดต่อนี้? ลบได้เฉพาะรายที่ยังไม่มีเอกสาร")) remove.mutate();
              }}
            >
              <Trash2 className="size-4" aria-hidden /> ลบ
            </Button>
          ) : null}
          <Button type="submit" size="sm" disabled={save.isPending || !form.name.trim()}>
            {save.isPending ? "กำลังบันทึก…" : "บันทึก"}
          </Button>
        </div>
      </header>

      {error ? <Alert tone="stop">{error}</Alert> : null}
      {!isAdmin && !id && !form.lead_id ? (
        <Alert tone="stop">
          เซลส์เพิ่มได้เฉพาะผู้ติดต่อของลูกค้าที่ตัวเองดูแล — กลับไปเลือกจาก “สร้างจากลูกค้าใน Lead Tracker” ในหน้าผู้ติดต่อ
        </Alert>
      ) : null}
      {id ? (
        <Alert>แก้ไขแล้วมีผลกับร่างและเอกสารที่ออกจากนี้ไป เอกสารที่ออกเลขแล้วยังแสดงชื่อและที่อยู่ตามตอนที่ออก</Alert>
      ) : null}

      <Panel title="ผู้ติดต่อ">
        <div className="grid gap-4 p-4 sm:grid-cols-2 sm:p-5">
          <Field label="ชื่อตามทะเบียน" required>
            <Input value={form.name} maxLength={255} onChange={(e) => set("name", e.target.value)} required />
          </Field>
          <Field label="รหัส" hint="ตั้งให้ตรงกับรหัสในโปรแกรม PEAK ของสำนักบัญชีได้">
            <Input value={form.code} maxLength={32} placeholder="C-0001" onChange={(e) => set("code", e.target.value)} />
          </Field>
          <Field label="ประเภท" required>
            <Select
              value={form.contact_type}
              onChange={(e) => {
                const type = Number(e.target.value);
                setForm((f) => ({ ...f, contact_type: type, wht_form: whtTouched ? f.wht_form : defaultWhtForm(type) }));
              }}
            >
              {Object.entries(contactTypeLabels).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </Select>
          </Field>
          {person ? (
            <Field label="คำนำหน้า">
              <Select value={form.name_prefix} onChange={(e) => set("name_prefix", Number(e.target.value))}>
                {Object.entries(namePrefixLabels).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </Select>
            </Field>
          ) : null}
          <Field label="ฝั่ง" required>
            <Select value={form.finance_side} onChange={(e) => set("finance_side", e.target.value as BillingContactBody["finance_side"])}>
              {Object.entries(financeSideLabels)
                .filter(([value]) => isAdmin || value === "customer")
                .map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
            </Select>
          </Field>
          <Field label="เลขประจำตัวผู้เสียภาษี" hint="13 หลัก จำเป็นสำหรับใบกำกับภาษีของนิติบุคคล">
            <Input inputMode="numeric" value={form.tax_number} maxLength={17} onChange={(e) => set("tax_number", e.target.value)} />
          </Field>
          <Field label="สาขา" hint="5 หลัก สำนักงานใหญ่ = 00000">
            <Input inputMode="numeric" value={form.branch_code} maxLength={5} onChange={(e) => set("branch_code", e.target.value)} />
          </Field>
          <Field label="หัก ณ ที่จ่ายยื่นแบบ" hint="บุคคล/คณะบุคคล = ภ.ง.ด.3 · นิติบุคคล = ภ.ง.ด.53">
            <Select
              value={form.wht_form}
              onChange={(e) => {
                setWhtTouched(true);
                set("wht_form", e.target.value as "pnd3" | "pnd53");
              }}
            >
              <option value="pnd53">ภ.ง.ด.53</option>
              <option value="pnd3">ภ.ง.ด.3</option>
            </Select>
          </Field>
        </div>
      </Panel>

      <Panel title="ที่อยู่ออกบิล">
        <div className="grid gap-4 p-4 sm:grid-cols-2 sm:p-5">
          <div className="sm:col-span-2">
            <Field label="ที่อยู่" hint="เลขที่ อาคาร ถนน — ใบกำกับภาษีต้องมีที่อยู่ผู้ซื้อ">
              <Input value={form.address} maxLength={500} onChange={(e) => set("address", e.target.value)} />
            </Field>
          </div>
          <Field label="แขวง/ตำบล">
            <Input value={form.sub_district} maxLength={100} onChange={(e) => set("sub_district", e.target.value)} />
          </Field>
          <Field label="เขต/อำเภอ">
            <Input value={form.district} maxLength={100} onChange={(e) => set("district", e.target.value)} />
          </Field>
          <Field label="จังหวัด">
            <Input value={form.province} maxLength={100} onChange={(e) => set("province", e.target.value)} />
          </Field>
          <Field label="รหัสไปรษณีย์">
            <Input inputMode="numeric" value={form.post_code} maxLength={10} onChange={(e) => set("post_code", e.target.value)} />
          </Field>
        </div>
      </Panel>

      <Panel title="ผู้ติดต่อหลักบนเอกสาร">
        <div className="grid gap-4 p-4 sm:grid-cols-2 sm:p-5">
          <Field label="ชื่อ">
            <Input value={form.person_first_name} maxLength={100} onChange={(e) => set("person_first_name", e.target.value)} />
          </Field>
          <Field label="นามสกุล">
            <Input value={form.person_last_name} maxLength={100} onChange={(e) => set("person_last_name", e.target.value)} />
          </Field>
          <Field label="ตำแหน่ง">
            <Input value={form.person_position} maxLength={100} onChange={(e) => set("person_position", e.target.value)} />
          </Field>
          <Field label="โทร">
            <Input value={form.person_phone} maxLength={40} onChange={(e) => set("person_phone", e.target.value)} />
          </Field>
          <Field label="อีเมล" hint="ใช้เติมช่อง “ถึง” ตอนร่างอีเมล ระบบไม่ส่งอีเมลเอง">
            <Input type="email" value={form.person_email} maxLength={200} onChange={(e) => set("person_email", e.target.value)} />
          </Field>
        </div>
      </Panel>
    </form>
  );
}
