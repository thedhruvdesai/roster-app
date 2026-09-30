"use client";

import { AlertTriangle, BedDouble, CheckCircle2, Clock3 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { addDays, fmtDow } from "@/lib/dates";
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
export function SummaryMetricsBar() {
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

  return (
    <div className="grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-zinc-800 bg-zinc-800 lg:grid-cols-[1.25fr_1.4fr_1fr_1fr]">
      {/* Now / next */}
      <div className={cn("col-span-2 bg-zinc-900 p-4 lg:col-span-1", m.onNow && "bg-vest/[0.08]")}>
        <p className="flex items-center gap-1.5 text-sm text-zinc-400">
          <Clock3 size={15} /> {m.onNow ? "On shift now" : "Next shift"}
        </p>
        {focus ? (
          <>
            <p className="mt-1 font-display text-3xl font-semibold leading-tight text-zinc-50">
              {m.onNow
                ? `${countdown(calcShift(focus).endAt.getTime() - now)} to go`
                : `In ${countdown(m.nextAt - now)}`}
            </p>
            <p className="mt-1 flex flex-wrap items-center gap-x-2 text-sm text-zinc-300">
              {focusEmp && <span className={cn("h-2 w-2 rounded-full", BADGE[focusEmp.color].dot)} />}
              <span className="font-medium">{focusEmp?.code}</span>
              <span className="text-zinc-400">
                {fmtDow(focus.date)} {focus.start}–{focus.end}
              </span>
            </p>
          </>
        ) : (
          <p className="mt-1 font-display text-3xl font-semibold text-zinc-500">Nothing booked</p>
        )}
      </div>

      {/* Hours meter */}
      <div className="col-span-2 bg-zinc-900 p-4 lg:col-span-1">
        <div className="flex items-baseline justify-between">
          <p className="text-sm text-zinc-400">Hours this week</p>
          <p className="text-sm text-zinc-500">{m.pay.shiftCount} shifts</p>
        </div>
        <p className="mt-1 font-display text-3xl font-semibold leading-tight text-zinc-50">
          {fmtHours(hours).replace("h", "")}
          <span className="ml-1 text-xl text-zinc-500">of {WEEKLY_HOURS_LIMIT}h</span>
        </p>
        <div className="relative mt-2 h-2 rounded-full bg-zinc-800">
          <div
            className={cn("h-full rounded-full transition-[width]", over ? "bg-rose-400" : near ? "bg-amber-300" : "bg-emerald-400")}
            style={{ width: `${pct}%` }}
          />
          <span className="absolute -inset-y-1 w-0.5 rounded bg-zinc-200" style={{ left: `${limitPct}%` }} title={`${WEEKLY_HOURS_LIMIT}h`} />
        </div>
        <p className={cn("mt-2 text-sm", over ? "text-rose-300" : near ? "text-amber-200" : "text-zinc-400")}>
          {over
            ? `${fmtHours(hours - WEEKLY_HOURS_LIMIT)} over a full-time week`
            : `${fmtHours(WEEKLY_HOURS_LIMIT - hours)} left before ${WEEKLY_HOURS_LIMIT}h`}
        </p>
      </div>

      {/* Rest */}
      <div className={cn("bg-zinc-900 p-4", m.rest.length > 0 && "bg-rose-500/[0.08]")}>
        <p className="flex items-center gap-1.5 text-sm text-zinc-400">
          <BedDouble size={15} /> Rest gaps
        </p>
        {m.rest.length ? (
          <>
            <p className="mt-1 flex items-center gap-2 font-display text-2xl font-semibold leading-tight text-rose-300 sm:text-3xl">
              <AlertTriangle size={22} /> {m.rest.length} short
            </p>
            <p className="mt-1 text-sm text-rose-200/80">
              Tightest {minGap! < 0 ? "overlaps" : `is ${fmtHours(minGap!)}`}, aim for {MIN_REST_HOURS}h+
            </p>
          </>
        ) : (
          <>
            <p className="mt-1 flex items-center gap-2 font-display text-2xl font-semibold leading-tight text-emerald-300 sm:text-3xl">
              <CheckCircle2 size={22} /> All clear
            </p>
            <p className="mt-1 text-sm text-zinc-400">Every gap is {MIN_REST_HOURS}h or more</p>
          </>
        )}
        {m.long > 0 && (
          <p className="mt-1 text-sm text-amber-200">
            {m.long} shift{m.long > 1 ? "s" : ""} over {LONG_SHIFT_HOURS}h
          </p>
        )}
      </div>

      {/* Pay */}
      <div className="bg-zinc-900 p-4">
        <p className="text-sm text-zinc-400">Week&apos;s pay (gross)</p>
        <p className="mt-1 font-display text-2xl font-semibold leading-tight text-zinc-50 sm:text-3xl">{fmtMoney(m.pay.grossProjected)}</p>
        <p className="mt-1 text-sm text-zinc-400">
          <span className="text-emerald-300">{fmtMoney(m.pay.verified)}</span> already worked
        </p>
      </div>
    </div>
  );
}
