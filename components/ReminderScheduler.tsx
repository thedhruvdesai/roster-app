"use client";

import { useEffect } from "react";
import { addDays, todayISO } from "@/lib/dates";
import { describeShift, fmtLead, playChime, registerWorker, showNotification } from "@/lib/reminders";
import { useRoster } from "@/lib/store";
import { toast } from "@/lib/toast";

const FIRED_KEY = "shiftdesk-reminded";
const WINDOW_MS = 48 * 3_600_000;

function readFired(): string[] {
  try {
    return JSON.parse(localStorage.getItem(FIRED_KEY) || "[]");
  } catch {
    return [];
  }
}
function markFired(key: string) {
  try {
    // keep the list short: only the latest 60 reminders
    localStorage.setItem(FIRED_KEY, JSON.stringify([...readFired().filter((k) => k !== key), key].slice(-60)));
  } catch {
    /* storage unavailable */
  }
}

/**
 * Rings and notifies before each scheduled shift while ShiftDesk is open
 * (or recently in the background). Phone calendar export covers the app being closed.
 */
export function ReminderScheduler() {
  const shifts = useRoster((s) => s.shifts);
  const employers = useRoster((s) => s.employers);
  const settings = useRoster((s) => s.reminders);
  const ensureRecurring = useRoster((s) => s.ensureRecurring);

  useEffect(() => {
    if (settings.enabled) {
      void registerWorker();
      ensureRecurring(todayISO(), addDays(todayISO(), 14));
    }
  }, [settings.enabled, ensureRecurring]);

  useEffect(() => {
    if (!settings.enabled) return;
    const timers: ReturnType<typeof setTimeout>[] = [];

    const fire = (key: string, title: string, body: string) => {
      if (readFired().includes(key)) return;
      markFired(key);
      if (settings.sound) playChime();
      void showNotification(title, body, key);
      toast(`${title} — ${body}`);
    };

    const plan = () => {
      timers.splice(0).forEach(clearTimeout);
      const now = Date.now();
      for (const s of shifts) {
        if (s.status !== "scheduled") continue;
        const emp = employers.find((e) => e.id === s.employerId);
        const d = describeShift(s, emp);
        const start = d.startAt.getTime();
        if (start <= now || start - now > WINDOW_MS) continue;
        const at = start - settings.lead * 60_000;
        const key = `${s.id}|${s.date}|${s.start}|${settings.lead}`;
        const title = `Shift in ${fmtLead(settings.lead)}: ${emp?.name ?? "Shift"}`;
        if (at <= now) {
          // Opened the app inside the reminder window: tell them now
          const mins = Math.round((start - now) / 60_000);
          fire(key, `Shift in ${mins < 60 ? `${mins} min` : fmtLead(Math.round(mins / 60) * 60)}: ${emp?.name ?? "Shift"}`, d.body);
        } else {
          timers.push(setTimeout(() => fire(key, title, d.body), at - now));
        }
      }
    };

    plan();
    // Phones pause timers in the background, so re-check whenever the app comes back
    const onVis = () => document.visibilityState === "visible" && plan();
    document.addEventListener("visibilitychange", onVis);
    const tick = setInterval(plan, 5 * 60_000);
    return () => {
      timers.forEach(clearTimeout);
      clearInterval(tick);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [shifts, employers, settings]);

  return null;
}
