"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Button } from "@odh/ui";
import { StageBadge } from "@/components/badges";
import { Alert, Field, Input, Panel, Select } from "@/components/ui";
import { ApiError, leads as leadsApi } from "@/lib/api";
import { toISODate } from "@/lib/format";
import { interestLabels, labelOf, stageLabels } from "@/lib/labels";
import type { Lead, Stage } from "@/lib/types";

/**
 * Moving a lead along the pipeline. `won` asks for the deal, because that is
 * what the KPI counts; a do_not_pitch lead cannot reach proposal or won at all,
 * so those buttons are not offered (and the API refuses them anyway).
 */
export function StageControl({ lead, canEdit }: { lead: Lead; canEdit: boolean }) {
  const queryClient = useQueryClient();
  const [target, setTarget] = useState<Stage | "">("");
  const [lostReason, setLostReason] = useState("");
  const [service, setService] = useState("system");
  const [amount, setAmount] = useState("");
  const [wonAt, setWonAt] = useState(toISODate());
  const [error, setError] = useState("");

  const change = useMutation({
    mutationFn: (stage: Stage) =>
      leadsApi.changeStage(lead.id, {
        stage,
        lost_reason: stage === "lost" || stage === "declined" ? lostReason : undefined,
        deal:
          stage === "won"
            ? { service, amount: Number(amount || 0), won_at: wonAt }
            : undefined,
      }),
    onSuccess: async () => {
      setTarget("");
      setAmount("");
      setLostReason("");
      setError("");
      await queryClient.invalidateQueries({ queryKey: ["leads"] });
    },
    onError: (caught) => {
      setError((caught as ApiError).body?.error ?? "เปลี่ยนขั้นไม่สำเร็จ");
    },
  });

  const available: Stage[] = (["new", "contacted", "meeting", "proposal", "won", "lost", "nurture", "declined"] as Stage[])
    .filter((stage) => stage !== lead.stage)
    .filter((stage) => !(lead.do_not_pitch && (stage === "proposal" || stage === "won")));

  return (
    <Panel title="ขั้นของลูกค้า" action={<StageBadge stage={lead.stage} />}>
      {error ? <Alert tone="stop">{error}</Alert> : null}

      {!canEdit ? (
        <p className="font-body text-sm text-muted">
          แก้ได้เฉพาะเซลส์ที่ดูแลรายนี้ หรือแอดมิน
        </p>
      ) : (
        <div className="space-y-3">
          {lead.do_not_pitch ? (
            <p className="font-body text-xs text-muted">
              รายนี้ติดสถานะห้ามเสนอขายตรง จึงไม่มีขั้น “ยื่นข้อเสนอ” และ “ปิดการขาย” ให้เลือก
            </p>
          ) : null}

          <div className="flex flex-wrap gap-2">
            {available.map((stage) => (
              <button
                key={stage}
                type="button"
                onClick={() => {
                  setError("");
                  if (stage === "won" || stage === "lost" || stage === "declined") {
                    setTarget(stage);
                    return;
                  }
                  change.mutate(stage);
                }}
                disabled={change.isPending}
                className="rounded-full border border-line px-4 py-2 font-display text-sm font-semibold text-ink transition-colors hover:border-navy hover:text-navy disabled:opacity-50"
              >
                ย้ายไป {labelOf(stageLabels, stage)}
              </button>
            ))}
          </div>

          {target === "won" ? (
            <div className="space-y-3 rounded-xl border border-gold bg-gold-soft p-4">
              <p className="font-display text-sm font-semibold text-navy">บันทึกดีลที่ปิดได้</p>
              <div className="grid gap-3 sm:grid-cols-3">
                <Field label="บริการ" required>
                  <Select value={service} onChange={(event) => setService(event.target.value)}>
                    {Object.keys(interestLabels).map((value) => (
                      <option key={value} value={value}>
                        {labelOf(interestLabels, value)}
                      </option>
                    ))}
                  </Select>
                </Field>
                <Field label="ยอดเงิน (บาท ไม่รวม VAT)" required>
                  <Input
                    value={amount}
                    onChange={(event) => setAmount(event.target.value)}
                    inputMode="numeric"
                    placeholder="0"
                  />
                </Field>
                <Field label="วันที่ปิดการขาย">
                  <Input type="date" value={wonAt} onChange={(event) => setWonAt(event.target.value)} />
                </Field>
              </div>
              <div className="flex gap-2">
                <Button size="sm" onClick={() => change.mutate("won")} disabled={change.isPending || !amount}>
                  บันทึกและปิดการขาย
                </Button>
                <Button size="sm" variant="line" onClick={() => setTarget("")}>
                  ยกเลิก
                </Button>
              </div>
            </div>
          ) : null}

          {target === "lost" || target === "declined" ? (
            <div className="space-y-3 rounded-xl border border-line p-4">
              <Field label={target === "lost" ? "เหตุผลที่ไม่ได้งาน" : "เหตุผลที่ไม่รับงาน"} required={target === "lost"}>
                <Input
                  value={lostReason}
                  onChange={(event) => setLostReason(event.target.value)}
                  placeholder={
                    target === "lost" ? "เช่น งบไม่พอ / เลือกเจ้าอื่น" : "เช่น งานต่อเนื่องจากระยะ 1 / วงเงินเกินผลงานเรา"
                  }
                />
              </Field>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={() => change.mutate(target)}
                  disabled={change.isPending || (target === "lost" && !lostReason.trim())}
                >
                  บันทึก
                </Button>
                <Button size="sm" variant="line" onClick={() => setTarget("")}>
                  ยกเลิก
                </Button>
              </div>
            </div>
          ) : null}
        </div>
      )}
    </Panel>
  );
}
