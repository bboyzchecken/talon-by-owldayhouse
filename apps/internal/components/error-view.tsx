"use client";

import Link from "next/link";
import { useEffect } from "react";
import { TriangleAlert } from "lucide-react";
import { Button } from "@odh/ui";

/**
 * What a page shows when it throws.
 *
 * React unmounts the whole tree under the nearest boundary, so without one a
 * single bad render — an array that came back null, a field that moved — takes
 * the entire app down to Next's bare "Application error" line. The boundaries
 * sit inside each tool's layout, which keeps the sidebar up: the tool that
 * broke is the only thing replaced, and the rest of the work is still there.
 *
 * The message and digest are printed for whoever has to report it; the console
 * keeps the stack, which the boundary would otherwise swallow.
 */
export function ErrorView({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <section className="mx-auto max-w-xl">
      <div className="rounded-2xl border border-border bg-card px-5 py-6">
        <span className="inline-flex size-10 items-center justify-center rounded-full border border-gold bg-notice text-primary">
          <TriangleAlert className="size-5" aria-hidden />
        </span>
        <h1 className="mt-4 font-display text-xl font-semibold text-foreground">
          หน้านี้แสดงผลไม่สำเร็จ
        </h1>
        <p className="mt-2 font-body text-sm text-muted-foreground">
          มีข้อผิดพลาดระหว่างแสดงหน้านี้ ข้อมูลในระบบยังอยู่ครบและไม่ได้ถูกแก้ไข
          ลองใหม่อีกครั้งได้เลย ถ้ายังไม่หาย
          ส่งรายละเอียดด้านล่างให้ทีมพัฒนาพร้อมบอกว่ากดอะไรมาก่อน
        </p>
        <div className="mt-5 flex flex-wrap gap-3">
          <Button size="sm" onClick={reset}>
            ลองใหม่
          </Button>
          <Button size="sm" variant="line" asChild>
            <Link href="/">กลับหน้าเครื่องมือ</Link>
          </Button>
        </div>
        <details className="mt-5 border-t border-border pt-4">
          <summary className="cursor-pointer font-display text-sm font-semibold text-foreground">
            รายละเอียดทางเทคนิค
          </summary>
          <p className="mt-2 break-words font-mono text-xs text-muted-foreground">
            {error.message || "ไม่มีข้อความแจ้งข้อผิดพลาด"}
          </p>
          {error.digest ? (
            <p className="mt-1 font-mono text-xs text-muted-foreground">
              digest: {error.digest}
            </p>
          ) : null}
        </details>
      </div>
    </section>
  );
}
