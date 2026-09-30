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
        "group relative rounded-xl border border-zinc-800 border-l-[3px] bg-zinc-900 p-3 transition-colors hover:border-zinc-700 hover:bg-zinc-900/80",
        employer ? BADGE[employer.color].soft : "border-l-zinc-600",
        shift.status === "paid" && "opacity-80"
      )}
    >
      <button onClick={onEdit} className="absolute inset-0 rounded-xl" aria-label={`Edit shift at ${shift.site}`} />

      <div className="relative pointer-events-none">
        <div className="flex items-center justify-between gap-2">
          <span className="flex min-w-0 items-center gap-1">
            <EmployerBadge employer={employer} compact />
            {shift.recurringId && (
              <Repeat size={11} className="shrink-0 text-zinc-500" aria-label="Fixed roster shift" />
            )}
          </span>
          <StatusPill status={shift.status} short />
        </div>

        <p className="mt-2 line-clamp-2 text-sm font-semibold leading-snug text-zinc-100">{shift.site}</p>

        <p className="mt-1 flex items-center gap-1.5 font-mono text-sm tabular-nums text-zinc-300">
          {shift.start} – {shift.end}
          {c.overnight && (
            <span className="inline-flex items-center gap-0.5 rounded bg-indigo-500/15 px-1 py-px font-sans text-[10px] font-medium text-indigo-300" title="Finishes the next day">
              <Moon size={10} /> +1
            </span>
          )}
        </p>

        <div className="mt-2 flex items-end justify-between border-t border-zinc-800 pt-2">
          <div className="text-[11px] leading-tight text-zinc-500">
            <p>
              <span className="font-medium text-zinc-300">{fmtHours(c.netHours)}</span> net
            </p>
            <p>{shift.breakMins ? `${shift.breakMins}m unpaid` : "No break"}</p>
          </div>
          <div className="text-right">
            <p className="text-sm font-semibold tabular-nums text-zinc-50">{fmtMoney(c.pay)}</p>
            <p className="text-[10px] tabular-nums text-zinc-500">@ ${shift.hourlyRate.toFixed(2)}/h</p>
          </div>
        </div>

        {restWarning && (
          <p className="mt-2 flex items-start gap-1 rounded-md bg-rose-500/10 px-1.5 py-1 text-[11px] leading-tight text-rose-300">
            <AlertTriangle size={12} className="mt-px shrink-0" />
            {restWarning.gapHours < 0
              ? "Overlaps the previous shift"
              : `Only ${fmtHours(restWarning.gapHours)} rest since last shift`}
          </p>
        )}

        {shift.notes && (
          <p className="mt-1.5 flex items-start gap-1 text-[11px] leading-tight text-zinc-500" title={shift.notes}>
            <StickyNote size={11} className="mt-px shrink-0" />
            <span className="line-clamp-1">{shift.notes}</span>
          </p>
        )}
      </div>

      {/* Actions sit above the full-card edit button */}
      <div className="relative mt-2 flex items-center justify-between">
        {overdue ? (
          <button
            onClick={onMarkWorked}
            className="inline-flex items-center gap-1 rounded-md bg-amber-500/10 px-1.5 py-1 text-[11px] font-medium text-amber-300 hover:bg-amber-500/20"
          >
            <CheckCircle2 size={12} /> Mark worked
          </button>
        ) : (
          <span />
        )}
        <div className="flex items-center opacity-100 transition-opacity md:opacity-0 md:group-hover:opacity-100 md:group-focus-within:opacity-100">
          <IconButton label="Edit" onClick={onEdit} className="h-7 w-7">
            <Pencil size={13} />
          </IconButton>
          <IconButton label="Duplicate to next day" onClick={onDuplicate} className="h-7 w-7">
            <Copy size={13} />
          </IconButton>
          {confirmDel ? (
            <button
              onClick={onDelete}
              className="ml-0.5 h-7 rounded-md bg-rose-500/20 px-2 text-[11px] font-semibold text-rose-300 hover:bg-rose-500/30"
            >
              Delete?
            </button>
          ) : (
            <IconButton label="Delete" onClick={() => setConfirmDel(true)} className="h-7 w-7 hover:text-rose-300">
              <Trash2 size={13} />
            </IconButton>
          )}
        </div>
      </div>
    </article>
  );
}
