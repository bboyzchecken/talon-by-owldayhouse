"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Button } from "@odh/ui";
import { Alert, Field, Input, Panel } from "@/components/ui";
import { ApiError, admin as adminApi } from "@/lib/api";
import { formatDate } from "@/lib/format";
import { useMeta } from "@/lib/hooks";

/**
 * The sales_existing cut-off: the last day a sales account may register one of
 * its own existing customers. After it, only an admin can.
 */
export function SettingsPanel() {
  const queryClient = useQueryClient();
  const { data: meta } = useMeta();
  const [value, setValue] = useState("");
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  const { data } = useQuery({ queryKey: ["admin", "settings"], queryFn: adminApi.listSettings });

  useEffect(() => {
    const row = data?.data.find((item) => item.key === "sales_existing_cutoff");
    if (row) setValue(row.value);
  }, [data]);

  const save = useMutation({
    mutationFn: () => adminApi.setCutoff(value),
    onSuccess: async () => {
      setError("");
      setSaved(true);
      await queryClient.invalidateQueries({ queryKey: ["admin", "settings"] });
      await queryClient.invalidateQueries({ queryKey: ["meta"] });
    },
    onError: (caught) => {
      setSaved(false);
      setError((caught as ApiError).body?.error ?? "บันทึกไม่สำเร็จ");
    },
  });

  const current = meta?.sales_existing_cutoff;
  const open = current ? new Date(`${current}T23:59:59+07:00`).getTime() >= Date.now() : false;

  return (
    <Panel title="วันหมดเขตลงลูกค้าเดิมของเซลส์">
      {error ? <Alert tone="stop">{error}</Alert> : null}
      {saved ? <Alert>บันทึกแล้ว</Alert> : null}

      <p className="font-body text-sm text-muted">
        ปัจจุบัน: <span className="font-semibold text-ink">{formatDate(current)}</span> —{" "}
        {open ? "เซลส์ยังลงลูกค้าเดิมของตัวเองได้" : "หมดเขตแล้ว เฉพาะแอดมินลงให้ได้"}
      </p>

      <div className="mt-4 flex flex-wrap items-end gap-3">
        <div className="min-w-48">
          <Field label="วันหมดเขต (รวมวันนั้น)">
            <Input
              type="date"
              value={value}
              onChange={(event) => {
                setSaved(false);
                setValue(event.target.value);
              }}
            />
          </Field>
        </div>
        <Button size="sm" onClick={() => save.mutate()} disabled={!value || save.isPending}>
          {save.isPending ? "กำลังบันทึก…" : "บันทึก"}
        </Button>
      </div>
    </Panel>
  );
}
