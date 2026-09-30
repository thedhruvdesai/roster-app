import type { HHMM, ISODate } from "./types";

const pad = (n: number) => String(n).padStart(2, "0");

/** Local-time ISO date (never UTC — avoids AEST off-by-one bugs) */
export function toISODate(d: Date): ISODate {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function parseISODate(iso: ISODate): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function addDays(iso: ISODate, days: number): ISODate {
  const d = parseISODate(iso);
  d.setDate(d.getDate() + days);
  return toISODate(d);
}

/** Monday of the week containing `iso` (Australian weeks run Mon–Sun) */
export function startOfWeek(iso: ISODate): ISODate {
  const d = parseISODate(iso);
  const dow = (d.getDay() + 6) % 7; // Mon=0 … Sun=6
  d.setDate(d.getDate() - dow);
  return toISODate(d);
}

export function weekDays(weekStart: ISODate): ISODate[] {
  return Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
}

export function todayISO(): ISODate {
  return toISODate(new Date());
}

export function timeToMins(t: HHMM): number {
  const [h, m] = t.split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
}

export function combine(iso: ISODate, t: HHMM): Date {
  const d = parseISODate(iso);
  d.setMinutes(timeToMins(t));
  return d;
}

export function isValidTime(t: string): t is HHMM {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(t);
}

// ── Display formatters ─────────────────────────────────────
const DOW = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export const fmtDow = (iso: ISODate) => DOW[parseISODate(iso).getDay()];
export const fmtDayNum = (iso: ISODate) => parseISODate(iso).getDate();
export const fmtShort = (iso: ISODate) => {
  const d = parseISODate(iso);
  return `${d.getDate()} ${MON[d.getMonth()]}`;
};
/** DD/MM/YYYY — the format Australian payroll teams expect */
export const fmtAU = (iso: ISODate) => {
  const d = parseISODate(iso);
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
};
export const fmtRange = (from: ISODate, to: ISODate) => {
  const a = parseISODate(from);
  const b = parseISODate(to);
  const sameMonth = a.getMonth() === b.getMonth() && a.getFullYear() === b.getFullYear();
  return sameMonth
    ? `${a.getDate()} – ${b.getDate()} ${MON[b.getMonth()]} ${b.getFullYear()}`
    : `${fmtShort(from)} – ${fmtShort(to)} ${b.getFullYear()}`;
};
