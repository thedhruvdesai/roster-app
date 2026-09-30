"use client";

import { CalendarPlus, Plus } from "lucide-react";
import { useMemo } from "react";
import { fmtDayNum, fmtDow, fmtShort, todayISO, weekDays } from "@/lib/dates";
import { calcShift, findRestWarnings, fmtHours, fmtMoney, shiftsInRange } from "@/lib/pay";
import { useRoster } from "@/lib/store";
import type { ISODate, RestWarning, Shift } from "@/lib/types";
import { BADGE, cn } from "@/lib/ui";
import { ShiftCard } from "./ShiftCard";
import { Button, EmptyState, WeekNavigator } from "./ui";

interface Props {
  onAdd: (date: ISODate) => void;
  onEdit: (shift: Shift) => void;
}

/** 7-day Mon–Sun grid. Columns on desktop, stacked day rows on mobile. */
export function WeeklyRosterView({ onAdd, onEdit }: Props) {
  const { shifts, employers, weekStart, setWeek, deleteShift, duplicateShift, setShiftStatus } = useRoster();
  const days = weekDays(weekStart);
  const today = todayISO();

  const { byDay, restByShift, weekCount } = useMemo(() => {
    const week = shiftsInRange(shifts, days[0], days[6]);
    const byDay = new Map<ISODate, Shift[]>(days.map((d) => [d, []]));
    week.forEach((s) => byDay.get(s.date)?.push(s));
    const restByShift = new Map<string, RestWarning>();
    findRestWarnings(shifts).forEach((w) => restByShift.set(w.nextShiftId, w));
    return { byDay, restByShift, weekCount: week.length };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shifts, weekStart]);

  const empById = (id: string) => employers.find((e) => e.id === id);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <WeekNavigator weekStart={weekStart} onChange={setWeek} />
        <div className="flex items-center gap-2">
          <Legend />
          <Button variant="primary" onClick={() => onAdd(days.includes(today) ? today : days[0])}>
            <Plus size={16} /> Add shift
          </Button>
        </div>
      </div>

      {weekCount === 0 && (
        <EmptyState
          icon={<CalendarPlus size={22} />}
          title="No shifts rostered this week"
          body="Tap + on any day to log a shift, or jump back to the current week to see your roster."
          action={
            <Button variant="primary" onClick={() => onAdd(days[0])}>
              <Plus size={16} /> Add first shift
            </Button>
          }
        />
      )}

      <div className={cn("grid gap-3 sm:grid-cols-2 xl:grid-cols-7", weekCount === 0 && "opacity-60")}>
        {days.map((d) => {
          const list = byDay.get(d) ?? [];
          const isToday = d === today;
          const isPast = d < today;
          const dayHours = list.reduce((a, s) => a + calcShift(s).netHours, 0);
          const dayPay = list.reduce((a, s) => a + calcShift(s).pay, 0);

          return (
            <div
              key={d}
              className={cn(
                "flex min-h-[4rem] flex-col rounded-2xl border p-2 xl:min-h-[22rem]",
                isToday ? "border-zinc-500 bg-zinc-800/40" : "border-zinc-800 bg-zinc-900/30"
              )}
            >
              <header className="mb-2 flex items-center justify-between px-1">
                <div className="flex items-baseline gap-2 xl:flex-col xl:gap-0">
                  <span className={cn("text-xs font-semibold uppercase tracking-wide", isToday ? "text-zinc-100" : "text-zinc-500")}>
                    {fmtDow(d)}
                  </span>
                  <span className={cn("text-lg font-semibold tabular-nums xl:text-xl", isToday ? "text-white" : isPast ? "text-zinc-500" : "text-zinc-300")}>
                    <span className="xl:hidden">{fmtShort(d)}</span>
                    <span className="hidden xl:inline">{fmtDayNum(d)}</span>
                  </span>
                  {isToday && <span className="rounded bg-zinc-100 px-1 text-[10px] font-bold text-zinc-900 xl:mt-0.5">TODAY</span>}
                </div>
                <button
                  onClick={() => onAdd(d)}
                  aria-label={`Add shift on ${fmtShort(d)}`}
                  className="flex h-8 w-8 items-center justify-center rounded-lg border border-dashed border-zinc-700 text-zinc-500 transition-colors hover:border-zinc-500 hover:bg-zinc-800 hover:text-zinc-100"
                >
                  <Plus size={15} />
                </button>
              </header>

              <div className="flex flex-1 flex-col gap-2">
                {list.map((s) => (
                  <ShiftCard
                    key={s.id}
                    shift={s}
                    employer={empById(s.employerId)}
                    restWarning={restByShift.get(s.id)}
                    onEdit={() => onEdit(s)}
                    onDuplicate={() => duplicateShift(s.id, 1)}
                    onDelete={() => deleteShift(s.id)}
                    onMarkWorked={() => setShiftStatus([s.id], "worked")}
                  />
                ))}
                {list.length === 0 && (
                  <button
                    onClick={() => onAdd(d)}
                    className="hidden flex-1 items-center justify-center rounded-xl text-xs text-zinc-600 transition-colors hover:bg-zinc-800/40 hover:text-zinc-400 xl:flex"
                  >
                    Day off
                  </button>
                )}
              </div>

              {list.length > 0 && (
                <footer className="mt-2 flex justify-between border-t border-zinc-800 px-1 pt-1.5 text-[11px] tabular-nums text-zinc-500">
                  <span>{fmtHours(dayHours)}</span>
                  <span>{fmtMoney(dayPay)}</span>
                </footer>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Legend() {
  const all = useRoster((s) => s.employers);
  const employers = all.filter((e) => !e.archived);
  return (
    <div className="hidden items-center gap-3 lg:flex">
      {employers.map((e) => (
        <span key={e.id} className="flex items-center gap-1.5 text-xs text-zinc-400">
          <span className={cn("h-2 w-2 rounded-full", BADGE[e.color].dot)} />
          {e.code}
        </span>
      ))}
    </div>
  );
}
