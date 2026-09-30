"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { addDays, startOfWeek, todayISO } from "./dates";
import { DEFAULT_EMPLOYERS, DEFAULT_RECURRING } from "./mock";
import { calcShift } from "./pay";
import type { Employer, ISODate, PaymentStatus, RecurringShift, Shift, WeekNote } from "./types";

export type Tab = "roster" | "pay" | "employers";

const uid = (p: string) =>
  `${p}_${typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID().slice(0, 8) : Math.random().toString(36).slice(2, 10)}`;

export type ShiftInput = Omit<Shift, "id" | "createdAt" | "updatedAt">;
const skipKey = (recId: string, date: ISODate) => `${recId}|${date}`;

interface RosterState {
  employers: Employer[];
  shifts: Shift[];
  recurring: RecurringShift[];
  /** "recurringId|date" occurrences the user deleted, so they aren't regenerated */
  skipped: string[];
  weekNotes: Record<ISODate, WeekNote>;

  tab: Tab;
  weekStart: ISODate;

  setTab: (t: Tab) => void;
  setWeek: (iso: ISODate) => void;
  shiftWeek: (delta: number) => void;
  goToCurrentWeek: () => void;

  addShift: (s: ShiftInput) => string;
  updateShift: (id: string, patch: Partial<ShiftInput>) => void;
  deleteShift: (id: string) => void;
  duplicateShift: (id: string, dayOffset?: number) => string | null;
  setShiftStatus: (ids: string[], status: PaymentStatus) => void;

  /** Creates any missing fixed-roster shifts between from and to (inclusive) */
  ensureRecurring: (from: ISODate, to: ISODate) => void;
  upsertRecurring: (r: Omit<RecurringShift, "id"> & { id?: string }) => void;
  deleteRecurring: (id: string) => void;

  upsertEmployer: (e: Omit<Employer, "id"> & { id?: string }) => string;
  deleteEmployer: (id: string) => { ok: boolean; reason?: string };

  setWeekNote: (weekStart: ISODate, patch: Partial<Omit<WeekNote, "weekStart">>) => void;

  resetToDefaults: () => void;
  clearAll: () => void;
}

function defaults() {
  return { employers: DEFAULT_EMPLOYERS, recurring: DEFAULT_RECURRING, shifts: [] as Shift[], skipped: [] as string[], weekNotes: {} };
}

/** Future, untouched, still-scheduled occurrences of a pattern — safe to regenerate */
const isRegenerable = (s: Shift, recId: string, today: ISODate) =>
  s.recurringId === recId && !s.customised && s.status === "scheduled" && s.date >= today;

export const useRoster = create<RosterState>()(
  persist(
    (set, get) => ({
      ...defaults(),
      tab: "roster",
      weekStart: startOfWeek(todayISO()),

      setTab: (tab) => set({ tab }),
      setWeek: (iso) => set({ weekStart: startOfWeek(iso) }),
      shiftWeek: (delta) => set({ weekStart: addDays(get().weekStart, delta * 7) }),
      goToCurrentWeek: () => set({ weekStart: startOfWeek(todayISO()) }),

      addShift: (input) => {
        const id = uid("sh");
        const now = Date.now();
        set((s) => ({ shifts: [...s.shifts, { ...input, id, createdAt: now, updatedAt: now }] }));
        return id;
      },
      updateShift: (id, patch) =>
        set((s) => ({
          shifts: s.shifts.map((x) =>
            x.id === id ? { ...x, ...patch, customised: x.recurringId ? true : x.customised, updatedAt: Date.now() } : x
          ),
        })),
      deleteShift: (id) =>
        set((s) => {
          const sh = s.shifts.find((x) => x.id === id);
          return {
            shifts: s.shifts.filter((x) => x.id !== id),
            skipped: sh?.recurringId ? [...s.skipped, skipKey(sh.recurringId, sh.date)] : s.skipped,
          };
        }),
      duplicateShift: (id, dayOffset = 1) => {
        const src = get().shifts.find((x) => x.id === id);
        if (!src) return null;
        const { id: _i, createdAt: _c, updatedAt: _u, recurringId: _r, customised: _cu, ...rest } = src;
        return get().addShift({ ...rest, date: addDays(src.date, dayOffset), status: "scheduled" });
      },
      setShiftStatus: (ids, status) =>
        set((s) => ({
          shifts: s.shifts.map((x) => (ids.includes(x.id) ? { ...x, status, updatedAt: Date.now() } : x)),
        })),

      ensureRecurring: (from, to) => {
        const { recurring, shifts, skipped, employers } = get();
        const skip = new Set(skipped);
        const have = new Set(shifts.filter((s) => s.recurringId).map((s) => skipKey(s.recurringId!, s.date)));
        const now = Date.now();
        const created: Shift[] = [];

        for (const r of recurring) {
          if (!r.active || !r.weekdays.length) continue;
          const emp = employers.find((e) => e.id === r.employerId);
          if (!emp) continue;
          let d = from < r.startDate ? r.startDate : from;
          const last = r.endDate && r.endDate < to ? r.endDate : to;
          for (; d <= last; d = addDays(d, 1)) {
            const dow = (new Date(d + "T00:00:00").getDay() + 6) % 7;
            if (!r.weekdays.includes(dow as RecurringShift["weekdays"][number])) continue;
            const key = skipKey(r.id, d);
            if (skip.has(key) || have.has(key)) continue;
            const rate = r.hourlyRate ?? resolveRate(employers, r.employerId, r.site);
            const base = { date: d, start: r.start, end: r.end, breakMins: r.breakMins, hourlyRate: rate };
            created.push({
              id: uid("sh"),
              employerId: r.employerId,
              site: r.site,
              ...base,
              status: calcShift(base).endAt.getTime() < now ? "worked" : "scheduled",
              notes: r.notes,
              recurringId: r.id,
              createdAt: now,
              updatedAt: now,
            });
            have.add(key);
          }
        }
        if (created.length) set((s) => ({ shifts: [...s.shifts, ...created] }));
      },

      upsertRecurring: (r) => {
        const id = r.id ?? uid("rec");
        const today = todayISO();
        set((s) => {
          const next = { ...r, id } as RecurringShift;
          const exists = s.recurring.some((x) => x.id === id);
          return {
            recurring: exists ? s.recurring.map((x) => (x.id === id ? next : x)) : [...s.recurring, next],
            // Drop untouched future occurrences so they regenerate with the new pattern
            shifts: s.shifts.filter((x) => !isRegenerable(x, id, today)),
          };
        });
      },
      deleteRecurring: (id) => {
        const today = todayISO();
        set((s) => ({
          recurring: s.recurring.filter((x) => x.id !== id),
          // Past and hand-edited shifts stay as history; future generated ones go
          shifts: s.shifts
            .filter((x) => !isRegenerable(x, id, today))
            .map((x) => (x.recurringId === id ? { ...x, recurringId: undefined, customised: undefined } : x)),
          skipped: s.skipped.filter((k) => !k.startsWith(`${id}|`)),
        }));
      },

      upsertEmployer: (e) => {
        const id = e.id ?? uid("emp");
        set((s) => {
          const exists = s.employers.some((x) => x.id === id);
          const next = { ...e, id } as Employer;
          return { employers: exists ? s.employers.map((x) => (x.id === id ? next : x)) : [...s.employers, next] };
        });
        return id;
      },
      deleteEmployer: (id) => {
        const used = get().shifts.filter((s) => s.employerId === id).length;
        const rec = get().recurring.filter((r) => r.employerId === id).length;
        if (used || rec)
          return {
            ok: false,
            reason: `${used ? `${used} shift${used > 1 ? "s" : ""}` : ""}${used && rec ? " and " : ""}${rec ? `${rec} fixed roster pattern${rec > 1 ? "s" : ""}` : ""} still use this employer. Archive it instead.`,
          };
        set((s) => ({ employers: s.employers.filter((x) => x.id !== id) }));
        return { ok: true };
      },

      setWeekNote: (weekStart, patch) =>
        set((s) => {
          const prev = s.weekNotes[weekStart] ?? { weekStart, text: "", timesheetSubmitted: false, updatedAt: 0 };
          return { weekNotes: { ...s.weekNotes, [weekStart]: { ...prev, ...patch, updatedAt: Date.now() } } };
        }),

      resetToDefaults: () => set({ ...defaults(), weekStart: startOfWeek(todayISO()) }),
      clearAll: () => set({ shifts: [], skipped: [], weekNotes: {} }),
    }),
    {
      // v2 key: starts fresh with real employers instead of the old demo data
      name: "shiftdesk-roster-v2",
      version: 2,
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({
        employers: s.employers,
        shifts: s.shifts,
        recurring: s.recurring,
        skipped: s.skipped,
        weekNotes: s.weekNotes,
        tab: s.tab,
      }),
      merge: (persisted, current) => ({ ...current, ...(persisted as object), weekStart: startOfWeek(todayISO()) }),
    }
  )
);

/** Resolves the default rate for an employer + site combination */
export function resolveRate(employers: Employer[], employerId: string, siteName?: string): number {
  const emp = employers.find((e) => e.id === employerId);
  if (!emp) return 0;
  const site = emp.sites.find((s) => s.name === siteName);
  return site?.rateOverride ?? emp.defaultRate;
}
