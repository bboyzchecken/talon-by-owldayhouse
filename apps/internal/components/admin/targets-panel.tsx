"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Button } from "@odh/ui";
import { Alert, Field, Input, Panel, Select, Spinner } from "@/components/ui";
import { ApiError, kpi as kpiApi } from "@/lib/api";
import { formatBaht } from "@/lib/format";

/**
 * Quarterly targets. The defaults come from the company's KPI calculator:
 * ~577,000 THB per sales person per quarter, ~11 proposals a month across the
 * team (so 11 per person per quarter) and ~9 meetings a month each (27).
 */
export function TargetsPanel() {
  const queryClient = useQueryClient();
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [quarter, setQuarter] = useState(Math.floor(now.getMonth() / 3) + 1);
  const [error, setError] = useState("");
  const [drafts, setDrafts] = useState<Record<number, { revenue: string; proposals: string; meetings: string }>>({});

  const { data, isLoading } = useQuery({
    queryKey: ["admin", "targets", year, quarter],
    queryFn: () => kpiApi.targets({ year, quarter }),
  });

  const save = useMutation({
    mutationFn: (body: {
      user_id: number;
      revenue_target: number;
      proposals_target: number;
      meetings_target: number;
    }) => kpiApi.saveTarget({ ...body, year, quarter }),
    onSuccess: async () => {
      setError("");
      await queryClient.invalidateQueries({ queryKey: ["admin", "targets"] });
      await queryClient.invalidateQueries({ queryKey: ["kpi"] });
    },
    onError: (caught) => setError((caught as ApiError).body?.error ?? "บันทึกเป้าไม่สำเร็จ"),
  });

  const rows = data?.data ?? [];

  return (
    <Panel title="เป้ารายไตรมาส">
      {error ? <Alert tone="stop">{error}</Alert> : null}

      <div className="mb-4 grid gap-3 sm:grid-cols-2">
        <Select aria-label="ปี" value={year} onChange={(event) => setYear(Number(event.target.value))}>
          {[now.getFullYear() - 1, now.getFullYear(), now.getFullYear() + 1].map((value) => (
            <option key={value} value={value}>
              ปี {value}
            </option>
          ))}
        </Select>
        <Select
          aria-label="ไตรมาส"
          value={quarter}
          onChange={(event) => setQuarter(Number(event.target.value))}
        >
          {[1, 2, 3, 4].map((value) => (
            <option key={value} value={value}>
              ไตรมาส {value}
            </option>
          ))}
        </Select>
      </div>

      {isLoading ? (
        <Spinner />
      ) : (
        <ul className="space-y-4">
          {rows.map((row) => {
            const draft = drafts[row.user_id] ?? {
              revenue: String(row.revenue_target),
              proposals: String(row.proposals_target),
              meetings: String(row.meetings_target),
            };
            const setDraft = (patch: Partial<typeof draft>) =>
              setDrafts((current) => ({ ...current, [row.user_id]: { ...draft, ...patch } }));

            return (
              <li key={row.user_id} className="rounded-xl border border-line p-4">
                <p className="font-display text-sm font-semibold text-ink">
                  {row.user?.name ?? `ผู้ใช้ #${row.user_id}`}
                  {row.id === 0 ? (
                    <span className="ml-2 font-body text-xs font-normal text-muted">(ค่าเริ่มต้น ยังไม่บันทึก)</span>
                  ) : null}
                </p>
                <div className="mt-3 grid gap-3 sm:grid-cols-3">
                  <Field label="ยอดขาย (บาท/ไตรมาส)">
                    <Input
                      value={draft.revenue}
                      onChange={(event) => setDraft({ revenue: event.target.value })}
                      inputMode="numeric"
                    />
                  </Field>
                  <Field label="ใบเสนอราคา (ฉบับ/ไตรมาส)">
                    <Input
                      value={draft.proposals}
                      onChange={(event) => setDraft({ proposals: event.target.value })}
                      inputMode="numeric"
                    />
                  </Field>
                  <Field label="นัดคุย (ครั้ง/ไตรมาส)">
                    <Input
                      value={draft.meetings}
                      onChange={(event) => setDraft({ meetings: event.target.value })}
                      inputMode="numeric"
                    />
                  </Field>
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-3">
                  <Button
                    size="sm"
                    onClick={() =>
                      save.mutate({
                        user_id: row.user_id,
                        revenue_target: Number(draft.revenue || 0),
                        proposals_target: Number(draft.proposals || 0),
                        meetings_target: Number(draft.meetings || 0),
                      })
                    }
                    disabled={save.isPending}
                  >
                    บันทึกเป้า
                  </Button>
                  <span className="font-mono text-xs text-muted">
                    ≈ {formatBaht(Number(draft.revenue || 0) / 3)} ต่อเดือน
                  </span>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </Panel>
  );
}
