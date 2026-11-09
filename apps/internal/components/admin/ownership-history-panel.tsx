"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { leadHref } from "@/components/lead-card";
import { EmptyState, Panel, Spinner } from "@/components/ui";
import { admin as adminApi } from "@/lib/api";
import { formatDateTime } from "@/lib/format";
import { useMeta } from "@/lib/hooks";
import { labelOf, ownerTypeLabels } from "@/lib/labels";

/** The audit trail: every change of owner across every lead. */
export function OwnershipHistoryPanel() {
  const { data: meta } = useMeta();
  const { data, isLoading } = useQuery({
    queryKey: ["admin", "ownership-logs"],
    queryFn: () => adminApi.recentOwnershipLogs(100),
  });

  const names = new Map((meta?.users ?? []).map((person) => [person.id, person.name]));
  const who = (id?: number) => (id ? (names.get(id) ?? `ผู้ใช้ #${id}`) : "ยังไม่มอบหมาย");
  const rows = data?.data ?? [];

  return (
    <Panel title={`ประวัติการเปลี่ยนเจ้าของ (${rows.length})`}>
      {isLoading ? (
        <Spinner />
      ) : rows.length === 0 ? (
        <EmptyState title="ยังไม่มีประวัติ" />
      ) : (
        <ol className="divide-y divide-line">
          {rows.map((entry) => (
            <li key={entry.id} className="py-3 first:pt-0 last:pb-0">
              <p className="font-body text-sm text-ink">
                <Link href={leadHref(entry.lead_id)} className="font-display font-semibold underline">
                  {entry.lead?.name ?? `ลูกค้า #${entry.lead_id}`}
                </Link>
                {": "}
                {entry.from_owner_type ? (
                  <>
                    {labelOf(ownerTypeLabels, entry.from_owner_type)} · {who(entry.from_owner_user_id)} →{" "}
                  </>
                ) : null}
                {labelOf(ownerTypeLabels, entry.to_owner_type)} · {who(entry.to_owner_user_id)}
              </p>
              <p className="font-mono text-[11px] text-muted">
                {formatDateTime(entry.created_at)} · โดย{" "}
                {entry.changed_by_user?.name ?? `ผู้ใช้ #${entry.changed_by}`}
                {entry.note ? ` · ${entry.note}` : ""}
              </p>
            </li>
          ))}
        </ol>
      )}
    </Panel>
  );
}
