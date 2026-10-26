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

          <nav className="hidden items-center gap-1 rounded-full bg-zinc-900 p-1 md:flex" aria-label="Main">
            {TABS.map(({ id, title }) => (
              <button
                key={id}
                onClick={() => changeTab(id)}
                aria-current={tab === id ? "page" : undefined}
                className={cn(
                  "h-9 rounded-full px-4 text-[14px] font-medium transition-colors",
                  tab === id ? "bg-zinc-50 text-zinc-950" : "text-zinc-400 hover:text-zinc-100"
                )}
              >
                {title}
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
                <SummaryMetricsBar onAdd={() => openAdd(addDate)} onEdit={openEdit} onNav={changeTab} />
                <WeeklyRosterView onAdd={openAdd} onEdit={openEdit} />
              </>
            )}
            {tab === "pay" && <PaySummaryView onEdit={openEdit} />}
            {tab === "employers" && <EmployersView />}
          </div>
        )}
      </main>

      {/* Phone: floating capsule nav. Active icon sits in a conic ring; add sits in the middle. */}
      {!modal.open && (
        <nav className="pb-safe fixed inset-x-0 bottom-3 z-40 flex justify-center md:hidden" aria-label="Main">
          <div className="flex items-center gap-1.5 rounded-full bg-zinc-900/90 p-1.5 shadow-[0_20px_50px_-12px_rgb(0_0_0/0.9)] ring-1 ring-white/[0.06] backdrop-blur-xl">
            {[TABS[0], TABS[1], null, TABS[2]].map((t, i) =>
              t ? (
                <button
                  key={t.id}
                  onClick={() => changeTab(t.id)}
                  aria-label={t.title}
                  aria-current={tab === t.id ? "page" : undefined}
                  className={cn("relative flex h-12 w-12 items-center justify-center rounded-full", tab === t.id ? "ring-active p-[1.5px]" : "")}
                >
                  <span className={cn("flex h-full w-full items-center justify-center rounded-full", tab === t.id ? "bg-zinc-900 text-zinc-50" : "bg-zinc-800 text-zinc-400")}>
                    <t.icon size={20} strokeWidth={tab === t.id ? 2.2 : 1.8} />
                  </span>
                </button>
              ) : (
                <button
                  key={`add-${i}`}
                  onClick={() => hydrated && openAdd(addDate)}
                  aria-label="New shift"
                  className="bg-vest flex h-12 w-12 items-center justify-center rounded-full text-vest-ink active:scale-95"
                >
                  <Plus size={22} strokeWidth={2.6} />
                </button>
              )
            )}
          </div>
        </nav>
      )}

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
