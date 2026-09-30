"use client";

import { Archive, Building2, Download, MapPin, Pencil, Plus, RotateCcw, Trash2, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { addDays } from "@/lib/dates";
import { buildPaySummary, fmtHours, fmtMoney } from "@/lib/pay";
import { useRoster } from "@/lib/store";
import type { BadgeColor, Employer, Site } from "@/lib/types";
import { BADGE, BADGE_COLORS, cn } from "@/lib/ui";
import { FixedRosterPanel } from "./FixedRosterPanel";
import { Button, EmployerBadge, EmptyState, Field, IconButton, Panel, inputCls } from "./ui";

export function EmployersView() {
  const { employers, shifts, weekStart, resetToDefaults, clearAll } = useRoster();
  const [editing, setEditing] = useState<Employer | "new" | null>(null);
  const [showArchived, setShowArchived] = useState(false);

  const week = useMemo(() => buildPaySummary(shifts, employers, weekStart, addDays(weekStart, 6)), [shifts, employers, weekStart]);
  const list = employers.filter((e) => showArchived || !e.archived);

  const exportJson = () => {
    const blob = new Blob([JSON.stringify({ employers, shifts, exportedAt: new Date().toISOString() }, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `roster-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-zinc-50">Employers & sites</h2>
          <p className="text-sm text-zinc-500">Default rates here pre-fill every new shift. Site overrides win over the employer rate.</p>
        </div>
        <div className="flex items-center gap-2">
          {employers.some((e) => e.archived) && (
            <Button size="sm" variant="ghost" onClick={() => setShowArchived((v) => !v)}>
              <Archive size={14} /> {showArchived ? "Hide" : "Show"} archived
            </Button>
          )}
          <Button variant="primary" onClick={() => setEditing("new")}>
            <Plus size={16} /> Add employer
          </Button>
        </div>
      </div>

      <FixedRosterPanel />

      {list.length === 0 ? (
        <EmptyState
          icon={<Building2 size={22} />}
          title="No employers yet"
          body="Add each security company you pick up shifts from, with its sites and base rate."
          action={<Button variant="primary" onClick={() => setEditing("new")}><Plus size={16} /> Add employer</Button>}
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {list.map((e) => {
            const line = week.byEmployer.find((l) => l.employer.id === e.id);
            const total = shifts.filter((s) => s.employerId === e.id).length;
            return (
              <Panel key={e.id} className={cn("flex flex-col p-4", e.archived && "opacity-60")}>
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <EmployerBadge employer={e} />
                    <h3 className="mt-2 truncate text-base font-semibold text-zinc-50">{e.name}</h3>
                    <p className="text-xs capitalize text-zinc-500">
                      {e.payCycle}{e.paymentType === "cash" ? " cash" : e.paymentType === "invoice" ? " invoice" : " pay"}
                      {e.payDay ? ` · paid ${e.payDay}` : ""} · {total} shift{total === 1 ? "" : "s"}{e.archived ? " · archived" : ""}
                    </p>
                  </div>
                  <IconButton label={`Edit ${e.name}`} onClick={() => setEditing(e)}>
                    <Pencil size={15} />
                  </IconButton>
                </div>

                <div className="mt-4 grid grid-cols-3 gap-2 rounded-xl bg-zinc-950/60 p-3 text-center">
                  <Mini label="Base rate" value={`$${e.defaultRate.toFixed(2)}`} />
                  <Mini label="This week" value={line ? fmtHours(line.hours) : "0h"} />
                  <Mini label="Earned" value={line ? fmtMoney(line.total) : "$0"} />
                </div>

                <ul className="mb-3 mt-3 space-y-1.5">
                  {e.sites.map((s) => (
                    <li key={s.id} className="flex items-center justify-between gap-2 text-sm">
                      <span className="flex min-w-0 items-center gap-1.5 text-zinc-300">
                        <MapPin size={13} className={cn("shrink-0", BADGE[e.color].text)} />
                        <span className="truncate">{s.name}</span>
                      </span>
                      {s.rateOverride != null && <span className="shrink-0 text-xs tabular-nums text-zinc-400">${s.rateOverride.toFixed(2)}</span>}
                    </li>
                  ))}
                  {e.sites.length === 0 && <li className="text-xs text-zinc-600">No saved sites</li>}
                </ul>

                {(e.timesheetVia || e.contactName || e.contactPhone || e.timesheetEmail) && (
                  <div className="mt-auto space-y-0.5 border-t border-zinc-800 pt-3 text-xs text-zinc-500">
                    {e.timesheetVia && <p><span className="text-zinc-400">Timesheet:</span> {e.timesheetVia}</p>}
                    {(e.contactName || e.contactPhone || e.timesheetEmail) && (
                      <p>{[e.contactName, e.contactPhone, e.timesheetEmail].filter(Boolean).join(" · ")}</p>
                    )}
                  </div>
                )}
              </Panel>
            );
          })}
        </div>
      )}

      <Panel className="flex flex-wrap items-center justify-between gap-3 p-4">
        <div>
          <p className="text-sm font-semibold text-zinc-200">Your data</p>
          <p className="text-xs text-zinc-500">Stored only in this browser (LocalStorage). Export a backup before clearing site data.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" onClick={exportJson}><Download size={14} /> Export JSON</Button>
          <Button size="sm" variant="ghost" onClick={() => confirm("Reset employers and fixed roster to your saved defaults? All shifts and notes will be removed.") && resetToDefaults()}>
            <RotateCcw size={14} /> Reset to my defaults
          </Button>
          <Button size="sm" variant="danger" onClick={() => confirm("Delete all shifts and notes? Employers and fixed roster are kept, and fixed shifts will refill.") && clearAll()}>
            <Trash2 size={14} /> Clear shifts
          </Button>
        </div>
      </Panel>

      {editing && <EmployerEditor employer={editing === "new" ? null : editing} onClose={() => setEditing(null)} />}
    </div>
  );
}

function Mini({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-wide text-zinc-500">{label}</p>
      <p className="mt-0.5 text-sm font-semibold tabular-nums text-zinc-100">{value}</p>
    </div>
  );
}

// ── Editor ─────────────────────────────────────────────────

type SiteDraft = { id: string; name: string; rate: string };

function EmployerEditor({ employer, onClose }: { employer: Employer | null; onClose: () => void }) {
  const { employers, upsertEmployer, deleteEmployer } = useRoster();
  const usedColors = employers.map((e) => e.color);
  const [name, setName] = useState(employer?.name ?? "");
  const [code, setCode] = useState(employer?.code ?? "");
  const [color, setColor] = useState<BadgeColor>(employer?.color ?? BADGE_COLORS.find((c) => !usedColors.includes(c)) ?? "cyan");
  const [rate, setRate] = useState(employer ? String(employer.defaultRate) : "");
  const [payCycle, setPayCycle] = useState<Employer["payCycle"]>(employer?.payCycle ?? "weekly");
  const [contactName, setContactName] = useState(employer?.contactName ?? "");
  const [contactPhone, setContactPhone] = useState(employer?.contactPhone ?? "");
  const [timesheetEmail, setTimesheetEmail] = useState(employer?.timesheetEmail ?? "");
  const [archived, setArchived] = useState(employer?.archived ?? false);
  const [paymentType, setPaymentType] = useState<NonNullable<Employer["paymentType"]>>(employer?.paymentType ?? "payroll");
  const [payDay, setPayDay] = useState(employer?.payDay ?? "");
  const [timesheetVia, setTimesheetVia] = useState(employer?.timesheetVia ?? "");
  const [sites, setSites] = useState<SiteDraft[]>(
    employer?.sites.map((s) => ({ id: s.id, name: s.name, rate: s.rateOverride != null ? String(s.rateOverride) : "" })) ?? [
      { id: `st_${Date.now()}`, name: "", rate: "" },
    ]
  );
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const autoCode = (n: string) =>
    n.split(/\s+/).filter(Boolean).map((w) => w[0]).join("").slice(0, 8).toUpperCase();

  const save = () => {
    const r = Number(rate);
    if (!name.trim()) return setError("Company name is required.");
    if (!Number.isFinite(r) || r <= 0) return setError("Enter a default hourly rate above $0.");
    const cleanSites: Site[] = sites
      .filter((s) => s.name.trim())
      .map((s) => ({ id: s.id, name: s.name.trim(), rateOverride: s.rate.trim() ? Number(s.rate) : undefined }));
    upsertEmployer({
      id: employer?.id,
      name: name.trim(),
      code: (code.trim() || autoCode(name)).toUpperCase().slice(0, 8),
      color,
      defaultRate: Math.round(r * 100) / 100,
      payCycle,
      contactName: contactName.trim() || undefined,
      contactPhone: contactPhone.trim() || undefined,
      timesheetEmail: timesheetEmail.trim() || undefined,
      paymentType,
      payDay: payDay.trim() || undefined,
      timesheetVia: timesheetVia.trim() || undefined,
      sites: cleanSites,
      archived,
    });
    onClose();
  };

  const remove = () => {
    if (!employer) return;
    const res = deleteEmployer(employer.id);
    if (!res.ok) setError(res.reason ?? "Could not delete.");
    else onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <form
        onSubmit={(e) => { e.preventDefault(); save(); }}
        className="relative flex max-h-[92dvh] w-full max-w-xl flex-col overflow-hidden rounded-t-2xl border border-zinc-800 bg-zinc-900 shadow-2xl sm:rounded-2xl"
      >
        <header className="flex items-center justify-between border-b border-zinc-800 px-5 py-4">
          <h2 className="text-base font-semibold text-zinc-50">{employer ? "Edit employer" : "New employer"}</h2>
          <IconButton type="button" label="Close" onClick={onClose}><X size={18} /></IconButton>
        </header>

        <div className="flex-1 space-y-4 overflow-y-auto px-5 py-4">
          <div className="grid grid-cols-[1fr_6rem] gap-3">
            <Field label="Company name">
              <input className={inputCls} value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Premier Protection Group" autoFocus />
            </Field>
            <Field label="Code">
              <input className={cn(inputCls, "uppercase")} maxLength={8} value={code} onChange={(e) => setCode(e.target.value)} placeholder={autoCode(name) || "ABC"} />
            </Field>
          </div>

          <Field label="Badge colour">
            <div className="flex flex-wrap gap-2">
              {BADGE_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  aria-label={c}
                  className={cn("h-8 w-8 rounded-full ring-2 ring-offset-2 ring-offset-zinc-900 transition", BADGE[c].dot, color === c ? "ring-zinc-100" : "ring-transparent opacity-60 hover:opacity-100")}
                />
              ))}
            </div>
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Default base rate (AUD/h)">
              <input type="number" step={0.01} min={0} inputMode="decimal" className={cn(inputCls, "tabular-nums")} value={rate} onChange={(e) => setRate(e.target.value)} placeholder="34.50" />
            </Field>
            <Field label="Pay cycle">
              <select className={inputCls} value={payCycle} onChange={(e) => setPayCycle(e.target.value as Employer["payCycle"])}>
                <option value="weekly">Weekly</option>
                <option value="fortnightly">Fortnightly</option>
                <option value="monthly">Monthly</option>
              </select>
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Paid via">
              <select className={inputCls} value={paymentType} onChange={(e) => setPaymentType(e.target.value as NonNullable<Employer["paymentType"]>)}>
                <option value="payroll">Payroll / bank</option>
                <option value="cash">Cash</option>
                <option value="invoice">Invoice</option>
              </select>
            </Field>
            <Field label="Pay day">
              <input className={inputCls} value={payDay} onChange={(e) => setPayDay(e.target.value)} placeholder="e.g. Thursday" />
            </Field>
          </div>

          <Field label="Timesheet method">
            <input className={inputCls} value={timesheetVia} onChange={(e) => setTimesheetVia(e.target.value)} placeholder="e.g. WhatsApp, Email Excel by Mon 9am, Invoice PDF" />
          </Field>

          <div>
            <div className="mb-1.5 flex items-center justify-between">
              <span className="text-xs font-medium text-zinc-400">Sites / venues</span>
              <button
                type="button"
                onClick={() => setSites((s) => [...s, { id: `st_${Date.now()}`, name: "", rate: "" }])}
                className="text-xs font-medium text-zinc-300 hover:text-white"
              >
                + Add site
              </button>
            </div>
            <div className="space-y-2">
              {sites.map((s, i) => (
                <div key={s.id} className="flex gap-2">
                  <input
                    className={inputCls}
                    value={s.name}
                    placeholder="Site name"
                    onChange={(e) => setSites((all) => all.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)))}
                  />
                  <input
                    className={cn(inputCls, "w-28 tabular-nums")}
                    type="number"
                    step={0.01}
                    value={s.rate}
                    placeholder="Rate ovr."
                    title="Optional site-specific rate"
                    onChange={(e) => setSites((all) => all.map((x, j) => (j === i ? { ...x, rate: e.target.value } : x)))}
                  />
                  <IconButton type="button" label="Remove site" className="h-10 w-10 shrink-0" onClick={() => setSites((all) => all.filter((_, j) => j !== i))}>
                    <X size={15} />
                  </IconButton>
                </div>
              ))}
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <Field label="Contact"><input className={inputCls} value={contactName} onChange={(e) => setContactName(e.target.value)} placeholder="Roster manager" /></Field>
            <Field label="Phone"><input className={inputCls} value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} placeholder="04xx xxx xxx" /></Field>
            <Field label="Timesheet email"><input type="email" className={inputCls} value={timesheetEmail} onChange={(e) => setTimesheetEmail(e.target.value)} /></Field>
          </div>

          {employer && (
            <label className="flex items-center gap-2 text-sm text-zinc-400">
              <input type="checkbox" className="accent-zinc-300" checked={archived} onChange={(e) => setArchived(e.target.checked)} />
              Archive (hide from new shifts, keep history)
            </label>
          )}

          {error && <p className="rounded-lg bg-rose-500/10 px-3 py-2 text-sm text-rose-300">{error}</p>}
        </div>

        <footer className="flex items-center justify-between gap-2 border-t border-zinc-800 px-5 py-3">
          {employer ? (
            <Button type="button" variant="danger" onClick={remove}><Trash2 size={15} /> Delete</Button>
          ) : <span />}
          <div className="flex gap-2">
            <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
            <Button type="submit" variant="primary">{employer ? "Save" : "Add employer"}</Button>
          </div>
        </footer>
      </form>
    </div>
  );
}
