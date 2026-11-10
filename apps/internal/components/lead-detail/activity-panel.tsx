"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Trash2 } from "lucide-react";
import { Button } from "@odh/ui";
import { Alert, EmptyState, Field, Input, Panel, Select, Spinner, Textarea } from "@/components/ui";
import { ApiError, leads as leadsApi } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { formatWhen, toISODateTime } from "@/lib/format";
import { activityTypeLabels, labelOf } from "@/lib/labels";
import type { Lead } from "@/lib/types";

/**
 * The lead's timeline, plus the one form that logs a touch and sets the next
 * follow-up together — that is what keeps the "วันนี้" screen honest.
 */
export function ActivityPanel({ lead, canEdit }: { lead: Lead; canEdit: boolean }) {
  const queryClient = useQueryClient();
  const { user, isAdmin } = useAuth();

  const [type, setType] = useState("call");
  // Date and time, now by default: a date alone was saved as midnight.
  const [happenedAt, setHappenedAt] = useState(() => toISODateTime());
  const [summary, setSummary] = useState("");
  const [nextAction, setNextAction] = useState(lead.next_action ?? "");
  const [nextActionDate, setNextActionDate] = useState(lead.next_action_date?.slice(0, 10) ?? "");
  const [error, setError] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["leads", lead.id, "activities"],
    queryFn: () => leadsApi.activities.list(lead.id),
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["leads"] });

  const create = useMutation({
    mutationFn: () =>
      leadsApi.activities.create(lead.id, {
        type,
        happened_at: happenedAt,
        summary,
        next_action: nextAction || undefined,
        next_action_date: nextActionDate || undefined,
      }),
    onSuccess: async () => {
      setSummary("");
      setHappenedAt(toISODateTime());
      setError("");
      await invalidate();
    },
    onError: (caught) => setError((caught as ApiError).body?.error ?? "บันทึกกิจกรรมไม่สำเร็จ"),
  });

  const remove = useMutation({
    mutationFn: (activityId: number) => leadsApi.activities.remove(lead.id, activityId),
    onSuccess: invalidate,
    onError: (caught) => setError((caught as ApiError).body?.error ?? "ลบกิจกรรมไม่สำเร็จ"),
  });

  const activities = data?.data ?? [];

  // A proposal to a do_not_pitch brand is exactly what the flag forbids.
  const types = (Object.keys(activityTypeLabels) as string[]).filter(
    (value) => !(lead.do_not_pitch && value === "proposal_sent"),
  );

  return (
    <Panel title={`ไทม์ไลน์ (${activities.length})`}>
      {error ? <Alert tone="stop">{error}</Alert> : null}

      {canEdit ? (
        <div className="mb-5 space-y-3 rounded-xl border border-line p-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="ประเภท" required>
              <Select value={type} onChange={(event) => setType(event.target.value)}>
                {types.map((value) => (
                  <option key={value} value={value}>
                    {labelOf(activityTypeLabels, value)}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="วันและเวลา" hint="นัดในอนาคตก็ใส่ได้ จะไปโผล่ในหน้าวันนี้และปฏิทินกลาง">
              <Input
                type="datetime-local"
                value={happenedAt}
                onChange={(event) => setHappenedAt(event.target.value)}
              />
            </Field>
          </div>

          <Field label="สรุปสั้น ๆ">
            <Textarea
              value={summary}
              onChange={(event) => setSummary(event.target.value)}
              placeholder="คุยอะไร ได้ข้อสรุปอะไร"
              rows={2}
            />
          </Field>

          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="สิ่งที่ต้องทำต่อ">
              <Input value={nextAction} onChange={(event) => setNextAction(event.target.value)} />
            </Field>
            <Field label="วันที่ต้องทำต่อ">
              <Input
                type="date"
                value={nextActionDate}
                onChange={(event) => setNextActionDate(event.target.value)}
              />
            </Field>
          </div>

          <Button size="sm" onClick={() => create.mutate()} disabled={create.isPending}>
            {create.isPending ? "กำลังบันทึก…" : "บันทึกกิจกรรม"}
          </Button>
        </div>
      ) : null}

      {isLoading ? (
        <Spinner />
      ) : activities.length === 0 ? (
        <EmptyState title="ยังไม่มีกิจกรรม" hint="ทุกครั้งที่โทร คุย หรือส่งใบเสนอราคา บันทึกไว้ที่นี่" />
      ) : (
        <ol className="space-y-3">
          {activities.map((activity) => (
            <li key={activity.id} className="flex gap-3">
              <span className="mt-1.5 size-2 shrink-0 rounded-full bg-navy" aria-hidden />
              <div className="min-w-0 flex-1 border-b border-line pb-3 last:border-0 last:pb-0">
                <div className="flex flex-wrap items-baseline gap-2">
                  <span className="font-display text-sm font-semibold text-ink">
                    {labelOf(activityTypeLabels, activity.type)}
                  </span>
                  <span className="font-mono text-[11px] text-muted">
                    {formatWhen(activity.happened_at)}
                  </span>
                  {activity.user ? (
                    <span className="font-body text-xs text-muted">· {activity.user.name}</span>
                  ) : null}
                  {canEdit && (isAdmin || activity.user_id === user?.id) ? (
                    <button
                      type="button"
                      onClick={() => {
                        if (window.confirm("ลบกิจกรรมนี้?")) remove.mutate(activity.id);
                      }}
                      className="ml-auto text-muted transition-colors hover:text-ink"
                      aria-label="ลบกิจกรรม"
                    >
                      <Trash2 className="size-4" aria-hidden />
                    </button>
                  ) : null}
                </div>
                {activity.summary ? (
                  <p className="mt-1 whitespace-pre-line font-body text-sm text-ink [overflow-wrap:anywhere]">{activity.summary}</p>
                ) : null}
              </div>
            </li>
          ))}
        </ol>
      )}
    </Panel>
  );
}
