"use client";

import Link from "next/link";
import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { Copy, Download } from "lucide-react";
import { Button } from "@odh/ui";
import { Alert, Panel } from "@/components/ui";
import { ApiError, egp } from "@/lib/api";
import type { EgpBrief } from "@/lib/types";

/**
 * Turns the starred projects into one Markdown file to hand to Claude for a
 * go / no-go analysis. The file carries its own request, the company notes
 * from the settings page and each agency's other projects.
 */
export function BriefExport({ count, hasCompanyNotes }: { count: number; hasCompanyNotes: boolean }) {
  const [done, setDone] = useState("");
  const [error, setError] = useState("");

  const run = useMutation({
    mutationFn: async (action: "download" | "copy") => ({ action, brief: await egp.brief() }),
    onSuccess: async ({ action, brief }) => {
      setError("");
      if (action === "download") {
        download(brief);
        setDone(`ดาวน์โหลด ${brief.filename} แล้ว (${brief.count} โครงการ)`);
      } else {
        try {
          await navigator.clipboard.writeText(brief.markdown);
          setDone(`คัดลอกแล้ว ${brief.count} โครงการ วางในแชท Claude ได้เลย`);
        } catch {
          download(brief);
          setDone("เบราว์เซอร์ไม่ให้คัดลอก จึงดาวน์โหลดเป็นไฟล์แทน");
        }
      }
    },
    onError: (caught) => {
      setDone("");
      setError((caught as ApiError).body?.error ?? "ส่งออกไม่สำเร็จ");
    },
  });

  return (
    <Panel title="ส่งออกให้ Claude วิเคราะห์">
      <ol className="list-decimal space-y-1 pl-5 font-body text-sm text-ink">
        <li>กดดาวน์โหลด (หรือคัดลอก) งานที่คัดไว้ {count} งาน</li>
        <li>
          เปิดแชทใหม่ใน Claude แนบไฟล์นี้ และแนบ <strong>TOR / ร่างประกาศ</strong> ของงานที่สนใจที่สุดจาก e-GP
          ถ้ามี
        </li>
        <li>ส่งได้เลย ในไฟล์มีคำขอวิเคราะห์ ไป / ไม่ไป เขียนไว้ให้แล้ว</li>
      </ol>
      {!hasCompanyNotes ? (
        <p className="mt-2 font-body text-xs text-muted">
          ยังไม่ได้กรอกข้อมูลบริษัท (ทุน ผลงาน ทีม พาร์ทเนอร์) ผลวิเคราะห์จะแม่นขึ้นมากถ้ากรอกไว้ใน{" "}
          <Link href="/egp/settings" className="font-semibold text-navy underline">
            หน้าตั้งค่า
          </Link>
        </p>
      ) : null}
      <div className="mt-4 flex flex-wrap gap-2">
        <Button size="sm" onClick={() => run.mutate("download")} disabled={run.isPending || count === 0}>
          <Download className="size-4" aria-hidden />
          ดาวน์โหลดไฟล์ .md
        </Button>
        <Button size="sm" variant="line" onClick={() => run.mutate("copy")} disabled={run.isPending || count === 0}>
          <Copy className="size-4" aria-hidden />
          คัดลอกข้อความ
        </Button>
      </div>
      {done ? (
        <div className="mt-3">
          <Alert>{done}</Alert>
        </div>
      ) : null}
      {error ? (
        <div className="mt-3">
          <Alert tone="stop">{error}</Alert>
        </div>
      ) : null}
    </Panel>
  );
}

function download(brief: EgpBrief) {
  const blob = new Blob([brief.markdown], { type: "text/markdown;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = brief.filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
