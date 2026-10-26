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

  const dayWord = focus ? (focus.date === todayISO() ? "today" : FULL_DOW[fmtDow(focus.date)] ?? fmtDow(focus.date)) : "";
  const lead = m.onNow ? "On shift now" : focus ? `Next shift, ${dayWord}` : "No shifts booked";

  return (
    <section aria-label="This week at a glance">
      {/* Hero: the one loud thing on the page. Time set in signage type, the dial beside it. */}
      <div className="relative grid items-center gap-8 pb-10 pt-2 md:grid-cols-[1fr_auto] md:gap-12 md:pb-14 md:pt-6">
        <div className="min-w-0">
          <p className="reveal flex items-center gap-2 text-[15px] text-zinc-400" style={{ animationDelay: "0ms" }}>
            {m.onNow ? <span className="h-2 w-2 animate-pulse rounded-full bg-vest motion-reduce:animate-none" /> : <Clock3 size={15} />}
            <span className={m.onNow ? "font-medium text-vest" : ""}>{lead}</span>
            {focus && fc && (
              <span className="text-zinc-500">
                {m.onNow ? `${countdown(fc.endAt.getTime() - now)} left` : `in ${countdown(m.nextAt - now)}`}
              </span>
            )}
          </p>

          {focus && fc ? (
            <>
              <h2 className="type-board mt-4 text-[clamp(6.5rem,34vw,15rem)] text-zinc-50 md:flex md:flex-wrap md:gap-x-[0.12em] md:text-[clamp(7rem,11.5vw,14rem)]" aria-label={`${focus.start} to ${focus.end}`}>
                <span className="mask"><span className="reveal block" style={{ animationDelay: "80ms" }}>{focus.start}</span></span>
                <span className="mask"><span className="reveal block text-zinc-600" style={{ animationDelay: "160ms" }}>{focus.end}</span></span>
              </h2>
              <div className="reveal mt-6 grid items-baseline gap-x-8 gap-y-3 border-t border-zinc-700/70 pt-5 sm:grid-cols-[auto_auto_1fr]" style={{ animationDelay: "240ms" }}>
                {focusEmp && (
                  <span className="inline-flex items-center gap-2 text-[15px] font-medium text-zinc-50">
                    <span className={cn("h-2.5 w-2.5 rounded-full", BADGE[focusEmp.color].dot)} />
                    {focusEmp.name}
                  </span>
                )}
                <span className="text-[15px] text-zinc-400">
                  {focus.site}
                  {fc.overnight ? ", into the next morning" : ""}
                </span>
                <span className="text-gold-grad font-serif text-[40px] font-bold leading-none sm:justify-self-end">{fmtMoney(fc.pay)}</span>
              </div>
              {progress !== null && (
                <div className="mt-5 h-1 overflow-hidden rounded-full bg-zinc-800" aria-label={`${Math.round(progress)}% of shift done`}>
                  <div className="h-full rounded-full bg-vest" style={{ width: `${progress}%` }} />
                </div>
              )}
            </>
          ) : (
            <h2 className="type-board mt-4 text-[clamp(4.5rem,20vw,10rem)] text-zinc-600">Free week</h2>
          )}
        </div>

        <div className="reveal md:w-[320px]" style={{ animationDelay: "200ms" }}>
          <ShiftDial
            shifts={shifts}
            employers={employers}
            now={now}
            focus={focus}
            centre={focus && fc ? countdown((m.onNow ? fc.endAt.getTime() : m.nextAt) - now) : "Free"}
            caption={m.onNow ? "left on shift" : focus ? "until next shift" : "next 24 hours"}
          />
        </div>
      </div>

      {/* The week as a ruled ledger: figures large, labels small, no boxes */}
      <dl className="grid grid-cols-2 border-y border-zinc-700/70 lg:grid-cols-4">
        <div className="col-span-2 border-b border-zinc-700/70 py-6 pr-6 lg:col-span-1 lg:border-b-0 lg:border-r">
          <dt className="flex items-baseline justify-between text-[13px] text-zinc-400">
            <span>Hours this week</span>
            <span>{m.pay.shiftCount} shifts</span>
          </dt>
          <dd className="mt-2 flex items-baseline gap-2">
            <span className="font-serif text-[64px] font-bold leading-[0.85] text-zinc-50">{fmtHours(hours).replace("h", "")}</span>
            <span className="text-zinc-500">of {WEEKLY_HOURS_LIMIT}</span>
          </dd>
          <div className="relative mt-4 h-1 rounded-full bg-zinc-800">
            <div className={cn("h-full rounded-full", over ? "bg-rose-400" : near ? "bg-amber-300" : "bg-emerald-400")} style={{ width: `${pct}%` }} />
            <span className="absolute -inset-y-1 w-px bg-zinc-300" style={{ left: `${limitPct}%` }} title={`${WEEKLY_HOURS_LIMIT}h`} />
          </div>
          <p className={cn("mt-2 text-[13px]", over ? "text-rose-300" : near ? "text-amber-200" : "text-zinc-400")}>
            {over ? `${fmtHours(hours - WEEKLY_HOURS_LIMIT)} over a full-time week` : `${fmtHours(WEEKLY_HOURS_LIMIT - hours)} left before ${WEEKLY_HOURS_LIMIT}h`}
          </p>
        </div>

        <div className="border-r border-zinc-700/70 py-6 pr-4 lg:px-6">
          <dt className="flex items-center gap-1.5 text-[13px] text-zinc-400"><BedDouble size={14} /> Rest gaps</dt>
          {m.rest.length ? (
            <dd>
              <p className="mt-2 flex items-center gap-2 font-serif text-[44px] font-bold leading-[0.9] text-rose-300"><AlertTriangle size={22} /> {m.rest.length} short</p>
              <p className="mt-1 text-[13px] text-rose-200/80">Tightest {minGap! < 0 ? "overlaps" : `is ${fmtHours(minGap!)}`}</p>
            </dd>
          ) : (
            <dd>
              <p className="mt-2 flex items-center gap-2 font-serif text-[44px] font-bold leading-[0.9] text-emerald-300"><CheckCircle2 size={22} /> Clear</p>
              <p className="mt-1 text-[13px] text-zinc-400">All gaps {MIN_REST_HOURS}h or more</p>
            </dd>
          )}
          {m.long > 0 && <p className="mt-1 text-[13px] text-amber-200">{m.long} over {LONG_SHIFT_HOURS}h</p>}
        </div>

        <div className="py-6 pl-4 lg:border-r lg:border-zinc-700/70 lg:px-6">
          <dt className="text-[13px] text-zinc-400">Week&apos;s pay</dt>
          <dd className="text-gold-grad mt-2 font-serif text-[44px] font-bold leading-[0.9]">{fmtMoney(m.pay.grossProjected)}</dd>
          <dd className="mt-1 text-[13px] text-zinc-400">before tax</dd>
        </div>

        <div className="col-span-2 border-t border-zinc-700/70 py-6 lg:col-span-1 lg:border-t-0 lg:pl-6">
          <dt className="text-[13px] text-zinc-400">Already worked</dt>
          <dd className="mt-2 font-serif text-[44px] font-bold leading-[0.9] text-emerald-300">{fmtMoney(m.pay.verified)}</dd>
          <dd className="mt-1 text-[13px] text-zinc-400">{fmtMoney(m.pay.grossProjected - m.pay.verified)} still to work</dd>
        </div>
      </dl>
    </section>
  );
}
