"use client";

import { Building2, CalendarRange, Plus, ShieldCheck, Wallet } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { addDays, todayISO, weekDays } from "@/lib/dates";
import { type Tab, useRoster } from "@/lib/store";
import type { ISODate, Shift } from "@/lib/types";
import { cn } from "@/lib/ui";
import { EmployersView } from "./EmployersView";
import { PaySummaryView } from "./PaySummaryView";
import { ShiftModal } from "./ShiftModal";
import { SummaryMetricsBar } from "./SummaryMetricsBar";
import { Toaster } from "./Toaster";
import { WeeklyRosterView } from "./WeeklyRosterView";

const TABS: { id: Tab; label: string; short: string; icon: typeof CalendarRange }[] = [
  { id: "roster", label: "Roster", short: "Roster", icon: CalendarRange },
  { id: "pay", label: "Pay & timesheets", short: "Pay", icon: Wallet },
  { id: "employers", label: "Employers & sites", short: "Employers", icon: Building2 },
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

  const changeTab = (t: Tab) => {
    setTab(t);
    window.scrollTo({ top: 0 });
  };

  const days = weekDays(weekStart);
  const addDate = days.includes(todayISO()) ? todayISO() : days[0];

  return (
    <div className="min-h-dvh">
      <header className="sticky top-0 z-40 border-b border-zinc-800/80 bg-zinc-950/90 pt-[env(safe-area-inset-top)] backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-[1500px] items-center gap-4 px-4 sm:px-6 md:h-16">
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-vest text-vest-ink">
              <ShieldCheck size={19} strokeWidth={2.4} />
            </span>
            <p className="font-display text-2xl font-semibold tracking-tight text-zinc-50">ShiftDesk</p>
          </div>

          {/* Desktop tabs */}
          <nav className="ml-8 hidden h-full md:flex" aria-label="Main">
            {TABS.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => changeTab(id)}
                aria-current={tab === id ? "page" : undefined}
                className={cn(
                  "flex h-full items-center gap-2 border-b-2 px-4 text-[15px] font-medium transition-colors",
                  tab === id ? "border-vest text-zinc-50" : "border-transparent text-zinc-400 hover:text-zinc-100"
                )}
              >
                <Icon size={17} />
                {label}
              </button>
            ))}
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-[1500px] space-y-5 px-4 pb-[calc(7rem+env(safe-area-inset-bottom))] pt-4 sm:px-6 md:pb-10 md:pt-6">
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

      {/* Mobile: floating add, within thumb reach */}
      {hydrated && tab === "roster" && !modal.open && (
        <button
          onClick={() => openAdd(addDate)}
          className="fixed bottom-[calc(4.75rem+env(safe-area-inset-bottom))] right-4 z-40 flex h-14 items-center gap-2 rounded-2xl bg-vest pl-4 pr-5 font-semibold text-vest-ink shadow-xl shadow-black/40 active:scale-95 md:hidden"
        >
          <Plus size={20} strokeWidth={2.6} /> Add shift
        </button>
      )}

      {/* Mobile bottom tab bar */}
      <nav
        className="pb-safe fixed inset-x-0 bottom-0 z-40 border-t border-zinc-800 bg-zinc-950/95 backdrop-blur-md md:hidden"
        aria-label="Main"
      >
        <div className="grid h-16 grid-cols-3">
          {TABS.map(({ id, short, icon: Icon }) => (
            <button
              key={id}
              onClick={() => changeTab(id)}
              aria-current={tab === id ? "page" : undefined}
              className={cn("relative flex flex-col items-center justify-center gap-1 text-xs font-medium", tab === id ? "text-zinc-50" : "text-zinc-500")}
            >
              {tab === id && <span className="absolute top-0 h-0.5 w-10 rounded-full bg-vest" />}
              <Icon size={22} strokeWidth={tab === id ? 2.3 : 1.8} className={tab === id ? "text-vest" : ""} />
              {short}
            </button>
          ))}
        </div>
      </nav>

      {hydrated && <ShiftModal open={modal.open} shift={modal.shift} defaultDate={modal.date} onClose={close} />}
      <Toaster />
    </div>
  );
}

function Skeleton() {
  return (
    <div className="animate-pulse space-y-4" aria-busy="true" aria-label="Loading roster">
      <div className="h-36 rounded-xl bg-zinc-900" />
      <div className="h-10 w-72 rounded-lg bg-zinc-900" />
      <div className="space-y-2">
        {Array.from({ length: 7 }).map((_, i) => (
          <div key={i} className="h-16 rounded-xl bg-zinc-900" />
        ))}
      </div>
    </div>
  );
}
