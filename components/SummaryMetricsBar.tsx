"use client";

import { AlertTriangle, CheckCircle2, Clock3 } from "lucide-react";
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
import { BADGE, BADGE_HEX, cn } from "@/lib/ui";
import { EarningsBars } from "./WeekCharts";
import dynamic from "next/dynamic";

// three.js city loads in its own chunk after the page has painted
const CityMap = dynamic(() => import("./CityMap"), { ssr: false });
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
  const routeColor = focusEmp ? BADGE_HEX[focusEmp.color] : "#FFFFFF";

  // Start the WebGL city only after first paint and a quiet moment
  const [map, setMap] = useState(false);
  useEffect(() => {
    const go = () => setMap(true);
    const w = window as Window & { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number };
    if (w.requestIdleCallback) w.requestIdleCallback(go, { timeout: 1500 });
    else setTimeout(go, 400);
  }, []);

  return (
    <section aria-label="This week at a glance" className="space-y-4">
      {/* Map hero with the next-shift sheet riding over it, like a booked trip */}
      <div className="relative -mx-4 sm:-mx-6 md:mx-0">
        <div className="relative h-[300px] overflow-hidden bg-black md:h-[420px] md:rounded-[28px]">
          {map && <CityMap color={routeColor} />}
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/60 via-transparent to-black" />
          <p className="reveal absolute left-4 top-4 text-[13px] font-medium text-zinc-300 sm:left-6 md:left-7 md:top-6" style={{ animationDelay: "0ms" }}>
            {m.onNow ? "You're on shift" : focus ? `Heading to ${focus.site}` : "No shifts booked"}
          </p>
        </div>

        <div className="reveal relative z-10 -mt-28 mx-3 rounded-[24px] bg-zinc-900 p-5 shadow-[0_-10px_60px_rgb(0_0_0/0.8)] sm:mx-6 md:-mt-36 md:ml-7 md:mr-auto md:max-w-[560px] md:p-6" style={{ animationDelay: "120ms" }}>
          <div className="flex items-center justify-between gap-3">
            <p className="text-[15px] font-semibold text-zinc-50">{m.onNow ? "On shift now" : focus ? `Next shift ${dayWord}` : "Nothing booked"}</p>
            {focus && fc && (
              <span className="rounded-full bg-zinc-800 px-3 py-1 text-[13px] font-medium text-zinc-50">
                {m.onNow ? `${countdown(fc.endAt.getTime() - now)} left` : `in ${countdown(m.nextAt - now)}`}
              </span>
            )}
          </div>

          {focus && fc ? (
            <>
              <p className="type-board mt-3 text-[clamp(2.9rem,13vw,4.25rem)] text-zinc-50">
                {focus.start}
                <span className="mx-2 font-normal text-zinc-600">–</span>
                {focus.end}
              </p>
              {progress !== null && (
                <div className="mt-3 h-1 overflow-hidden rounded-full bg-zinc-800" aria-label={`${Math.round(progress)}% of shift done`}>
                  <div className="h-full rounded-full bg-zinc-50" style={{ width: `${progress}%` }} />
                </div>
              )}
              {/* Trip-style detail rows */}
              <ul className="mt-4 divide-y divide-zinc-800">
                <li className="flex items-center gap-3 py-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-zinc-800">
                    <span className={cn("h-3 w-3 rounded-[4px]", focusEmp ? BADGE[focusEmp.color].dot : "bg-zinc-500")} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[15px] font-medium text-zinc-50">{focusEmp?.name}</span>
                    <span className="block truncate text-[13px] text-zinc-400">{focus.site}</span>
                  </span>
                  <span className="text-[17px] font-semibold text-zinc-50">{fmtMoney(fc.pay)}</span>
                </li>
                <li className="flex items-center gap-3 py-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-zinc-800 text-zinc-300">
                    <Clock3 size={18} />
                  </span>
                  <span className="flex-1 text-[14px] text-zinc-300">
                    {fmtHours(fc.netHours)} at ${focus.hourlyRate.toFixed(2)}/h
                    {fc.overnight ? ", finishes next morning" : ""}
                  </span>
                </li>
              </ul>
              <div className="mt-4 grid grid-cols-2 gap-2">
                <button onClick={() => onEdit(focus)} className="bg-vest h-12 rounded-xl text-[15px] font-semibold text-vest-ink active:opacity-70">
                  Open shift
                </button>
                <button onClick={() => onAdd()} className="h-12 rounded-xl bg-zinc-800 text-[15px] font-semibold text-zinc-50 active:opacity-70">
                  Add shift
                </button>
              </div>
            </>
          ) : (
            <button onClick={() => onAdd()} className="bg-vest mt-4 h-12 w-full rounded-xl text-[15px] font-semibold text-vest-ink">
              Add a shift
            </button>
          )}
        </div>
      </div>

      {/* Earnings, Uber Driver style */}
      <div className="reveal rounded-[24px] bg-zinc-900 p-5 sm:p-6" style={{ animationDelay: "200ms" }}>
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[14px] text-zinc-400">This week</p>
            <p className="type-board mt-1 text-[44px] text-zinc-50">{fmtMoney(m.pay.grossProjected)}</p>
          </div>
          <button onClick={() => onNav("pay")} className="mt-1 rounded-full bg-zinc-800 px-4 py-2 text-[14px] font-medium text-zinc-50 active:opacity-70">
            See pay
          </button>
        </div>
        <div className="mt-5">
          <EarningsBars shifts={shifts} weekStart={weekStart} today={todayISO()} />
        </div>
      </div>

      {/* Three quick tiles */}
      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        <div className="reveal rounded-[20px] bg-zinc-900 p-4" style={{ animationDelay: "260ms" }}>
          <p className="text-[12px] text-zinc-400">Hours</p>
          <p className="mt-1 text-[24px] font-bold tracking-tight text-zinc-50">{fmtHours(hours)}</p>
          <div className="mt-2 h-1 overflow-hidden rounded-full bg-zinc-800">
            <div className={cn("h-full rounded-full", over ? "bg-rose-400" : "bg-zinc-50")} style={{ width: `${Math.min(100, (hours / WEEKLY_HOURS_LIMIT) * 100)}%` }} />
          </div>
          <p className={cn("mt-1.5 text-[12px]", over ? "text-rose-300" : "text-zinc-500")}>{over ? `${fmtHours(hours - WEEKLY_HOURS_LIMIT)} over 38h` : `of ${WEEKLY_HOURS_LIMIT}h`}</p>
        </div>
        <div className="reveal rounded-[20px] bg-zinc-900 p-4" style={{ animationDelay: "300ms" }}>
          <p className="text-[12px] text-zinc-400">Rest gaps</p>
          <p className={cn("mt-1 flex items-center gap-1.5 text-[24px] font-bold tracking-tight", m.rest.length ? "text-rose-300" : "text-zinc-50")}>
            {m.rest.length ? <><AlertTriangle size={18} /> {m.rest.length}</> : <><CheckCircle2 size={18} className="text-emerald-400" /> OK</>}
          </p>
          <p className="mt-3 text-[12px] text-zinc-500">{m.rest.length ? `tightest ${minGap! < 0 ? "overlaps" : fmtHours(minGap!)}` : `all ${MIN_REST_HOURS}h+`}</p>
        </div>
        <div className="reveal rounded-[20px] bg-zinc-900 p-4" style={{ animationDelay: "340ms" }}>
          <p className="text-[12px] text-zinc-400">Worked</p>
          <p className="mt-1 text-[24px] font-bold tracking-tight text-zinc-50">{fmtMoney(m.pay.verified).replace(".00", "")}</p>
          <p className="mt-3 text-[12px] text-zinc-500">{m.pay.shiftCount} shifts this week</p>
        </div>
      </div>
    </section>
  );
}
