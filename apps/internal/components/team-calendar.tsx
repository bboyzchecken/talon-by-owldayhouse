"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { CalendarClock, ChevronLeft, ChevronRight, FileClock, Handshake, Landmark } from "lucide-react";
import { cn } from "@odh/ui";
import { leadHref } from "@/components/lead-card";
import { Alert, Panel, Spinner } from "@/components/odh";
import { calendar } from "@/lib/api";
import { toISODate } from "@/lib/format";
import type { CalendarEvent, CalendarKind } from "@/lib/types";

// Days are handled as "YYYY-MM-DD" strings and UTC dates, so the grid never
// shifts with the browser's time zone; the API already speaks Bangkok days.
const day = (iso: string) => new Date(`${iso}T00:00:00Z`);
const iso = (d: Date) => d.toISOString().slice(0, 10);
const addDays = (d: Date, n: number) => new Date(d.getTime() + n * 86_400_000);

const monthTitle = new Intl.DateTimeFormat("th-TH", {
  timeZone: "UTC",
  month: "long",
  year: "numeric",
  calendar: "gregory",
  numberingSystem: "latn",
});
const dayTitle = new Intl.DateTimeFormat("th-TH", {
  timeZone: "UTC",
  weekday: "long",
  day: "numeric",
  month: "long",
  calendar: "gregory",
  numberingSystem: "latn",
});
const weekdays = ["อา", "จ", "อ", "พ", "พฤ", "ศ", "ส"];

const kindLabels: Record<CalendarKind, string> = {
  egp_deadline: "ปิดรับข้อเสนอ e-GP",
  meeting: "นัดพบ",
  follow_up: "ตามต่อ",
  tax_deadline: "กำหนดยื่นภาษี",
};

/** Dates that cannot move: e-GP closing dates and tax deadlines (admins only). */
const isDeadline = (kind: CalendarKind) => kind === "egp_deadline" || kind === "tax_deadline";

/** The six-week grid around a month, starting on Sunday. */
function gridFor(monthStart: Date) {
  const first = addDays(monthStart, -monthStart.getUTCDay());
  return Array.from({ length: 42 }, (_, i) => addDays(first, i));
}

/**
 * The team calendar on the Lead Tracker: e-GP closing dates of projects sent
 * to sales (they cannot move), meetings and follow-ups. Everyone sees the
 * whole team; "ของฉัน" narrows it to one's own leads.
 */
export function TeamCalendar({ userId }: { userId?: number }) {
  const today = toISODate();
  const [month, setMonth] = useState(() => today.slice(0, 7) + "-01");
  const [selected, setSelected] = useState(today);
  const [mineOnly, setMineOnly] = useState(false);

  const days = useMemo(() => gridFor(day(month)), [month]);
  const from = iso(days[0] ?? day(month));
  const to = iso(days[days.length - 1] ?? day(month));

  const { data, isLoading, error } = useQuery({
    queryKey: ["calendar", from, to],
    queryFn: () => calendar.range(from, to),
  });

  const events = useMemo(
    () => (data?.data ?? []).filter((e) => !mineOnly || (userId !== undefined && e.owner_id === userId)),
    [data, mineOnly, userId],
  );
  const byDay = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();
    for (const e of events) map.set(e.date, [...(map.get(e.date) ?? []), e]);
    return map;
  }, [events]);

  // The next closing dates, apart from the day already open above.
  const upcomingDeadlines = events
    .filter((e) => isDeadline(e.kind) && e.date >= today && e.date !== selected)
    .slice(0, 5);
  const selectedEvents = byDay.get(selected) ?? [];

  const shiftMonth = (n: number) => {
    const d = day(month);
    const next = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + n, 1));
    setMonth(iso(next));
  };

  return (
    <Panel title="ปฏิทินกลาง">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => shiftMonth(-1)}
            className="rounded-full p-2 text-muted-foreground transition-colors hover:bg-primary/5 hover:text-primary"
            aria-label="เดือนก่อน"
          >
            <ChevronLeft className="size-4" aria-hidden />
          </button>
          <h3 className="min-w-36 text-center font-display text-base font-semibold text-foreground">
            {monthTitle.format(day(month))}
          </h3>
          <button
            type="button"
            onClick={() => shiftMonth(1)}
            className="rounded-full p-2 text-muted-foreground transition-colors hover:bg-primary/5 hover:text-primary"
            aria-label="เดือนถัดไป"
          >
            <ChevronRight className="size-4" aria-hidden />
          </button>
          {month !== today.slice(0, 7) + "-01" ? (
            <button
              type="button"
              onClick={() => {
                setMonth(today.slice(0, 7) + "-01");
                setSelected(today);
              }}
              className="ml-1 rounded-full border border-border px-3 py-1 font-display text-xs font-semibold text-muted-foreground hover:border-foreground"
            >
              วันนี้
            </button>
          ) : null}
        </div>
        <div className="flex rounded-full border border-border p-0.5" role="group" aria-label="แสดงของใคร">
          {[
            { mine: false, label: "ทั้งทีม" },
            { mine: true, label: "ของฉัน" },
          ].map((option) => (
            <button
              key={option.label}
              type="button"
              onClick={() => setMineOnly(option.mine)}
              aria-pressed={mineOnly === option.mine}
              className={cn(
                "rounded-full px-3 py-1 font-display text-xs font-semibold transition-colors",
                mineOnly === option.mine ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground",
              )}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {error ? (
        <div className="mt-3">
          <Alert tone="stop">{(error as Error).message}</Alert>
        </div>
      ) : null}

      <div className="mt-3 grid grid-cols-7 gap-1 text-center" role="grid" aria-label="ปฏิทินเดือนนี้">
        {weekdays.map((w) => (
          <div key={w} className="pb-1 font-mono text-[11px] text-muted-foreground" role="columnheader">
            {w}
          </div>
        ))}
        {days.map((d) => {
          const key = iso(d);
          const list = byDay.get(key) ?? [];
          const deadlines = list.filter((e) => isDeadline(e.kind)).length;
          const meetings = list.filter((e) => e.kind === "meeting").length;
          const followUps = list.filter((e) => e.kind === "follow_up").length;
          const inMonth = key.slice(0, 7) === month.slice(0, 7);
          const isToday = key === today;
          const isSelected = key === selected;
          return (
            <button
              key={key}
              type="button"
              role="gridcell"
              onClick={() => setSelected(key)}
              aria-pressed={isSelected}
              aria-label={`${dayTitle.format(d)}: กำหนด ${deadlines} นัด ${meetings} ตามต่อ ${followUps}`}
              className={cn(
                "flex min-h-14 flex-col items-center gap-1 rounded-lg border px-0.5 py-1 transition-colors",
                isSelected ? "border-primary bg-primary/5" : "border-transparent hover:border-border",
                !inMonth && "opacity-40",
              )}
            >
              <span
                className={cn(
                  "flex size-6 items-center justify-center rounded-full font-mono text-xs tabular-nums",
                  isToday ? "bg-primary text-primary-foreground" : "text-foreground",
                )}
              >
                {d.getUTCDate()}
              </span>
              <span className="flex flex-wrap items-center justify-center gap-0.5" aria-hidden>
                {deadlines > 0 ? (
                  <span className="rounded bg-foreground px-1 font-mono text-[10px] leading-4 text-background">{deadlines}</span>
                ) : null}
                {meetings > 0 ? <span className="size-1.5 rounded-full border border-primary" /> : null}
                {followUps > 0 ? <span className="size-1.5 rounded-full bg-muted-foreground" /> : null}
              </span>
            </button>
          );
        })}
      </div>

      <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1 font-body text-xs text-muted-foreground" aria-label="คำอธิบายสัญลักษณ์">
        <li className="flex items-center gap-1.5">
          <span className="rounded bg-foreground px-1 font-mono text-[10px] leading-4 text-background">1</span> ปิดรับข้อเสนอ e-GP / ยื่นภาษี
        </li>
        <li className="flex items-center gap-1.5">
          <span className="size-1.5 rounded-full border border-primary" /> นัดพบ
        </li>
        <li className="flex items-center gap-1.5">
          <span className="size-1.5 rounded-full bg-muted-foreground" /> ตามต่อ
        </li>
      </ul>

      <div className="mt-4 border-t border-border pt-4">
        <h4 className="font-display text-sm font-semibold text-foreground">{dayTitle.format(day(selected))}</h4>
        {isLoading ? (
          <Spinner />
        ) : selectedEvents.length === 0 ? (
          <p className="mt-1 font-body text-sm text-muted-foreground">ไม่มีรายการ</p>
        ) : (
          <EventList events={selectedEvents} />
        )}
      </div>

      {upcomingDeadlines.length > 0 ? (
        <div className="mt-4 border-t border-border pt-4">
          <h4 className="font-display text-sm font-semibold text-foreground">กำหนดที่ใกล้ถึง</h4>
          <EventList events={upcomingDeadlines} showDate />
        </div>
      ) : null}
    </Panel>
  );
}

function EventList({ events, showDate = false }: { events: CalendarEvent[]; showDate?: boolean }) {
  return (
    <ul className="mt-2 space-y-2">
      {events.map((e, i) => {
        const Icon = e.kind === "tax_deadline" ? Landmark : e.kind === "egp_deadline" ? FileClock : e.kind === "meeting" ? Handshake : CalendarClock;
        return (
          <li key={`${e.kind}-${e.lead_id}-${e.project_id ?? ""}-${i}`}>
            <Link
              href={e.link ?? leadHref(e.lead_id)}
              className={cn(
                "flex items-start gap-3 rounded-xl border p-3 transition-colors hover:border-primary",
                isDeadline(e.kind) ? "border-foreground/40" : "border-border",
              )}
            >
              <Icon className={cn("mt-0.5 size-4 shrink-0", isDeadline(e.kind) ? "text-foreground" : "text-primary")} aria-hidden />
              <div className="min-w-0 flex-1">
                <p className="font-mono text-[11px] text-muted-foreground">
                  {kindLabels[e.kind]}
                  {showDate ? ` · ${dayTitle.format(day(e.date))}` : ""}
                  {e.time ? ` · ${e.time} น.` : ""}
                </p>
                <p className="font-display text-sm font-semibold text-foreground">{e.lead_name}</p>
                <p className="line-clamp-2 font-body text-sm text-foreground">{e.title}</p>
                <p className="font-body text-xs text-muted-foreground">
                  {e.kind === "tax_deadline"
                    ? e.detail
                    : [e.detail, e.owner_name ? `ดูแลโดย ${e.owner_name}` : "ยังไม่มอบหมาย"].filter(Boolean).join(" · ")}
                </p>
              </div>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
