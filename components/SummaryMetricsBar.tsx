"use client";

import { AlertTriangle, BedDouble, CheckCircle2, Clock3 } from "lucide-react";
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
  const fc = focus ? calcShift(focus) : null;
  const progress = m.onNow && fc ? Math.min(100, ((now - fc.startAt.getTime()) / (fc.endAt.getTime() - fc.startAt.getTime())) * 100) : null;

  return (
    <section aria-label="This week at a glance" className="space-y-5">
      {/* The board: the one big thing on the page */}
      <div className={cn("relative grid items-center gap-6 overflow-hidden rounded-[28px] bg-zinc-900 p-5 sm:p-7 md:grid-cols-[auto_1fr] md:gap-10", m.onNow && "ring-1 ring-inset ring-vest/50")}>
        <ShiftDial
          shifts={shifts}
          employers={employers}
          now={now}
          focus={focus}
          centre={focus && fc ? countdown((m.onNow ? fc.endAt.getTime() : m.nextAt) - now) : "Free"}
          caption={m.onNow ? "left on shift" : focus ? "until next shift" : "next 24 hours"}
        />
        <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
          <span className={cn("inline-flex items-center gap-2 text-[15px] font-semibold", m.onNow ? "text-vest" : "text-zinc-50")}>
            {m.onNow ? <span className="h-2 w-2 animate-pulse rounded-full bg-vest motion-reduce:animate-none" /> : <Clock3 size={15} />}
            {m.onNow ? "On shift now" : "Next shift"}
          </span>
          {focus && (
            <span className="text-[15px] text-zinc-400">
              {fmtDow(focus.date)} {focus.date === todayISO() ? "today" : ""}
            </span>
          )}
        </div>

        {focus && fc ? (
          <>
            <p className="type-board mt-3 text-[clamp(3.5rem,15vw,6.25rem)] text-zinc-50 md:text-[clamp(3.5rem,7vw,6.25rem)]">
              <span className="block sm:inline">{focus.start}</span>
              <span className="mx-[0.12em] hidden font-light text-zinc-600 sm:inline-block" aria-label="to">–</span>
              <span className="block text-zinc-500 sm:inline sm:text-zinc-50">{focus.end}</span>
            </p>
            <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2">
              {focusEmp && (
                <span className="inline-flex items-center gap-2 text-[15px] font-semibold text-zinc-50">
                  <span className={cn("h-3 w-3 rounded-sm", BADGE[focusEmp.color].bar)} />
                  {focusEmp.name}
                </span>
              )}
              <span className="text-[15px] text-zinc-300">{focus.site}</span>
              {fc.overnight && <span className="text-[15px] text-zinc-400">into the next morning</span>}
              <span className="ml-auto text-[20px] font-semibold text-zinc-50">{fmtMoney(fc.pay)}</span>
            </div>
            {progress !== null && (
              <div className="mt-5 h-1.5 overflow-hidden rounded-full bg-zinc-700" aria-label={`${Math.round(progress)}% of shift done`}>
                <div className="h-full rounded-full bg-vest" style={{ width: `${progress}%` }} />
              </div>
            )}
          </>
        ) : (
          <p className="type-board mt-3 text-[clamp(2.25rem,9vw,4rem)] text-zinc-500">Nothing booked</p>
        )}
        </div>
      </div>

      {/* Week ledger: ruled columns, no boxes */}
      <dl className="grid grid-cols-2 gap-3 lg:grid-cols-[1.6fr_1fr_1fr_1fr]">
        <div className="col-span-2 rounded-2xl bg-zinc-900 p-4 lg:col-span-1">
          <dt className="flex items-baseline justify-between text-[13px] font-semibold text-zinc-400">
            <span>Hours this week</span>
            <span>{m.pay.shiftCount} shifts</span>
          </dt>
          <dd className="mt-1 flex items-baseline gap-2">
            <span className="text-[34px] font-bold leading-none text-zinc-50">{fmtHours(hours).replace("h", "")}</span>
            <span className="text-zinc-500">of {WEEKLY_HOURS_LIMIT}h</span>
          </dd>
          <div className="relative mt-3 h-1.5 rounded-full bg-zinc-700">
            <div className={cn("h-full rounded-full", over ? "bg-rose-400" : near ? "bg-amber-300" : "bg-emerald-400")} style={{ width: `${pct}%` }} />
            <span className="absolute -inset-y-1 w-0.5 rounded bg-zinc-300" style={{ left: `${limitPct}%` }} title={`${WEEKLY_HOURS_LIMIT}h`} />
          </div>
          <p className={cn("mt-2 text-sm", over ? "text-rose-300" : near ? "text-amber-200" : "text-zinc-400")}>
            {over ? `${fmtHours(hours - WEEKLY_HOURS_LIMIT)} over a full-time week` : `${fmtHours(WEEKLY_HOURS_LIMIT - hours)} left before ${WEEKLY_HOURS_LIMIT}h`}
          </p>
        </div>

        <div className="rounded-2xl bg-zinc-900 p-4">
          <dt className="flex items-center gap-1.5 text-[13px] font-semibold text-zinc-400"><BedDouble size={15} /> Rest gaps</dt>
          {m.rest.length ? (
            <dd>
              <p className="mt-1 flex items-center gap-2 text-[22px] font-bold text-rose-300"><AlertTriangle size={20} /> {m.rest.length} short</p>
              <p className="mt-1 text-sm text-rose-200/80">Tightest {minGap! < 0 ? "overlaps" : `is ${fmtHours(minGap!)}`}</p>
            </dd>
          ) : (
            <dd>
              <p className="mt-1 flex items-center gap-2 text-[22px] font-bold text-emerald-300"><CheckCircle2 size={20} /> Clear</p>
              <p className="mt-1 text-sm text-zinc-400">All gaps {MIN_REST_HOURS}h+</p>
            </dd>
          )}
          {m.long > 0 && <p className="mt-1 text-sm text-amber-200">{m.long} over {LONG_SHIFT_HOURS}h</p>}
        </div>

        <div className="rounded-2xl bg-zinc-900 p-4">
          <dt className="text-[13px] font-semibold text-zinc-400">Week&apos;s pay</dt>
          <dd className="mt-1 text-[22px] font-bold text-zinc-50">{fmtMoney(m.pay.grossProjected)}</dd>
          <dd className="mt-1 text-sm text-zinc-400">before tax</dd>
        </div>

        <div className="col-span-2 rounded-2xl bg-zinc-900 p-4 lg:col-span-1">
          <dt className="text-[13px] font-semibold text-zinc-400">Already worked</dt>
          <dd className="mt-1 text-[22px] font-bold text-emerald-300">{fmtMoney(m.pay.verified)}</dd>
          <dd className="mt-1 text-sm text-zinc-400">{fmtMoney(m.pay.grossProjected - m.pay.verified)} still to work</dd>
        </div>
      </dl>
    </section>
  );
}
