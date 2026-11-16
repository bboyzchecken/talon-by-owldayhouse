"use client";

import Link from "next/link";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { ExternalLink, Mail, MessageCircle, Phone, Trash2 } from "lucide-react";
import { Button } from "@odh/ui";
import { leadHref } from "@/components/lead-card";
import { Alert, Input, Select } from "@/components/odh";
import { ApiError, inbox, type AcceptInboxBody } from "@/lib/api";
import { formatDate, formatDateTime, lineHref, telHref } from "@/lib/format";
import {
  budgetLabels,
  industryLabels,
  interestLabels,
  labelOf,
  timelineLabels,
} from "@/lib/labels";
import type { DuplicateLead, InboundRequest, Industry, SimilarLead, User } from "@/lib/types";

/**
 * One request from the quote form on owldayhouse.com. Everything on it was
 * typed by a stranger on the internet, so it is shown as text and nothing
 * more: React escapes it, and no field is ever turned into HTML or a link
 * except the phone number and LINE id, which are rebuilt from their digits.
 */
export function RequestCard({
  item,
  users,
  isAdmin,
  industries,
}: {
  item: InboundRequest;
  users: User[];
  isAdmin: boolean;
  industries: Industry[];
}) {
  const queryClient = useQueryClient();
  const suggested = (item.company || item.contact_name).trim();

  const [name, setName] = useState(suggested);
  const [industry, setIndustry] = useState<string>(item.industry || "");
  const [owner, setOwner] = useState("");
  const [reason, setReason] = useState("");
  const [discarding, setDiscarding] = useState(false);
  const [duplicate, setDuplicate] = useState<DuplicateLead | null>(null);
  const [similar, setSimilar] = useState<SimilarLead[] | null>(null);
  const [error, setError] = useState("");

  const refresh = async () => {
    await queryClient.invalidateQueries({ queryKey: ["inbox"] });
  };

  const accept = useMutation({
    mutationFn: (extra: AcceptInboxBody) =>
      inbox.accept(item.id, {
        name: name.trim(),
        industry: industry || undefined,
        owner_user_id: isAdmin && owner ? Number(owner) : undefined,
        ...extra,
      }),
    onSuccess: async () => {
      setDuplicate(null);
      setSimilar(null);
      setError("");
      await queryClient.invalidateQueries({ queryKey: ["leads"] });
      await refresh();
    },
    onError: (caught) => {
      const apiError = caught as ApiError;
      if (apiError.body?.duplicate) {
        setDuplicate(apiError.body.duplicate);
        setSimilar(null);
        setError("");
        return;
      }
      if (apiError.body?.similar?.length) {
        setSimilar(apiError.body.similar);
        setDuplicate(null);
        setError("");
        return;
      }
      setError(apiError.body?.error ?? "รับเข้าระบบไม่สำเร็จ");
    },
    meta: { success: "รับเข้า Lead Tracker แล้ว" },
  });

  const discard = useMutation({
    mutationFn: () => inbox.discard(item.id, reason.trim()),
    onSuccess: refresh,
    meta: { success: "ทิ้งคำขอนี้แล้ว" },
  });

  const remove = useMutation({
    mutationFn: () => inbox.remove(item.id),
    onSuccess: refresh,
    meta: { success: "ลบคำขอนี้ออกจากระบบแล้ว" },
  });

  const isNew = item.status === "new";
  const busy = accept.isPending || discard.isPending || remove.isPending;

  return (
    <article className="rounded-2xl border border-border bg-card p-4 sm:p-5">
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="font-mono text-xs tabular-nums text-muted-foreground">#{item.id}</span>
        <span className="font-mono text-xs text-muted-foreground">· {formatDateTime(item.created_at)}</span>
        {item.locale === "en" ? (
          <span className="rounded-full border border-border px-2 py-0.5 font-mono text-[11px] text-muted-foreground">EN</span>
        ) : null}
        {item.industry ? (
          <span className="rounded-full border border-border px-2.5 py-0.5 font-display text-xs font-semibold text-muted-foreground">
            {labelOf(industryLabels, item.industry)}
          </span>
        ) : null}
        {(item.interests ?? []).map((interest) => (
          <span
            key={interest}
            className="rounded-full bg-primary/10 px-2.5 py-0.5 font-display text-xs font-semibold text-primary"
          >
            {labelOf(interestLabels, interest)}
          </span>
        ))}
      </div>

      <h3 className="mt-2 font-display text-lg font-semibold leading-snug text-foreground">
        {item.company || item.contact_name}
      </h3>
      {item.company ? (
        <p className="font-body text-sm text-muted-foreground">ผู้ติดต่อ: {item.contact_name}</p>
      ) : null}

      <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5 font-body text-sm">
        {item.phone ? (
          <li>
            <a href={telHref(item.phone)} className="inline-flex items-center gap-1.5 text-primary underline">
              <Phone className="size-4" aria-hidden />
              {item.phone}
            </a>
          </li>
        ) : null}
        {item.line_id ? (
          <li>
            <a
              href={lineHref(item.line_id)}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-primary underline"
            >
              <MessageCircle className="size-4" aria-hidden />
              LINE {item.line_id}
            </a>
          </li>
        ) : null}
        {item.email ? (
          <li className="inline-flex items-center gap-1.5 text-foreground">
            {/* Shown, never sent to: there is no e-mail in this system. */}
            <Mail className="size-4 text-muted-foreground" aria-hidden />
            <span className="select-all">{item.email}</span>
          </li>
        ) : null}
      </ul>

      {item.brief ? (
        <p className="mt-3 whitespace-pre-line rounded-xl bg-muted px-3 py-2 font-body text-sm text-foreground">
          {item.brief}
        </p>
      ) : null}

      <dl className="mt-3 grid grid-cols-1 gap-x-4 gap-y-1 font-body text-sm sm:grid-cols-3">
        <div>
          <dt className="font-mono text-[11px] uppercase tracking-wide text-muted-foreground">อยากได้เมื่อ</dt>
          <dd className="text-foreground">{item.timeline ? labelOf(timelineLabels, item.timeline) : "—"}</dd>
        </div>
        <div>
          <dt className="font-mono text-[11px] uppercase tracking-wide text-muted-foreground">งบที่ลูกค้าบอก</dt>
          <dd className="text-foreground">{item.budget_band ? labelOf(budgetLabels, item.budget_band) : "—"}</dd>
        </div>
        <div>
          <dt className="font-mono text-[11px] uppercase tracking-wide text-muted-foreground">มาจาก</dt>
          <dd className="break-words text-foreground">
            {[item.utm_source && `utm ${item.utm_source}`, item.utm_campaign, item.landing_path]
              .filter(Boolean)
              .join(" · ") || "—"}
            {item.referrer ? <span className="block text-xs text-muted-foreground">{item.referrer}</span> : null}
          </dd>
        </div>
      </dl>

      {error ? (
        <div className="mt-3">
          <Alert tone="stop">{error}</Alert>
        </div>
      ) : null}

      {duplicate ? (
        <div className="mt-3 rounded-xl border border-gold bg-notice p-3">
          <p className="font-display text-sm font-semibold text-primary">มีลูกค้าชื่อนี้ในระบบแล้ว</p>
          <p className="mt-1 font-body text-sm text-foreground">
            {duplicate.name} — {duplicate.owner_name || "ยังไม่มอบหมาย"} · ลงไว้ {formatDate(duplicate.registered_at)}
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button size="sm" onClick={() => accept.mutate({ lead_id: duplicate.id })} disabled={busy}>
              เพิ่มเข้าลูกค้ารายนี้
            </Button>
            <Button size="sm" variant="line" onClick={() => setDuplicate(null)}>
              แก้ชื่อเอง
            </Button>
          </div>
        </div>
      ) : null}

      {similar ? (
        <div className="mt-3 rounded-xl border border-gold bg-notice p-3">
          <p className="font-display text-sm font-semibold text-primary">มีลูกค้าชื่อคล้ายกัน</p>
          <ul className="mt-2 space-y-2">
            {similar.map((lead) => (
              <li key={lead.id} className="flex flex-wrap items-center gap-2 font-body text-sm text-foreground">
                <span className="min-w-0 flex-1">
                  {lead.name} — {lead.owner_name || "ยังไม่มอบหมาย"} · ลงไว้ {formatDate(lead.registered_at)}
                </span>
                <Button size="sm" variant="line" onClick={() => accept.mutate({ lead_id: lead.id })} disabled={busy}>
                  เพิ่มเข้ารายนี้
                </Button>
              </li>
            ))}
          </ul>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button size="sm" onClick={() => accept.mutate({ confirm_similar: true })} disabled={busy}>
              ไม่ใช่รายเดียวกัน — สร้างลูกค้าใหม่
            </Button>
            <Button size="sm" variant="line" onClick={() => setSimilar(null)}>
              ยกเลิก
            </Button>
          </div>
        </div>
      ) : null}

      {isNew && !duplicate && !similar ? (
        <div className="mt-4 space-y-3 border-t border-border pt-4">
          <div className="grid gap-2 sm:grid-cols-3">
            <label className="sm:col-span-1">
              <span className="mb-1 block font-display text-xs font-semibold text-muted-foreground">ลงชื่อลูกค้าว่า</span>
              <Input value={name} onChange={(event) => setName(event.target.value)} maxLength={255} />
            </label>
            <label>
              <span className="mb-1 block font-display text-xs font-semibold text-muted-foreground">กลุ่มธุรกิจ</span>
              <Select value={industry} onChange={(event) => setIndustry(event.target.value)} aria-label="กลุ่มธุรกิจ">
                <option value="">เลือก…</option>
                {industries.map((value) => (
                  <option key={value} value={value}>
                    {labelOf(industryLabels, value)}
                  </option>
                ))}
              </Select>
            </label>
            {isAdmin ? (
              <label>
                <span className="mb-1 block font-display text-xs font-semibold text-muted-foreground">ให้ใครดูแล</span>
                <Select value={owner} onChange={(event) => setOwner(event.target.value)} aria-label="ให้ใครดูแล">
                  <option value="">ยังไม่มอบหมาย</option>
                  {users.map((person) => (
                    <option key={person.id} value={person.id}>
                      {person.name}
                    </option>
                  ))}
                </Select>
              </label>
            ) : (
              <p className="self-end pb-3 font-body text-xs text-muted-foreground">รับแล้วคุณจะเป็นคนดูแลลูกค้ารายนี้</p>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              size="sm"
              onClick={() => accept.mutate({})}
              disabled={busy || !name.trim() || !industry}
            >
              {accept.isPending ? "กำลังรับ…" : "รับเข้า Lead Tracker"}
            </Button>
            {discarding ? (
              <>
                <Input
                  value={reason}
                  onChange={(event) => setReason(event.target.value)}
                  placeholder="เหตุผลสั้น ๆ เช่น สแปม, ไม่ใช่งานของเรา"
                  maxLength={200}
                  className="min-w-0 flex-1 py-2 text-sm"
                  aria-label="เหตุผลที่ทิ้ง"
                />
                <Button size="sm" variant="line" onClick={() => discard.mutate()} disabled={busy}>
                  ยืนยันทิ้ง
                </Button>
                <Button size="sm" variant="line" onClick={() => setDiscarding(false)}>
                  ยกเลิก
                </Button>
              </>
            ) : (
              <Button size="sm" variant="line" onClick={() => setDiscarding(true)} disabled={busy}>
                ทิ้ง
              </Button>
            )}
          </div>
        </div>
      ) : null}

      {!isNew ? (
        <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-border pt-3 font-body text-sm">
          <span className="text-muted-foreground">
            {item.status === "accepted" ? "รับเข้าระบบ" : "ทิ้ง"}โดย {item.handler?.name ?? "—"} ·{" "}
            {formatDateTime(item.handled_at)}
            {item.status === "discarded" && item.discard_reason ? ` · ${item.discard_reason}` : ""}
          </span>
          {item.status === "accepted" && item.lead_id ? (
            <Link
              href={leadHref(item.lead_id)}
              className="inline-flex items-center gap-1.5 font-display font-semibold text-primary underline"
            >
              <ExternalLink className="size-4" aria-hidden />
              เปิดลูกค้า{item.lead ? ` ${item.lead.name}` : ""}
            </Link>
          ) : null}
        </div>
      ) : null}

      {isAdmin ? (
        <div className="mt-3 flex justify-end">
          <button
            type="button"
            className="inline-flex items-center gap-1 font-body text-xs text-muted-foreground underline hover:text-foreground disabled:opacity-50"
            disabled={busy}
            onClick={() => {
              if (
                window.confirm(
                  `ลบคำขอ #${item.id} ออกจากระบบถาวร?\nใช้เมื่อเจ้าของข้อมูลขอให้ลบ ลูกค้าที่รับเข้า Lead Tracker ไปแล้วไม่ถูกลบตาม`,
                )
              ) {
                remove.mutate();
              }
            }}
          >
            <Trash2 className="size-3.5" aria-hidden />
            ลบถาวร (ตามคำขอของเจ้าของข้อมูล)
          </button>
        </div>
      ) : null}
    </article>
  );
}
