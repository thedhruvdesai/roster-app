"use client";

import { AlertTriangle, CheckCircle2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { addDays, fmtDow, todayISO } from "@/lib/dates";
import {
  LONG_SHIFT_HOURS,
  MIN_REST_HOURS,
  WEEKLY_HOURS_LIMIT,
  buildPaySummary,
  calcShift,
  findRestWarnings,
  fmtHours,
  fmtMoney,
  shiftsInRange,
} from "@/lib/pay";
import { useRoster } from "@/lib/store";
import { BADGE, cn } from "@/lib/ui";
import { ShiftDial } from "./ShiftDial";
import { EarningsChart, HoursGauge } from "./WeekCharts";
import type { Tab } from "@/lib/store";
import type { Shift } from "@/lib/types";

const FULL_DOW: Record<string, string> = { Mon: "Monday", Tue: "Tuesday", Wed: "Wednesday", Thu: "Thursday", Fri: "Friday", Sat: "Saturday", Sun: "Sunday" };

function countdown(ms: number) {
  const mins = Math.max(0, Math.round(ms / 60_000));
  const d = Math.floor(mins / 1440);
  const h = Math.floor((mins % 1440) / 60);
  const m = mins % 60;
  if (d) return `${d}d ${h}h`;
  if (h) return `${h}h ${m}m`;
  return `${m}m`;
}

/** Top strip: what's next, how loaded the week is, whether rest is OK, and what it pays. */
export function SummaryMetricsBar({ onAdd, onEdit, onNav }: { onAdd: () => void; onEdit: (s: Shift) => void; onNav: (t: Tab) => void }) {
  const { shifts, employers, weekStart } = useRoster();
  const weekEnd = addDays(weekStart, 6);
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(t);
  }, []);

  const m = useMemo(() => {
    const week = shiftsInRange(shifts, weekStart, weekEnd);
    const ids = new Set(week.map((s) => s.id));
    const rest = findRestWarnings(shifts).filter((w) => ids.has(w.nextShiftId));
    const long = week.filter((s) => calcShift(s).netHours > LONG_SHIFT_HOURS).length;
    const pay = buildPaySummary(shifts, employers, weekStart, weekEnd);

    // Current or next shift across the whole roster
    let onNow: (typeof shifts)[number] | undefined;
    let next: (typeof shifts)[number] | undefined;
    let nextAt = Infinity;
    for (const s of shifts) {
      const c = calcShift(s);
      const a = c.startAt.getTime();
      const b = c.endAt.getTime();
      if (a <= now && b > now) onNow = s;
      else if (a > now && a < nextAt) {
        next = s;
        nextAt = a;
      }
    }
    return { pay, rest, long, onNow, next, nextAt };
  }, [shifts, employers, weekStart, weekEnd, now]);

  const hours = m.pay.totalHours;
  const METER_MAX = Math.max(60, Math.ceil(hours / 10) * 10);
  const pct = Math.min(100, (hours / METER_MAX) * 100);
  const limitPct = (WEEKLY_HOURS_LIMIT / METER_MAX) * 100;
  const over = hours >= WEEKLY_HOURS_LIMIT;
  const near = !over && hours >= WEEKLY_HOURS_LIMIT * 0.85;
  const minGap = m.rest.length ? Math.min(...m.rest.map((r) => r.gapHours)) : null;

  const focus = m.onNow ?? m.next;
  const focusEmp = focus ? employers.find((e) => e.id === focus.employerId) : undefined;
  const fc = focus ? calcShift(focus) : null;
  const progress = m.onNow && fc ? Math.min(100, ((now - fc.startAt.getTime()) / (fc.endAt.getTime() - fc.startAt.getTime())) * 100) : null;

  const dayWord = focus ? (focus.date === todayISO() ? "today" : FULL_DOW[fmtDow(focus.date)] ?? fmtDow(focus.date)) : "";
  const hour = new Date(now).getHours();
  const greet = hour < 5 ? "Working late" : hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";

  const pills: { label: string; run: () => void; primary?: boolean }[] = [
    { label: "Add shift", run: () => onAdd(), primary: true },
    { label: "Timesheet", run: () => onNav("pay") },
    { label: "Pay", run: () => onNav("pay") },
    { label: "Employers", run: () => onNav("employers") },
  ];

  return (
    <section aria-label="This week at a glance" className="space-y-4">
      {/* Greeting */}
      <div className="reveal flex items-center gap-3 pt-1" style={{ animationDelay: "0ms" }}>
        <span className="flex h-11 w-11 items-center justify-center rounded-full bg-zinc-800 text-[17px] font-semibold text-zinc-50">D</span>
        <div className="leading-tight">
          <p className="text-[13px] text-zinc-400">{greet}, Dhruv</p>
          <p className="text-[17px] font-medium text-zinc-50">Here&apos;s your week</p>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.15fr_1fr]">
        {/* Balance-style week total + quick pills + glow card */}
        <div className="reveal rounded-[28px] bg-zinc-900 p-5 sm:p-6" style={{ animationDelay: "60ms" }}>
          <p className="text-[14px] text-zinc-400">Week&apos;s pay, before tax</p>
          <div className="mt-1 flex flex-wrap items-end gap-3">
            <p className="type-board text-[clamp(3rem,13vw,4.5rem)] text-zinc-50">{fmtMoney(m.pay.grossProjected)}</p>
            <span className="mb-2 rounded-full bg-vest/15 px-2.5 py-1 text-[13px] font-semibold text-vest">{fmtHours(hours)} · {m.pay.shiftCount} shifts</span>
          </div>
          <p className="mt-1 text-[14px] text-zinc-400">
            <span className="text-zinc-200">{fmtMoney(m.pay.verified)}</span> worked so far
          </p>

          <div className="-mx-1 mt-5 flex gap-2 overflow-x-auto px-1 pb-1">
            {pills.map((p) => (
              <button
                key={p.label}
                onClick={p.run}
                className={cn(
                  "h-10 shrink-0 rounded-full px-4 text-[14px] font-medium transition-colors active:opacity-70",
                  p.primary ? "bg-vest text-vest-ink" : "bg-zinc-800 text-zinc-200 hover:bg-zinc-700"
                )}
              >
                {p.label}
              </button>
            ))}
          </div>

          {/* Signature glow card */}
          <div className="glow-card mt-5 rounded-[24px] p-5">
            <p className="flex items-center gap-2 text-[15px] font-semibold">
              <span aria-hidden>✦</span>
              {m.onNow ? "On shift now" : focus ? `Next shift ${dayWord}` : "Nothing booked"}
            </p>
            {focus && fc ? (
              <>
                <p className="type-board mt-2 text-[clamp(2.75rem,12vw,4rem)]">
                  {focus.start}
                  <span className="mx-1 opacity-50">–</span>
                  {focus.end}
                </p>
                <p className="mt-2 max-w-[34ch] text-[14px] leading-snug opacity-80">
                  {focusEmp?.name} at {focus.site}
                  {fc.overnight ? ", running into the next morning" : ""}. Pays {fmtMoney(fc.pay)}.
                </p>
                {progress !== null && (
                  <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-black/20" aria-label={`${Math.round(progress)}% of shift done`}>
                    <div className="h-full rounded-full bg-black/70" style={{ width: `${progress}%` }} />
                  </div>
                )}
                <div className="mt-4 flex items-center justify-between gap-3">
                  <span className="rounded-full bg-black/15 px-3 py-1 text-[13px] font-medium">
                    {m.onNow ? `${countdown(fc.endAt.getTime() - now)} left` : `Starts in ${countdown(m.nextAt - now)}`}
                  </span>
                  <button onClick={() => onEdit(focus)} className="rounded-full bg-black/85 px-4 py-2 text-[13px] font-semibold text-white active:opacity-70">
                    Open shift
                  </button>
                </div>
              </>
            ) : (
              <p className="mt-2 text-[14px] opacity-80">Add a shift or set up your fixed weekly roster under Employers.</p>
            )}
          </div>
        </div>

        {/* Gauge + dial */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
          <div className="reveal flex flex-col rounded-[28px] bg-zinc-900 p-5" style={{ animationDelay: "120ms" }}>
            <div className="flex items-baseline justify-between">
              <p className="text-[15px] font-medium text-zinc-50">Weekly hours</p>
              <span className={cn("text-[13px]", over ? "text-rose-300" : near ? "text-amber-200" : "text-zinc-400")}>
                {over ? `${fmtHours(hours - WEEKLY_HOURS_LIMIT)} over` : `${fmtHours(WEEKLY_HOURS_LIMIT - hours)} left`}
              </span>
            </div>
            <div className="mt-4 flex flex-1 items-center">
              <HoursGauge hours={hours} limit={WEEKLY_HOURS_LIMIT} />
            </div>
            <div className={cn("mt-4 flex items-center gap-2 rounded-2xl px-3 py-2.5 text-[13px]", m.rest.length ? "bg-rose-500/10 text-rose-300" : "bg-zinc-800 text-zinc-300")}>
              {m.rest.length ? <AlertTriangle size={15} /> : <CheckCircle2 size={15} className="text-vest" />}
              {m.rest.length
                ? `${m.rest.length} short rest gap${m.rest.length > 1 ? "s" : ""}, tightest ${minGap! < 0 ? "overlaps" : fmtHours(minGap!)}`
                : `Rest gaps clear, all ${MIN_REST_HOURS}h or more`}
              {m.long > 0 && <span className="ml-auto text-amber-200">{m.long} over {LONG_SHIFT_HOURS}h</span>}
            </div>
          </div>

          <div className="reveal rounded-[28px] bg-zinc-900 p-5" style={{ animationDelay: "180ms" }}>
            <p className="text-[15px] font-medium text-zinc-50">Next 24 hours</p>
            <div className="mt-2">
              <ShiftDial
                shifts={shifts}
                employers={employers}
                now={now}
                focus={focus}
                centre={focus && fc ? countdown((m.onNow ? fc.endAt.getTime() : m.nextAt) - now) : "Free"}
                caption={m.onNow ? "left on shift" : focus ? "until next shift" : "no shifts"}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Earnings line */}
      <div className="reveal rounded-[28px] bg-zinc-900 p-5 sm:p-6" style={{ animationDelay: "240ms" }}>
        <div className="mb-3 flex items-baseline justify-between">
          <p className="text-[15px] font-medium text-zinc-50">Earnings by day</p>
          <p className="text-[13px] text-zinc-400">{fmtMoney(m.pay.grossProjected)} this week</p>
        </div>
        <EarningsChart shifts={shifts} weekStart={weekStart} today={todayISO()} />
      </div>
    </section>
  );
}
