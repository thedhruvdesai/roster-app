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
  const theme = useRoster((s) => s.theme);
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

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
    <div className="min-h-dvh">
      {/* Website-style top bar: logo, sections, primary action, menu */}
      <header className={cn("material sticky top-0 z-40 pt-[env(safe-area-inset-top)] transition-shadow", collapsed && "hairline")}>
        <div className="mx-auto flex h-12 max-w-[1280px] items-center gap-6 px-4 sm:px-6 md:h-16 md:px-10">
          <button onClick={() => changeTab("roster")} aria-label="ShiftDesk home" className="shrink-0">
            <span className="md:hidden"><LogoMark size={28} /></span>
            <span className="hidden md:inline-flex"><Logo size={32} /></span>
          </button>

          <nav className="hidden h-full items-center gap-1 md:flex" aria-label="Main">
            {TABS.map(({ id, title }) => (
              <button
                key={id}
                onClick={() => changeTab(id)}
                aria-current={tab === id ? "page" : undefined}
                className={cn(
                  "relative h-full px-3 text-[15px] transition-colors",
                  tab === id ? "font-medium text-zinc-50" : "text-zinc-400 hover:text-zinc-100"
                )}
              >
                {title}
                {tab === id && <span className="absolute inset-x-3 bottom-0 h-0.5 rounded-full bg-vest" />}
              </button>
            ))}
          </nav>

          {/* Phone: page name appears once the big title scrolls away */}
          <span className={cn("flex-1 text-center text-[17px] font-semibold text-zinc-50 transition-opacity md:hidden", collapsed ? "opacity-100" : "opacity-0")}>
            {current.short}
          </span>

          <div className="ml-auto flex items-center gap-2">
            {hydrated && (
              <button
                onClick={() => openAdd(addDate)}
                className="bg-vest hidden h-10 items-center gap-2 rounded-full px-5 text-[15px] font-semibold text-vest-ink active:opacity-70 md:inline-flex"
              >
                <Plus size={18} strokeWidth={2.6} /> New shift
              </button>
            )}
            {hydrated && <MenuButton onNewShift={() => openAdd(addDate)} />}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1280px] px-4 pb-[calc(8rem+env(safe-area-inset-bottom))] sm:px-6 md:px-10 md:pb-16 md:pt-6">
        {/* On the roster the hero carries the page, so its title is for screen readers */}
        <h1 ref={titleRef} className={cn("large-title mb-5 mt-3 text-zinc-50 md:mb-8 md:mt-6", tab === "roster" && "sr-only")}>
          {current.title}
        </h1>
        {!hydrated ? (
          <Skeleton />
        ) : (
          <div className="space-y-10">
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
