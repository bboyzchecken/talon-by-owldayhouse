"use client";

import Link from "next/link";
import { CalendarClock, ChevronRight } from "lucide-react";
import { cn } from "@odh/ui";
import { DoNotPitchBadge, OwnerTypeBadge, StageBadge } from "@/components/badges";
import { daysOverdue, formatBaht, formatDate } from "@/lib/format";
import { industryLabels, labelOf, sourceLabels } from "@/lib/labels";
import type { Lead } from "@/lib/types";

export function leadHref(id: number): string {
  // Static export cannot pre-render /leads/[id], so one detail page reads the
  // id from the query string.
  return `/leads/detail/?id=${id}`;
}

/**
 * One lead, as a tappable card. Used on วันนี้, รายชื่อ and the pipeline board,
 * so the owner badge and the do_not_pitch warning show up everywhere.
 */
export function LeadCard({
  lead,
  showNextAction = true,
  className,
}: {
  lead: Lead;
  showNextAction?: boolean;
  className?: string;
}) {
  const overdue = daysOverdue(lead.next_action_date);

  return (
    <Link
      href={leadHref(lead.id)}
      className={cn(
        "flex items-start gap-3 rounded-2xl border border-line bg-white p-4 transition-colors hover:border-navy",
        lead.do_not_pitch && "border-ink/40",
        className,
      )}
    >
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-1.5">
          <StageBadge stage={lead.stage} />
          <OwnerTypeBadge ownerType={lead.owner_type} ownerName={lead.owner?.name} />
          {lead.do_not_pitch ? <DoNotPitchBadge reason={lead.do_not_pitch_reason} /> : null}
        </div>

        <h3 className="mt-2 truncate font-display text-base font-semibold text-ink">{lead.name}</h3>

        {lead.source_detail ? (
          // What the work is: for an e-GP lead (named after the agency) this
          // is the project title, so it gets its own, readable line.
          <p className="mt-0.5 line-clamp-2 font-body text-sm text-ink">{lead.source_detail}</p>
        ) : null}
        <p className="mt-0.5 font-body text-xs text-muted">
          {labelOf(industryLabels, lead.industry)} · {labelOf(sourceLabels, lead.source)}
        </p>

        {lead.estimated_value > 0 ? (
          <p className="mt-1 font-mono text-xs text-muted">คาดการณ์ {formatBaht(lead.estimated_value)}</p>
        ) : null}

        {showNextAction && lead.next_action_date ? (
          <p
            className={cn(
              "mt-2 inline-flex max-w-full items-center gap-1.5 rounded-full px-2 py-1 font-body text-xs",
              overdue > 0 ? "bg-ink text-white" : "bg-gray-50 text-muted",
            )}
          >
            <CalendarClock className="size-3.5 shrink-0" aria-hidden />
            <span className="truncate">
              {overdue > 0
                ? `เลยกำหนด ${overdue} วัน`
                : overdue === 0
                  ? "ต้องตามวันนี้"
                  : `ตามต่อ ${formatDate(lead.next_action_date)}`}
              {lead.next_action ? ` · ${lead.next_action}` : ""}
            </span>
          </p>
        ) : null}
      </div>

      <ChevronRight className="mt-1 size-5 shrink-0 text-muted" aria-hidden />
    </Link>
  );
}
