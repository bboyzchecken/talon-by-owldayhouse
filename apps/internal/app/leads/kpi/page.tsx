"use client";

import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Alert, Meter, Panel, Select, Spinner, StatTile } from "@/components/ui";
import { kpi as kpiApi } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { formatBaht, formatNumber, formatPercent } from "@/lib/format";
import { useMeta } from "@/lib/hooks";
import { labelOf, sourceLabels } from "@/lib/labels";
import type { KPIUser } from "@/lib/types";

const thaiMonths = [
  "มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน",
  "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม",
];

export default function KPIPage() {
  const { isAdmin } = useAuth();
  const { data: meta } = useMeta();

  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [period, setPeriod] = useState<string>(`q${Math.floor(now.getMonth() / 3) + 1}`);
  const [userID, setUserID] = useState<string>("");

  const quarter = period.startsWith("q") ? Number(period.slice(1)) : 0;
  const month = period.startsWith("m") ? Number(period.slice(1)) : 0;

  const { data, isLoading, error } = useQuery({
    queryKey: ["kpi", year, period, userID],
    queryFn: () =>
      kpiApi.get({
        year,
        quarter: quarter || undefined,
        month: month || undefined,
        user_id: userID ? Number(userID) : undefined,
      }),
  });

  const years = [now.getFullYear(), now.getFullYear() - 1, now.getFullYear() + 1];

  return (
    <div className="space-y-5">
      <header>
        <h1 className="font-display text-2xl font-semibold text-ink sm:text-3xl">KPI</h1>
        <p className="mt-1 font-body text-sm text-muted">
          แยกลูกค้าที่บริษัทหามา (KPI หลัก) ออกจากลูกค้าเดิมที่เซลส์พามาเอง (โบนัส)
        </p>
      </header>

      <Panel>
        <div className="grid gap-3 sm:grid-cols-3">
          <Select aria-label="ปี" value={year} onChange={(event) => setYear(Number(event.target.value))}>
            {years.map((value) => (
              <option key={value} value={value}>
                ปี {value}
              </option>
            ))}
          </Select>

          <Select aria-label="ช่วงเวลา" value={period} onChange={(event) => setPeriod(event.target.value)}>
            {[1, 2, 3, 4].map((value) => (
              <option key={`q${value}`} value={`q${value}`}>
                ไตรมาส {value}
              </option>
            ))}
            {thaiMonths.map((label, index) => (
              <option key={`m${index + 1}`} value={`m${index + 1}`}>
                {label}
              </option>
            ))}
          </Select>

          {isAdmin ? (
            <Select
              aria-label="เซลส์"
              value={userID}
              onChange={(event) => setUserID(event.target.value)}
            >
              <option value="">ทุกคน</option>
              {(meta?.users ?? []).map((person) => (
                <option key={person.id} value={person.id}>
                  {person.name}
                </option>
              ))}
            </Select>
          ) : null}
        </div>
      </Panel>

      {error ? <Alert>{(error as Error).message}</Alert> : null}

      {isLoading ? (
        <Spinner />
      ) : data ? (
        <>
          <p className="font-mono text-xs uppercase tracking-wide text-muted">{data.period.label}</p>

          {isAdmin && !userID ? (
            <Panel title="ทีมขายรวม">
              <TeamSummary team={data.team} />
            </Panel>
          ) : null}

          <div className="space-y-4">
            {data.users.map((row) => (
              <ScoreCard key={row.user_id} row={row} />
            ))}
          </div>

          <Panel title="แหล่งที่มาไหนได้ผล">
            <div className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
              <table className="w-full min-w-[640px] border-collapse text-left">
                <thead>
                  <tr className="border-b border-line">
                    {["แหล่งที่มา", "ลูกค้าใหม่", "นัดคุย", "ใบเสนอราคา", "ปิดได้", "ยอดรวม", "อัตราปิด"].map(
                      (heading) => (
                        <th
                          key={heading}
                          scope="col"
                          className="py-2 font-mono text-[11px] uppercase tracking-wide text-muted"
                        >
                          {heading}
                        </th>
                      ),
                    )}
                  </tr>
                </thead>
                <tbody>
                  {data.by_source.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-4 font-body text-sm text-muted">
                        ยังไม่มีข้อมูลในช่วงนี้
                      </td>
                    </tr>
                  ) : (
                    data.by_source.map((row) => (
                      <tr key={row.source} className="border-b border-line last:border-0">
                        <td className="py-2 font-display text-sm font-semibold text-ink">
                          {labelOf(sourceLabels, row.source)}
                        </td>
                        <td className="py-2 font-mono text-sm tabular-nums">{formatNumber(row.new_leads)}</td>
                        <td className="py-2 font-mono text-sm tabular-nums">{formatNumber(row.meetings)}</td>
                        <td className="py-2 font-mono text-sm tabular-nums">{formatNumber(row.proposals)}</td>
                        <td className="py-2 font-mono text-sm tabular-nums">{formatNumber(row.won_count)}</td>
                        <td className="py-2 font-mono text-sm tabular-nums">{formatBaht(row.won_amount)}</td>
                        <td className="py-2 font-mono text-sm tabular-nums">{formatPercent(row.won_rate)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </Panel>
        </>
      ) : null}
    </div>
  );
}

function TeamSummary({ team }: { team: KPIUser }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      <StatTile label="ยอดปิด (บริษัทหามา)" value={formatBaht(team.company.won_amount)} tone="key" />
      <StatTile label="ยอดปิด (โบนัส)" value={formatBaht(team.sales_existing.won_amount)} />
      <StatTile
        label="ใบเสนอราคา"
        value={formatNumber(team.company.proposals + team.sales_existing.proposals)}
      />
      <StatTile
        label="นัดคุย"
        value={formatNumber(team.company.meetings + team.sales_existing.meetings)}
      />
    </div>
  );
}

function ScoreCard({ row }: { row: KPIUser }) {
  return (
    <Panel
      title={row.name}
      action={<span className="font-mono text-xs text-muted">{row.username}</span>}
    >
      <div className="space-y-5">
        <section>
          <h3 className="font-display text-sm font-semibold text-ink">
            ลูกค้าที่บริษัทหามา — KPI หลัก
          </h3>
          <div className="mt-2 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <StatTile label="ลูกค้าใหม่" value={formatNumber(row.company.new_leads)} />
            <StatTile label="นัดคุย" value={formatNumber(row.company.meetings)} />
            <StatTile label="ใบเสนอราคา" value={formatNumber(row.company.proposals)} />
            <StatTile label="ยอดปิด" value={formatBaht(row.company.won_amount)} tone="key" />
          </div>

          {row.target ? (
            <div className="mt-3 grid gap-3 sm:grid-cols-3">
              <Meter
                percent={row.target.revenue_percent}
                label={`ยอดขาย ${formatPercent(row.target.revenue_percent)} ของเป้า ${formatBaht(row.target.revenue_target)}`}
              />
              <Meter
                percent={row.target.proposals_percent}
                label={`ใบเสนอราคา ${row.company.proposals}/${row.target.proposals_target}`}
              />
              <Meter
                percent={row.target.meetings_percent}
                label={`นัดคุย ${row.company.meetings}/${row.target.meetings_target}`}
              />
            </div>
          ) : (
            <p className="mt-2 font-body text-xs text-muted">
              ยังไม่ได้ตั้งเป้าของช่วงนี้ — แอดมินตั้งได้ในหน้า Admin
            </p>
          )}
        </section>

        <section>
          <h3 className="font-display text-sm font-semibold text-ink">
            ลูกค้าเดิมที่พามาเอง — โบนัส
          </h3>
          <div className="mt-2 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <StatTile label="ลูกค้าใหม่" value={formatNumber(row.sales_existing.new_leads)} />
            <StatTile label="นัดคุย" value={formatNumber(row.sales_existing.meetings)} />
            <StatTile label="ใบเสนอราคา" value={formatNumber(row.sales_existing.proposals)} />
            <StatTile label="ยอดปิด" value={formatBaht(row.sales_existing.won_amount)} />
          </div>
          {row.target ? (
            <p className="mt-2 font-body text-xs text-muted">
              โบนัสคิดเป็น {formatPercent(row.target.bonus_revenue_percent)} ของเป้าหลัก และไม่นับรวมใน KPI หลัก
            </p>
          ) : null}
        </section>

        <p className="font-mono text-xs text-muted">
          รวมทั้งสองส่วน: {formatBaht(row.total.won_amount)} · ลูกค้าใหม่{" "}
          {formatNumber(row.total.new_leads)} ราย
        </p>
      </div>
    </Panel>
  );
}
