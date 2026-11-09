"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRef, useState } from "react";
import { Download, Paperclip, Trash2, Upload } from "lucide-react";
import { Button } from "@odh/ui";
import { Alert, EmptyState, Panel, Spinner } from "@/components/ui";
import { ApiError, files as filesApi, leads as leadsApi } from "@/lib/api";
import { formatBytes, formatDate } from "@/lib/format";
import { useMeta } from "@/lib/hooks";

/**
 * Attachments: quotes, briefs, booth photos. The browser uploads straight to
 * Cloudflare R2 through a presigned PUT and downloads through a presigned GET,
 * so the bytes never touch our server and the bucket stays private.
 */
export function FilesPanel({ leadId, canEdit }: { leadId: number; canEdit: boolean }) {
  const queryClient = useQueryClient();
  const { data: meta } = useMeta();
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["leads", leadId, "files"],
    queryFn: () => leadsApi.files.list(leadId),
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["leads", leadId, "files"] });

  const upload = useMutation({
    mutationFn: (file: File) => filesApi.upload("lead", leadId, file),
    onSuccess: async () => {
      setError("");
      if (inputRef.current) inputRef.current.value = "";
      await invalidate();
    },
    onError: (caught) => setError((caught as ApiError).body?.error ?? "อัปโหลดไม่สำเร็จ"),
  });

  const remove = useMutation({
    mutationFn: (id: number) => filesApi.remove(id),
    onSuccess: invalidate,
    onError: (caught) => setError((caught as ApiError).body?.error ?? "ลบไฟล์ไม่สำเร็จ"),
  });

  async function openFile(id: number) {
    setError("");
    try {
      const { download_url } = await filesApi.downloadURL(id);
      window.open(download_url, "_blank", "noopener,noreferrer");
    } catch (caught) {
      setError((caught as ApiError).body?.error ?? "เปิดไฟล์ไม่สำเร็จ");
    }
  }

  const rows = data?.data ?? [];
  const extensions = meta?.upload.extensions ?? [];
  const maxMB = meta ? Math.round(meta.upload.max_bytes / (1024 * 1024)) : 20;

  return (
    <Panel
      title={`ไฟล์แนบ (${rows.length})`}
      action={
        canEdit ? (
          <>
            <input
              ref={inputRef}
              type="file"
              className="sr-only"
              accept={extensions.join(",")}
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) upload.mutate(file);
              }}
            />
            <Button
              size="sm"
              variant="line"
              onClick={() => inputRef.current?.click()}
              disabled={upload.isPending}
            >
              <Upload className="size-4" aria-hidden />
              {upload.isPending ? "กำลังอัปโหลด…" : "อัปโหลด"}
            </Button>
          </>
        ) : null
      }
    >
      {error ? <Alert>{error}</Alert> : null}

      {isLoading ? (
        <Spinner />
      ) : rows.length === 0 ? (
        <EmptyState
          title="ยังไม่มีไฟล์แนบ"
          hint={`ใบเสนอราคา บรีฟ หรือรูปบูธ — รับ ${extensions.join(", ")} ขนาดไม่เกิน ${maxMB} MB`}
        />
      ) : (
        <ul className="divide-y divide-line">
          {rows.map((file) => (
            <li key={file.id} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
              <Paperclip className="size-4 shrink-0 text-muted" aria-hidden />
              <div className="min-w-0 flex-1">
                <p className="truncate font-display text-sm font-semibold text-ink">{file.filename}</p>
                <p className="font-mono text-[11px] text-muted">
                  {formatBytes(file.size)} · {formatDate(file.created_at)}
                  {file.uploader ? ` · ${file.uploader.name}` : ""}
                </p>
              </div>
              <button
                type="button"
                onClick={() => openFile(file.id)}
                className="flex size-10 items-center justify-center rounded-full border border-line text-muted transition-colors hover:border-navy hover:text-navy"
                aria-label={`ดาวน์โหลด ${file.filename}`}
              >
                <Download className="size-4" aria-hidden />
              </button>
              {canEdit ? (
                <button
                  type="button"
                  onClick={() => {
                    if (window.confirm(`ลบไฟล์ ${file.filename}?`)) remove.mutate(file.id);
                  }}
                  className="flex size-10 items-center justify-center rounded-full border border-line text-muted transition-colors hover:border-ink hover:text-ink"
                  aria-label={`ลบ ${file.filename}`}
                >
                  <Trash2 className="size-4" aria-hidden />
                </button>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}
