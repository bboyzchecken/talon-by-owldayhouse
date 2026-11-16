"use client";

import { useQuery } from "@tanstack/react-query";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { DocumentForm } from "@/components/docs/document-form";
import { Alert, Spinner } from "@/components/odh";
import { documents } from "@/lib/api";
import { docTypeLabels } from "@/lib/docs";
import type { DocType } from "@/lib/types";

export default function NewDocumentPage() {
  return (
    <Suspense fallback={<Spinner />}>
      <NewDocument />
    </Suspense>
  );
}

/** /docs/new makes a draft; /docs/new/?id=… edits one. */
function NewDocument() {
  const params = useSearchParams();
  const id = Number(params.get("id"));
  const initialType = Number(params.get("type")) || undefined;
  const editing = Number.isFinite(id) && id > 0;
  const existing = useQuery({ queryKey: ["docs", id, "detail"], queryFn: () => documents.get(id), enabled: editing });

  if (editing && existing.isLoading) return <Spinner />;
  if (editing && existing.error) return <Alert tone="stop">{(existing.error as Error).message}</Alert>;
  const doc = existing.data?.document;
  if (doc && doc.status !== "draft") {
    return <Alert tone="stop">เอกสารนี้ออกเลขแล้ว แก้ไขไม่ได้ ต้องยกเลิกแล้วออกใหม่</Alert>;
  }

  return (
    <div className="space-y-5">
      <header>
        <h1 className="font-display text-2xl font-semibold text-foreground sm:text-3xl">
          {doc ? `แก้ไขร่าง${docTypeLabels[doc.doc_type]}` : "สร้างเอกสาร"}
        </h1>
        <p className="mt-1 font-body text-sm text-muted-foreground">
          บันทึกเป็นร่างก่อน เลขที่เอกสารออกตอนกด “ออกเอกสาร” เท่านั้น ร่างที่ทิ้งไว้จึงไม่กินเลข
        </p>
      </header>
      <DocumentForm existing={doc} initialType={initialType as DocType | undefined} />
    </div>
  );
}
