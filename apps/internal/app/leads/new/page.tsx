"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { AlertTriangle, CheckCircle2 } from "lucide-react";
import { Button } from "@odh/ui";
import { leadHref } from "@/components/lead-card";
import { Alert, Field, Input, Panel, Select, Textarea } from "@/components/ui";
import { ApiError, leads as leadsApi, type CreateLeadBody } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { formatDate } from "@/lib/format";
import { useMeta } from "@/lib/hooks";
import {
  industryLabels,
  interestLabels,
  labelOf,
  ownerTypeLabels,
  sourceLabels,
} from "@/lib/labels";

/** Debounce a value, so the duplicate check does not fire on every keystroke. */
function useDebounced<T>(value: T, delay = 400): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}

export default function NewLeadPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { isAdmin, user } = useAuth();
  const { data: meta } = useMeta();

  const [form, setForm] = useState({
    name: "",
    tax_id: "",
    website: "",
    industry: "other",
    source: "trade_fair",
    source_detail: "",
    owner_type: "company",
    owner_user_id: "",
    estimated_value: "",
    next_action: "",
    next_action_date: "",
    notes: "",
    do_not_pitch: false,
    do_not_pitch_reason: "",
    contact_name: "",
    contact_position: "",
    contact_phone: "",
    contact_line: "",
    contact_email: "",
  });
  const [interests, setInterests] = useState<string[]>([]);
  const [confirmSimilar, setConfirmSimilar] = useState(false);
  const [error, setError] = useState("");

  const debouncedName = useDebounced(form.name);
  const debouncedTaxID = useDebounced(form.tax_id);

  // The live duplicate / similar-name check while typing.
  const check = useQuery({
    queryKey: ["leads", "check", debouncedName, debouncedTaxID],
    queryFn: () => leadsApi.check(debouncedName, debouncedTaxID),
    enabled: debouncedName.trim().length >= 2 || debouncedTaxID.trim().length >= 10,
  });

  const duplicate = check.data?.duplicate ?? null;
  const similar = check.data?.similar ?? [];

  // Whether this account may still register one of its own existing customers.
  const cutoff = meta?.sales_existing_cutoff ?? "";
  const cutoffOpen = useMemo(() => {
    if (isAdmin) return true;
    if (!cutoff) return false;
    return new Date(`${cutoff}T23:59:59+07:00`).getTime() >= Date.now();
  }, [cutoff, isAdmin]);

  useEffect(() => {
    if (!cutoffOpen && form.owner_type === "sales_existing") {
      setForm((current) => ({ ...current, owner_type: "company" }));
    }
  }, [cutoffOpen, form.owner_type]);

  const create = useMutation({
    mutationFn: (body: CreateLeadBody) => leadsApi.create(body),
    onSuccess: async (lead) => {
      await queryClient.invalidateQueries({ queryKey: ["leads"] });
      router.push(leadHref(lead.id));
    },
  });

  function set<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError("");

    if (duplicate) {
      setError("รายนี้มีอยู่ในระบบแล้ว จึงเพิ่มซ้ำไม่ได้");
      return;
    }

    const body: CreateLeadBody = {
      name: form.name.trim(),
      tax_id: form.tax_id.trim() || undefined,
      website: form.website.trim() || undefined,
      industry: form.industry,
      source: form.source,
      source_detail: form.source_detail.trim() || undefined,
      owner_type: form.owner_type,
      owner_user_id: form.owner_user_id ? Number(form.owner_user_id) : undefined,
      interests,
      estimated_value: form.estimated_value ? Number(form.estimated_value) : undefined,
      next_action: form.next_action.trim() || undefined,
      next_action_date: form.next_action_date || undefined,
      notes: form.notes.trim() || undefined,
      do_not_pitch: form.do_not_pitch,
      do_not_pitch_reason: form.do_not_pitch_reason.trim() || undefined,
      confirm_similar: confirmSimilar || similar.length === 0,
    };

    if (form.contact_name.trim()) {
      body.contact = {
        name: form.contact_name.trim(),
        position: form.contact_position.trim() || undefined,
        phone: form.contact_phone.trim() || undefined,
        line_id: form.contact_line.trim() || undefined,
        email: form.contact_email.trim() || undefined,
      };
    }

    try {
      await create.mutateAsync(body);
    } catch (caught) {
      const apiError = caught as ApiError;
      setError(apiError.body?.error ?? "บันทึกไม่สำเร็จ");
      if (apiError.body?.needs_confirm) {
        setConfirmSimilar(false);
      }
    }
  }

  const blocked = Boolean(duplicate);
  const needsConfirm = similar.length > 0 && !confirmSimilar;

  return (
    <form onSubmit={onSubmit} className="space-y-5" noValidate>
      <header>
        <h1 className="font-display text-2xl font-semibold text-ink sm:text-3xl">เพิ่มลูกค้า</h1>
        <p className="mt-1 font-body text-sm text-muted">
          ใครลงชื่อก่อนเป็นเจ้าของ ระบบจะเช็กชื่อซ้ำและชื่อคล้ายให้ระหว่างพิมพ์
        </p>
      </header>

      {error ? <Alert>{error}</Alert> : null}

      <Panel title="ข้อมูลบริษัท">
        <div className="space-y-4">
          <Field
            label="ชื่อบริษัท"
            required
            hint={
              check.data?.normalized_name
                ? `ชื่อที่ใช้เทียบซ้ำ: ${check.data.normalized_name}`
                : "พิมพ์ได้ทั้ง “บริษัท … จำกัด” หรือชื่อสั้น ระบบตัดคำนำหน้าให้เอง"
            }
          >
            <Input
              value={form.name}
              onChange={(event) => set("name", event.target.value)}
              placeholder="บริษัท ตัวอย่าง จำกัด"
              required
              autoComplete="off"
            />
          </Field>

          {/* The duplicate answer: whose it is, and since when. */}
          {duplicate ? (
            <Alert tone="stop">
              <div className="flex items-start gap-2">
                <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden />
                <div>
                  <p className="font-display font-semibold">รายนี้มีอยู่ในระบบแล้ว</p>
                  <p className="mt-1">
                    <span className="font-semibold">{duplicate.name}</span> —{" "}
                    {labelOf(ownerTypeLabels, duplicate.owner_type)}
                    {duplicate.owner_name ? ` · ดูแลโดย ${duplicate.owner_name}` : " · ยังไม่มอบหมาย"}
                    {duplicate.registered_by ? ` · ลงโดย ${duplicate.registered_by}` : ""} ·
                    ลงไว้เมื่อ {formatDate(duplicate.registered_at)}
                  </p>
                  <Link
                    href={leadHref(duplicate.id)}
                    className="mt-2 inline-block font-display text-sm font-semibold underline"
                  >
                    เปิดดูรายนี้
                  </Link>
                </div>
              </div>
            </Alert>
          ) : null}

          {!duplicate && similar.length > 0 ? (
            <Alert>
              <p className="font-display font-semibold">มีลูกค้าชื่อคล้ายกันอยู่แล้ว</p>
              <ul className="mt-2 space-y-1">
                {similar.map((row) => (
                  <li key={row.id}>
                    <Link href={leadHref(row.id)} className="underline">
                      {row.name}
                    </Link>{" "}
                    — {row.owner_name || "ยังไม่มอบหมาย"} · ลงไว้ {formatDate(row.registered_at)} ·
                    ความคล้าย {Math.round(row.similarity * 100)}%
                  </li>
                ))}
              </ul>
              <label className="mt-3 flex items-start gap-2 font-body text-sm">
                <input
                  type="checkbox"
                  checked={confirmSimilar}
                  onChange={(event) => setConfirmSimilar(event.target.checked)}
                  className="mt-0.5 size-4 rounded border-line-control accent-navy"
                />
                ตรวจแล้ว ไม่ใช่รายเดียวกัน — ยืนยันเพิ่มรายใหม่
              </label>
            </Alert>
          ) : null}

          {!duplicate && similar.length === 0 && form.name.trim().length >= 2 && !check.isFetching ? (
            <p className="flex items-center gap-1.5 font-body text-sm text-muted">
              <CheckCircle2 className="size-4 text-navy" aria-hidden />
              ยังไม่มีชื่อนี้หรือชื่อคล้ายกันในระบบ
            </p>
          ) : null}

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="เลขผู้เสียภาษี" hint="ถ้ามี — ใช้กันซ้ำได้แม่นกว่าชื่อ">
              <Input
                value={form.tax_id}
                onChange={(event) => set("tax_id", event.target.value)}
                inputMode="numeric"
                placeholder="0105543000191"
              />
            </Field>
            <Field label="เว็บไซต์">
              <Input
                value={form.website}
                onChange={(event) => set("website", event.target.value)}
                placeholder="https://example.com"
                inputMode="url"
              />
            </Field>
            <Field label="กลุ่มธุรกิจ" required>
              <Select value={form.industry} onChange={(event) => set("industry", event.target.value)}>
                {(meta?.industries ?? []).map((value) => (
                  <option key={value} value={value}>
                    {labelOf(industryLabels, value)}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="แหล่งที่มา" required>
              <Select value={form.source} onChange={(event) => set("source", event.target.value)}>
                {(meta?.sources ?? []).map((value) => (
                  <option key={value} value={value}>
                    {labelOf(sourceLabels, value)}
                  </option>
                ))}
              </Select>
            </Field>
          </div>

          <Field label="รายละเอียดแหล่งที่มา" hint="เช่น ชื่องานแสดงสินค้า เลขประกาศ e-GP หรือลิงก์">
            <Input
              value={form.source_detail}
              onChange={(event) => set("source_detail", event.target.value)}
            />
          </Field>
        </div>
      </Panel>

      <Panel title="เจ้าของและการติดตาม">
        <div className="space-y-4">
          <Field
            label="ประเภทเจ้าของ"
            hint={
              cutoffOpen
                ? `ลงลูกค้าเดิมของตัวเองได้ถึง ${formatDate(cutoff)}`
                : `หมดเขตลงลูกค้าเดิมของเซลส์แล้ว (${formatDate(cutoff)}) — ขอให้แอดมินลงให้`
            }
          >
            <Select value={form.owner_type} onChange={(event) => set("owner_type", event.target.value)}>
              <option value="company">{labelOf(ownerTypeLabels, "company")} — นับเป็น KPI หลัก</option>
              {cutoffOpen ? (
                <option value="sales_existing">
                  {labelOf(ownerTypeLabels, "sales_existing")} — นับเป็นโบนัส
                </option>
              ) : null}
            </Select>
          </Field>

          {isAdmin ? (
            <Field label="มอบหมายให้เซลส์" hint="เว้นว่างไว้ได้ แล้วมอบหมายภายหลังในหน้ารายละเอียด">
              <Select
                value={form.owner_user_id}
                onChange={(event) => set("owner_user_id", event.target.value)}
              >
                <option value="">— ยังไม่มอบหมาย —</option>
                {(meta?.users ?? []).map((person) => (
                  <option key={person.id} value={person.id}>
                    {person.name}
                  </option>
                ))}
              </Select>
            </Field>
          ) : (
            <p className="font-body text-sm text-muted">
              ลูกค้ารายนี้จะเป็นของ <span className="font-semibold text-ink">{user?.name}</span>
            </p>
          )}

          <fieldset>
            <legend className="mb-1.5 font-display text-sm font-semibold text-ink">บริการที่สนใจ</legend>
            <div className="flex flex-wrap gap-2">
              {(meta?.interests ?? []).map((value) => {
                const checked = interests.includes(value);
                return (
                  <label
                    key={value}
                    className={`cursor-pointer rounded-full border px-3 py-2 font-display text-sm font-semibold transition-colors ${
                      checked ? "border-navy bg-navy text-white" : "border-line text-muted hover:border-ink"
                    }`}
                  >
                    <input
                      type="checkbox"
                      className="sr-only"
                      checked={checked}
                      onChange={(event) =>
                        setInterests((current) =>
                          event.target.checked
                            ? [...current, value]
                            : current.filter((item) => item !== value),
                        )
                      }
                    />
                    {labelOf(interestLabels, value)}
                  </label>
                );
              })}
            </div>
          </fieldset>

          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="มูลค่าที่คาด (บาท)">
              <Input
                value={form.estimated_value}
                onChange={(event) => set("estimated_value", event.target.value)}
                inputMode="numeric"
                placeholder="0"
              />
            </Field>
            <Field label="สิ่งที่ต้องทำต่อ">
              <Input
                value={form.next_action}
                onChange={(event) => set("next_action", event.target.value)}
                placeholder="โทรนัดคุย"
              />
            </Field>
            <Field label="วันที่ต้องทำต่อ">
              <Input
                type="date"
                value={form.next_action_date}
                onChange={(event) => set("next_action_date", event.target.value)}
              />
            </Field>
          </div>

          <Field label="บันทึกเพิ่มเติม">
            <Textarea value={form.notes} onChange={(event) => set("notes", event.target.value)} />
          </Field>

          <div className="rounded-xl border border-line p-4">
            <label className="flex items-start gap-2 font-body text-sm text-ink">
              <input
                type="checkbox"
                checked={form.do_not_pitch}
                onChange={(event) => set("do_not_pitch", event.target.checked)}
                className="mt-0.5 size-4 rounded border-line-control accent-navy"
              />
              <span>
                <span className="font-display font-semibold">ห้ามเสนอขายตรง (do not pitch)</span>
                <span className="mt-0.5 block text-muted">
                  ใช้กับแบรนด์ที่เป็นลูกค้าของเอเจนซีที่จ้างเรา — ย้ายไปขั้นยื่นข้อเสนอหรือปิดการขายไม่ได้
                </span>
              </span>
            </label>
            {form.do_not_pitch ? (
              <div className="mt-3">
                <Field label="เหตุผล" required>
                  <Input
                    value={form.do_not_pitch_reason}
                    onChange={(event) => set("do_not_pitch_reason", event.target.value)}
                    placeholder="เช่น เป็นลูกค้าของเอเจนซี X ที่จ้างเราผลิตงาน"
                  />
                </Field>
              </div>
            ) : null}
          </div>
        </div>
      </Panel>

      <Panel title="ผู้ติดต่อคนแรก (ไม่บังคับ)">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="ชื่อผู้ติดต่อ">
            <Input
              value={form.contact_name}
              onChange={(event) => set("contact_name", event.target.value)}
            />
          </Field>
          <Field label="ตำแหน่ง">
            <Input
              value={form.contact_position}
              onChange={(event) => set("contact_position", event.target.value)}
            />
          </Field>
          <Field label="เบอร์โทร">
            <Input
              value={form.contact_phone}
              onChange={(event) => set("contact_phone", event.target.value)}
              inputMode="tel"
            />
          </Field>
          <Field label="LINE ID">
            <Input
              value={form.contact_line}
              onChange={(event) => set("contact_line", event.target.value)}
            />
          </Field>
          <Field label="อีเมล" hint="เก็บเป็นข้อมูลเท่านั้น ระบบไม่ส่งอีเมล">
            <Input
              type="email"
              value={form.contact_email}
              onChange={(event) => set("contact_email", event.target.value)}
            />
          </Field>
        </div>
      </Panel>

      {/* Not sticky: on a phone it would sit on top of the form it belongs to,
          and the bottom tab bar is already there. */}
      <div className="flex flex-wrap gap-3">
        <Button type="submit" disabled={blocked || needsConfirm || create.isPending}>
          {create.isPending ? "กำลังบันทึก…" : "บันทึกลูกค้า"}
        </Button>
        <Button asChild variant="line" type="button">
          <Link href="/leads/list">ยกเลิก</Link>
        </Button>
        {needsConfirm ? (
          <p className="w-full font-body text-xs text-muted">
            ติ๊กยืนยันด้านบนก่อน ว่าไม่ใช่รายเดียวกับที่ชื่อคล้ายกัน
          </p>
        ) : null}
      </div>
    </form>
  );
}
