"use client";

import { AlertTriangle, BedDouble, Clock, DollarSign, Timer } from "lucide-react";
import { useMemo } from "react";
import { addDays } from "@/lib/dates";
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
import { cn } from "@/lib/ui";

/** Top banner: weekly hours meter, fatigue flags and pay at a glance. */
export function SummaryMetricsBar() {
  const { shifts, employers, weekStart } = useRoster();
  const weekEnd = addDays(weekStart, 6);

  const m = useMemo(() => {
    const week = shiftsInRange(shifts, weekStart, weekEnd);
    const ids = new Set(week.map((s) => s.id));
    const rest = findRestWarnings(shifts).filter((w) => ids.has(w.nextShiftId));
    const long = week.filter((s) => calcShift(s).netHours > LONG_SHIFT_HOURS).length;
    const pay = buildPaySummary(shifts, employers, weekStart, weekEnd);
    const workDays = new Set(week.map((s) => s.date)).size;
    return { pay, rest, long, workDays };
  }, [shifts, employers, weekStart, weekEnd]);

  const hours = m.pay.totalHours;
  const METER_MAX = 60;
  const pct = Math.min(100, (hours / METER_MAX) * 100);
  const limitPct = (WEEKLY_HOURS_LIMIT / METER_MAX) * 100;
  const over = hours >= WEEKLY_HOURS_LIMIT;
  const near = !over && hours >= WEEKLY_HOURS_LIMIT * 0.85;
  const minGap = m.rest.length ? Math.min(...m.rest.map((r) => r.gapHours)) : null;

  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {/* Hours meter */}
      <div className="col-span-2 rounded-2xl border border-zinc-800 bg-zinc-900/60 p-4">
        <div className="flex items-start justify-between">
          <div>
            <p className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-zinc-500">
              <Clock size={13} /> Weekly hours
            </p>
            <p className="mt-1 text-2xl font-semibold tabular-nums text-zinc-50">
              {fmtHours(hours)}
              <span className="ml-1.5 text-sm font-normal text-zinc-500">/ {WEEKLY_HOURS_LIMIT}h</span>
            </p>
          </div>
          <div className="text-right text-xs text-zinc-500">
            <p>{m.pay.shiftCount} shifts</p>
            <p>{m.workDays} of 7 days</p>
          </div>
        </div>
        <div className="relative mt-3 h-2.5 overflow-hidden rounded-full bg-zinc-800">
          <div
            className={cn("h-full rounded-full transition-all", over ? "bg-rose-500" : near ? "bg-amber-400" : "bg-emerald-400")}
            style={{ width: `${pct}%` }}
          />
          <div className="absolute inset-y-0 w-px bg-zinc-300/70" style={{ left: `${limitPct}%` }} />
        </div>
        <p className={cn("mt-2 text-xs", over ? "text-rose-300" : near ? "text-amber-300" : "text-zinc-500")}>
          {over
            ? `Over ${WEEKLY_HOURS_LIMIT}h — ${fmtHours(hours - WEEKLY_HOURS_LIMIT)} above a full-time load. Watch fatigue.`
            : near
            ? `Approaching ${WEEKLY_HOURS_LIMIT}h — ${fmtHours(WEEKLY_HOURS_LIMIT - hours)} headroom left.`
            : `${fmtHours(WEEKLY_HOURS_LIMIT - hours)} below the ${WEEKLY_HOURS_LIMIT}h fatigue threshold.`}
        </p>
      </div>

      {/* Rest / fatigue */}
      <div
        className={cn(
          "rounded-2xl border p-4",
          m.rest.length ? "border-rose-500/30 bg-rose-500/[0.07]" : "border-zinc-800 bg-zinc-900/60"
        )}
      >
        <p className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-zinc-500">
          <BedDouble size={13} /> Rest breaks
        </p>
        {m.rest.length ? (
          <>
            <p className="mt-1 flex items-center gap-1.5 text-2xl font-semibold text-rose-300">
              <AlertTriangle size={18} /> {m.rest.length}
            </p>
            <p className="mt-1 text-xs text-rose-300/80">
              Turnaround{m.rest.length > 1 ? "s" : ""} under {MIN_REST_HOURS}h · tightest {minGap! < 0 ? "overlapping" : fmtHours(minGap!)}
            </p>
          </>
        ) : (
          <>
            <p className="mt-1 text-2xl font-semibold text-emerald-300">OK</p>
            <p className="mt-1 text-xs text-zinc-500">All gaps ≥ {MIN_REST_HOURS}h</p>
          </>
        )}
        {m.long > 0 && (
          <p className="mt-1.5 flex items-center gap-1 text-xs text-amber-300">
            <Timer size={12} /> {m.long} shift{m.long > 1 ? "s" : ""} over {LONG_SHIFT_HOURS}h
          </p>
        )}
      </div>

      {/* Pay */}
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-4">
        <p className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-zinc-500">
          <DollarSign size={13} /> Projected pay
        </p>
        <p className="mt-1 text-2xl font-semibold tabular-nums text-zinc-50">{fmtMoney(m.pay.grossProjected)}</p>
        <p className="mt-1 text-xs text-zinc-500">
          <span className="text-emerald-300">{fmtMoney(m.pay.verified)}</span> worked · gross, pre-tax
        </p>
      </div>
    </div>
  );
}
