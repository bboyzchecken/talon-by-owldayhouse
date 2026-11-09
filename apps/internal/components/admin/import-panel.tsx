"use client";

import Link from "next/link";
import { useMutation } from "@tanstack/react-query";
import { useRef, useState } from "react";
import { cn } from "@odh/ui";
import { Button } from "@odh/ui";
import { leadHref } from "@/components/lead-card";
import { Alert, Field, Input, Panel, Select } from "@/components/ui";
import { ApiError, csv } from "@/lib/api";
import { useMeta } from "@/lib/hooks";
import { labelOf, ownerTypeLabels, sourceLabels } from "@/lib/labels";
import type { ImportResponse, ImportRow } from "@/lib/types";

const statusLabels: Record<ImportRow["status"], string> = {
  new: "เพิ่มได้",
  created: "เพิ่มแล้ว",
  duplicate: "ซ้ำกับในระบบ",
  duplicate_in_file: "ซ้ำในไฟล์",
  similar: "ชื่อคล้าย",
  invalid: "ข้อมูลไม่ครบ",
};

const statusClasses: Record<ImportRow["status"], string> = {
  new: "bg-navy/10 text-navy",
  created: "bg-gold text-navy",
  duplicate: "bg-ink text-white",
  duplicate_in_file: "bg-ink/10 text-ink",
  similar: "bg-gold-soft text-navy",
  invalid: "bg-ink/5 text-muted",
};

/**
 * Two-pass CSV import for exhibitor lists: preview says which rows are
 * duplicates, near-duplicates or incomplete and whose they are, then commit
 * creates only what is safe.
 */
export function ImportPanel() {
  const { data: meta } = useMeta();
  const inputRef = useRef<HTMLInputElement>(null);

  const [file, setFile] = useState<File | null>(null);
  const [source, setSource] = useState("trade_fair");
  const [sourceDetail, setSourceDetail] = useState("");
  const [ownerType, setOwnerType] = useState("company");
  const [ownerUserID, setOwnerUserID] = useState("");
  const [confirmSimilar, setConfirmSimilar] = useState(false);
  const [result, setResult] = useState<ImportResponse | null>(null);
  const [error, setError] = useState("");

  const run = useMutation({
    mutationFn: (mode: "preview" | "commit") => {
      if (!file) throw new ApiError(0, { error: "เลือกไฟล์ CSV ก่อน" });
      return csv.import({
        file,
        mode,
        source,
        source_detail: sourceDetail || undefined,
        owner_type: ownerType,
        owner_user_id: ownerUserID ? Number(ownerUserID) : undefined,
        confirm_similar: confirmSimilar,
      });
    },
    onSuccess: (data) => {
      setError("");
      setResult(data);
    },
    onError: (caught) => setError((caught as ApiError).body?.error ?? "นำเข้าไม่สำเร็จ"),
  });

  const summary = result?.summary ?? {};

  return (
    <Panel title="นำเข้ารายชื่อจาก CSV">
      {error ? <Alert tone="stop">{error}</Alert> : null}

      <p className="font-body text-sm text-muted">
        คอลัมน์ที่รับ: <span className="font-mono">name, industry, source, source_detail, website, contact</span>{" "}
        (หัวตารางภาษาไทยก็ได้ เช่น ชื่อบริษัท, ผู้ติดต่อ) — ไฟล์เป็น UTF-8 ขนาดไม่เกิน 5 MB
      </p>

      <div className="mt-4 space-y-3">
        <Field label="ไฟล์ CSV" required>
          <input
            ref={inputRef}
            type="file"
            accept=".csv,text/csv"
            onChange={(event) => {
              setResult(null);
              setFile(event.target.files?.[0] ?? null);
            }}
            className="w-full rounded-xl border border-line bg-white px-4 py-3 font-body text-sm text-ink file:mr-3 file:rounded-full file:border-0 file:bg-navy file:px-4 file:py-2 file:font-display file:text-sm file:font-semibold file:text-white"
          />
        </Field>

        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="แหล่งที่มา (ใช้กับแถวที่ไม่ได้ระบุ)">
            <Select value={source} onChange={(event) => setSource(event.target.value)}>
              {(meta?.sources ?? []).map((value) => (
                <option key={value} value={value}>
                  {labelOf(sourceLabels, value)}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="รายละเอียดแหล่งที่มา" hint="เช่น ชื่องานแสดงสินค้า">
            <Input value={sourceDetail} onChange={(event) => setSourceDetail(event.target.value)} />
          </Field>
          <Field label="ประเภทเจ้าของ">
            <Select value={ownerType} onChange={(event) => setOwnerType(event.target.value)}>
              {(meta?.owner_types ?? []).map((value) => (
                <option key={value} value={value}>
                  {labelOf(ownerTypeLabels, value)}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="มอบหมายให้เซลส์" hint="เว้นว่างไว้ให้เป็นลูกค้าของบริษัทที่ยังไม่มอบหมาย">
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

        <label className="flex items-start gap-2 font-body text-sm text-ink">
          <input
            type="checkbox"
            checked={confirmSimilar}
            onChange={(event) => setConfirmSimilar(event.target.checked)}
            className="mt-0.5 size-4 rounded border-line-control accent-navy"
          />
          เพิ่มแถวที่ชื่อ “คล้าย” กับรายที่มีอยู่ด้วย (ตรวจแล้วว่าไม่ใช่รายเดียวกัน)
        </label>

        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="line" onClick={() => run.mutate("preview")} disabled={!file || run.isPending}>
            ตรวจก่อน (preview)
          </Button>
          <Button
            size="sm"
            onClick={() => run.mutate("commit")}
            disabled={!file || run.isPending || !result || result.mode !== "preview"}
          >
            ยืนยันนำเข้า
          </Button>
        </div>
        {result?.mode === "commit" ? (
          <p className="font-body text-xs text-muted">
            นำเข้าเรียบร้อย — กด “ตรวจก่อน” อีกครั้งถ้าจะนำเข้าไฟล์ใหม่
          </p>
        ) : null}
      </div>

      {result ? (
        <div className="mt-5 space-y-3">
          <div className="flex flex-wrap gap-2">
            {(Object.keys(statusLabels) as ImportRow["status"][]).map((status) =>
              summary[status] ? (
                <span
                  key={status}
                  className={cn(
                    "rounded-full px-3 py-1 font-display text-xs font-semibold",
                    statusClasses[status],
                  )}
                >
                  {statusLabels[status]}: {summary[status]}
                </span>
              ) : null,
            )}
          </div>

          <div className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
            <table className="w-full min-w-[640px] border-collapse text-left">
              <thead>
                <tr className="border-b border-line">
                  {["แถว", "ชื่อบริษัท", "สถานะ", "รายละเอียด"].map((heading) => (
                    <th
                      key={heading}
                      scope="col"
                      className="py-2 font-mono text-[11px] uppercase tracking-wide text-muted"
                    >
                      {heading}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {result.rows.map((row) => (
                  <tr key={row.row} className="border-b border-line align-top last:border-0">
                    <td className="py-2 font-mono text-xs text-muted">{row.row}</td>
                    <td className="py-2 font-body text-sm text-ink">
                      {row.lead_id ? (
                        <Link href={leadHref(row.lead_id)} className="underline">
                          {row.name || "—"}
                        </Link>
                      ) : (
                        row.name || "—"
                      )}
                    </td>
                    <td className="py-2">
                      <span
                        className={cn(
                          "rounded-full px-2.5 py-1 font-display text-xs font-semibold",
                          statusClasses[row.status],
                        )}
                      >
                        {statusLabels[row.status]}
                      </span>
                    </td>
                    <td className="py-2 font-body text-xs text-muted">
                      {row.duplicate
                        ? `มีอยู่แล้ว — ${row.duplicate.owner_name || "ยังไม่มอบหมาย"}`
                        : row.similar && row.similar.length > 0
                          ? `คล้าย: ${row.similar.map((item) => item.name).join(", ")}`
                          : (row.message ?? "")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}
    </Panel>
  );
}
