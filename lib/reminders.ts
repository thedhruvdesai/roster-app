"use client";

import { calcShift, fmtHours, fmtMoney } from "./pay";
import type { Employer, Shift } from "./types";

export interface ReminderSettings {
  enabled: boolean;
  /** Minutes before the shift starts */
  lead: number;
  sound: boolean;
}

export const DEFAULT_REMINDERS: ReminderSettings = { enabled: false, lead: 60, sound: true };
export const LEAD_OPTIONS = [30, 60, 120, 180] as const;
export const fmtLead = (m: number) => (m < 60 ? `${m} min` : `${m / 60} h`);

/** Text used for both the in-app alert and the calendar event */
export function describeShift(s: Shift, emp?: Employer) {
  const c = calcShift(s);
  const who = emp?.name ?? "Shift";
  return {
    title: `${who} · ${s.start}`,
    body: `${s.site} · ${s.start}–${s.end}${c.overnight ? " (next day)" : ""} · ${fmtHours(c.netHours)} · ${fmtMoney(c.pay)}`,
    startAt: c.startAt,
    endAt: c.endAt,
  };
}

// ── Sound ───────────────────────────────────────────────────────────────
let ctx: AudioContext | null = null;

/** Browsers only allow sound after a tap, so this is called from the toggle to unlock audio */
export function unlockAudio() {
  try {
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    ctx ??= new AC();
    if (ctx.state === "suspended") void ctx.resume();
  } catch {
    /* no audio on this device */
  }
}

/** A bright three-note chime, played twice. Made in code so there's no file to load. */
export function playChime() {
  unlockAudio();
  if (!ctx) return;
  const now = ctx.currentTime;
  const notes = [880, 1174.66, 1567.98]; // A5, D6, G6
  for (let round = 0; round < 2; round++) {
    notes.forEach((f, i) => {
      const t = now + round * 0.9 + i * 0.16;
      const o = ctx!.createOscillator();
      const g = ctx!.createGain();
      o.type = "sine";
      o.frequency.value = f;
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.35, t + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.7);
      o.connect(g).connect(ctx!.destination);
      o.start(t);
      o.stop(t + 0.75);
    });
  }
  if ("vibrate" in navigator) navigator.vibrate?.([200, 100, 200]);
}

// ── System notifications ───────────────────────────────────────────────
export const notificationsSupported = () => typeof window !== "undefined" && "Notification" in window;

export async function registerWorker() {
  if (!("serviceWorker" in navigator)) return null;
  try {
    return await navigator.serviceWorker.register("/sw.js");
  } catch {
    return null;
  }
}

export async function askPermission(): Promise<NotificationPermission | "unsupported"> {
  if (!notificationsSupported()) return "unsupported";
  if (Notification.permission !== "default") return Notification.permission;
  try {
    return await Notification.requestPermission();
  } catch {
    return Notification.permission;
  }
}

export async function showNotification(title: string, body: string, tag: string) {
  if (!notificationsSupported() || Notification.permission !== "granted") return false;
  const opts: NotificationOptions = { body, tag, icon: "/icon-192.png", badge: "/icon-192.png", requireInteraction: true };
  try {
    // iPhone and Android only show notifications through the service worker
    const reg = (await navigator.serviceWorker?.getRegistration()) ?? (await registerWorker());
    if (reg) {
      await reg.showNotification(title, opts);
      return true;
    }
    new Notification(title, opts);
    return true;
  } catch {
    return false;
  }
}

// ── Calendar export (alarms ring even when ShiftDesk is closed) ────────
const icsDate = (d: Date) => d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
const esc = (t: string) => t.replace(/\\/g, "\\\\").replace(/\n/g, "\\n").replace(/([,;])/g, "\\$1");

export function buildIcs(shifts: Shift[], employers: Employer[], lead: number) {
  const stamp = icsDate(new Date());
  const lines = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//ShiftDesk//Roster//EN", "CALSCALE:GREGORIAN", "METHOD:PUBLISH", "X-WR-CALNAME:ShiftDesk shifts"];
  for (const s of shifts) {
    const d = describeShift(s, employers.find((e) => e.id === s.employerId));
    lines.push(
      "BEGIN:VEVENT",
      `UID:${s.id}@shiftdesk`,
      `DTSTAMP:${stamp}`,
      `DTSTART:${icsDate(d.startAt)}`,
      `DTEND:${icsDate(d.endAt)}`,
      `SUMMARY:${esc(`${employers.find((e) => e.id === s.employerId)?.name ?? "Shift"} – ${s.site}`)}`,
      `LOCATION:${esc(s.site)}`,
      `DESCRIPTION:${esc(d.body + (s.notes ? `\n${s.notes}` : ""))}`,
      "BEGIN:VALARM",
      "ACTION:DISPLAY",
      `DESCRIPTION:${esc(`Shift in ${fmtLead(lead)}: ${s.site}`)}`,
      `TRIGGER:-PT${lead}M`,
      "END:VALARM",
      "BEGIN:VALARM",
      "ACTION:DISPLAY",
      `DESCRIPTION:${esc(`Shift starts now: ${s.site}`)}`,
      "TRIGGER:PT0M",
      "END:VALARM",
      "END:VEVENT"
    );
  }
  lines.push("END:VCALENDAR");
  return lines.join("\r\n");
}

export function downloadIcs(text: string, name = "shiftdesk-shifts.ics") {
  const blob = new Blob([text], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

// ── One shift → calendar ───────────────────────────────────────────────
const isIOS = () =>
  typeof navigator !== "undefined" &&
  (/iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1));
const isAndroid = () => typeof navigator !== "undefined" && /Android/i.test(navigator.userAgent);

/** A link to /cal.ics that returns this calendar text as a real file (see netlify/functions/ics.mjs) */
export function icsLink(ics: string, name: string) {
  const bytes = new TextEncoder().encode(ics);
  let bin = "";
  bytes.forEach((b) => (bin += String.fromCharCode(b)));
  const d = btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  return `/cal.ics?n=${encodeURIComponent(name)}&d=${d}`;
}

/** Google Calendar's "new event" page, filled in. Opens the Calendar app on Android. */
export function googleCalendarUrl(s: Shift, emp?: Employer) {
  const d = describeShift(s, emp);
  const q = new URLSearchParams({
    action: "TEMPLATE",
    text: `${emp?.name ?? "Shift"} – ${s.site}`,
    dates: `${icsDate(d.startAt)}/${icsDate(d.endAt)}`,
    details: d.body + (s.notes ? `\n${s.notes}` : ""),
    location: s.site,
  });
  return `https://calendar.google.com/calendar/render?${q.toString()}`;
}

/**
 * Adds one shift to the phone's calendar in the way each phone handles best:
 * iPhone opens the "Add to Calendar" sheet, Android opens Google Calendar,
 * computers download an .ics file that opens in Outlook / Calendar.
 */
export function addShiftToCalendar(s: Shift, employers: Employer[], lead: number) {
  const emp = employers.find((e) => e.id === s.employerId);
  if (isAndroid()) {
    window.open(googleCalendarUrl(s, emp), "_blank", "noopener");
    return "google" as const;
  }
  return openIcs(buildIcs([s], employers, lead), `shift-${s.date}-${s.start.replace(":", "")}`);
}

/** iPhone: open the served file so the "Add to Calendar" sheet appears. Elsewhere: download it. */
export function openIcs(ics: string, name: string) {
  if (isIOS()) {
    window.location.href = icsLink(ics, name);
    return "ios" as const;
  }
  downloadIcs(ics, `${name}.ics`);
  return "file" as const;
}
