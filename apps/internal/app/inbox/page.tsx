"use client";

import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { cn } from "@odh/ui";
import { RequestCard } from "@/components/inbox/request-card";
import { Alert, EmptyState, Spinner } from "@/components/odh";
import { inbox } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useMeta } from "@/lib/hooks";
import type { InboundStatus } from "@/lib/types";

const tabs: { status: InboundStatus; label: string; hint: string }[] = [
  { status: "new", label: "ใหม่", hint: "ยังไม่มีใครรับหรือทิ้ง ใครในทีมกดรับก่อน คนนั้นได้ดูแล" },
  { status: "accepted", label: "รับแล้ว", hint: "อยู่ใน Lead Tracker แล้ว" },
  {
    status: "discarded",
    label: "ทิ้งแล้ว",
    hint: "เก็บไว้ดูย้อนหลังว่าสแปมมาจากไหน ระบบลบให้เองเมื่อครบ 180 วันนับจากวันที่ส่ง",
  },
];

export default function InboxPage() {
  const { isAdmin } = useAuth();
  const { data: meta } = useMeta();
  const [status, setStatus] = useState<InboundStatus>("new");

  const list = useQuery({
    queryKey: ["inbox", "list", status],
    queryFn: () => inbox.list(status),
  });

  const counts = list.data?.counts;
  const items = list.data?.items ?? [];

  return (
    <div className="space-y-5">
      <header>
        <h1 className="font-display text-2xl font-semibold text-foreground sm:text-3xl">งานเข้า</h1>
        <p className="mt-1 max-w-2xl font-body text-sm text-muted-foreground">
          คำขอใบเสนอราคาจากฟอร์มบน owldayhouse.com ยังไม่เป็นลูกค้าจนกว่าคนในทีมจะกดรับ ลูกค้าไม่ได้รับอีเมลยืนยัน
          จึงต้องติดต่อกลับทางช่องทางที่เขาให้ไว้
        </p>
      </header>

      <nav aria-label="สถานะคำขอ" className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
        <ul className="flex gap-2">
          {tabs.map((tab) => (
            <li key={tab.status}>
              <button
                type="button"
                onClick={() => setStatus(tab.status)}
                aria-current={status === tab.status ? "page" : undefined}
                className={cn(
                  "whitespace-nowrap rounded-full px-4 py-2 font-display text-sm font-semibold transition-colors",
                  status === tab.status
                    ? "bg-primary text-primary-foreground"
                    : "border border-border text-muted-foreground hover:border-foreground",
                )}
              >
                {tab.label}
                {counts ? <span className="ml-1.5 font-mono text-xs opacity-80">{counts[tab.status] ?? 0}</span> : null}
              </button>
            </li>
          ))}
        </ul>
      </nav>
      <p className="font-body text-xs text-muted-foreground">{tabs.find((t) => t.status === status)?.hint}</p>

      {list.error ? <Alert tone="stop">{(list.error as Error).message}</Alert> : null}

      {list.isLoading ? (
        <Spinner />
      ) : items.length === 0 ? (
        <EmptyState
          title={status === "new" ? "ไม่มีคำขอใหม่" : "ไม่มีรายการในหมวดนี้"}
          hint={status === "new" ? "คำขอที่ส่งจากหน้าติดต่อเราบนเว็บไซต์จะขึ้นที่นี่ และนับเป็นตัวเลขบนเมนู" : undefined}
        />
      ) : (
        <ul className="space-y-3">
          {items.map((item) => (
            <li key={item.id}>
              <RequestCard
                item={item}
                users={meta?.users ?? []}
                isAdmin={isAdmin}
                industries={meta?.industries ?? []}
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
