"use client";

import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { cn } from "@odh/ui";
import { LeadCard } from "@/components/lead-card";
import { Alert, Panel, Select, Spinner } from "@/components/ui";
import { leads as leadsApi } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { formatBaht } from "@/lib/format";
import { useMeta } from "@/lib/hooks";
import { labelOf, stageLabels } from "@/lib/labels";
import type { Lead, Stage } from "@/lib/types";

/** The board shows the live stages; won and lost are the closed ones. */
const boardStages: Stage[] = ["new", "contacted", "meeting", "proposal", "nurture", "won", "lost", "declined"];

export default function PipelinePage() {
  const { isAdmin, user } = useAuth();
  const { data: meta } = useMeta();
  const [scope, setScope] = useState<string>("all");

  const ownerFilter = scope === "all" ? undefined : scope === "mine" ? undefined : Number(scope);
  const mine = scope === "mine";

  const { data, isLoading, error } = useQuery({
    queryKey: ["leads", "pipeline", scope],
    queryFn: () =>
      leadsApi.list({ limit: 200, owner_user_id: ownerFilter, mine, sort: "updated" }),
  });

  const columns = useMemo(() => {
    const grouped = new Map<Stage, Lead[]>();
    for (const stage of boardStages) grouped.set(stage, []);
    for (const lead of data?.data ?? []) {
      const bucket = grouped.get(lead.stage);
      if (bucket) bucket.push(lead);
    }
    return grouped;
  }, [data]);

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold text-ink sm:text-3xl">Pipeline</h1>
          <p className="mt-1 font-body text-sm text-muted">ลูกค้าทั้งหมดเรียงตามขั้น เลื่อนดูได้ทางขวา</p>
        </div>
        <Select
          aria-label="ขอบเขตของบอร์ด"
          className="w-auto min-w-48"
          value={scope}
          onChange={(event) => setScope(event.target.value)}
        >
          <option value="all">ทุกคน</option>
          <option value="mine">ของฉัน ({user?.name})</option>
          {isAdmin
            ? (meta?.users ?? []).map((person) => (
                <option key={person.id} value={person.id}>
                  {person.name}
                </option>
              ))
            : null}
        </Select>
      </header>

      {error ? <Alert>{(error as Error).message}</Alert> : null}

      {isLoading ? (
        <Spinner />
      ) : (
        <>
          {/* Phone: one stacked column per stage. Desktop: a scrolling board. */}
          <div className="hidden gap-4 overflow-x-auto pb-2 lg:flex">
            {boardStages.map((stage) => {
              const items = columns.get(stage) ?? [];
              const value = items.reduce((sum, lead) => sum + (lead.estimated_value ?? 0), 0);
              return (
                <section key={stage} className="w-72 shrink-0">
                  <header
                    className={cn(
                      "mb-3 rounded-xl border px-3 py-2",
                      stage === "won" ? "border-gold bg-gold-soft" : "border-line bg-white",
                    )}
                  >
                    <h2 className="font-display text-sm font-semibold text-ink">
                      {labelOf(stageLabels, stage)}{" "}
                      <span className="font-mono text-xs text-muted">({items.length})</span>
                    </h2>
                    {value > 0 ? (
                      <p className="font-mono text-[11px] text-muted">{formatBaht(value)}</p>
                    ) : null}
                  </header>
                  <ul className="space-y-3">
                    {items.map((lead) => (
                      <li key={lead.id}>
                        <LeadCard lead={lead} showNextAction={false} />
                      </li>
                    ))}
                    {items.length === 0 ? (
                      <li className="rounded-xl border border-dashed border-line px-3 py-6 text-center font-body text-xs text-muted">
                        ว่าง
                      </li>
                    ) : null}
                  </ul>
                </section>
              );
            })}
          </div>

          <div className="space-y-4 lg:hidden">
            {boardStages.map((stage) => {
              const items = columns.get(stage) ?? [];
              if (items.length === 0) return null;
              return (
                <Panel key={stage} title={`${labelOf(stageLabels, stage)} (${items.length})`}>
                  <ul className="space-y-3">
                    {items.map((lead) => (
                      <li key={lead.id}>
                        <LeadCard lead={lead} showNextAction={false} />
                      </li>
                    ))}
                  </ul>
                </Panel>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
