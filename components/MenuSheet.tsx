"use client";

import { Building2, CalendarDays, Check, Download, Plus, Smartphone, Wallet, X } from "lucide-react";
import { type ReactNode, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { type Tab, useRoster } from "@/lib/store";
import { toast } from "@/lib/toast";
import { cn } from "@/lib/ui";
import { Logo } from "./Logo";

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
  const { tab, setTab, employers, shifts, recurring } = useRoster();
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

  const doInstall = async () => {
    if (!install) return;
    await install.prompt();
    await install.userChoice;
    setInstall(null);
  };

  return (
    <div className="fixed inset-0 z-[70]" role="dialog" aria-modal="true" aria-label="Menu">
      <div className="backdrop-in absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <aside className="menu-in pb-safe absolute inset-y-0 right-0 flex w-[min(340px,88vw)] flex-col bg-zinc-900 pt-[env(safe-area-inset-top)] shadow-2xl">
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

        <div className="space-y-1 px-3">
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
