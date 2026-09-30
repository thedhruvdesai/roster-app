"use client";

import { AlertTriangle, Calculator, Moon, Trash2, X } from "lucide-react";
import { type ReactNode, useEffect, useMemo, useRef, useState } from "react";
import { addDays, fmtAU, fmtDow, isValidTime, todayISO } from "@/lib/dates";
import {
  LONG_SHIFT_HOURS,
  MIN_REST_HOURS,
  calcShift,
  findRestWarnings,
  fmtHours,
  fmtMoney,
} from "@/lib/pay";
import { resolveRate, useRoster } from "@/lib/store";
import { deleteShiftWithUndo } from "@/lib/actions";
import { toast } from "@/lib/toast";
import type { ISODate, PaymentStatus, Shift } from "@/lib/types";
import { PAYMENT_STATUS_LABEL } from "@/lib/types";
import { BADGE, cn } from "@/lib/ui";
import { Button, Field, IconButton, inputCls } from "./ui";

interface Props {
  open: boolean;
  shift: Shift | null; // null = create
  defaultDate: ISODate;
  onClose: () => void;
}

interface Draft {
  employerId: string;
  site: string;
  date: ISODate;
  start: string;
  end: string;
  breakMins: string;
  hourlyRate: string;
  status: PaymentStatus;
  notes: string;
}

const BREAK_PRESETS = [0, 15, 30, 45, 60];
const STATUSES: PaymentStatus[] = ["scheduled", "worked", "paid"];

export function ShiftModal({ open, shift, defaultDate, onClose }: Props) {
  const { employers, shifts, recurring, addShift, updateShift } = useRoster();
  const active = employers.filter((e) => !e.archived || e.id === shift?.employerId);
  const [rateTouched, setRateTouched] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const firstRef = useRef<HTMLSelectElement>(null);

  const blank = (): Draft => {
    const emp = active[0];
    const site = emp?.sites[0]?.name ?? "";
    return {
      employerId: emp?.id ?? "",
      site,
      date: defaultDate,
      start: "18:00",
      end: "02:00",
      breakMins: "30",
      hourlyRate: emp ? String(resolveRate(employers, emp.id, site)) : "",
      status: defaultDate < todayISO() ? "worked" : "scheduled",
      notes: "",
    };
  };

  const [d, setD] = useState<Draft>(blank);

  // Reset form whenever the modal opens
  useEffect(() => {
    if (!open) return;
    setSubmitted(false);
    if (shift) {
      setD({
        employerId: shift.employerId,
        site: shift.site,
        date: shift.date,
        start: shift.start,
        end: shift.end,
        breakMins: String(shift.breakMins),
        hourlyRate: String(shift.hourlyRate),
        status: shift.status,
        notes: shift.notes ?? "",
      });
      setRateTouched(true);
    } else {
      setD(blank());
      setRateTouched(false);
    }
    setTimeout(() => firstRef.current?.focus(), 30);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, shift, defaultDate]);

  // Esc to close + scroll lock
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  const employer = employers.find((e) => e.id === d.employerId);

  // Quick-fill: fixed roster patterns first, then recent distinct one-off shifts
  const presets = useMemo(() => {
    type P = { key: string; employerId: string; site: string; start: string; end: string; breakMins: number; rate: number };
    const out: P[] = [];
    const seen = new Set<string>();
    const push = (p: Omit<P, "key">) => {
      const key = `${p.employerId}|${p.site}|${p.start}|${p.end}`;
      if (seen.has(key) || !employers.some((e) => e.id === p.employerId && !e.archived)) return;
      seen.add(key);
      out.push({ ...p, key });
    };
    recurring.filter((r) => r.active).forEach((r) =>
      push({ employerId: r.employerId, site: r.site, start: r.start, end: r.end, breakMins: r.breakMins, rate: r.hourlyRate ?? resolveRate(employers, r.employerId, r.site) })
    );
    [...shifts].sort((a, b) => b.updatedAt - a.updatedAt).slice(0, 30).forEach((x) =>
      push({ employerId: x.employerId, site: x.site, start: x.start, end: x.end, breakMins: x.breakMins, rate: x.hourlyRate })
    );
    return out.slice(0, 8);
  }, [recurring, shifts, employers]);

  const applyPreset = (p: (typeof presets)[number]) => {
    setRateTouched(true);
    setD((prev) => ({ ...prev, employerId: p.employerId, site: p.site, start: p.start, end: p.end, breakMins: String(p.breakMins), hourlyRate: String(p.rate) }));
  };

  const set = <K extends keyof Draft>(k: K, v: Draft[K]) =>
    setD((prev) => {
      const next = { ...prev, [k]: v };
      // Auto-apply employer/site default rate until the user edits the rate by hand
      if (!rateTouched && (k === "employerId" || k === "site")) {
        if (k === "employerId") {
          const emp = employers.find((e) => e.id === v);
          next.site = emp?.sites[0]?.name ?? "";
        }
        next.hourlyRate = String(resolveRate(employers, next.employerId, next.site));
      } else if (k === "employerId") {
        const emp = employers.find((e) => e.id === v);
        if (!emp?.sites.some((s) => s.name === prev.site)) next.site = emp?.sites[0]?.name ?? "";
      }
      return next;
    });

  // ── Validation + live maths ───────────────────────────
  const breakNum = Number(d.breakMins);
  const rateNum = Number(d.hourlyRate);
  const timesOk = isValidTime(d.start) && isValidTime(d.end);

  const calc = useMemo(
    () => (timesOk ? calcShift({ date: d.date, start: d.start, end: d.end, breakMins: breakNum || 0, hourlyRate: rateNum || 0 }) : null),
    [d.date, d.start, d.end, breakNum, rateNum, timesOk]
  );

  const errors: Partial<Record<keyof Draft, string>> = {};
  if (!d.employerId) errors.employerId = "Choose an employer";
  if (!d.site.trim()) errors.site = "Enter the site or venue";
  if (!d.date) errors.date = "Pick a date";
  if (!isValidTime(d.start)) errors.start = "Use HH:MM";
  if (!isValidTime(d.end)) errors.end = "Use HH:MM";
  if (!Number.isFinite(breakNum) || breakNum < 0) errors.breakMins = "0 or more minutes";
  else if (calc && breakNum >= calc.grossMins) errors.breakMins = "Break is longer than the shift";
  if (!Number.isFinite(rateNum) || rateNum <= 0) errors.hourlyRate = "Enter a rate above $0";
  else if (rateNum > 500) errors.hourlyRate = "That looks too high — check the rate";
  const valid = Object.keys(errors).length === 0;

  // Rest-gap check against the rest of the roster, with this draft in place
  const restWarn = useMemo(() => {
    if (!calc || !valid) return null;
    const draft: Shift = {
      id: shift?.id ?? "__draft__",
      employerId: d.employerId,
      site: d.site,
      date: d.date,
      start: d.start,
      end: d.end,
      breakMins: breakNum,
      hourlyRate: rateNum,
      status: d.status,
      createdAt: 0,
      updatedAt: 0,
    };
    const others = shifts.filter((s) => s.id !== draft.id);
    const hits = findRestWarnings([...others, draft]).filter(
      (w) => w.nextShiftId === draft.id || w.prevShiftId === draft.id
    );
    return hits.length ? Math.min(...hits.map((h) => h.gapHours)) : null;
  }, [calc, valid, shifts, shift, d, breakNum, rateNum]);

  const save = () => {
    setSubmitted(true);
    if (!valid) return;
    const payload = {
      employerId: d.employerId,
      site: d.site.trim(),
      date: d.date,
      start: d.start,
      end: d.end,
      breakMins: breakNum,
      hourlyRate: Math.round(rateNum * 100) / 100,
      status: d.status,
      notes: d.notes.trim() || undefined,
    };
    if (shift) {
      updateShift(shift.id, payload);
      toast("Shift updated");
    } else {
      addShift(payload);
      toast(`Added ${fmtDow(payload.date)} ${payload.start}–${payload.end}`);
    }
    onClose();
  };

  if (!open) return null;
  const err = (k: keyof Draft) => (submitted ? errors[k] : undefined);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4" role="dialog" aria-modal="true" aria-labelledby="shift-modal-title">
      <div className="backdrop-in absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />

      <form
        onSubmit={(e) => {
          e.preventDefault();
          save();
        }}
        className="sheet-in pb-safe relative flex max-h-[94dvh] w-full max-w-2xl flex-col overflow-hidden rounded-t-2xl border border-zinc-800 bg-zinc-900 shadow-2xl sm:rounded-xl sm:pb-0"
      >
        <span className="mx-auto mt-2 h-1 w-10 rounded-full bg-zinc-700 sm:hidden" aria-hidden />
        <header className="flex items-center justify-between border-b border-zinc-800 px-5 py-3 sm:py-4">
          <div>
            <h2 id="shift-modal-title" className="font-display text-2xl font-semibold text-zinc-50">
              {shift ? "Edit shift" : "New shift"}
            </h2>
            <p className="text-xs text-zinc-500">
              {fmtDow(d.date)} {fmtAU(d.date)}
              {calc?.overnight && ` → ${fmtDow(addDays(d.date, 1))} ${fmtAU(addDays(d.date, 1))}`}
            </p>
          </div>
          <IconButton label="Close" onClick={onClose} type="button">
            <X size={18} />
          </IconButton>
        </header>

        <div className="flex-1 space-y-4 overflow-y-auto px-5 py-4">
          {!shift && presets.length > 0 && (
            <div>
              <p className="mb-1.5 text-sm font-medium text-zinc-300">Quick fill</p>
              <div className="-mx-5 flex gap-2 overflow-x-auto px-5 pb-1">
                {presets.map((p) => {
                  const e = employers.find((x) => x.id === p.employerId);
                  const on = d.employerId === p.employerId && d.site === p.site && d.start === p.start && d.end === p.end;
                  return (
                    <button
                      key={p.key}
                      type="button"
                      onClick={() => applyPreset(p)}
                      className={cn(
                        "flex shrink-0 items-center gap-2 rounded-lg border px-3 py-2 text-left transition-colors",
                        on ? "border-vest bg-vest/10" : "border-zinc-700 hover:border-zinc-500"
                      )}
                    >
                      {e && <span className={cn("h-7 w-1 rounded-full", BADGE[e.color].bar)} />}
                      <span>
                        <span className="block font-display text-base font-semibold leading-tight text-zinc-50">
                          {e?.code} {p.start}–{p.end}
                        </span>
                        <span className="block max-w-[11rem] truncate text-xs text-zinc-400">{p.site}</span>
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Employer" error={err("employerId")}>
              <select ref={firstRef} className={inputCls} value={d.employerId} onChange={(e) => set("employerId", e.target.value)}>
                {active.length === 0 && <option value="">Add an employer first</option>}
                {active.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Site / Venue" error={err("site")} hint="Pick a saved site or type a one-off venue">
              <input
                className={inputCls}
                list="site-options"
                value={d.site}
                onChange={(e) => set("site", e.target.value)}
                placeholder="e.g. Marina Mirage"
              />
              <datalist id="site-options">
                {employer?.sites.map((s) => <option key={s.id} value={s.name} />)}
              </datalist>
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            <Field label="Date" error={err("date")} className="col-span-2 sm:col-span-1">
              <input type="date" className={inputCls} value={d.date} onChange={(e) => set("date", e.target.value)} />
            </Field>
            <Field label="Start" error={err("start")}>
              <input type="time" className={cn(inputCls, "font-mono")} value={d.start} onChange={(e) => set("start", e.target.value)} />
            </Field>
            <Field label="End" error={err("end")}>
              <input type="time" className={cn(inputCls, "font-mono")} value={d.end} onChange={(e) => set("end", e.target.value)} />
            </Field>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Unpaid break (mins)" error={err("breakMins")}>
              <input
                type="number"
                min={0}
                step={5}
                inputMode="numeric"
                className={inputCls}
                value={d.breakMins}
                onChange={(e) => set("breakMins", e.target.value)}
              />
              <div className="mt-1.5 flex gap-1">
                {BREAK_PRESETS.map((b) => (
                  <button
                    key={b}
                    type="button"
                    onClick={() => set("breakMins", String(b))}
                    className={cn(
                      "rounded-md px-2.5 py-1 text-xs font-semibold ring-1 ring-inset transition-colors",
                      Number(d.breakMins) === b ? "bg-vest text-vest-ink ring-vest" : "text-zinc-400 ring-zinc-700 hover:bg-zinc-800"
                    )}
                  >
                    {b}m
                  </button>
                ))}
              </div>
            </Field>
            <Field
              label="Hourly base rate (AUD)"
              error={err("hourlyRate")}
              hint={
                employer
                  ? `Default for this site: $${resolveRate(employers, employer.id, d.site).toFixed(2)}/h`
                  : undefined
              }
            >
              <div className="relative">
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-zinc-500">$</span>
                <input
                  type="number"
                  min={0}
                  step={0.01}
                  inputMode="decimal"
                  className={cn(inputCls, "pl-7 tabular-nums")}
                  value={d.hourlyRate}
                  onChange={(e) => {
                    setRateTouched(true);
                    set("hourlyRate", e.target.value);
                  }}
                />
              </div>
            </Field>
          </div>

          <Field label="Payment status">
            <div className="grid grid-cols-3 gap-1 rounded-lg border border-zinc-800 bg-zinc-950 p-1">
              {STATUSES.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => set("status", s)}
                  className={cn(
                    "rounded-md px-2 py-2 text-sm font-medium transition-colors",
                    d.status === s ? "bg-zinc-700 text-zinc-50" : "text-zinc-400 hover:text-zinc-200"
                  )}
                >
                  {PAYMENT_STATUS_LABEL[s]}
                </button>
              ))}
            </div>
          </Field>

          <Field label="Operational notes" hint="Uniform, parking, access codes, key handover…">
            <textarea
              rows={2}
              className={cn(inputCls, "h-auto py-2")}
              value={d.notes}
              onChange={(e) => set("notes", e.target.value)}
              placeholder="e.g. Black suit. Park on B1. Keys from night supervisor at 06:00."
            />
          </Field>
        </div>

        {/* Live calculation footer */}
        <div className="border-t border-zinc-800 bg-zinc-950/60 px-5 py-3">
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
            <div className="flex items-center gap-2 text-zinc-500">
              <Calculator size={15} />
              <span className="text-sm">This shift</span>
            </div>
            <Stat label="Span" value={calc ? fmtHours(calc.grossMins / 60) : "—"} />
            <Stat label="Net paid" value={calc ? fmtHours(calc.netHours) : "—"} />
            <Stat label="Shift value" value={calc && valid ? fmtMoney(calc.pay) : "—"} strong />
            {employer && <span className={cn("ml-auto hidden text-xs sm:block", BADGE[employer.color].text)}>{employer.code}</span>}
          </div>

          <div className="mt-2 flex flex-wrap gap-2">
            {calc?.overnight && (
              <Chip tone="indigo">
                <Moon size={12} /> Overnight — finishes {fmtDow(addDays(d.date, 1))} {d.end}
              </Chip>
            )}
            {calc && calc.netHours > LONG_SHIFT_HOURS && (
              <Chip tone="amber">
                <AlertTriangle size={12} /> Long shift: over {LONG_SHIFT_HOURS}h
              </Chip>
            )}
            {restWarn !== null && (
              <Chip tone="rose">
                <AlertTriangle size={12} />
                {restWarn < 0 ? "Overlaps another shift" : `Only ${fmtHours(restWarn)} rest next to another shift (min ${MIN_REST_HOURS}h)`}
              </Chip>
            )}
          </div>
        </div>

        <footer className="flex items-center justify-between gap-2 border-t border-zinc-800 px-5 py-3">
          {shift ? (
            <Button
              type="button"
              variant="danger"
              onClick={() => {
                deleteShiftWithUndo(shift.id);
                onClose();
              }}
            >
              <Trash2 size={15} /> Delete
            </Button>
          ) : (
            <span />
          )}
          <div className="flex gap-2">
            <Button type="button" variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" disabled={submitted && !valid}>
              {shift ? "Save changes" : "Add shift"}
            </Button>
          </div>
        </footer>
      </form>
    </div>
  );
}

function Stat({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex items-baseline gap-1.5">
      <span className="text-sm text-zinc-400">{label}</span>
      <span className={cn("font-display", strong ? "text-2xl font-semibold text-vest" : "text-lg font-medium text-zinc-100")}>{value}</span>
    </div>
  );
}

function Chip({ tone, children }: { tone: "indigo" | "amber" | "rose"; children: ReactNode }) {
  const t = {
    indigo: "bg-indigo-500/15 text-indigo-300",
    amber: "bg-amber-500/15 text-amber-300",
    rose: "bg-rose-500/15 text-rose-300",
  }[tone];
  return <span className={cn("inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium", t)}>{children}</span>;
}
