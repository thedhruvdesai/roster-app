"use client";

import {
  Banknote,
  Check,
  CheckCheck,
  ClipboardCopy,
  FileText,
  Hourglass,
  Receipt,
  Wallet,
} from "lucide-react";
import { type ReactNode, useEffect, useMemo, useState } from "react";
import { motion } from "motion/react";
import { addDays, fmtAU, fmtDow, fmtRange } from "@/lib/dates";
import {
  buildPaySummary,
  buildTimesheetText,
  calcShift,
  fmtHours,
  fmtMoney,
  isOverdueForUpdate,
  shiftsInRange,
} from "@/lib/pay";
import { useRoster } from "@/lib/store";
import { setStatusWithToast } from "@/lib/actions";
import type { ISODate, PaymentStatus, Shift } from "@/lib/types";
import { PAYMENT_STATUS_LABEL } from "@/lib/types";
import { STATUS_STYLE, cn } from "@/lib/ui";
import { Button, EmployerBadge, EmptyState, Panel, WeekNavigator, inputCls } from "./ui";

type Mode = "week" | "fortnight" | "custom";

export function PaySummaryView({ onEdit }: { onEdit: (s: Shift) => void }) {
  const { shifts, employers, weekStart, setWeek, weekNotes, setWeekNote, ensureRecurring } = useRoster();

  const [mode, setMode] = useState<Mode>("week");
  const [custom, setCustom] = useState({ from: addDays(weekStart, -7), to: addDays(weekStart, 6) });
  const [empFilter, setEmpFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<PaymentStatus | "all">("all");

  // Fortnight = selected week + the one before it (typical fortnightly pay run)
  const from: ISODate = mode === "week" ? weekStart : mode === "fortnight" ? addDays(weekStart, -7) : custom.from;
  const to: ISODate = mode === "custom" ? custom.to : addDays(weekStart, 6);
  const rangeValid = from <= to;

  useEffect(() => {
    // Cap custom ranges to a year so a typo can't generate thousands of shifts
    if (rangeValid && to <= addDays(from, 366)) ensureRecurring(from, to);
  }, [from, to, rangeValid, ensureRecurring]);

  const summary = useMemo(() => buildPaySummary(shifts, employers, from, to), [shifts, employers, from, to]);
  // Employers with nothing in this period still get a row, so every company is visible
  const idle = useMemo(
    () => employers.filter((e) => !e.archived && !summary.byEmployer.some((l) => l.employer.id === e.id)),
    [employers, summary]
  );
  const ledger = useMemo(
    () =>
      shiftsInRange(shifts, from, to).filter(
        (s) => (empFilter === "all" || s.employerId === empFilter) && (statusFilter === "all" || s.status === statusFilter)
      ),
    [shifts, from, to, empFilter, statusFilter]
  );
  const overdue = useMemo(() => shiftsInRange(shifts, from, to).filter((s) => isOverdueForUpdate(s)), [shifts, from, to]);

  const noteKey = mode === "custom" ? from : weekStart;
  const note = weekNotes[noteKey];

  const empById = (id: string) => employers.find((e) => e.id === id);
  const empty = summary.shiftCount === 0;

  return (
    <div className="space-y-5">
      {/* ── Period: Uber-style segmented pill, then the week stepper ── */}
      <div className="space-y-3">
        <div className="flex rounded-full bg-zinc-900 p-1 sm:inline-flex">
          {(["week", "fortnight", "custom"] as Mode[]).map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={cn(
                "relative h-10 flex-1 rounded-full px-5 text-[15px] font-semibold capitalize transition-colors duration-200 sm:flex-none",
                mode === m ? "text-zinc-950" : "text-zinc-400"
              )}
            >
              {mode === m && (
                <motion.span layoutId="period-pill" transition={{ type: "spring", stiffness: 420, damping: 34, mass: 0.8 }} className="absolute inset-0 rounded-full bg-zinc-50" />
              )}
              <span className="relative">{m === "custom" ? "Range" : m}</span>
            </button>
          ))}
        </div>
        {mode === "custom" ? (
          <div className="grid grid-cols-2 gap-2 sm:flex">
            <input type="date" aria-label="From" className={cn(inputCls, "sm:w-auto")} value={custom.from} onChange={(e) => setCustom((c) => ({ ...c, from: e.target.value }))} />
            <input type="date" aria-label="To" className={cn(inputCls, "sm:w-auto")} value={custom.to} onChange={(e) => setCustom((c) => ({ ...c, to: e.target.value }))} />
          </div>
        ) : (
          <WeekNavigator weekStart={weekStart} onChange={setWeek} />
        )}
      </div>

      {/* ── Earnings hero: one big figure, the status split underneath ── */}
      <div className="rounded-[24px] bg-zinc-900 p-5 sm:p-6">
        <p className="text-[14px] text-zinc-400">
          {mode === "week" ? "This week" : mode === "fortnight" ? "This fortnight" : rangeValid ? fmtRange(from, to) : "Invalid range"}, before tax
        </p>
        <p className="type-board mt-1 text-[clamp(2.75rem,14vw,4.5rem)] text-zinc-50">{fmtMoney(summary.grossProjected)}</p>
        <p className="mt-1 text-[14px] text-zinc-400">
          {fmtHours(summary.totalHours)} across {summary.shiftCount} shift{summary.shiftCount === 1 ? "" : "s"}
        </p>
        {!empty && (
          <div className="mt-5">
            <StatusBar paid={summary.paid} pending={summary.pendingPay} scheduled={summary.scheduled} />
          </div>
        )}
      </div>

      {/* ── Three status tiles, colour only as a small marker ── */}
      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        {[
          { label: "Worked", value: summary.verified, dot: "bg-zinc-50", sub: "done so far" },
          { label: "Pending", value: summary.pendingPay, dot: "bg-amber-400", sub: "chase if late" },
          { label: "Paid", value: summary.paid, dot: "bg-emerald-400", sub: "in the bank" },
        ].map((t) => (
          <div key={t.label} className="rounded-[20px] bg-zinc-900 p-4">
            <p className="flex items-center gap-1.5 text-[12px] text-zinc-400">
              <span className={cn("h-2 w-2 rounded-full", t.dot)} />
              {t.label}
            </p>
            <p className="mt-1.5 truncate text-[clamp(1.05rem,5vw,1.6rem)] font-bold tracking-tight text-zinc-50">{fmtMoney(t.value)}</p>
            <p className="mt-0.5 text-[12px] text-zinc-500">{t.sub}</p>
          </div>
        ))}
      </div>

      {overdue.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-amber-500/30 bg-amber-500/[0.07] px-4 py-3">
          <p className="text-sm text-amber-200">
            {overdue.length} finished shift{overdue.length > 1 ? "s are" : " is"} still marked <b>Scheduled</b>.
          </p>
          <Button size="sm" variant="outline" onClick={() => setStatusWithToast(overdue.map((s) => s.id), "worked")}>
            <Check size={14} /> Mark as worked
          </Button>
        </div>
      )}

      {empty ? (
        <EmptyState
          icon={<Receipt size={22} />}
          title="No pay data for this period"
          body="Shifts you roster will appear here with hours, rates and payment status. Try another week or a wider date range."
        />
      ) : (
        <>
          {/* ── By employer ─────────────────────────────── */}
          <Panel>
            <div className="border-b border-zinc-800 px-4 py-3">
              <h3 className="font-display text-xl font-semibold text-zinc-50">By employer</h3>
            </div>
            {/* Mobile: one row per employer */}
            <ul className="divide-y divide-zinc-700/60 md:hidden">
              {summary.byEmployer.map((l) => {
                const workedIds = shiftsInRange(shifts, from, to)
                  .filter((x) => x.employerId === l.employer.id && x.status === "worked")
                  .map((x) => x.id);
                return (
                  <li key={l.employer.id} className="px-4 py-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <EmployerBadge employer={l.employer} />
                        <p className="mt-1 text-sm text-zinc-400">
                          {l.shiftCount} shift{l.shiftCount === 1 ? "" : "s"}, {fmtHours(l.hours)} at {l.rates.map((r) => `$${r.toFixed(2)}`).join(" / ")}
                        </p>
                      </div>
                      <p className="shrink-0 font-display text-xl font-semibold text-zinc-50">{fmtMoney(l.total)}</p>
                    </div>
                    <div className="mt-2 flex items-center justify-between gap-3">
                      <StatusBar paid={l.paid} pending={l.pending} scheduled={l.scheduled} slim />
                      <Button size="sm" variant="ghost" disabled={!workedIds.length} onClick={() => setStatusWithToast(workedIds, "paid")}>
                        <Banknote size={13} /> Mark paid
                      </Button>
                    </div>
                  </li>
                );
              })}
              {idle.map((e) => (
                <li key={e.id} className="flex items-start justify-between gap-3 px-4 py-3">
                  <div className="min-w-0">
                    <EmployerBadge employer={e} />
                    <p className="mt-1 text-sm text-zinc-500">
                      No shifts · ${e.defaultRate.toFixed(2)}/h · <span className="capitalize">{e.payCycle}</span>
                    </p>
                  </div>
                  <p className="shrink-0 font-display text-xl font-semibold text-zinc-600">{fmtMoney(0)}</p>
                </li>
              ))}
              <li className="flex justify-between px-4 py-3 font-display text-lg font-semibold">
                <span className="text-zinc-300">Total {fmtHours(summary.totalHours)}</span>
                <span className="text-vest">{fmtMoney(summary.grossProjected)}</span>
              </li>
            </ul>
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full min-w-[640px] text-sm">
                <thead className="text-left text-sm text-zinc-400">
                  <tr>
                    <th className="px-4 py-2 font-medium">Company</th>
                    <th className="px-3 py-2 text-right font-medium">Shifts</th>
                    <th className="px-3 py-2 text-right font-medium">Hours</th>
                    <th className="px-3 py-2 text-right font-medium">Rate(s)</th>
                    <th className="px-3 py-2 text-right font-medium">Payout</th>
                    <th className="px-3 py-2 font-medium">Status mix</th>
                    <th className="px-4 py-2" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-700/60">
                  {summary.byEmployer.map((l) => {
                    const workedIds = shiftsInRange(shifts, from, to)
                      .filter((s) => s.employerId === l.employer.id && s.status === "worked")
                      .map((s) => s.id);
                    return (
                      <tr key={l.employer.id} className="hover:bg-zinc-800/30">
                        <td className="px-4 py-3">
                          <EmployerBadge employer={l.employer} />
                          <p className="mt-0.5 text-xs capitalize text-zinc-500">{l.employer.payCycle} pay</p>
                        </td>
                        <td className="px-3 py-3 text-right tabular-nums text-zinc-300">{l.shiftCount}</td>
                        <td className="px-3 py-3 text-right tabular-nums text-zinc-300">{fmtHours(l.hours)}</td>
                        <td className="px-3 py-3 text-right tabular-nums text-zinc-400">{l.rates.map((r) => `$${r.toFixed(2)}`).join(" / ")}</td>
                        <td className="px-3 py-3 text-right font-display text-lg font-semibold text-zinc-50">{fmtMoney(l.total)}</td>
                        <td className="px-3 py-3">
                          <StatusBar paid={l.paid} pending={l.pending} scheduled={l.scheduled} slim />
                        </td>
                        <td className="px-4 py-3 text-right">
                          <Button size="sm" variant="ghost" disabled={!workedIds.length} onClick={() => setStatusWithToast(workedIds, "paid")}>
                            <Banknote size={13} /> Mark paid
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                  {idle.map((e) => (
                    <tr key={e.id} className="text-zinc-500">
                      <td className="px-4 py-3">
                        <EmployerBadge employer={e} />
                        <p className="mt-0.5 text-xs capitalize text-zinc-500">{e.payCycle} pay</p>
                      </td>
                      <td className="px-3 py-3 text-right tabular-nums">0</td>
                      <td className="px-3 py-3 text-right tabular-nums">0h</td>
                      <td className="px-3 py-3 text-right tabular-nums">${e.defaultRate.toFixed(2)}</td>
                      <td className="px-3 py-3 text-right font-display text-lg font-semibold text-zinc-600">{fmtMoney(0)}</td>
                      <td colSpan={2} className="px-3 py-3 text-xs">No shifts this period</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="border-t border-zinc-700 text-sm">
                  <tr>
                    <td className="px-4 py-3 font-semibold text-zinc-300">Total</td>
                    <td className="px-3 py-3 text-right tabular-nums text-zinc-300">{summary.shiftCount}</td>
                    <td className="px-3 py-3 text-right tabular-nums text-zinc-300">{fmtHours(summary.totalHours)}</td>
                    <td />
                    <td className="px-3 py-3 text-right font-display text-lg font-semibold text-vest">{fmtMoney(summary.grossProjected)}</td>
                    <td colSpan={2} />
                  </tr>
                </tfoot>
              </table>
            </div>
          </Panel>

          {/* ── Itemised ledger ─────────────────────────── */}
          <Panel>
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-800 px-4 py-3">
              <h3 className="font-display text-xl font-semibold text-zinc-50">Shift ledger</h3>
              <div className="flex gap-2">
                <select className={cn(inputCls, "h-9 w-auto text-sm")} value={empFilter} onChange={(e) => setEmpFilter(e.target.value)}>
                  <option value="all">All employers</option>
                  {summary.byEmployer.map((l) => (
                    <option key={l.employer.id} value={l.employer.id}>{l.employer.name}</option>
                  ))}
                </select>
                <select className={cn(inputCls, "h-9 w-auto text-sm")} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as PaymentStatus | "all")}>
                  <option value="all">All statuses</option>
                  {(["scheduled", "worked", "paid"] as PaymentStatus[]).map((s) => (
                    <option key={s} value={s}>{PAYMENT_STATUS_LABEL[s]}</option>
                  ))}
                </select>
              </div>
            </div>

            {ledger.length === 0 ? (
              <p className="px-4 py-8 text-center text-sm text-zinc-500">No shifts match these filters.</p>
            ) : (
              <>
                {/* Desktop table */}
                <div className="hidden overflow-x-auto md:block">
                  <table className="w-full text-sm">
                    <thead className="text-left text-sm text-zinc-400">
                      <tr>
                        <th className="px-4 py-2 font-medium">Date</th>
                        <th className="px-3 py-2 font-medium">Venue</th>
                        <th className="px-3 py-2 font-medium">Time</th>
                        <th className="px-3 py-2 text-right font-medium">Hours</th>
                        <th className="px-3 py-2 text-right font-medium">Base rate</th>
                        <th className="px-3 py-2 text-right font-medium">Amount</th>
                        <th className="px-4 py-2 font-medium">Payment status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-700/60">
                      {ledger.map((s) => {
                        const c = calcShift(s);
                        return (
                          <tr key={s.id} className="hover:bg-zinc-800/30">
                            <td className="whitespace-nowrap px-4 py-2.5 tabular-nums text-zinc-300">
                              <span className="text-zinc-500">{fmtDow(s.date)}</span> {fmtAU(s.date)}
                            </td>
                            <td className="px-3 py-2.5">
                              <button onClick={() => onEdit(s)} className="mb-1 block text-left text-zinc-100 hover:text-vest">
                                {s.site}
                              </button>
                              <EmployerBadge employer={empById(s.employerId)} compact />
                            </td>
                            <td className="whitespace-nowrap px-3 py-2.5 font-display text-base text-zinc-200">
                              {s.start}–{s.end}
                              {c.overnight && <span className="ml-1 text-sm text-indigo-300">next day</span>}
                            </td>
                            <td className="px-3 py-2.5 text-right tabular-nums text-zinc-300">{fmtHours(c.netHours)}</td>
                            <td className="px-3 py-2.5 text-right tabular-nums text-zinc-400">${s.hourlyRate.toFixed(2)}</td>
                            <td className="px-3 py-2.5 text-right font-display text-lg font-semibold text-zinc-50">{fmtMoney(c.pay)}</td>
                            <td className="px-4 py-2.5">
                              <StatusSelect status={s.status} onChange={(st) => setStatusWithToast([s.id], st)} />
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Mobile cards */}
                <ul className="divide-y divide-zinc-700/60 md:hidden">
                  {ledger.map((s) => {
                    const c = calcShift(s);
                    return (
                      <li key={s.id} className="px-4 py-3">
                        <div className="flex items-start justify-between gap-3">
                          <button onClick={() => onEdit(s)} className="min-w-0 text-left">
                            <p className="text-xs tabular-nums text-zinc-500">
                              {fmtDow(s.date)} {fmtAU(s.date)} · <span className="font-mono">{s.start}–{s.end}</span>
                            </p>
                            <p className="truncate text-sm font-medium text-zinc-100">{s.site}</p>
                            <div className="mt-1"><EmployerBadge employer={empById(s.employerId)} compact /></div>
                          </button>
                          <div className="shrink-0 text-right">
                            <p className="font-semibold tabular-nums text-zinc-50">{fmtMoney(c.pay)}</p>
                            <p className="text-xs tabular-nums text-zinc-500">{fmtHours(c.netHours)} × ${s.hourlyRate.toFixed(2)}</p>
                          </div>
                        </div>
                        <div className="mt-2">
                          <StatusSelect status={s.status} onChange={(st) => setStatusWithToast([s.id], st)} />
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </>
            )}
          </Panel>
        </>
      )}

      {/* ── Notes & export ───────────────────────────── */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Panel className="p-4">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="flex items-center gap-2 font-display text-xl font-semibold text-zinc-50">
              <FileText size={15} /> Pay notes
            </h3>
            <label className="flex cursor-pointer items-center gap-2 text-xs text-zinc-400">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-zinc-600 bg-zinc-900 accent-emerald-500"
                checked={note?.timesheetSubmitted ?? false}
                onChange={(e) => setWeekNote(noteKey, { timesheetSubmitted: e.target.checked })}
              />
              Timesheet submitted
            </label>
          </div>
          <NotesField
            key={noteKey}
            initial={note?.text ?? ""}
            onSave={(text) => setWeekNote(noteKey, { text })}
          />
          <p className="mt-2 text-xs text-zinc-500">
            Saved for the period starting {fmtAU(noteKey)}
            {note?.updatedAt ? ` · last edited ${new Date(note.updatedAt).toLocaleString("en-AU", { dateStyle: "short", timeStyle: "short" })}` : ""}
          </p>
        </Panel>

        <ExportPanel from={from} to={to} note={note?.text} disabled={empty} />
      </div>
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────

function Kpi({ icon, label, value, sub, tone }: { icon: ReactNode; label: string; value: string; sub: string; tone?: "emerald" | "amber" }) {
  return (
    <div className="bg-zinc-900 p-4">
      <p className="flex items-center gap-1.5 text-sm text-zinc-400">
        {icon} {label}
      </p>
      <p className={cn("mt-1 font-serif text-[48px] font-bold leading-[0.95]", tone === "emerald" ? "text-emerald-300" : tone === "amber" ? "text-amber-300" : "text-zinc-50")}>
        {value}
      </p>
      <p className="mt-0.5 text-xs text-zinc-500">{sub}</p>
    </div>
  );
}

function StatusBar({ paid, pending, scheduled, slim }: { paid: number; pending: number; scheduled: number; slim?: boolean }) {
  const total = paid + pending + scheduled || 1;
  const seg = [
    { v: paid, c: "bg-emerald-400", l: "Paid" },
    { v: pending, c: "bg-amber-400", l: "Pending" },
    { v: scheduled, c: "bg-zinc-600", l: "Scheduled" },
  ];
  return (
    <div className={slim ? "w-32" : ""}>
      <div className={cn("flex overflow-hidden rounded-full bg-zinc-800", slim ? "h-1.5" : "h-2")}>
        {seg.map((s) => s.v > 0 && <div key={s.l} className={s.c} style={{ width: `${(s.v / total) * 100}%` }} title={`${s.l}: ${fmtMoney(s.v)}`} />)}
      </div>
      {!slim && (
        <div className="mt-1.5 flex flex-wrap gap-4 text-xs text-zinc-500">
          {seg.map((s) => (
            <span key={s.l} className="flex items-center gap-1.5">
              <span className={cn("h-2 w-2 rounded-full", s.c)} /> {s.l} {fmtMoney(s.v)}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

function StatusSelect({ status, onChange }: { status: PaymentStatus; onChange: (s: PaymentStatus) => void }) {
  return (
    <div className="inline-flex rounded-[9px] bg-zinc-800 p-0.5">
      {(["scheduled", "worked", "paid"] as PaymentStatus[]).map((s) => (
        <button
          key={s}
          onClick={() => onChange(s)}
          className={cn(
            "rounded-[7px] px-2.5 py-1 text-xs font-semibold transition-colors",
            status === s ? STATUS_STYLE[s] : "text-zinc-400"
          )}
          aria-pressed={status === s}
        >
          {{ scheduled: "Sched.", worked: "Pending", paid: "Paid" }[s]}
        </button>
      ))}
    </div>
  );
}

/** Debounced textarea so every keystroke doesn't hit localStorage */
function NotesField({ initial, onSave }: { initial: string; onSave: (t: string) => void }) {
  const [text, setText] = useState(initial);
  useEffect(() => {
    if (text === initial) return;
    const t = setTimeout(() => onSave(text), 400);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text]);
  return (
    <textarea
      rows={5}
      value={text}
      onChange={(e) => setText(e.target.value)}
      className={cn(inputCls, "h-auto resize-y py-2 leading-relaxed")}
      placeholder={"Timesheet sent to Border rostering 29/09 ✓\nPayroll ref: PAY-2291\nDiscrepancy: Marina Mirage Tue short-paid 0.5h — raised with ops"}
    />
  );
}

function ExportPanel({ from, to, note, disabled }: { from: ISODate; to: ISODate; note?: string; disabled: boolean }) {
  const { shifts, employers } = useRoster();
  const [emp, setEmp] = useState<string>("all");
  const [includePay, setIncludePay] = useState(true);
  const [includeNote, setIncludeNote] = useState(false);
  const [copied, setCopied] = useState(false);

  const text = useMemo(
    () => buildTimesheetText(shifts, employers, from, to, { employerId: emp, includePay, note: includeNote ? note : undefined }),
    [shifts, employers, from, to, emp, includePay, includeNote, note]
  );
  const inRange = employers.filter((e) => shiftsInRange(shifts, from, to).some((s) => s.employerId === e.id));

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // Fallback for older mobile browsers / non-secure contexts
      const ta = document.createElement("textarea");
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      ta.remove();
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  return (
    <Panel className="flex flex-col p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h3 className="flex items-center gap-2 font-display text-xl font-semibold text-zinc-50">
          <ClipboardCopy size={15} /> Timesheet export
        </h3>
        <select className={cn(inputCls, "h-9 w-auto text-sm")} value={emp} onChange={(e) => setEmp(e.target.value)}>
          <option value="all">All employers</option>
          {inRange.map((e) => (
            <option key={e.id} value={e.id}>{e.name}</option>
          ))}
        </select>
      </div>
      <pre className="max-h-56 flex-1 overflow-auto whitespace-pre-wrap rounded-lg border border-zinc-800 bg-zinc-950 p-3 font-sans text-[13px] leading-relaxed text-zinc-300">
        {text}
      </pre>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-4 text-xs text-zinc-400">
          <label className="flex items-center gap-1.5">
            <input type="checkbox" className="accent-emerald-500" checked={includePay} onChange={(e) => setIncludePay(e.target.checked)} /> Include $
          </label>
          <label className="flex items-center gap-1.5">
            <input type="checkbox" className="accent-emerald-500" checked={includeNote} onChange={(e) => setIncludeNote(e.target.checked)} disabled={!note} /> Include notes
          </label>
        </div>
        <Button variant="primary" size="sm" onClick={copy} disabled={disabled}>
          {copied ? <Check size={14} /> : <ClipboardCopy size={14} />} {copied ? "Copied" : "Copy summary"}
        </Button>
      </div>
    </Panel>
  );
}

