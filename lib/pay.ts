import { addDays, combine, fmtAU, fmtDow, timeToMins } from "./dates";
import type {
  Employer,
  EmployerPayLine,
  ISODate,
  RestWarning,
  Shift,
  ShiftCalc,
  WeeklyPaySummary,
} from "./types";

export const WEEKLY_HOURS_LIMIT = 38;
export const MIN_REST_HOURS = 10;
export const LONG_SHIFT_HOURS = 12;

/** Round to cents without float drift (e.g. 7.5 * 32.47) */
export const roundMoney = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;
export const roundHours = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

export const fmtMoney = (n: number) =>
  n.toLocaleString("en-AU", { style: "currency", currency: "AUD", minimumFractionDigits: 2 });
export const fmtHours = (n: number) => `${roundHours(n).toFixed(2).replace(/\.00$/, "")}h`;

/**
 * Core shift maths.
 * - End <= start means the shift crosses midnight (22:00 → 06:00 = 8h).
 * - Start == end is treated as a 24h shift (explicitly allowed, rare).
 * - Break is clamped so net time never goes negative.
 */
export function calcShift(input: Pick<Shift, "date" | "start" | "end" | "breakMins" | "hourlyRate">): ShiftCalc {
  const s = timeToMins(input.start);
  let e = timeToMins(input.end);
  const overnight = e <= s;
  if (overnight) e += 24 * 60;

  const grossMins = e - s;
  const breakMins = Math.max(0, Math.min(input.breakMins || 0, grossMins));
  const netMins = grossMins - breakMins;
  const netHours = roundHours(netMins / 60);
  const pay = roundMoney((netMins / 60) * (input.hourlyRate || 0));

  const startAt = combine(input.date, input.start);
  const endAt = combine(overnight ? addDays(input.date, 1) : input.date, input.end);

  return { grossMins, netMins, netHours, pay, overnight, startAt, endAt };
}

export function shiftsInRange(shifts: Shift[], from: ISODate, to: ISODate) {
  return shifts
    .filter((s) => s.date >= from && s.date <= to)
    .sort((a, b) => (a.date + a.start).localeCompare(b.date + b.start));
}

/**
 * Turnaround check across ALL shifts (so a Sunday-night → Monday-morning
 * gap across the week boundary is still caught). Overlaps show as negative gaps.
 */
export function findRestWarnings(shifts: Shift[], minRest = MIN_REST_HOURS): RestWarning[] {
  const sorted = [...shifts]
    .map((s) => ({ s, c: calcShift(s) }))
    .sort((a, b) => a.c.startAt.getTime() - b.c.startAt.getTime());

  const out: RestWarning[] = [];
  for (let i = 1; i < sorted.length; i++) {
    const prev = sorted[i - 1];
    const next = sorted[i];
    const gapHours = (next.c.startAt.getTime() - prev.c.endAt.getTime()) / 3_600_000;
    if (gapHours < minRest) {
      out.push({ prevShiftId: prev.s.id, nextShiftId: next.s.id, gapHours: roundHours(gapHours) });
    }
  }
  return out;
}

export function buildPaySummary(
  shifts: Shift[],
  employers: Employer[],
  from: ISODate,
  to: ISODate
): WeeklyPaySummary {
  const inRange = shiftsInRange(shifts, from, to);
  const byEmp = new Map<string, EmployerPayLine>();

  const summary: WeeklyPaySummary = {
    from,
    to,
    shiftCount: inRange.length,
    totalHours: 0,
    grossProjected: 0,
    verified: 0,
    paid: 0,
    pendingPay: 0,
    scheduled: 0,
    byEmployer: [],
  };

  for (const s of inRange) {
    const c = calcShift(s);
    const emp = employers.find((e) => e.id === s.employerId);
    if (!emp) continue;

    let line = byEmp.get(emp.id);
    if (!line) {
      line = { employer: emp, shiftCount: 0, hours: 0, rates: [], total: 0, paid: 0, pending: 0, scheduled: 0 };
      byEmp.set(emp.id, line);
    }
    line.shiftCount++;
    line.hours += c.netHours;
    line.total += c.pay;
    if (!line.rates.includes(s.hourlyRate)) line.rates.push(s.hourlyRate);

    summary.totalHours += c.netHours;
    summary.grossProjected += c.pay;

    if (s.status === "paid") {
      line.paid += c.pay;
      summary.paid += c.pay;
      summary.verified += c.pay;
    } else if (s.status === "worked") {
      line.pending += c.pay;
      summary.pendingPay += c.pay;
      summary.verified += c.pay;
    } else {
      line.scheduled += c.pay;
      summary.scheduled += c.pay;
    }
  }

  summary.byEmployer = [...byEmp.values()]
    .map((l) => ({
      ...l,
      hours: roundHours(l.hours),
      total: roundMoney(l.total),
      paid: roundMoney(l.paid),
      pending: roundMoney(l.pending),
      scheduled: roundMoney(l.scheduled),
      rates: l.rates.sort((a, b) => a - b),
    }))
    .sort((a, b) => b.total - a.total);

  (["totalHours"] as const).forEach((k) => (summary[k] = roundHours(summary[k])));
  (["grossProjected", "verified", "paid", "pendingPay", "scheduled"] as const).forEach(
    (k) => (summary[k] = roundMoney(summary[k]))
  );
  return summary;
}

/** True when a shift has finished but is still marked Scheduled */
export function isOverdueForUpdate(s: Shift, now = new Date()) {
  return s.status === "scheduled" && calcShift(s).endAt.getTime() < now.getTime();
}

/**
 * Plain-text timesheet for WhatsApp / SMS / email.
 * Uses *bold* markers which render in WhatsApp and read fine elsewhere.
 */
export function buildTimesheetText(
  shifts: Shift[],
  employers: Employer[],
  from: ISODate,
  to: ISODate,
  opts: { employerId?: string | "all"; includePay?: boolean; note?: string } = {}
): string {
  const { employerId = "all", includePay = true, note } = opts;
  const list = shiftsInRange(shifts, from, to).filter(
    (s) => employerId === "all" || s.employerId === employerId
  );
  const targets = employers.filter((e) => list.some((s) => s.employerId === e.id));
  if (!targets.length) return `No shifts between ${fmtAU(from)} and ${fmtAU(to)}.`;

  const blocks: string[] = [];
  let grandHours = 0;
  let grandPay = 0;

  for (const emp of targets) {
    const rows = list.filter((s) => s.employerId === emp.id);
    let hrs = 0;
    let pay = 0;
    const lines = rows.map((s) => {
      const c = calcShift(s);
      hrs += c.netHours;
      pay += c.pay;
      const brk = s.breakMins ? `, ${s.breakMins}m break` : "";
      const money = includePay ? ` = ${fmtMoney(c.pay)}` : "";
      return `${fmtAU(s.date)} (${fmtDow(s.date)}) - ${s.start} - ${s.end}${brk} (${fmtHours(c.netHours).replace("h", " hrs")})${money}\n   ${s.site}`;
    });
    grandHours += hrs;
    grandPay += pay;
    blocks.push(
      [
        `*${emp.name} Timesheet*`,
        `*_Week Ending: ${fmtAU(to)}_*`,
        "",
        ...lines,
        "",
        `*Total hrs - ${roundHours(hrs).toFixed(2)}*${includePay ? `\n*Total - ${fmtMoney(roundMoney(pay))}*` : ""}`,
      ].join("\n")
    );
  }

  if (targets.length > 1) {
    blocks.push(
      `*All employers - ${roundHours(grandHours).toFixed(2)} hrs${includePay ? ` / ${fmtMoney(roundMoney(grandPay))}` : ""}*`
    );
  }
  if (note?.trim()) blocks.push(`Notes: ${note.trim()}`);
  return blocks.join("\n\n");
}
