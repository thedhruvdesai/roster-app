"use client";

import { Pause, Pencil, Play, Plus, Repeat, Trash2, X } from "lucide-react";
import { useEffect, useState } from "react";
import { fmtAU, isValidTime, startOfWeek, todayISO } from "@/lib/dates";
import { calcShift, fmtHours, fmtMoney } from "@/lib/pay";
import { resolveRate, useRoster } from "@/lib/store";
import type { RecurringShift, Weekday } from "@/lib/types";
import { cn } from "@/lib/ui";
import { Button, EmployerBadge, Field, IconButton, Panel, inputCls } from "./ui";

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

/** Weekly totals for one pattern */
function patternWeek(r: RecurringShift, rate: number) {
  const c = calcShift({ date: "2026-01-05", start: r.start, end: r.end, breakMins: r.breakMins, hourlyRate: rate });
  return { hours: c.netHours * r.weekdays.length, pay: c.pay * r.weekdays.length, overnight: c.overnight };
}

export function FixedRosterPanel() {
  const { recurring, employers, upsertRecurring, deleteRecurring } = useRoster();
  const [editing, setEditing] = useState<RecurringShift | "new" | null>(null);

  const totals = recurring
    .filter((r) => r.active)
    .reduce(
      (a, r) => {
        const w = patternWeek(r, r.hourlyRate ?? resolveRate(employers, r.employerId, r.site));
        return { hours: a.hours + w.hours, pay: a.pay + w.pay };
      },
      { hours: 0, pay: 0 }
    );

  return (
    <Panel className="p-4">
      <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
        <div>
          <h3 className="flex items-center gap-2 font-display text-xl font-semibold text-zinc-50">
            <Repeat size={15} /> Fixed weekly roster
          </h3>
          <p className="mt-0.5 text-xs text-zinc-500">
            Fills your roster automatically every week. Add extra shifts on top from the Roster tab.
          </p>
        </div>
        <Button size="sm" variant="primary" onClick={() => setEditing("new")}>
          <Plus size={14} /> Add fixed shift
        </Button>
      </div>

      {recurring.length === 0 ? (
        <p className="rounded-xl border border-dashed border-zinc-800 px-4 py-6 text-center text-sm text-zinc-500">
          No fixed shifts yet.
        </p>
      ) : (
        <ul className="divide-y divide-zinc-800/70 rounded-xl border border-zinc-800">
          {recurring.map((r) => {
            const emp = employers.find((e) => e.id === r.employerId);
            const rate = r.hourlyRate ?? resolveRate(employers, r.employerId, r.site);
            const w = patternWeek(r, rate);
            return (
              <li key={r.id} className={cn("flex items-center gap-3 px-3 py-3", !r.active && "opacity-50")}>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <EmployerBadge employer={emp} compact />
                    <span className="flex gap-0.5">
                      {DAYS.map((d, i) => (
                        <span
                          key={d}
                          className={cn(
                            "flex h-5 w-5 items-center justify-center rounded text-xs font-semibold",
                            r.weekdays.includes(i as Weekday) ? "bg-vest text-vest-ink" : "text-zinc-600"
                          )}
                        >
                          {d[0]}
                        </span>
                      ))}
                    </span>
                    {!r.active && <span className="text-xs text-zinc-500">Paused</span>}
                  </div>
                  <p className="mt-1 truncate text-[15px] text-zinc-200">{r.site}</p>
                  <p className="font-display text-lg text-zinc-100">
                    {r.start}–{r.end}
                    {w.overnight && <span className="ml-1 text-sm text-indigo-300">next day</span>}
                    <span className="ml-2 font-sans text-sm text-zinc-400">
                      {fmtHours(w.hours)} and {fmtMoney(w.pay)} a week at ${rate.toFixed(2)}/h
                    </span>
                  </p>
                </div>
                <div className="flex shrink-0 items-center">
                  <IconButton
                    label={r.active ? "Pause" : "Resume"}
                    onClick={() => upsertRecurring({ ...r, active: !r.active })}
                  >
                    {r.active ? <Pause size={14} /> : <Play size={14} />}
                  </IconButton>
                  <IconButton label="Edit" onClick={() => setEditing(r)}>
                    <Pencil size={14} />
                  </IconButton>
                  <IconButton
                    label="Delete"
                    className="hover:text-rose-300"
                    onClick={() =>
                      confirm("Remove this fixed shift? Past and already-edited shifts stay in your history.") &&
                      deleteRecurring(r.id)
                    }
                  >
                    <Trash2 size={14} />
                  </IconButton>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {recurring.some((r) => r.active) && (
        <p className="mt-3 text-xs text-zinc-500">
          Fixed roster total: <span className="font-medium text-zinc-200">{fmtHours(totals.hours)}</span> ·{" "}
          <span className="font-medium text-zinc-200">{fmtMoney(totals.pay)}</span> per week before extras
        </p>
      )}

      {editing && <RecurringEditor pattern={editing === "new" ? null : editing} onClose={() => setEditing(null)} />}
    </Panel>
  );
}

function RecurringEditor({ pattern, onClose }: { pattern: RecurringShift | null; onClose: () => void }) {
  const { employers, upsertRecurring } = useRoster();
  const active = employers.filter((e) => !e.archived);
  const [employerId, setEmployerId] = useState(pattern?.employerId ?? active[0]?.id ?? "");
  const emp = employers.find((e) => e.id === employerId);
  const [site, setSite] = useState(pattern?.site ?? emp?.sites[0]?.name ?? "");
  const [weekdays, setWeekdays] = useState<Weekday[]>(pattern?.weekdays ?? []);
  const [start, setStart] = useState(pattern?.start ?? "18:00");
  const [end, setEnd] = useState(pattern?.end ?? "06:00");
  const [breakMins, setBreakMins] = useState(String(pattern?.breakMins ?? 0));
  const [rate, setRate] = useState(pattern?.hourlyRate != null ? String(pattern.hourlyRate) : "");
  const [startDate, setStartDate] = useState(pattern?.startDate ?? startOfWeek(todayISO()));
  const [notes, setNotes] = useState(pattern?.notes ?? "");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const toggleDay = (i: Weekday) =>
    setWeekdays((w) => (w.includes(i) ? w.filter((x) => x !== i) : [...w, i].sort() as Weekday[]));

  const save = () => {
    if (!employerId) return setError("Choose an employer.");
    if (!site.trim()) return setError("Enter the site.");
    if (!weekdays.length) return setError("Pick at least one day.");
    if (!isValidTime(start) || !isValidTime(end)) return setError("Enter valid start and end times.");
    const b = Number(breakMins) || 0;
    const r = rate.trim() ? Number(rate) : undefined;
    if (r !== undefined && (!Number.isFinite(r) || r <= 0)) return setError("Rate must be above $0, or leave it blank.");
    upsertRecurring({
      id: pattern?.id,
      employerId,
      site: site.trim(),
      weekdays,
      start,
      end,
      breakMins: b,
      hourlyRate: r,
      startDate,
      endDate: pattern?.endDate,
      active: pattern?.active ?? true,
      notes: notes.trim() || undefined,
    });
    onClose();
  };

  const defaultRate = resolveRate(employers, employerId, site);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <form
        onSubmit={(e) => {
          e.preventDefault();
          save();
        }}
        className="relative flex max-h-[92dvh] w-full max-w-lg flex-col overflow-hidden rounded-t-2xl border border-zinc-800 bg-zinc-900 shadow-2xl sm:rounded-xl"
      >
        <header className="flex items-center justify-between border-b border-zinc-800 px-5 py-4">
          <h2 className="font-display text-2xl font-semibold text-zinc-50">{pattern ? "Edit fixed shift" : "New fixed shift"}</h2>
          <IconButton type="button" label="Close" onClick={onClose}>
            <X size={18} />
          </IconButton>
        </header>

        <div className="flex-1 space-y-4 overflow-y-auto px-5 py-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Employer">
              <select
                className={inputCls}
                value={employerId}
                onChange={(e) => {
                  setEmployerId(e.target.value);
                  setSite(employers.find((x) => x.id === e.target.value)?.sites[0]?.name ?? "");
                }}
              >
                {active.map((e) => (
                  <option key={e.id} value={e.id}>{e.name}</option>
                ))}
              </select>
            </Field>
            <Field label="Site">
              <input className={inputCls} list="rec-sites" value={site} onChange={(e) => setSite(e.target.value)} />
              <datalist id="rec-sites">
                {emp?.sites.map((s) => <option key={s.id} value={s.name} />)}
              </datalist>
            </Field>
          </div>

          <Field label="Repeats on">
            <div className="grid grid-cols-7 gap-1">
              {DAYS.map((d, i) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => toggleDay(i as Weekday)}
                  className={cn(
                    "rounded-lg py-2 text-xs font-semibold ring-1 ring-inset transition-colors",
                    weekdays.includes(i as Weekday) ? "bg-vest text-vest-ink ring-vest" : "text-zinc-400 ring-zinc-700 hover:bg-zinc-800"
                  )}
                >
                  {d}
                </button>
              ))}
            </div>
          </Field>

          <div className="grid grid-cols-3 gap-3">
            <Field label="Start">
              <input type="time" className={cn(inputCls, "font-mono")} value={start} onChange={(e) => setStart(e.target.value)} />
            </Field>
            <Field label="End">
              <input type="time" className={cn(inputCls, "font-mono")} value={end} onChange={(e) => setEnd(e.target.value)} />
            </Field>
            <Field label="Break (mins)">
              <input type="number" min={0} step={5} className={inputCls} value={breakMins} onChange={(e) => setBreakMins(e.target.value)} />
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Rate (AUD/h)" hint={`Blank = default $${defaultRate.toFixed(2)}`}>
              <input type="number" step={0.01} className={cn(inputCls, "tabular-nums")} value={rate} placeholder={defaultRate.toFixed(2)} onChange={(e) => setRate(e.target.value)} />
            </Field>
            <Field label="Starts from" hint={fmtAU(startDate)}>
              <input type="date" className={inputCls} value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            </Field>
          </div>

          <Field label="Notes (copied to each shift)">
            <input className={inputCls} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Uniform, parking, handover…" />
          </Field>

          <p className="text-xs text-zinc-500">
            Saving updates upcoming shifts from this pattern. Past shifts and ones you've edited by hand are left as they are.
          </p>

          {error && <p className="rounded-lg bg-rose-500/10 px-3 py-2 text-sm text-rose-300">{error}</p>}
        </div>

        <footer className="flex justify-end gap-2 border-t border-zinc-800 px-5 py-3">
          <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
          <Button type="submit" variant="primary">{pattern ? "Save" : "Add fixed shift"}</Button>
        </footer>
      </form>
    </div>
  );
}
