"use client";

import { AlertTriangle, ChevronRight, Moon, Plus, Repeat } from "lucide-react";
import { fmtAU, fmtDayNum, fmtDow, todayISO } from "@/lib/dates";
import { calcShift, fmtHours, fmtMoney } from "@/lib/pay";
import type { Employer, ISODate, RestWarning, Shift } from "@/lib/types";
import { BADGE, STATUS_STYLE, cn } from "@/lib/ui";

const FULL: Record<string, string> = { Mon: "Monday", Tue: "Tuesday", Wed: "Wednesday", Thu: "Thursday", Fri: "Friday", Sat: "Saturday", Sun: "Sunday" };
const STATUS_SHORT = { scheduled: "Scheduled", worked: "Pending pay", paid: "Paid" } as const;

interface Row {
  date: ISODate;
  own: Shift[];
  hours: number;
  pay: number;
}

/** Uber trip-history style: each day is a heading, each shift a tappable receipt row. */
export function ShiftList({
  rows,
  empById,
  restByShift,
  onAdd,
  onEdit,
}: {
  rows: Row[];
  empById: Map<string, Employer>;
  restByShift: Map<string, RestWarning>;
  onAdd: (d: ISODate) => void;
  onEdit: (s: Shift) => void;
}) {
  const today = todayISO();
  return (
    <div className="space-y-6">
      {rows.map((r) => {
        const isToday = r.date === today;
        const label = isToday ? "Today" : FULL[fmtDow(r.date)];
        return (
          <section key={r.date} id={`day-${r.date}`} className="scroll-mt-20">
            <div className="mb-2 flex items-end justify-between gap-3 px-1">
              <div>
                <h3 className={cn("text-[20px] font-bold tracking-tight", r.date < today && !isToday ? "text-zinc-500" : "text-zinc-50")}>
                  {label}
                  <span className="ml-2 text-[15px] font-medium text-zinc-500">{fmtDayNum(r.date)}</span>
                </h3>
              </div>
              <div className="flex items-center gap-3">
                {r.own.length > 0 && (
                  <span className="text-[13px] text-zinc-400">
                    {fmtHours(r.hours)} · {fmtMoney(r.pay)}
                  </span>
                )}
                <button
                  onClick={() => onAdd(r.date)}
                  aria-label={`Add shift on ${label} ${fmtAU(r.date)}`}
                  className="flex h-8 w-8 items-center justify-center rounded-full bg-zinc-800 text-zinc-50 active:opacity-60"
                >
                  <Plus size={16} />
                </button>
              </div>
            </div>

            {r.own.length === 0 ? (
              <button
                onClick={() => onAdd(r.date)}
                className="flex w-full items-center justify-between rounded-2xl bg-zinc-900 px-4 py-4 text-left text-[15px] text-zinc-500 active:bg-zinc-800"
              >
                Day off
                <span className="text-[13px] text-zinc-400">Add shift</span>
              </button>
            ) : (
              <ul className="overflow-hidden rounded-2xl bg-zinc-900">
                {r.own.map((s, i) => {
                  const c = calcShift(s);
                  const e = empById.get(s.employerId);
                  const rest = restByShift.get(s.id);
                  return (
                    <li key={s.id} className={cn(i > 0 && "border-t border-zinc-800")}>
                      <button onClick={() => onEdit(s)} className="flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors hover:bg-zinc-800/50 active:bg-zinc-800">
                        <span className="flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded-xl bg-zinc-800">
                          <span className="text-[19px] font-bold leading-none text-zinc-50">{e?.name.charAt(0) ?? "?"}</span>
                          <span className={cn("mt-1.5 h-1 w-5 rounded-full", e ? BADGE[e.color].bar : "bg-zinc-500")} />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-[16px] font-semibold text-zinc-50">{s.site}</span>
                          <span className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[13px] text-zinc-400">
                            <span className="font-medium text-zinc-200">
                              {s.start} – {s.end}
                            </span>
                            {c.overnight && (
                              <span className="inline-flex items-center gap-0.5">
                                <Moon size={11} /> next day
                              </span>
                            )}
                            <span>{fmtHours(c.netHours)}</span>
                            {s.recurringId && (
                              <span className="inline-flex items-center gap-0.5">
                                <Repeat size={11} /> fixed
                              </span>
                            )}
                          </span>
                          {rest && (
                            <span className="mt-1 inline-flex items-center gap-1 text-[12px] font-medium text-rose-300">
                              <AlertTriangle size={12} />
                              {rest.gapHours < 0 ? "Overlaps previous shift" : `Only ${fmtHours(rest.gapHours)} rest before`}
                            </span>
                          )}
                        </span>
                        <span className="flex shrink-0 flex-col items-end gap-1">
                          <span className="text-[16px] font-semibold text-zinc-50">{fmtMoney(c.pay)}</span>
                          <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-semibold", STATUS_STYLE[s.status])}>{STATUS_SHORT[s.status]}</span>
                        </span>
                        <ChevronRight size={18} className="hidden shrink-0 text-zinc-600 sm:block" />
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        );
      })}
    </div>
  );
}
