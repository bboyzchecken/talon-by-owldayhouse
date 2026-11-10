"use client";

import Link from "next/link";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { AlertTriangle, CalendarClock, ExternalLink, Info } from "lucide-react";
import { Button, cn } from "@odh/ui";
import { leadHref } from "@/components/lead-card";
import { Alert, Input, Select } from "@/components/ui";
import { ApiError, egp } from "@/lib/api";
import { formatBaht, formatDate } from "@/lib/format";
import type { EgpAnnouncement, EgpSendResult, SimilarLead, User } from "@/lib/types";

/**
 * One public-procurement project on the Radar. Every label says why it is
 * there; the wording is neutral on purpose — a signal from the numbers, not an
 * accusation against an agency.
 */
export function AnnouncementCard({
  item,
  users,
  defaultAssigneeId,
  onSent,
}: {
  item: EgpAnnouncement;
  users: User[];
  defaultAssigneeId: number | null;
  /** Sending moves the card to another tab, so the page shows the result. */
  onSent: (result: EgpSendResult, item: EgpAnnouncement) => void;
}) {
  const queryClient = useQueryClient();
  const r = item.result;
  const closed = r.stage === "awarded" || r.stage === "cancelled";
  const open = item.decision === "new" && !closed;

  const [assignee, setAssignee] = useState<string>(defaultAssigneeId ? String(defaultAssigneeId) : "");
  const [deadline, setDeadline] = useState(item.deadline_at?.slice(0, 10) ?? "");
  const [similar, setSimilar] = useState<SimilarLead[] | null>(null);
  const [error, setError] = useState("");

  const refresh = () => queryClient.invalidateQueries({ queryKey: ["egp"] });

  const sendMutation = useMutation({
    mutationFn: (extra: { lead_id?: number; confirm_similar?: boolean }) =>
      egp.send(item.id, { owner_user_id: assignee ? Number(assignee) : undefined, ...extra }),
    onSuccess: async (result) => {
      setSimilar(null);
      setError("");
      onSent(result, item);
      await queryClient.invalidateQueries({ queryKey: ["leads"] });
      await refresh();
    },
    onError: (caught) => {
      const apiError = caught as ApiError;
      if (apiError.body?.similar?.length) {
        setSimilar(apiError.body.similar);
        setError("");
        return;
      }
      setError(apiError.body?.error ?? "ส่งไม่สำเร็จ");
    },
  });

  const skip = useMutation({ mutationFn: () => egp.skip(item.id), onSuccess: refresh });
  const restore = useMutation({ mutationFn: () => egp.restore(item.id), onSuccess: refresh });
  const saveDeadline = useMutation({
    mutationFn: (value: string) => egp.setDeadline(item.id, value),
    onSuccess: refresh,
    onError: (caught) => setError((caught as ApiError).body?.error ?? "บันทึกวันปิดรับไม่สำเร็จ"),
  });

  const warnings = r.flags.filter((f) => f.severity === "warn");
  const notices = r.flags.filter((f) => f.severity === "info");

  return (
    <article
      className={cn(
        "rounded-2xl border bg-white p-4 sm:p-5",
        r.flagged ? "border-ink/40" : "border-line",
      )}
    >
      <div className="flex flex-wrap items-center gap-1.5">
        {r.stage && r.stage !== "unknown" ? (
          <span
            className={cn(
              "rounded-full px-2.5 py-1 font-display text-xs font-semibold",
              r.stage === "open"
                ? "bg-navy/10 text-navy"
                : r.stage === "upcoming"
                  ? "border border-navy/40 text-navy"
                  : "bg-gray-50 text-muted",
            )}
          >
            {r.stage_label}
          </span>
        ) : null}
        {r.passed ? (
          <span
            className={cn(
              "rounded-full px-2.5 py-1 font-mono text-xs font-medium tabular-nums",
              r.score >= 80 ? "bg-navy text-white" : "border border-navy/40 text-navy",
            )}
            title="คะแนนจากความตรงของบริการ วงเงิน และเวลาเตรียม"
          >
            คะแนน {r.score}
          </span>
        ) : null}
        {item.method_label && item.method ? (
          <span className="rounded-full border border-line px-2.5 py-1 font-display text-xs font-semibold text-ink">
            {item.method_label}
          </span>
        ) : null}
        <span className="rounded-full border border-line px-2.5 py-1 font-display text-xs font-semibold text-muted">
          {r.group_label}
        </span>
        {r.watchlisted ? (
          <span className="rounded-full bg-navy/10 px-2.5 py-1 font-display text-xs font-semibold text-navy">
            จับตา
          </span>
        ) : null}
        {r.days_left !== null ? (
          <span
            className={cn(
              "inline-flex items-center gap-1 rounded-full px-2.5 py-1 font-display text-xs font-semibold",
              r.days_left < 7 ? "bg-ink text-white" : "bg-gray-50 text-muted",
            )}
          >
            <CalendarClock className="size-3.5" aria-hidden />
            {r.days_left === 0 ? "ปิดรับวันนี้" : `เหลือ ${r.days_left} วัน`}
          </span>
        ) : null}
        {warnings.map((flag) => (
          <span
            key={flag.code}
            className="inline-flex items-center gap-1 rounded-full bg-ink px-2.5 py-1 font-display text-xs font-semibold text-white"
            title={flag.reason}
          >
            <AlertTriangle className="size-3.5" aria-hidden />
            {flag.label}
          </span>
        ))}
      </div>

      <p className="mt-3 font-display text-sm font-semibold text-muted">
        {item.agency}
        {item.procurement_unit && item.procurement_unit !== item.agency ? (
          <span className="font-body font-normal"> · {item.procurement_unit}</span>
        ) : null}
      </p>
      <h3 className="mt-1 font-display text-base font-semibold leading-snug text-ink">{item.title}</h3>
      {r.subject && r.subject.length < item.title.length - 4 ? (
        <p className="mt-1 font-body text-xs text-muted">
          งานที่จ้าง: <span className="text-ink">{r.subject}</span>
        </p>
      ) : null}

      <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1 font-body text-sm sm:grid-cols-4">
        <div>
          <dt className="font-mono text-[11px] uppercase tracking-wide text-muted">วงเงิน</dt>
          <dd className="tabular-nums text-ink">{item.budget ? formatBaht(item.budget) : "—"}</dd>
        </div>
        {item.reference_price && item.reference_price !== item.budget ? (
          <div>
            <dt className="font-mono text-[11px] uppercase tracking-wide text-muted">ราคากลาง</dt>
            <dd className="tabular-nums text-ink">{formatBaht(item.reference_price)}</dd>
          </div>
        ) : null}
        <div>
          <dt className="font-mono text-[11px] uppercase tracking-wide text-muted">เลขที่โครงการ</dt>
          <dd className="select-all font-mono text-ink">{item.project_id}</dd>
        </div>
        {item.winner_announced_at ? (
          <div>
            <dt className="font-mono text-[11px] uppercase tracking-wide text-muted">ประกาศผู้ชนะ</dt>
            <dd className="text-ink">{formatDate(item.winner_announced_at)}</dd>
          </div>
        ) : (
          <div>
            <dt className="font-mono text-[11px] uppercase tracking-wide text-muted">วันปิดรับ</dt>
            <dd className="text-ink">{formatDate(item.deadline_at)}</dd>
          </div>
        )}
        <div>
          <dt className="font-mono text-[11px] uppercase tracking-wide text-muted">สถานะใน e-GP</dt>
          <dd className="text-ink">{item.project_status || "—"}</dd>
        </div>
      </dl>

      {r.matched_services.length > 0 ? (
        <p className="mt-2 font-body text-xs text-muted">
          ตรงกับ: {r.matched_services.join(", ")} ({r.matched_keywords.join(", ")})
        </p>
      ) : null}

      {warnings.length > 0 || notices.length > 0 ? (
        <ul className="mt-3 space-y-1">
          {[...warnings, ...notices].map((flag) => (
            <li key={flag.code} className="flex items-start gap-1.5 font-body text-xs text-muted">
              {flag.severity === "warn" ? (
                <AlertTriangle className="mt-0.5 size-3.5 shrink-0 text-ink" aria-hidden />
              ) : (
                <Info className="mt-0.5 size-3.5 shrink-0" aria-hidden />
              )}
              <span>
                <span className="font-semibold text-ink">{flag.label}:</span> {flag.reason}
              </span>
            </li>
          ))}
        </ul>
      ) : null}

      {!r.passed ? (
        <ul className="mt-3 space-y-1 rounded-xl bg-gray-50 px-3 py-2">
          {r.exclusions.map((ex) => (
            <li key={ex.code} className="font-body text-xs text-muted">
              {closed ? "" : "ไม่ผ่านตัวกรอง: "}
              {ex.reason}
            </li>
          ))}
        </ul>
      ) : null}

      {error ? (
        <div className="mt-3">
          <Alert tone="stop">{error}</Alert>
        </div>
      ) : null}

      {similar ? (
        <div className="mt-3 rounded-xl border border-gold bg-gold-soft p-3">
          <p className="font-display text-sm font-semibold text-navy">มีลูกค้าชื่อคล้ายหน่วยงานนี้</p>
          <ul className="mt-2 space-y-2">
            {similar.map((lead) => (
              <li key={lead.id} className="flex flex-wrap items-center gap-2 font-body text-sm text-ink">
                <span className="min-w-0 flex-1">
                  {lead.name} — {lead.owner_name || "ยังไม่มอบหมาย"} · ลงไว้ {formatDate(lead.registered_at)}
                </span>
                <Button size="sm" variant="line" onClick={() => sendMutation.mutate({ lead_id: lead.id })}>
                  แนบกับรายนี้
                </Button>
              </li>
            ))}
          </ul>
          <div className="mt-3 flex gap-2">
            <Button size="sm" onClick={() => sendMutation.mutate({ confirm_similar: true })}>
              ไม่ใช่รายเดียวกัน — สร้างลูกค้าใหม่
            </Button>
            <Button size="sm" variant="line" onClick={() => setSimilar(null)}>
              ยกเลิก
            </Button>
          </div>
        </div>
      ) : null}

      {open ? (
        <div className="mt-4 flex flex-wrap items-end gap-2 border-t border-line pt-4">
          <label className="min-w-40 flex-1 sm:flex-none">
            <span className="mb-1 block font-display text-xs font-semibold text-muted">วันปิดรับ</span>
            <Input
              type="date"
              value={deadline}
              onChange={(event) => setDeadline(event.target.value)}
              onBlur={() => {
                if (deadline !== (item.deadline_at?.slice(0, 10) ?? "")) saveDeadline.mutate(deadline);
              }}
              aria-label="วันปิดรับข้อเสนอ"
            />
          </label>
          <label className="min-w-44 flex-1">
            <span className="mb-1 block font-display text-xs font-semibold text-muted">ส่งให้</span>
            <Select value={assignee} onChange={(event) => setAssignee(event.target.value)} aria-label="ส่งให้ใคร">
              <option value="">ตัวฉันเอง</option>
              {users.map((person) => (
                <option key={person.id} value={person.id}>
                  {person.name}
                </option>
              ))}
            </Select>
          </label>
          <Button size="sm" onClick={() => sendMutation.mutate({})} disabled={sendMutation.isPending}>
            {sendMutation.isPending ? "กำลังส่ง…" : "ส่งเข้า Lead Tracker"}
          </Button>
          <Button size="sm" variant="line" onClick={() => skip.mutate()} disabled={skip.isPending}>
            ข้าม
          </Button>
        </div>
      ) : null}

      {item.decision === "sent" && item.lead_id ? (
        <div className="mt-4 border-t border-line pt-3">
          <Link
            href={leadHref(item.lead_id)}
            className="inline-flex items-center gap-1.5 font-display text-sm font-semibold text-navy underline"
          >
            <ExternalLink className="size-4" aria-hidden />
            เปิดลูกค้าใน Lead Tracker
          </Link>
        </div>
      ) : null}

      {item.decision === "skipped" ? (
        <div className="mt-4 border-t border-line pt-3">
          <Button size="sm" variant="line" onClick={() => restore.mutate()} disabled={restore.isPending}>
            เอากลับมาพิจารณา
          </Button>
        </div>
      ) : null}
    </article>
  );
}
