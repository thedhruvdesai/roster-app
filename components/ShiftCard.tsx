"use client";

import { AlertTriangle, CheckCircle2, Copy, Moon, Pencil, Repeat, StickyNote, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { calcShift, fmtHours, fmtMoney, isOverdueForUpdate } from "@/lib/pay";
import type { Employer, RestWarning, Shift } from "@/lib/types";
import { BADGE, cn } from "@/lib/ui";
import { EmployerBadge, IconButton, StatusPill } from "./ui";

interface Props {
  shift: Shift;
  employer?: Employer;
  restWarning?: RestWarning;
  onEdit: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onMarkWorked: () => void;
}

/** A shift "ticket": times first, then venue, then money. */
export function ShiftCard({ shift, employer, restWarning, onEdit, onDuplicate, onDelete, onMarkWorked }: Props) {
  const c = calcShift(shift);
  const [confirmDel, setConfirmDel] = useState(false);
  const overdue = isOverdueForUpdate(shift);

  useEffect(() => {
    if (!confirmDel) return;
    const t = setTimeout(() => setConfirmDel(false), 3000);
    return () => clearTimeout(t);
  }, [confirmDel]);

  return (
    <article
      className={cn(
        "group relative flex flex-col rounded-lg border border-zinc-800 border-l-4 bg-zinc-950/60 p-3 transition-colors hover:border-y-zinc-700 hover:border-r-zinc-700",
        employer ? BADGE[employer.color].soft : "border-l-zinc-600"
      )}
    >
      <button onClick={onEdit} className="absolute inset-0 rounded-lg" aria-label={`Edit shift at ${shift.site}`} />

      <div className="pointer-events-none relative">
        <div className="flex items-start justify-between gap-2">
          <p className="font-display text-2xl font-semibold leading-none text-zinc-50">
            {shift.start}
            <span className="px-1 text-zinc-500">–</span>
            {shift.end}
            {c.overnight && (
              <span className="ml-1.5 inline-flex translate-y-[-3px] items-center gap-0.5 rounded bg-indigo-400/15 px-1 py-px align-middle font-sans text-[11px] font-semibold text-indigo-200" title="Finishes the next day">
                <Moon size={10} /> next day
              </span>
            )}
          </p>
          <div className="text-right font-display leading-none">
            <p className="text-xl font-semibold text-zinc-50">{fmtMoney(c.pay)}</p>
          </div>
        </div>

        <p className="mt-2 line-clamp-1 text-[15px] font-medium text-zinc-200" title={shift.site}>
          {shift.site}
        </p>

        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          <EmployerBadge employer={employer} compact />
          <StatusPill status={shift.status} short />
          {shift.recurringId && (
            <span className="inline-flex items-center gap-1 text-xs text-zinc-500" title="From your fixed weekly roster">
              <Repeat size={11} /> Fixed
            </span>
          )}
          <span className="ml-auto font-display text-sm text-zinc-400">
            {fmtHours(c.netHours)} at ${shift.hourlyRate.toFixed(2)}
            {shift.breakMins ? `, ${shift.breakMins}m break` : ""}
          </span>
        </div>

        {restWarning && (
          <p className="mt-2 flex items-center gap-1.5 rounded bg-rose-500/10 px-2 py-1 text-xs font-medium text-rose-300">
            <AlertTriangle size={12} className="shrink-0" />
            {restWarning.gapHours < 0
              ? "Overlaps your previous shift"
              : `Only ${fmtHours(restWarning.gapHours)} rest since your last shift`}
          </p>
        )}

        {shift.notes && (
          <p className="mt-2 flex items-start gap-1.5 text-xs text-zinc-400" title={shift.notes}>
            <StickyNote size={12} className="mt-px shrink-0" />
            <span className="line-clamp-1">{shift.notes}</span>
          </p>
        )}
      </div>

      {overdue && (
        <button
          onClick={onMarkWorked}
          className="relative mt-2 inline-flex items-center gap-1 self-start rounded bg-amber-400/10 px-2 py-1 text-xs font-semibold text-amber-300 hover:bg-amber-400/20"
        >
          <CheckCircle2 size={13} /> Mark as worked
        </button>
      )}

      {/* Mobile: always-visible action row. Desktop: appears over the ticket corner on hover/focus. */}
      <div className="relative mt-2 flex items-center justify-end gap-0.5 border-t border-zinc-800 pt-1.5 md:absolute md:right-2 md:top-2 md:mt-0 md:border-0 md:bg-zinc-900 md:p-0.5 md:invisible md:shadow-lg md:ring-1 md:ring-zinc-700 md:rounded-md md:group-hover:visible md:group-focus-within:visible">
        <IconButton label="Edit" onClick={onEdit} className="h-8 w-8 md:h-7 md:w-7">
          <Pencil size={14} />
        </IconButton>
        <IconButton label="Copy to next day" onClick={onDuplicate} className="h-8 w-8 md:h-7 md:w-7">
          <Copy size={14} />
        </IconButton>
        {confirmDel ? (
          <button onClick={onDelete} className="h-8 rounded bg-rose-500/20 px-2 text-xs font-semibold text-rose-300 hover:bg-rose-500/30 md:h-7">
            Delete shift
          </button>
        ) : (
          <IconButton label="Delete" onClick={() => setConfirmDel(true)} className="h-8 w-8 hover:text-rose-300 md:h-7 md:w-7">
            <Trash2 size={14} />
          </IconButton>
        )}
      </div>
    </article>
  );
}
