"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { CalendarClock, Users } from "lucide-react";
import { Button } from "@odh/ui";
import { LeadCard, leadHref } from "@/components/lead-card";
import { TeamCalendar } from "@/components/team-calendar";
import { Alert, EmptyState, Panel, Spinner, StatTile } from "@/components/ui";
import { leads as leadsApi } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { formatWhen } from "@/lib/format";
import { activityTypeLabels, labelOf } from "@/lib/labels";

export default function TodayPage() {
  const { user, isAdmin } = useAuth();
  const { data, isLoading, error } = useQuery({
    queryKey: ["leads", "today"],
    queryFn: () => leadsApi.today(),
  });

  if (isLoading) return <Spinner />;
  if (error) return <Alert>{error.message}</Alert>;

  const due = data?.due ?? [];
  const upcoming = data?.upcoming ?? [];
  const meetings = data?.meetings ?? [];

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-display text-2xl font-semibold text-ink sm:text-3xl">วันนี้</h1>
        <p className="mt-1 font-body text-sm text-muted">
          {isAdmin
            ? "ลูกค้าที่ถึงกำหนดตามต่อของทุกคน และนัดที่กำลังจะถึง"
            : `สวัสดี ${user?.name ?? ""} — ลูกค้าที่ถึงกำหนดตามต่อ และนัดที่กำลังจะถึง`}
        </p>
      </header>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <StatTile label="ต้องตามวันนี้" value={due.length} tone={due.length > 0 ? "key" : "plain"} />
        <StatTile label="ตามต่อ 7 วันข้างหน้า" value={upcoming.length} />
        <StatTile label="นัดที่จะถึง" value={meetings.length} />
      </div>

      <Panel title={`ถึงกำหนดตามต่อ (${due.length})`}>
        {due.length === 0 ? (
          <EmptyState
            title="ไม่มีรายการค้างวันนี้"
            hint="เมื่อกำหนดวันตามต่อให้ลูกค้า รายชื่อจะมาโผล่ที่นี่"
            action={
              <Button asChild size="sm">
                <Link href="/leads/list">ดูรายชื่อทั้งหมด</Link>
              </Button>
            }
          />
        ) : (
          <ul className="space-y-3">
            {due.map((lead) => (
              <li key={lead.id}>
                <LeadCard lead={lead} />
              </li>
            ))}
          </ul>
        )}
      </Panel>

      <TeamCalendar userId={user?.id} />

      <Panel title={`นัดที่กำลังจะถึง (${meetings.length})`}>
        {meetings.length === 0 ? (
          <EmptyState title="ยังไม่มีนัดในสัปดาห์นี้" hint="บันทึกนัดได้จากหน้ารายละเอียดลูกค้า" />
        ) : (
          <ul className="divide-y divide-line">
            {meetings.map((activity) => (
              <li key={activity.id} className="py-3 first:pt-0 last:pb-0">
                <Link
                  href={leadHref(activity.lead_id)}
                  className="flex items-start gap-3 rounded-xl p-1 transition-colors hover:bg-navy/5"
                >
                  <CalendarClock className="mt-0.5 size-4 shrink-0 text-navy" aria-hidden />
                  <div className="min-w-0">
                    <div className="truncate font-display text-sm font-semibold text-ink">
                      {activity.lead?.name ?? `ลูกค้า #${activity.lead_id}`}
                    </div>
                    <div className="font-body text-xs text-muted">
                      {formatWhen(activity.happened_at)} ·{" "}
                      {labelOf(activityTypeLabels, activity.type)}
                      {activity.user ? ` · ${activity.user.name}` : ""}
                    </div>
                    {activity.summary ? (
                      <p className="mt-0.5 font-body text-xs text-muted">{activity.summary}</p>
                    ) : null}
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Panel>

      <Panel title={`ตามต่อ 7 วันข้างหน้า (${upcoming.length})`}>
        {upcoming.length === 0 ? (
          <EmptyState title="ยังไม่มีรายการในสัปดาห์นี้" />
        ) : (
          <ul className="space-y-3">
            {upcoming.map((lead) => (
              <li key={lead.id}>
                <LeadCard lead={lead} />
              </li>
            ))}
          </ul>
        )}
      </Panel>

      <div className="flex flex-wrap gap-3">
        <Button asChild variant="line" size="sm">
          <Link href="/leads/list">
            <Users className="size-4" aria-hidden />
            รายชื่อลูกค้าทั้งหมด
          </Link>
        </Button>
        <Button asChild size="sm">
          <Link href="/leads/new">เพิ่มลูกค้า</Link>
        </Button>
      </div>
    </div>
  );
}
