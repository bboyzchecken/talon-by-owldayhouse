"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@odh/ui";
import { money } from "@/lib/docs";
import type { Aging, AmountRow, MonthTotals } from "@/lib/types";

// Charts for the finance overview. Brand colors only: navy (primary) carries
// revenue, gold carries expenses — the pair separates under every kind of
// color blindness, and since navy is very dark against white, every chart
// also has a legend, a direct label on the chosen month and a table view, so
// nothing is read from color alone.

const compact = new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 });
const shortMonth = new Intl.DateTimeFormat("th-TH", { month: "short", calendar: "gregory", timeZone: "UTC" });
const longMonth = new Intl.DateTimeFormat("th-TH", { month: "long", year: "numeric", calendar: "gregory", numberingSystem: "latn", timeZone: "UTC" });

export const monthShort = (key: string) => shortMonth.format(new Date(`${key}-01T00:00:00Z`));
export const monthLong = (key: string) => longMonth.format(new Date(`${key}-01T00:00:00Z`));

const num = (v: string | number) => Number(v) || 0;

/** A round top for the axis: 1, 2 or 5 times a power of ten, over the largest value. */
function niceMax(max: number) {
  if (max <= 0) return 1;
  const pow = 10 ** Math.floor(Math.log10(max));
  for (const step of [1, 2, 2.5, 5, 10]) if (step * pow >= max) return step * pow;
  return 10 * pow;
}

/** A bar with 4px rounded data-end, anchored square on the baseline. */
function barPath(x: number, y: number, w: number, h: number) {
  if (h <= 0) return "";
  const r = Math.min(4, w / 2, h);
  return `M${x},${y + h}V${y + r}Q${x},${y} ${x + r},${y}H${x + w - r}Q${x + w},${y} ${x + w},${y + r}V${y + h}Z`;
}

function useWidth<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [width, setWidth] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) => setWidth(entry?.contentRect.width ?? 0));
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  return [ref, width] as const;
}

function Swatch({ className }: { className: string }) {
  return <span className={cn("inline-block size-2.5 rounded-sm", className)} aria-hidden />;
}

export function ViewToggle({ table, onChange }: { table: boolean; onChange: (table: boolean) => void }) {
  return (
    <div className="flex rounded-full border border-border p-0.5" role="group" aria-label="รูปแบบการแสดง">
      {[
        { t: false, label: "กราฟ" },
        { t: true, label: "ตาราง" },
      ].map((o) => (
        <button
          key={o.label}
          type="button"
          aria-pressed={table === o.t}
          onClick={() => onChange(o.t)}
          className={cn(
            "rounded-full px-3 py-1 font-display text-xs font-semibold",
            table === o.t ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground",
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

/** Revenue and expenses, twelve months ending at the chosen one: grouped bars, one axis. */
export function IncomeExpenseChart({ series, selected }: { series: MonthTotals[]; selected: string }) {
  const [ref, width] = useWidth<HTMLDivElement>();
  const [hover, setHover] = useState<number | null>(null);
  const [table, setTable] = useState(false);

  const height = 260;
  const m = { top: 24, right: 8, bottom: 28, left: 48 };
  const plotW = Math.max(0, width - m.left - m.right);
  const plotH = height - m.top - m.bottom;
  const top = niceMax(Math.max(...series.flatMap((s) => [num(s.revenue), num(s.expense)]), 0));
  const y = (v: number) => m.top + plotH - (Math.max(0, v) / top) * plotH;
  const band = series.length ? plotW / series.length : 0;
  const barW = Math.max(3, Math.min(18, (band - 10) / 2));
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((f) => f * top);
  // On a narrow screen every other month is labelled, counting back from the last.
  const labelEvery = band < 34 ? 2 : 1;
  const active = hover ?? series.findIndex((s) => s.month === selected);
  const point = active >= 0 ? series[active] : undefined;

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <ul className="flex flex-wrap gap-4 font-body text-xs text-muted-foreground" aria-label="คำอธิบายกราฟ">
          <li className="flex items-center gap-1.5">
            <Swatch className="bg-primary" /> รายได้ (ก่อน VAT)
          </li>
          <li className="flex items-center gap-1.5">
            <Swatch className="bg-gold" /> ค่าใช้จ่าย
          </li>
        </ul>
        <ViewToggle table={table} onChange={setTable} />
      </div>

      {table ? (
        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[560px] font-body text-sm">
            <thead>
              <tr className="border-b border-border text-right font-display text-xs text-muted-foreground">
                <th className="py-2 text-left font-semibold">เดือน</th>
                <th className="py-2 font-semibold">รายได้</th>
                <th className="py-2 font-semibold">ค่าใช้จ่าย</th>
                <th className="py-2 font-semibold">กำไรขั้นต้น</th>
                <th className="py-2 font-semibold">เงินเข้า</th>
                <th className="py-2 font-semibold">เงินออก</th>
              </tr>
            </thead>
            <tbody className="font-mono tabular-nums">
              {series.map((s) => (
                <tr key={s.month} className={cn("border-b border-border text-right last:border-0", s.month === selected && "font-semibold")}>
                  <td className="py-2 text-left font-body">{monthLong(s.month)}</td>
                  <td className="py-2">{money(s.revenue)}</td>
                  <td className="py-2">{money(s.expense)}</td>
                  <td className="py-2">{money(num(s.revenue) - num(s.expense))}</td>
                  <td className="py-2">{money(s.cash_in)}</td>
                  <td className="py-2">{money(s.cash_out)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div ref={ref} className="relative mt-3" onMouseLeave={() => setHover(null)}>
          {width > 0 ? (
            <svg width={width} height={height} role="img" aria-label="กราฟรายได้และค่าใช้จ่าย 12 เดือน">
              {ticks.map((t) => (
                <g key={t}>
                  <line x1={m.left} x2={width - m.right} y1={y(t)} y2={y(t)} className={t === 0 ? "stroke-border" : "stroke-border/60"} strokeDasharray={t === 0 ? undefined : "2 4"} />
                  <text x={m.left - 8} y={y(t)} dy="0.32em" textAnchor="end" className="fill-muted-foreground font-mono text-[10px]">
                    {compact.format(t)}
                  </text>
                </g>
              ))}
              {series.map((s, i) => {
                const x0 = m.left + i * band;
                const cx = x0 + band / 2;
                const rev = num(s.revenue);
                const exp = num(s.expense);
                const isSel = s.month === selected;
                return (
                  <g key={s.month}>
                    {active === i ? <rect x={x0 + 2} y={m.top - 8} width={band - 4} height={plotH + 8} rx={6} className="fill-muted" /> : null}
                    <path d={barPath(cx - barW - 1, y(rev), barW, y(0) - y(rev))} className="fill-primary" />
                    <path d={barPath(cx + 1, y(exp), barW, y(0) - y(exp))} className="fill-gold" />
                    {isSel || (series.length - 1 - i) % labelEvery === 0 ? (
                      <text x={cx} y={height - 8} textAnchor="middle" className={cn("font-body text-[11px]", isSel ? "fill-foreground font-semibold" : "fill-muted-foreground")}>
                        {monthShort(s.month)}
                      </text>
                    ) : null}
                    {isSel && hover === null && labelEvery === 1 ? (
                      <text
                        x={cx + 40 > width - m.right ? width - m.right : cx}
                        y={Math.min(y(rev), y(exp)) - 6}
                        textAnchor={cx + 40 > width - m.right ? "end" : "middle"}
                        className="fill-foreground font-mono text-[10px]"
                      >
                        {compact.format(rev)} / {compact.format(exp)}
                      </text>
                    ) : null}
                    <rect
                      x={x0}
                      y={m.top - 8}
                      width={band}
                      height={plotH + m.bottom + 8}
                      fill="transparent"
                      onMouseEnter={() => setHover(i)}
                      onFocus={() => setHover(i)}
                      tabIndex={0}
                      aria-label={`${monthLong(s.month)} รายได้ ${money(rev)} ค่าใช้จ่าย ${money(exp)}`}
                    />
                  </g>
                );
              })}
            </svg>
          ) : (
            <div style={{ height }} />
          )}
          {point && hover !== null ? (
            <div
              className="pointer-events-none absolute top-0 z-10 w-56 rounded-xl border border-border bg-card p-3 font-body text-xs shadow-lg"
              style={{ left: Math.min(Math.max(0, m.left + hover * band + band / 2 - 112), Math.max(0, width - 224)) }}
              role="status"
            >
              <p className="font-display text-sm font-semibold text-foreground">{monthLong(point.month)}</p>
              <dl className="mt-1 space-y-0.5">
                <TipRow label="รายได้" value={point.revenue} swatch="bg-primary" />
                <TipRow label="ค่าใช้จ่าย" value={point.expense} swatch="bg-gold" />
                <TipRow label="กำไรขั้นต้น" value={num(point.revenue) - num(point.expense)} strong />
                <TipRow label="เงินเข้า" value={point.cash_in} />
                <TipRow label="เงินออก" value={point.cash_out} />
              </dl>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}

function TipRow({ label, value, swatch, strong }: { label: string; value: string | number; swatch?: string; strong?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className="flex items-center gap-1.5 text-muted-foreground">
        {swatch ? <Swatch className={swatch} /> : <span className="inline-block size-2.5" aria-hidden />}
        {label}
      </dt>
      <dd className={cn("font-mono tabular-nums text-foreground", strong && "font-semibold")}>{money(value)}</dd>
    </div>
  );
}

// Aging: one hue, light to dark as it gets later (sequential), 2px gaps.
const agingShades = ["bg-primary/20", "bg-primary/40", "bg-primary/60", "bg-primary/80", "bg-primary"];

export function AgingBar({ aging }: { aging: Aging }) {
  const total = num(aging.total);
  return (
    <div>
      <div className="flex h-3 w-full gap-0.5 overflow-hidden rounded-full bg-muted" aria-hidden>
        {total > 0
          ? aging.buckets.map((b, i) =>
              num(b.amount) > 0 ? (
                <div key={b.key} className={cn("h-full first:rounded-l-full last:rounded-r-full", agingShades[i])} style={{ width: `${(num(b.amount) / total) * 100}%` }} title={`${b.label}: ${money(b.amount)}`} />
              ) : null,
            )
          : null}
      </div>
      <table className="mt-3 w-full font-body text-sm">
        <caption className="sr-only">ยอดค้างตามอายุ</caption>
        <tbody>
          {aging.buckets.map((b, i) => (
            <tr key={b.key} className="border-b border-border last:border-0">
              <td className="py-1.5">
                <span className="flex items-center gap-2 text-foreground">
                  <span className={cn("inline-block size-2.5 rounded-sm", agingShades[i])} aria-hidden />
                  {b.label}
                </span>
              </td>
              <td className="py-1.5 text-right font-mono text-xs tabular-nums text-muted-foreground">{b.count} ใบ</td>
              <td className={cn("py-1.5 text-right font-mono tabular-nums", i > 0 && num(b.amount) > 0 ? "font-semibold text-foreground" : "text-foreground")}>
                {money(b.amount)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** Horizontal bars for a ranked breakdown, one hue, value labelled at the end. */
export function BarList({ rows, label }: { rows: { key: string; name: string; amount: string; href?: string }[]; label: string }) {
  const max = Math.max(...rows.map((r) => num(r.amount)), 0);
  if (rows.length === 0) return <p className="font-body text-sm text-muted-foreground">ยังไม่มีรายการ</p>;
  return (
    <ul className="space-y-2.5" aria-label={label}>
      {rows.map((r) => (
        <li key={r.key}>
          <div className="flex items-baseline justify-between gap-3 font-body text-sm">
            <span className="truncate text-foreground">{r.name}</span>
            <span className="shrink-0 font-mono tabular-nums text-foreground">{money(r.amount)}</span>
          </div>
          <div className="mt-1 h-2 rounded-full bg-muted">
            <div className="h-2 rounded-full bg-primary" style={{ width: `${max > 0 ? Math.max(1, (Math.max(0, num(r.amount)) / max) * 100) : 0}%` }} />
          </div>
        </li>
      ))}
    </ul>
  );
}

export type { AmountRow };
