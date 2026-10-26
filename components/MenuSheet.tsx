"use client";

import { Bell, BellOff, Building2, CalendarDays, CalendarPlus, Check, Download, Plus, Smartphone, Volume2, Wallet, X } from "lucide-react";
import { addDays, todayISO } from "@/lib/dates";
import { calcShift } from "@/lib/pay";
import { LEAD_OPTIONS, askPermission, buildIcs, downloadIcs, fmtLead, notificationsSupported, playChime, registerWorker, showNotification, unlockAudio } from "@/lib/reminders";
import { type ReactNode, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { type Tab, useRoster } from "@/lib/store";
import { toast } from "@/lib/toast";
import { cn } from "@/lib/ui";
import { Logo } from "./Logo";
import { THEMES } from "@/lib/themes";

type InstallEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };

const NAV: { id: Tab; title: string; icon: typeof CalendarDays }[] = [
  { id: "roster", title: "Roster", icon: CalendarDays },
  { id: "pay", title: "Pay & Timesheets", icon: Wallet },
  { id: "employers", title: "Employers & Sites", icon: Building2 },
];

/** Hamburger button + right-hand menu panel */
export function MenuButton({ onNewShift, className }: { onNewShift: () => void; className?: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        onClick={() => setOpen(true)}
        aria-label="Open menu"
        aria-expanded={open}
        className={cn("flex h-10 w-10 items-center justify-center rounded-full text-zinc-50 active:opacity-60 hover:bg-zinc-800", className)}
      >
        {/* Two-line hamburger, drawn so it optically matches the SF symbol weight */}
        <svg width="22" height="22" viewBox="0 0 22 22" aria-hidden>
          <path d="M3 7.5h16M3 14.5h11" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
      </button>
      {open && createPortal(<MenuSheet onClose={() => setOpen(false)} onNewShift={onNewShift} />, document.body)}
    </>
  );
}

function MenuSheet({ onClose, onNewShift }: { onClose: () => void; onNewShift: () => void }) {
  const { tab, setTab, employers, shifts, recurring, theme, setTheme, reminders, setReminders, ensureRecurring } = useRoster();
  const [perm, setPerm] = useState<string>("default");
  useEffect(() => setPerm(notificationsSupported() ? Notification.permission : "unsupported"), []);
  const [install, setInstall] = useState<InstallEvent | null>(null);
  const [standalone, setStandalone] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    setStandalone(window.matchMedia("(display-mode: standalone)").matches);
    const w = window as Window & { __installPrompt?: InstallEvent };
    if (w.__installPrompt) setInstall(w.__installPrompt);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  const go = (t: Tab) => {
    setTab(t);
    window.scrollTo({ top: 0 });
    onClose();
  };

  const backup = () => {
    const blob = new Blob([JSON.stringify({ employers, shifts, recurring, exportedAt: new Date().toISOString() }, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `shiftdesk-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
    toast("Backup downloaded");
  };

  const toggleReminders = async () => {
    unlockAudio();
    if (reminders.enabled) {
      setReminders({ enabled: false });
      toast("Shift reminders off");
      return;
    }
    await registerWorker();
    const p = await askPermission();
    setPerm(p);
    setReminders({ enabled: true });
    toast(p === "granted" ? `Reminders on: ${fmtLead(reminders.lead)} before each shift` : "Reminders on inside the app. Allow notifications to get alerts outside it.");
  };

  const testReminder = async () => {
    unlockAudio();
    if (reminders.sound) playChime();
    const shown = await showNotification("Shift in 1 h: Test", "This is how your shift reminder will look and sound", "test");
    toast(shown ? "Test reminder sent" : "Test reminder (notifications are off for this browser)");
  };

  const exportCalendar = () => {
    const from = todayISO();
    const to = addDays(from, 28);
    ensureRecurring(from, to);
    const now = Date.now();
    const list = useRoster
      .getState()
      .shifts.filter((s) => s.status === "scheduled" && s.date >= from && s.date <= to && calcShift(s).startAt.getTime() > now)
      .sort((a, b) => calcShift(a).startAt.getTime() - calcShift(b).startAt.getTime());
    if (!list.length) return toast("No upcoming shifts in the next 4 weeks");
    downloadIcs(buildIcs(list, employers, reminders.lead));
    toast(`${list.length} shifts saved for your calendar, alarm ${fmtLead(reminders.lead)} before`);
  };

  const doInstall = async () => {
    if (!install) return;
    await install.prompt();
    await install.userChoice;
    setInstall(null);
  };

  return (
    <div className="fixed inset-0 z-[70]" role="dialog" aria-modal="true" aria-label="Menu">
      <div className="backdrop-in absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <aside className="menu-in pb-safe absolute inset-y-0 right-0 flex w-[min(340px,88vw)] flex-col overflow-y-auto overscroll-contain bg-zinc-900 pt-[env(safe-area-inset-top)] shadow-2xl">
        <div className="flex items-center justify-between px-5 py-4">
          <Logo size={30} />
          <button onClick={onClose} aria-label="Close menu" className="flex h-9 w-9 items-center justify-center rounded-full bg-zinc-800 text-zinc-300 active:opacity-60">
            <X size={18} />
          </button>
        </div>

        <nav className="px-3" aria-label="Main">
          {NAV.map(({ id, title, icon: Icon }) => (
            <button
              key={id}
              onClick={() => go(id)}
              className={cn("flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-[17px]", tab === id ? "bg-zinc-800 font-semibold text-zinc-50" : "text-zinc-200 active:bg-zinc-800")}
            >
              <Icon size={21} className={tab === id ? "text-vest" : "text-zinc-400"} />
              <span className="flex-1">{title}</span>
              {tab === id && <Check size={18} className="text-vest" />}
            </button>
          ))}
        </nav>

        <div className="mx-5 my-4 h-px bg-zinc-700/60" />

        <section className="px-5" aria-label="Theme">
          <p className="mb-2.5 text-[13px] font-semibold text-zinc-400">Theme</p>
          <div className="grid grid-cols-5 gap-2">
            {THEMES.map((t) => (
              <button
                key={t.id}
                onClick={() => setTheme(t.id)}
                aria-pressed={theme === t.id}
                aria-label={`${t.name}: ${t.blurb}`}
                className="group flex flex-col items-center gap-1.5"
              >
                <span
                  className={cn("relative h-11 w-11 rounded-full transition-transform group-active:scale-90", theme === t.id ? "ring-2 ring-offset-2 ring-offset-zinc-900" : "ring-1 ring-white/10")}
                  style={{ background: `radial-gradient(circle at 30% 25%, ${t.metal[0]}, ${t.metal[1]} 45%, ${t.metal[2]} 70%, ${t.ramp[9]} 71%)`, ...(theme === t.id ? { ["--tw-ring-color" as string]: t.accent } : {}) }}
                >
                  {theme === t.id && <Check size={16} className="absolute inset-0 m-auto" style={{ color: t.ink }} strokeWidth={3} />}
                </span>
                <span className={cn("text-[11px] leading-tight", theme === t.id ? "font-semibold text-zinc-50" : "text-zinc-400")}>{t.name}</span>
              </button>
            ))}
          </div>
          <p className="mt-2 text-[13px] text-zinc-500">{THEMES.find((t) => t.id === theme)?.blurb}</p>
        </section>

        <div className="mx-5 my-4 h-px bg-zinc-700/60" />

        <section className="px-5" aria-label="Shift reminders">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[15px] font-semibold text-zinc-50">Shift reminders</p>
              <p className="text-[13px] leading-snug text-zinc-500">
                {reminders.enabled
                  ? perm === "granted"
                    ? "Sound and notification before each shift"
                    : perm === "denied"
                      ? "Notifications blocked: sound and banner in the app only"
                      : "Sound and banner while ShiftDesk is open"
                  : "Off"}
              </p>
            </div>
            <button
              role="switch"
              aria-checked={reminders.enabled}
              aria-label="Shift reminders"
              onClick={toggleReminders}
              className={cn("relative h-[31px] w-[51px] shrink-0 rounded-full transition-colors", reminders.enabled ? "bg-[#30D158]" : "bg-zinc-700")}
            >
              <span className={cn("absolute left-0 top-0.5 h-[27px] w-[27px] rounded-full bg-white shadow transition-transform", reminders.enabled ? "translate-x-[22px]" : "translate-x-0.5")} />
            </button>
          </div>

          <p className="mb-2 mt-3 text-[13px] font-semibold text-zinc-400">Remind me</p>
          <div className="grid grid-cols-4 gap-1.5 rounded-full bg-zinc-800 p-1">
            {LEAD_OPTIONS.map((m) => (
              <button
                key={m}
                onClick={() => setReminders({ lead: m })}
                aria-pressed={reminders.lead === m}
                className={cn("h-8 rounded-full text-[13px] font-semibold", reminders.lead === m ? "bg-zinc-50 text-zinc-950" : "text-zinc-400")}
              >
                {fmtLead(m)}
              </button>
            ))}
          </div>
          <p className="mt-1.5 text-[12px] text-zinc-500">before the shift starts</p>

          <div className="mt-3 flex gap-2">
            <button
              onClick={() => setReminders({ sound: !reminders.sound })}
              aria-pressed={reminders.sound}
              className={cn("flex h-9 items-center gap-1.5 rounded-full px-3.5 text-[13px] font-semibold", reminders.sound ? "bg-zinc-50 text-zinc-950" : "bg-zinc-800 text-zinc-400")}
            >
              {reminders.sound ? <Volume2 size={15} /> : <BellOff size={15} />} Sound {reminders.sound ? "on" : "off"}
            </button>
            <button onClick={testReminder} className="flex h-9 items-center gap-1.5 rounded-full bg-zinc-800 px-3.5 text-[13px] font-semibold text-zinc-50 active:opacity-60">
              <Bell size={15} /> Test
            </button>
          </div>
        </section>

        <div className="mx-5 my-4 h-px bg-zinc-700/60" />

        <div className="space-y-1 px-3">
          <MenuAction
            icon={<CalendarPlus size={20} />}
            label="Add shifts to phone calendar"
            hint={`Next 4 weeks, alarm ${fmtLead(reminders.lead)} before. Rings even when ShiftDesk is closed`}
            onClick={exportCalendar}
          />
          <MenuAction icon={<Plus size={20} />} label="New shift" onClick={() => { onClose(); onNewShift(); }} />
          <MenuAction icon={<Download size={20} />} label="Download backup" hint="Saves your shifts and employers as a file" onClick={backup} />
          {!standalone && (
            <MenuAction
              icon={<Smartphone size={20} />}
              label={install ? "Install app" : "Add to Home Screen"}
              hint={install ? "Opens full screen, like a normal app" : "Browser menu, then Add to Home Screen"}
              onClick={install ? doInstall : undefined}
            />
          )}
        </div>

        <p className="mt-auto px-5 py-5 text-[13px] leading-snug text-zinc-500">
          Your roster is saved on this device only. Download a backup before clearing your browser.
        </p>
      </aside>
    </div>
  );
}

function MenuAction({ icon, label, hint, onClick }: { icon: ReactNode; label: string; hint?: string; onClick?: () => void }) {
  return (
    <button
      onClick={onClick}
      disabled={!onClick}
      className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left active:bg-zinc-800 disabled:cursor-default"
    >
      <span className="flex h-9 w-9 items-center justify-center rounded-[10px] bg-zinc-800 text-vest">{icon}</span>
      <span>
        <span className="block text-[17px] text-zinc-50">{label}</span>
        {hint && <span className="block text-[13px] text-zinc-400">{hint}</span>}
      </span>
    </button>
  );
}
