"use client";

import { useQuery } from "@tanstack/react-query";
import { LeadCard } from "@/components/lead-card";
import { EmptyState, Panel, Spinner } from "@/components/ui";
import { leads as leadsApi } from "@/lib/api";

/** Every brand our sales team must not approach directly, in one list. */
export function DoNotPitchPanel() {
  const { data, isLoading } = useQuery({
    queryKey: ["leads", "do-not-pitch"],
    queryFn: () => leadsApi.list({ do_not_pitch: true, limit: 100 }),
  });

  const rows = data?.data ?? [];

  return (
    <Panel title={`รายการห้ามเสนอขายตรง (${rows.length})`}>
      {isLoading ? (
        <Spinner />
      ) : rows.length === 0 ? (
        <EmptyState
          title="ยังไม่มีรายการ"
          hint="ติ๊ก “ห้ามเสนอขายตรง” ในหน้าลูกค้า เมื่อแบรนด์นั้นเป็นลูกค้าของเอเจนซีที่จ้างเรา"
        />
      ) : (
        <ul className="space-y-3">
          {rows.map((lead) => (
            <li key={lead.id}>
              <LeadCard lead={lead} showNextAction={false} />
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}
