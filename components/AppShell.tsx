"use client";

import { Building2, CalendarDays, Plus, Wallet } from "lucide-react";
import { Logo, LogoMark } from "./Logo";
import { MenuButton } from "./MenuSheet";
import { useCallback, useEffect, useRef, useState } from "react";
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

const TABS: { id: Tab; title: string; short: string; icon: typeof CalendarDays }[] = [
  { id: "roster", title: "Roster", short: "Roster", icon: CalendarDays },
  { id: "pay", title: "Pay & Timesheets", short: "Pay", icon: Wallet },
  { id: "employers", title: "Employers & Sites", short: "Employers", icon: Building2 },
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

  // iOS-style collapsing large title: the inline title fades in once the large one scrolls away
  const titleRef = useRef<HTMLHeadingElement>(null);
  const [collapsed, setCollapsed] = useState(false);
  useEffect(() => {
    const el = titleRef.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setCollapsed(!e.isIntersecting), { rootMargin: "-56px 0px 0px 0px" });
    io.observe(el);
    return () => io.disconnect();
  }, [hydrated, tab]);

  const changeTab = (t: Tab) => {
    setTab(t);
    window.scrollTo({ top: 0 });
  };

  const days = weekDays(weekStart);
  const addDate = days.includes(todayISO()) ? todayISO() : days[0];
  const current = TABS.find((t) => t.id === tab)!;

  return (
    <div className="min-h-dvh md:grid md:grid-cols-[260px_1fr]">
      {/* Mac / iPad: sidebar */}
      <aside className="sticky top-0 hidden h-dvh flex-col bg-zinc-925 px-3 pb-6 pt-6 md:flex" style={{ boxShadow: "inset -0.5px 0 0 rgb(84 84 88 / 0.65)" }}>
        <div className="mb-7 px-2">
          <Logo size={34} />
        </div>
        <nav className="space-y-0.5" aria-label="Main">
          {TABS.map(({ id, title, icon: Icon }) => (
            <button
              key={id}
              onClick={() => changeTab(id)}
              aria-current={tab === id ? "page" : undefined}
              className={cn(
                "flex w-full items-center gap-3 rounded-[10px] px-2.5 py-2 text-left text-[15px] transition-colors",
                tab === id ? "bg-zinc-800 font-semibold text-zinc-50" : "text-zinc-300 hover:bg-zinc-900"
              )}
            >
              <Icon size={19} className={tab === id ? "text-vest" : "text-zinc-400"} />
              {title}
            </button>
          ))}
        </nav>
        {hydrated && (
          <button
            onClick={() => openAdd(addDate)}
            className="mt-auto flex h-11 items-center justify-center gap-2 rounded-full bg-vest text-[17px] font-semibold text-vest-ink active:opacity-70"
          >
            <Plus size={19} strokeWidth={2.6} /> New Shift
          </button>
        )}
      </aside>

      <div className="min-w-0">
        {/* Phone: translucent nav bar with inline title once scrolled */}
        <header className={cn("material sticky top-0 z-40 pt-[env(safe-area-inset-top)] transition-shadow md:hidden", collapsed && "hairline")}>
          <div className="relative flex h-11 items-center justify-center px-4">
            <LogoMark size={26} className="absolute left-4" />
            {hydrated && <MenuButton onNewShift={() => openAdd(addDate)} className="absolute right-2" />}
            <span className={cn("text-[17px] font-semibold text-zinc-50 transition-opacity", collapsed ? "opacity-100" : "opacity-0")}>
              {current.short}
            </span>
          </div>
        </header>

        <main className="mx-auto max-w-[1200px] px-4 pb-[calc(8rem+env(safe-area-inset-bottom))] sm:px-6 md:px-10 md:pb-12 md:pt-8">
          <div className="mb-4 mt-1 flex items-center justify-between gap-4 md:mb-6 md:mt-0">
            <h1 ref={titleRef} className="large-title text-zinc-50">
              {current.title}
            </h1>
            {hydrated && <MenuButton onNewShift={() => openAdd(addDate)} className="hidden md:flex" />}
          </div>
          {!hydrated ? (
            <Skeleton />
          ) : (
            <div className="space-y-6">
              {tab === "roster" && (
                <>
                  <SummaryMetricsBar />
                  <WeeklyRosterView onAdd={openAdd} onEdit={openEdit} />
                </>
              )}
              {tab === "pay" && <PaySummaryView onEdit={openEdit} />}
              {tab === "employers" && <EmployersView />}
            </div>
          )}
        </main>
      </div>

      {/* Phone: floating add */}
      {hydrated && tab === "roster" && !modal.open && (
        <button
          onClick={() => openAdd(addDate)}
          aria-label="New shift"
          className="fixed bottom-[calc(5.5rem+env(safe-area-inset-bottom))] right-4 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-vest text-vest-ink shadow-[0_8px_24px_rgb(0_0_0/0.5)] active:scale-95 md:hidden"
        >
          <Plus size={26} strokeWidth={2.6} />
        </button>
      )}

      {/* Phone: iOS tab bar */}
      <nav className="material hairline-t pb-safe fixed inset-x-0 bottom-0 z-40 md:hidden" aria-label="Main">
        <div className="grid h-[50px] grid-cols-3">
          {TABS.map(({ id, short, icon: Icon }) => (
            <button
              key={id}
              onClick={() => changeTab(id)}
              aria-current={tab === id ? "page" : undefined}
              className={cn("flex flex-col items-center justify-center gap-0.5 pt-1 text-[10px] font-medium", tab === id ? "text-vest" : "text-zinc-500")}
            >
              <Icon size={24} strokeWidth={tab === id ? 2.2 : 1.8} />
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
      <div className="h-44 rounded-2xl bg-zinc-900" />
      <div className="h-24 rounded-2xl bg-zinc-900" />
      <div className="space-y-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-16 rounded-2xl bg-zinc-900" />
        ))}
      </div>
    </div>
  );
}
