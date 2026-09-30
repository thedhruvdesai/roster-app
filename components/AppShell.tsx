"use client";

import { Building2, CalendarRange, ShieldCheck, Wallet } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { addDays, todayISO } from "@/lib/dates";
import { type Tab, useRoster } from "@/lib/store";
import type { ISODate, Shift } from "@/lib/types";
import { cn } from "@/lib/ui";
import { EmployersView } from "./EmployersView";
import { PaySummaryView } from "./PaySummaryView";
import { ShiftModal } from "./ShiftModal";
import { SummaryMetricsBar } from "./SummaryMetricsBar";
import { WeeklyRosterView } from "./WeeklyRosterView";

const TABS: { id: Tab; label: string; short: string; icon: typeof CalendarRange }[] = [
  { id: "roster", label: "Roster / Schedule", short: "Roster", icon: CalendarRange },
  { id: "pay", label: "Pay & Timesheets", short: "Pay", icon: Wallet },
  { id: "employers", label: "Employers & Sites", short: "Employers", icon: Building2 },
];

/** Waits for zustand to rehydrate from LocalStorage so SSR markup never mismatches */
function useHydrated() {
  const [ok, setOk] = useState(false);
  useEffect(() => {
    const unsub = useRoster.persist.onFinishHydration(() => setOk(true));
    if (useRoster.persist.hasHydrated()) setOk(true);
    return unsub;
  }, []);
  return ok;
}

export function AppShell() {
  const hydrated = useHydrated();
  const tab = useRoster((s) => s.tab);
  const setTab = useRoster((s) => s.setTab);
  const weekStart = useRoster((s) => s.weekStart);
  const recurring = useRoster((s) => s.recurring);
  const employers = useRoster((s) => s.employers);
  const ensureRecurring = useRoster((s) => s.ensureRecurring);

  // Materialise fixed-roster shifts for the viewed fortnight either side
  useEffect(() => {
    if (hydrated) ensureRecurring(addDays(weekStart, -14), addDays(weekStart, 20));
  }, [hydrated, weekStart, recurring, employers, ensureRecurring]);

  const [modal, setModal] = useState<{ open: boolean; shift: Shift | null; date: ISODate }>({
    open: false,
    shift: null,
    date: todayISO(),
  });
  const openAdd = useCallback((date: ISODate) => setModal({ open: true, shift: null, date }), []);
  const openEdit = useCallback((shift: Shift) => setModal({ open: true, shift, date: shift.date }), []);
  const close = useCallback(() => setModal((m) => ({ ...m, open: false })), []);

  return (
    <div className="min-h-dvh">
      <header className="sticky top-0 z-40 border-b border-zinc-800/80 bg-zinc-950/85 backdrop-blur">
        <div className="mx-auto flex max-w-[1500px] items-center gap-4 px-4 sm:px-6">
          <div className="flex items-center gap-2 py-3">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-zinc-100 text-zinc-900">
              <ShieldCheck size={18} />
            </span>
            <div className="hidden leading-tight sm:block">
              <p className="text-sm font-semibold">ShiftDesk</p>
              <p className="text-[11px] text-zinc-500">Roster · Fatigue · Pay</p>
            </div>
          </div>

          <nav className="-mb-px ml-auto flex overflow-x-auto sm:ml-6" aria-label="Main">
            {TABS.map(({ id, label, short, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setTab(id)}
                aria-current={tab === id ? "page" : undefined}
                className={cn(
                  "flex shrink-0 items-center gap-2 border-b-2 px-3 py-4 text-sm font-medium transition-colors",
                  tab === id ? "border-zinc-100 text-zinc-50" : "border-transparent text-zinc-500 hover:text-zinc-200"
                )}
              >
                <Icon size={16} />
                <span className="hidden md:inline">{label}</span>
                <span className="md:hidden">{short}</span>
              </button>
            ))}
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-[1500px] space-y-5 px-4 py-5 sm:px-6">
        {!hydrated ? (
          <Skeleton />
        ) : (
          <>
            {tab === "roster" && (
              <>
                <SummaryMetricsBar />
                <WeeklyRosterView onAdd={openAdd} onEdit={openEdit} />
              </>
            )}
            {tab === "pay" && <PaySummaryView onEdit={openEdit} />}
            {tab === "employers" && <EmployersView />}
          </>
        )}
      </main>

      {hydrated && <ShiftModal open={modal.open} shift={modal.shift} defaultDate={modal.date} onClose={close} />}
    </div>
  );
}

function Skeleton() {
  return (
    <div className="animate-pulse space-y-4" aria-busy="true" aria-label="Loading roster">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <div className="col-span-2 h-32 rounded-2xl bg-zinc-900" />
        <div className="h-32 rounded-2xl bg-zinc-900" />
        <div className="h-32 rounded-2xl bg-zinc-900" />
      </div>
      <div className="h-10 w-72 rounded-lg bg-zinc-900" />
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-7">
        {Array.from({ length: 7 }).map((_, i) => (
          <div key={i} className="h-40 rounded-2xl bg-zinc-900 xl:h-80" />
        ))}
      </div>
    </div>
  );
}
