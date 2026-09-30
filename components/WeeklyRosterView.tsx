"use client";

import { CalendarPlus, Plus } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { addDays, fmtDayNum, fmtDow, parseISODate, todayISO, weekDays } from "@/lib/dates";
import { calcShift, findRestWarnings, fmtHours, fmtMoney, shiftsInRange } from "@/lib/pay";
import { useRoster } from "@/lib/store";
import type { Employer, ISODate, RestWarning, Shift } from "@/lib/types";
import { BADGE, cn } from "@/lib/ui";
import { ShiftCard } from "./ShiftCard";
import { Button, EmptyState, WeekNavigator } from "./ui";

interface Props {
  onAdd: (date: ISODate) => void;
  onEdit: (shift: Shift) => void;
}

const DAY_MS = 86_400_000;
const HOURS = [0, 3, 6, 9, 12, 15, 18, 21, 24];

interface Segment {
  shift: Shift;
  employer?: Employer;
  left: number; // %
  width: number; // %
  continued: boolean; // started the previous day
  runsOver: boolean; // finishes the next day
}

interface Gap {
  left: number;
  width: number;
  hours: number;
}

/** Clips an absolute time range to one calendar day, returned as % of the day */
function clip(dayStart: number, from: number, to: number) {
  const a = Math.max(from, dayStart);
  const b = Math.min(to, dayStart + DAY_MS);
  if (b <= a) return null;
  return { left: ((a - dayStart) / DAY_MS) * 100, width: ((b - a) / DAY_MS) * 100 };
}

function useNow() {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(t);
  }, []);
  return now;
}

/** Mon–Sun as 24-hour duty strips, with the shift tickets underneath each day. */
export function WeeklyRosterView({ onAdd, onEdit }: Props) {
  const { shifts, employers, weekStart, setWeek, deleteShift, duplicateShift, setShiftStatus } = useRoster();
  const days = weekDays(weekStart);
  const today = todayISO();
  const now = useNow();

  const data = useMemo(() => {
    const empById = new Map(employers.map((e) => [e.id, e]));
    // Include the Sunday before so its overnight shift spills into Monday's strip
    const nearby = shiftsInRange(shifts, addDays(days[0], -1), days[6]);
    const warnings = findRestWarnings(shifts);
    const restByShift = new Map<string, RestWarning>(warnings.map((w) => [w.nextShiftId, w]));
    const byId = new Map(shifts.map((s) => [s.id, s]));

    const rows = days.map((d) => {
      const dayStart = parseISODate(d).getTime();
      const own = nearby.filter((s) => s.date === d);
      const segments: Segment[] = [];
      for (const s of nearby) {
        const c = calcShift(s);
        const seg = clip(dayStart, c.startAt.getTime(), c.endAt.getTime());
        if (!seg) continue;
        segments.push({
          shift: s,
          employer: empById.get(s.employerId),
          ...seg,
          continued: s.date !== d,
          runsOver: s.date === d && c.overnight && c.endAt.getTime() > dayStart + DAY_MS,
        });
      }
      const gaps: Gap[] = [];
      for (const w of warnings) {
        const prev = byId.get(w.prevShiftId);
        const next = byId.get(w.nextShiftId);
        if (!prev || !next || w.gapHours <= 0) continue;
        const seg = clip(dayStart, calcShift(prev).endAt.getTime(), calcShift(next).startAt.getTime());
        if (seg) gaps.push({ ...seg, hours: w.gapHours });
      }
      const hours = own.reduce((a, s) => a + calcShift(s).netHours, 0);
      const pay = own.reduce((a, s) => a + calcShift(s).pay, 0);
      return { date: d, dayStart, own, segments, gaps, hours, pay };
    });

    return { rows, restByShift, empById, weekCount: rows.reduce((a, r) => a + r.own.length, 0) };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shifts, employers, weekStart]);

  return (
    <section className="space-y-4" aria-label="Weekly roster">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <WeekNavigator weekStart={weekStart} onChange={setWeek} />
        <Button variant="primary" onClick={() => onAdd(days.includes(today) ? today : days[0])}>
          <Plus size={16} strokeWidth={2.5} /> Add shift
        </Button>
      </div>

      {data.weekCount === 0 && (
        <EmptyState
          icon={<CalendarPlus size={24} />}
          title="Nothing rostered this week"
          body="Add a shift on any day, or set up fixed weekly shifts under Employers & Sites so they fill in automatically."
          action={
            <Button variant="primary" onClick={() => onAdd(days[0])}>
              <Plus size={16} /> Add a shift
            </Button>
          }
        />
      )}

      <div className="overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900">
        {/* Hour ruler, aligned with the strips below */}
        <div className="grid grid-cols-[1fr] gap-x-3 border-b border-zinc-800 px-3 py-2 md:grid-cols-[5.5rem_1fr_7.5rem] md:px-4">
          <span className="hidden md:block" />
          <div className="relative h-4">
            {HOURS.map((h) => (
              <span
                key={h}
                className={cn(
                  "absolute top-0 font-display text-xs text-zinc-500",
                  h === 0 ? "translate-x-0" : h === 24 ? "-translate-x-full" : "-translate-x-1/2",
                  h % 6 !== 0 && "hidden sm:inline"
                )}
                style={{ left: `${(h / 24) * 100}%` }}
              >
                {String(h % 24).padStart(2, "0")}
              </span>
            ))}
          </div>
          <span className="hidden text-right text-xs text-zinc-500 md:block">Hours / pay</span>
        </div>

        <ol>
          {data.rows.map((r) => {
            const isToday = r.date === today;
            const isPast = r.date < today;
            const nowPct = isToday ? ((now - r.dayStart) / DAY_MS) * 100 : null;
            return (
              <li
                key={r.date}
                className={cn(
                  "border-b border-zinc-800 px-3 py-3 last:border-b-0 md:px-4",
                  isToday && "bg-zinc-800/40"
                )}
              >
                <div className="grid grid-cols-[1fr_auto] items-center gap-x-3 gap-y-2 md:grid-cols-[5.5rem_1fr_7.5rem]">
                  {/* Day label */}
                  <div className="flex items-baseline gap-2 md:block">
                    <p className={cn("font-display text-2xl font-semibold leading-none", isToday ? "text-vest" : isPast ? "text-zinc-500" : "text-zinc-100")}>
                      {fmtDow(r.date)} {fmtDayNum(r.date)}
                    </p>
                    {isToday && <p className="text-xs font-medium text-vest md:mt-1">Today</p>}
                  </div>

                  {/* Mobile totals + add */}
                  <div className="flex items-center gap-2 md:hidden">
                    {r.own.length > 0 && (
                      <span className="font-display text-base text-zinc-300">
                        {fmtHours(r.hours)} <span className="text-zinc-500">/</span> {fmtMoney(r.pay)}
                      </span>
                    )}
                    <AddButton onClick={() => onAdd(r.date)} date={r.date} />
                  </div>

                  {/* 24h strip */}
                  <div className="col-span-2 md:col-span-1">
                    <DayStrip segments={r.segments} gaps={r.gaps} nowPct={nowPct} onEdit={onEdit} />
                  </div>

                  {/* Desktop totals + add */}
                  <div className="hidden items-center justify-end gap-3 md:flex">
                    {r.own.length > 0 ? (
                      <div className="text-right font-display leading-tight">
                        <p className="text-lg font-semibold text-zinc-100">{fmtHours(r.hours)}</p>
                        <p className="text-sm text-zinc-400">{fmtMoney(r.pay)}</p>
                      </div>
                    ) : (
                      <span className="text-sm text-zinc-600">Off</span>
                    )}
                    <AddButton onClick={() => onAdd(r.date)} date={r.date} />
                  </div>
                </div>

                {r.own.length > 0 && (
                  <div className="mt-3 grid gap-2 sm:grid-cols-2 md:ml-[6.25rem] md:mr-[8.25rem] lg:grid-cols-3">
                    {r.own.map((s) => (
                      <ShiftCard
                        key={s.id}
                        shift={s}
                        employer={data.empById.get(s.employerId)}
                        restWarning={data.restByShift.get(s.id)}
                        onEdit={() => onEdit(s)}
                        onDuplicate={() => duplicateShift(s.id, 1)}
                        onDelete={() => deleteShift(s.id)}
                        onMarkWorked={() => setShiftStatus([s.id], "worked")}
                      />
                    ))}
                  </div>
                )}
              </li>
            );
          })}
        </ol>
      </div>

      <Legend />
    </section>
  );
}

function AddButton({ onClick, date }: { onClick: () => void; date: ISODate }) {
  return (
    <button
      onClick={onClick}
      aria-label={`Add shift on ${fmtDow(date)} ${fmtDayNum(date)}`}
      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-zinc-700 text-zinc-400 transition-colors hover:border-vest hover:text-vest"
    >
      <Plus size={16} />
    </button>
  );
}

function DayStrip({
  segments,
  gaps,
  nowPct,
  onEdit,
}: {
  segments: Segment[];
  gaps: Gap[];
  nowPct: number | null;
  onEdit: (s: Shift) => void;
}) {
  return (
    <div className="relative h-9 rounded-md bg-zinc-950">
      {/* Grid: stronger line every 6h */}
      {HOURS.slice(1, -1).map((h) => (
        <span
          key={h}
          className={cn("absolute inset-y-0 w-px", h % 6 === 0 ? "bg-zinc-800" : "bg-zinc-900")}
          style={{ left: `${(h / 24) * 100}%` }}
        />
      ))}

      {gaps.map((g, i) => (
        <span
          key={i}
          className="hatch-rest absolute inset-y-1.5 rounded-sm"
          style={{ left: `${g.left}%`, width: `${g.width}%` }}
          title={`Only ${fmtHours(g.hours)} rest before the next shift`}
        />
      ))}

      {segments.map((seg) => {
        const c = seg.employer ? BADGE[seg.employer.color] : null;
        const wide = seg.width > 12;
        return (
          <button
            key={seg.shift.id + (seg.continued ? "-c" : "")}
            onClick={() => onEdit(seg.shift)}
            className={cn(
              "absolute inset-y-1 flex items-center overflow-hidden px-1.5 text-left transition-[filter] hover:brightness-110",
              c ? c.bar : "bg-zinc-500",
              seg.continued ? "rounded-r opacity-60" : seg.runsOver ? "rounded-l" : "rounded",
              seg.shift.status === "scheduled" ? "" : "ring-1 ring-inset ring-black/20"
            )}
            style={{ left: `${seg.left}%`, width: `${seg.width}%` }}
            title={`${seg.employer?.name ?? ""} ${seg.shift.start}–${seg.shift.end} · ${seg.shift.site}`}
            aria-label={`Edit ${seg.employer?.name ?? "shift"} ${seg.shift.start} to ${seg.shift.end}`}
          >
            {wide && !seg.continued && (
              <span className="truncate font-display text-sm font-semibold text-zinc-950">
                <span className="sm:hidden">{seg.shift.start}</span>
                <span className="hidden sm:inline">{seg.employer?.code} {seg.shift.start}</span>
              </span>
            )}
          </button>
        );
      })}

      {nowPct !== null && nowPct >= 0 && nowPct <= 100 && (
        <span className="pointer-events-none absolute -inset-y-1 w-0.5 rounded-full bg-vest shadow-[0_0_0_2px_#0d1822]" style={{ left: `${nowPct}%` }}>
          <span className="absolute -top-1 left-1/2 h-2 w-2 -translate-x-1/2 rounded-full bg-vest" />
        </span>
      )}
    </div>
  );
}

function Legend() {
  const all = useRoster((s) => s.employers);
  const employers = all.filter((e) => !e.archived);
  return (
    <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-zinc-400">
      {employers.map((e) => (
        <span key={e.id} className="flex items-center gap-2">
          <span className={cn("h-2.5 w-4 rounded-sm", BADGE[e.color].bar)} />
          {e.name}
        </span>
      ))}
      <span className="flex items-center gap-2">
        <span className="hatch-rest h-2.5 w-4 rounded-sm" />
        Under 10h rest
      </span>
      <span className="flex items-center gap-2">
        <span className="h-3 w-0.5 rounded-full bg-vest" />
        Now
      </span>
    </div>
  );
}
