"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Suspense, useState } from "react";
import { AlertOctagon, ArrowLeft, Globe, Pencil } from "lucide-react";
import { Button } from "@odh/ui";
import { DoNotPitchBadge, OwnerTypeBadge, StageBadge } from "@/components/badges";
import { ActivityPanel } from "@/components/lead-detail/activity-panel";
import { AssignPanel } from "@/components/lead-detail/assign-panel";
import { ContactsPanel } from "@/components/lead-detail/contacts-panel";
import { FilesPanel } from "@/components/lead-detail/files-panel";
import { StageControl } from "@/components/lead-detail/stage-control";
import { Alert, EmptyState, Field, Input, Panel, Select, Spinner, Textarea } from "@/components/ui";
import { ApiError, leads as leadsApi, type UpdateLeadBody } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { formatBaht, formatDate } from "@/lib/format";
import { useMeta } from "@/lib/hooks";
import {
  industryLabels,
  interestLabels,
  labelOf,
  sourceLabels,
} from "@/lib/labels";
import type { Lead } from "@/lib/types";

export default function LeadDetailPage() {
  return (
    <Suspense fallback={<Spinner />}>
      <LeadDetail />
    </Suspense>
  );
}

function LeadDetail() {
  const params = useSearchParams();
  const id = Number(params.get("id"));
  const { isAdmin } = useAuth();

  const { data, isLoading, error } = useQuery({
    queryKey: ["leads", id, "detail"],
    queryFn: () => leadsApi.get(id),
    enabled: Number.isFinite(id) && id > 0,
  });

  if (!Number.isFinite(id) || id <= 0) {
    return (
      <EmptyState
        title="ไม่พบลูกค้ารายนี้"
        hint="ลิงก์ไม่ถูกต้อง"
        action={
          <Button asChild size="sm">
            <Link href="/leads/list">กลับไปหน้ารายชื่อ</Link>
          </Button>
        }
      />
    );
  }
  if (isLoading) return <Spinner />;
  if (error) return <Alert>{(error as Error).message}</Alert>;
  if (!data) return null;

  const { lead, can_edit: canEdit } = data;

  return (
    <div className="space-y-5">
      <Link
        href="/leads/list"
        className="inline-flex items-center gap-1.5 font-display text-sm font-semibold text-muted transition-colors hover:text-navy"
      >
        <ArrowLeft className="size-4" aria-hidden />
        รายชื่อลูกค้า
      </Link>

      {/* The do_not_pitch warning is the first thing on the screen. */}
      {lead.do_not_pitch ? (
        <Alert tone="stop">
          <div className="flex items-start gap-2">
            <AlertOctagon className="mt-0.5 size-5 shrink-0" aria-hidden />
            <div>
              <p className="font-display text-base font-semibold">ห้ามเสนอขายตรงกับลูกค้ารายนี้</p>
              <p className="mt-0.5">
                {lead.do_not_pitch_reason ||
                  "เป็นแบรนด์ที่เป็นลูกค้าของเอเจนซีที่จ้างเรา ติดต่อผ่านเอเจนซีเท่านั้น"}
              </p>
            </div>
          </div>
        </Alert>
      ) : null}

      <header>
        <div className="flex flex-wrap items-center gap-1.5">
          <StageBadge stage={lead.stage} />
          <OwnerTypeBadge ownerType={lead.owner_type} ownerName={lead.owner?.name} />
          {lead.do_not_pitch ? <DoNotPitchBadge reason={lead.do_not_pitch_reason} /> : null}
        </div>
        <h1 className="mt-2 font-display text-2xl font-semibold text-ink sm:text-3xl">{lead.name}</h1>
        <p className="mt-1 font-body text-sm text-muted">
          {labelOf(industryLabels, lead.industry)} · {labelOf(sourceLabels, lead.source)}
          {lead.source_detail ? ` · ${lead.source_detail}` : ""} · ลงทะเบียน{" "}
          {formatDate(lead.registered_at)}
          {lead.registrar ? ` โดย ${lead.registrar.name}` : ""}
        </p>
        {lead.website ? (
          <a
            href={lead.website.startsWith("http") ? lead.website : `https://${lead.website}`}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-2 inline-flex items-center gap-1.5 font-body text-sm text-navy underline"
          >
            <Globe className="size-4" aria-hidden />
            {lead.website}
          </a>
        ) : null}
      </header>

      <LeadFacts lead={lead} canEdit={canEdit} />

      <StageControl lead={lead} canEdit={canEdit} />
      <ContactsPanel leadId={lead.id} canEdit={canEdit} />
      <ActivityPanel lead={lead} canEdit={canEdit} />
      <FilesPanel leadId={lead.id} canEdit={canEdit} />
      <AssignPanel lead={lead} isAdmin={isAdmin} />
    </div>
  );
}

/** The lead's own fields, with an inline edit form for whoever may edit. */
function LeadFacts({ lead, canEdit }: { lead: Lead; canEdit: boolean }) {
  const queryClient = useQueryClient();
  const { data: meta } = useMeta();
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    name: lead.name,
    tax_id: lead.tax_id ?? "",
    website: lead.website,
    industry: lead.industry as string,
    source: lead.source as string,
    source_detail: lead.source_detail,
    estimated_value: lead.estimated_value ? String(lead.estimated_value) : "",
    next_action: lead.next_action,
    next_action_date: lead.next_action_date?.slice(0, 10) ?? "",
    notes: lead.notes,
    do_not_pitch: lead.do_not_pitch,
    do_not_pitch_reason: lead.do_not_pitch_reason,
  });
  const [interests, setInterests] = useState<string[]>(lead.interests ?? []);

  const save = useMutation({
    mutationFn: () => {
      const body: UpdateLeadBody = {
        name: form.name.trim(),
        tax_id: form.tax_id.trim(),
        website: form.website.trim(),
        industry: form.industry,
        source: form.source,
        source_detail: form.source_detail.trim(),
        interests,
        estimated_value: form.estimated_value ? Number(form.estimated_value) : 0,
        next_action: form.next_action.trim(),
        next_action_date: form.next_action_date,
        notes: form.notes,
        do_not_pitch: form.do_not_pitch,
        do_not_pitch_reason: form.do_not_pitch_reason.trim(),
      };
      return leadsApi.update(lead.id, body);
    },
    onSuccess: async () => {
      setEditing(false);
      setError("");
      await queryClient.invalidateQueries({ queryKey: ["leads"] });
    },
    onError: (caught) => setError((caught as ApiError).body?.error ?? "บันทึกไม่สำเร็จ"),
  });

  if (!editing) {
    return (
      <Panel
        title="ข้อมูลลูกค้า"
        action={
          canEdit ? (
            <Button size="sm" variant="line" onClick={() => setEditing(true)}>
              <Pencil className="size-4" aria-hidden />
              แก้ข้อมูล
            </Button>
          ) : null
        }
      >
        <dl className="grid gap-4 sm:grid-cols-2">
          <Fact label="เลขผู้เสียภาษี" value={lead.tax_id || "—"} />
          <Fact label="มูลค่าที่คาด" value={lead.estimated_value ? formatBaht(lead.estimated_value) : "—"} />
          <Fact label="สิ่งที่ต้องทำต่อ" value={lead.next_action || "—"} />
          <Fact label="วันที่ต้องทำต่อ" value={formatDate(lead.next_action_date)} />
          <Fact
            label="บริการที่สนใจ"
            value={
              (lead.interests ?? []).length > 0
                ? (lead.interests ?? []).map((value) => labelOf(interestLabels, value)).join(", ")
                : "—"
            }
          />
          <Fact label="utm" value={[lead.utm_source, lead.utm_campaign].filter(Boolean).join(" / ") || "—"} />
          {lead.stage === "lost" && lead.lost_reason ? (
            <Fact label="เหตุผลที่ไม่ได้งาน" value={lead.lost_reason} />
          ) : null}
          <div className="sm:col-span-2">
            <dt className="font-mono text-[11px] uppercase tracking-wide text-muted">บันทึก</dt>
            <dd className="mt-1 whitespace-pre-line font-body text-sm text-ink">{lead.notes || "—"}</dd>
          </div>
        </dl>
      </Panel>
    );
  }

  return (
    <Panel title="แก้ข้อมูลลูกค้า">
      {error ? <Alert tone="stop">{error}</Alert> : null}
      <div className="space-y-4">
        <Field label="ชื่อบริษัท" required hint="ถ้าเปลี่ยนชื่อ ระบบจะเช็กซ้ำกับรายอื่นอีกครั้ง">
          <Input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="เลขผู้เสียภาษี">
            <Input
              value={form.tax_id}
              onChange={(event) => setForm({ ...form, tax_id: event.target.value })}
              inputMode="numeric"
            />
          </Field>
          <Field label="เว็บไซต์">
            <Input value={form.website} onChange={(event) => setForm({ ...form, website: event.target.value })} />
          </Field>
          <Field label="กลุ่มธุรกิจ">
            <Select
              value={form.industry}
              onChange={(event) => setForm({ ...form, industry: event.target.value })}
            >
              {(meta?.industries ?? []).map((value) => (
                <option key={value} value={value}>
                  {labelOf(industryLabels, value)}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="แหล่งที่มา">
            <Select value={form.source} onChange={(event) => setForm({ ...form, source: event.target.value })}>
              {(meta?.sources ?? []).map((value) => (
                <option key={value} value={value}>
                  {labelOf(sourceLabels, value)}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="รายละเอียดแหล่งที่มา">
            <Input
              value={form.source_detail}
              onChange={(event) => setForm({ ...form, source_detail: event.target.value })}
            />
          </Field>
          <Field label="มูลค่าที่คาด (บาท)">
            <Input
              value={form.estimated_value}
              onChange={(event) => setForm({ ...form, estimated_value: event.target.value })}
              inputMode="numeric"
            />
          </Field>
          <Field label="สิ่งที่ต้องทำต่อ">
            <Input
              value={form.next_action}
              onChange={(event) => setForm({ ...form, next_action: event.target.value })}
            />
          </Field>
          <Field label="วันที่ต้องทำต่อ">
            <Input
              type="date"
              value={form.next_action_date}
              onChange={(event) => setForm({ ...form, next_action_date: event.target.value })}
            />
          </Field>
        </div>

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
                        event.target.checked ? [...current, value] : current.filter((item) => item !== value),
                      )
                    }
                  />
                  {labelOf(interestLabels, value)}
                </label>
              );
            })}
          </div>
        </fieldset>

        <Field label="บันทึก">
          <Textarea value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} />
        </Field>

        <div className="rounded-xl border border-line p-4">
          <label className="flex items-start gap-2 font-body text-sm text-ink">
            <input
              type="checkbox"
              checked={form.do_not_pitch}
              onChange={(event) => setForm({ ...form, do_not_pitch: event.target.checked })}
              className="mt-0.5 size-4 rounded border-line-control accent-navy"
            />
            <span className="font-display font-semibold">ห้ามเสนอขายตรง (do not pitch)</span>
          </label>
          {form.do_not_pitch ? (
            <div className="mt-3">
              <Field label="เหตุผล">
                <Input
                  value={form.do_not_pitch_reason}
                  onChange={(event) => setForm({ ...form, do_not_pitch_reason: event.target.value })}
                />
              </Field>
            </div>
          ) : null}
        </div>

        <div className="flex gap-2">
          <Button size="sm" onClick={() => save.mutate()} disabled={save.isPending}>
            {save.isPending ? "กำลังบันทึก…" : "บันทึก"}
          </Button>
          <Button size="sm" variant="line" onClick={() => setEditing(false)}>
            ยกเลิก
          </Button>
        </div>
      </div>
    </Panel>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="font-mono text-[11px] uppercase tracking-wide text-muted">{label}</dt>
      <dd className="mt-1 font-body text-sm text-ink">{value}</dd>
    </div>
  );
}
