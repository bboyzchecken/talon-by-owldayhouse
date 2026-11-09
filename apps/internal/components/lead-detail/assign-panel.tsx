"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Button } from "@odh/ui";
import { Alert, Field, Input, Panel, Select, Spinner } from "@/components/ui";
import { ApiError, leads as leadsApi } from "@/lib/api";
import { formatDateTime } from "@/lib/format";
import { useMeta } from "@/lib/hooks";
import { labelOf, ownerTypeLabels } from "@/lib/labels";
import type { Lead } from "@/lib/types";

/**
 * Ownership. Only an admin can change it, and the API writes an OwnershipLog
 * on every change — the history below is that log.
 */
export function AssignPanel({ lead, isAdmin }: { lead: Lead; isAdmin: boolean }) {
  const queryClient = useQueryClient();
  const { data: meta } = useMeta();

  const [ownerType, setOwnerType] = useState(lead.owner_type);
  const [ownerUserID, setOwnerUserID] = useState(lead.owner_user_id ? String(lead.owner_user_id) : "");
  const [note, setNote] = useState("");
  const [error, setError] = useState("");

  const logs = useQuery({
    queryKey: ["leads", lead.id, "ownership-logs"],
    queryFn: () => leadsApi.ownershipLogs(lead.id),
  });

  const assign = useMutation({
    mutationFn: () =>
      leadsApi.assign(lead.id, {
        owner_type: ownerType,
        owner_user_id: ownerUserID ? Number(ownerUserID) : undefined,
        note: note || undefined,
      }),
    onSuccess: async () => {
      setNote("");
      setError("");
      await queryClient.invalidateQueries({ queryKey: ["leads"] });
    },
    onError: (caught) => setError((caught as ApiError).body?.error ?? "เปลี่ยนเจ้าของไม่สำเร็จ"),
  });

  const names = new Map((meta?.users ?? []).map((person) => [person.id, person.name]));
  const who = (id?: number) => (id ? (names.get(id) ?? `ผู้ใช้ #${id}`) : "ยังไม่มอบหมาย");

  return (
    <Panel title="เจ้าของและประวัติการเปลี่ยน">
      {error ? <Alert tone="stop">{error}</Alert> : null}

      <p className="font-body text-sm text-ink">
        ปัจจุบัน: <span className="font-semibold">{labelOf(ownerTypeLabels, lead.owner_type)}</span> ·{" "}
        {who(lead.owner_user_id)}
      </p>

      {isAdmin ? (
        <div className="mt-4 space-y-3 rounded-xl border border-line p-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="ประเภทเจ้าของ">
              <Select
                value={ownerType}
                onChange={(event) => setOwnerType(event.target.value as Lead["owner_type"])}
              >
                {(meta?.owner_types ?? []).map((value) => (
                  <option key={value} value={value}>
                    {labelOf(ownerTypeLabels, value)}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="มอบหมายให้">
              <Select value={ownerUserID} onChange={(event) => setOwnerUserID(event.target.value)}>
                <option value="">— ยังไม่มอบหมาย —</option>
                {(meta?.users ?? []).map((person) => (
                  <option key={person.id} value={person.id}>
                    {person.name}
                  </option>
                ))}
              </Select>
            </Field>
          </div>
          <Field label="เหตุผล / บันทึก" hint="จะถูกเก็บไว้ในประวัติการเปลี่ยนเจ้าของ">
            <Input value={note} onChange={(event) => setNote(event.target.value)} />
          </Field>
          <Button size="sm" onClick={() => assign.mutate()} disabled={assign.isPending}>
            {assign.isPending ? "กำลังบันทึก…" : "บันทึกการมอบหมาย"}
          </Button>
        </div>
      ) : (
        <p className="mt-2 font-body text-xs text-muted">เปลี่ยนเจ้าของได้เฉพาะแอดมิน</p>
      )}

      <div className="mt-5">
        <h3 className="font-display text-sm font-semibold text-ink">ประวัติการเปลี่ยนเจ้าของ</h3>
        {logs.isLoading ? (
          <Spinner label="กำลังโหลดประวัติ…" />
        ) : (logs.data?.data ?? []).length === 0 ? (
          <p className="mt-2 font-body text-sm text-muted">ยังไม่มีประวัติ</p>
        ) : (
          <ol className="mt-2 space-y-2">
            {(logs.data?.data ?? []).map((entry) => (
              <li key={entry.id} className="border-b border-line pb-2 last:border-0 last:pb-0">
                <p className="font-body text-sm text-ink">
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
      </div>
    </Panel>
  );
}
