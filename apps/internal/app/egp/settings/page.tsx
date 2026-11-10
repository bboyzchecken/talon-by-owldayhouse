"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Button } from "@odh/ui";
import { Alert, Field, Input, Panel, Select, Spinner, Textarea } from "@/components/ui";
import { ApiError, egp } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useMeta } from "@/lib/hooks";
import type { EgpSettings } from "@/lib/types";

/** One entry per line, for every list setting. */
const toLines = (values: string[]) => values.join("\n");
const fromLines = (text: string) =>
  text
    .split("\n")
    .map((v) => v.trim())
    .filter(Boolean);

export default function RadarSettingsPage() {
  const { isAdmin, loading } = useAuth();
  const queryClient = useQueryClient();
  const { data: meta } = useMeta();
  const { data, isLoading } = useQuery({ queryKey: ["egp", "settings"], queryFn: egp.settings, enabled: isAdmin });

  const [form, setForm] = useState<EgpSettings | null>(null);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (data && !form) setForm(data.settings);
  }, [data, form]);

  const save = useMutation({
    mutationFn: (settings: EgpSettings) => egp.saveSettings(settings),
    onSuccess: async (result) => {
      setForm(result.settings);
      setSaved(true);
      setError("");
      await queryClient.invalidateQueries({ queryKey: ["egp"] });
    },
    onError: (caught) => {
      setSaved(false);
      setError((caught as ApiError).body?.error ?? "บันทึกไม่สำเร็จ");
    },
  });

  if (loading || isLoading || !form || !data) return <Spinner />;
  if (!isAdmin) return <Alert tone="stop">ใช้ได้เฉพาะแอดมิน</Alert>;

  const update = (patch: Partial<EgpSettings>) => {
    setSaved(false);
    setForm({ ...form, ...patch });
  };
  const sales = (meta?.users ?? []).filter((u) => u.role === "sales");

  return (
    <div className="space-y-5">
      <header>
        <h1 className="font-display text-2xl font-semibold text-ink sm:text-3xl">ตั้งค่า Radar</h1>
        <p className="mt-1 max-w-2xl font-body text-sm text-muted">
          เปลี่ยนแล้วมีผลกับประกาศที่นำเข้าไว้แล้วทั้งหมดทันที ไม่ต้องนำเข้าใหม่
        </p>
      </header>

      {error ? <Alert tone="stop">{error}</Alert> : null}
      {saved ? <Alert>บันทึกแล้ว</Alert> : null}

      <Panel title="หน่วยงาน">
        <fieldset>
          <legend className="mb-2 font-display text-sm font-semibold text-ink">กลุ่มหน่วยงานที่สนใจ</legend>
          <div className="flex flex-wrap gap-2">
            {data.groups.map((group) => {
              const checked = form.agency_groups.includes(group.key);
              return (
                <label
                  key={group.key}
                  className={`cursor-pointer rounded-full border px-3 py-2 font-display text-sm font-semibold transition-colors ${
                    checked ? "border-navy bg-navy text-white" : "border-line text-muted hover:border-ink"
                  }`}
                >
                  <input
                    type="checkbox"
                    className="sr-only"
                    checked={checked}
                    onChange={(event) =>
                      update({
                        agency_groups: event.target.checked
                          ? [...form.agency_groups, group.key]
                          : form.agency_groups.filter((g) => g !== group.key),
                      })
                    }
                  />
                  {group.label}
                </label>
              );
            })}
          </div>
        </fieldset>

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <Field label="หน่วยงานที่จับตา" hint="บรรทัดละชื่อ ใส่แค่บางส่วนของชื่อก็ได้ ผ่านตัวกรองกลุ่มเสมอและได้คะแนนเพิ่ม">
            <Textarea
              rows={4}
              value={toLines(form.watchlist)}
              onChange={(event) => update({ watchlist: fromLines(event.target.value) })}
            />
          </Field>
          <Field label="หน่วยงานที่ไม่เอา" hint="บรรทัดละชื่อ ไม่แสดงเลยไม่ว่ากรณีใด">
            <Textarea
              rows={4}
              value={toLines(form.blocklist)}
              onChange={(event) => update({ blocklist: fromLines(event.target.value) })}
            />
          </Field>
          <Field label="จังหวัด" hint="บรรทัดละจังหวัด เว้นว่าง = ทุกจังหวัด (ใช้เฉพาะเมื่อไฟล์จาก e-GP มีคอลัมน์จังหวัด)">
            <Textarea
              rows={3}
              value={toLines(form.provinces)}
              onChange={(event) => update({ provinces: fromLines(event.target.value) })}
            />
          </Field>
        </div>
      </Panel>

      <Panel title="วงเงินและเวลา">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="วงเงินขั้นต่ำ (บาท)" hint="ต่ำกว่านี้ไม่แสดง">
            <Input
              inputMode="numeric"
              value={String(form.budget_min)}
              onChange={(event) => update({ budget_min: Number(event.target.value.replace(/[^\d]/g, "")) || 0 })}
            />
          </Field>
          <Field label="วงเงินที่ยื่นได้ (บาท)" hint="เกินนี้ยังแสดง แต่ติดป้าย “เกินวงเงินที่ตั้ง”">
            <Input
              inputMode="numeric"
              value={String(form.budget_max)}
              onChange={(event) => update({ budget_max: Number(event.target.value.replace(/[^\d]/g, "")) || 0 })}
            />
          </Field>
          <Field label="เวลาเตรียมขั้นต่ำ (วัน)" hint="เหลือน้อยกว่านี้ก่อนปิดรับ ติดป้าย “เวลาเตรียมสั้น”">
            <Input
              type="number"
              min={0}
              max={90}
              value={form.min_prep_days}
              onChange={(event) => update({ min_prep_days: Number(event.target.value) || 0 })}
            />
          </Field>
          <Field label="ให้เซลส์ตามต่อก่อนปิดรับ (วัน)" hint="ตั้ง “วันที่ต้องทำต่อ” ของลูกค้าเร็วกว่าวันปิดรับเท่านี้">
            <Input
              type="number"
              min={0}
              max={90}
              value={form.lead_time_days}
              onChange={(event) => update({ lead_time_days: Number(event.target.value) || 0 })}
            />
          </Field>
        </div>
        <div className="mt-4 space-y-2">
          <label className="flex items-start gap-2 font-body text-sm text-ink">
            <input
              type="checkbox"
              checked={form.hide_flagged_by_default}
              onChange={(event) => update({ hide_flagged_by_default: event.target.checked })}
              className="mt-0.5 size-4 rounded border-line-control accent-navy"
            />
            แยกงานที่ติดป้ายระวังไปแท็บของมันเอง (ไม่ปนในแท็บ “น่าสนใจ”)
          </label>
          <label className="flex items-start gap-2 font-body text-sm text-ink">
            <input
              type="checkbox"
              checked={form.hire_only}
              onChange={(event) => update({ hire_only: event.target.checked })}
              className="mt-0.5 size-4 rounded border-line-control accent-navy"
            />
            เฉพาะงานจ้าง (ไม่เอางานซื้อของ)
          </label>
        </div>
      </Panel>

      <Panel title="บริการและคำค้น">
        <p className="mb-4 font-body text-sm text-muted">
          ชื่อโครงการต้องมีคำในกลุ่มที่เปิดไว้อย่างน้อยหนึ่งคำ บรรทัดละคำ ระบบหาคำเฉพาะส่วนที่บอกว่า
          <strong className="text-ink">จ้างอะไร</strong> (ก่อนคำอย่าง “เพื่อ” “สำหรับ” “ตามโครงการ” “ไปกลับ”) เช่น
          “จ้างเหมารถตู้ไปอบรม” งานที่จ้างคือรถตู้ จึงไม่ตรงคำว่า “อบรม”
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          {form.service_groups.map((group, index) => (
            <div key={group.key} className="rounded-xl border border-line p-4">
              <label className="flex items-center gap-2 font-display text-sm font-semibold text-ink">
                <input
                  type="checkbox"
                  checked={group.enabled}
                  onChange={(event) => {
                    const next = [...form.service_groups];
                    next[index] = { ...group, enabled: event.target.checked };
                    update({ service_groups: next });
                  }}
                  className="size-4 rounded border-line-control accent-navy"
                />
                {group.label}
              </label>
              <Textarea
                className="mt-2"
                rows={5}
                value={toLines(group.keywords)}
                onChange={(event) => {
                  const next = [...form.service_groups];
                  next[index] = { ...group, keywords: fromLines(event.target.value) };
                  update({ service_groups: next });
                }}
                aria-label={`คำค้นของ ${group.label}`}
              />
            </div>
          ))}
        </div>
        <div className="mt-4">
          <Field label="คำที่ตัดทิ้ง" hint="ตัดทิ้งเมื่อคำนี้อยู่ในส่วนที่บอกว่าจ้างอะไร ยกเว้นคำที่ตามหลังคำค้นของงานระบบ สื่อ และออนไลน์ (“พัฒนาระบบลงทะเบียนยานพาหนะ” ยังผ่าน)">
            <Textarea
              rows={4}
              value={toLines(form.exclude_keywords)}
              onChange={(event) => update({ exclude_keywords: fromLines(event.target.value) })}
            />
          </Field>
        </div>
      </Panel>

      <Panel title="ข้อมูลบริษัทสำหรับการวิเคราะห์">
        <Field
          label="ติดไปกับทุกไฟล์ที่ส่งออกให้ Claude"
          hint="เขียนเท่าที่เป็นจริง ผลวิเคราะห์ว่ายื่นได้ไหมขึ้นกับข้อมูลนี้ ไม่เกิน 4,000 ตัวอักษร"
        >
          <Textarea
            rows={7}
            value={form.analysis_context ?? ""}
            onChange={(event) => update({ analysis_context: event.target.value })}
            placeholder={[
              "ทุนจดทะเบียน:",
              "ผลงานที่มีสัญญาหรือหนังสือรับรองผลงาน (หน่วยงาน, ปี, มูลค่า, งานอะไร):",
              "ทีมที่ลงงานได้จริง (จำนวนคน, ความถนัด):",
              "พาร์ทเนอร์ที่ร่วมยื่นหรือรับช่วงได้:",
              "ขนาดงานที่รับไหว และงานที่ไม่รับ:",
            ].join("\n")}
          />
        </Field>
      </Panel>

      <Panel title="การส่งให้เซลส์">
        <Field label="ผู้รับโดยค่าเริ่มต้น" hint="เปลี่ยนได้ทีละประกาศในหน้า Radar">
          <Select
            value={form.default_assignee_id ? String(form.default_assignee_id) : ""}
            onChange={(event) =>
              update({ default_assignee_id: event.target.value ? Number(event.target.value) : null })
            }
          >
            <option value="">ตัวฉันเอง (แอดมินที่กดส่ง)</option>
            {sales.map((person) => (
              <option key={person.id} value={person.id}>
                {person.name}
              </option>
            ))}
          </Select>
        </Field>
      </Panel>

      <div className="flex flex-wrap gap-2">
        <Button onClick={() => save.mutate(form)} disabled={save.isPending}>
          {save.isPending ? "กำลังบันทึก…" : "บันทึก"}
        </Button>
        <Button
          variant="line"
          onClick={() => {
            setSaved(false);
            setForm(data.defaults);
          }}
        >
          คืนค่าเริ่มต้น
        </Button>
      </div>
    </div>
  );
}
