import { addDays, combine, fmtAU, fmtDow, timeToMins } from "./dates";
import type {
  Employer,
  EmployerPayLine,
  ISODate,
  RestWarning,
  Shift,
  ShiftCalc,
  WeeklyPaySummary,
  PenaltyRates,
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
type Band = keyof PenaltyRates;
export const BANDS: Band[] = ["weekday", "weeknight", "saturday", "sunday"];
export const BAND_LABEL: Record<Band, string> = { weekday: "Weekday", weeknight: "Weeknight", saturday: "Saturday", sunday: "Sunday" };
/** "4.50h weeknight" or "2h weeknight + 6h Saturday" */
export const fmtBands = (bands: Record<Band, number>) =>
  BANDS.filter((b) => bands[b] > 0)
    .map((b) => `${fmtHours(bands[b])} ${b === "weekday" || b === "weeknight" ? b : BAND_LABEL[b]}`)
    .join(" + ");

/** Which award band a moment falls in: weekends by day, Mon–Fri split at 6am and 6pm */
function bandAt(dow: number, minuteOfDay: number): Band {
  if (dow === 6) return "saturday";
  if (dow === 0) return "sunday";
  return minuteOfDay < 360 || minuteOfDay >= 1080 ? "weeknight" : "weekday";
}

/** Minutes worked in each band, walking the shift between band boundaries */
export function splitBands(date: ISODate, startMins: number, endMins: number) {
  const out: Record<Band, number> = { weekday: 0, weeknight: 0, saturday: 0, sunday: 0 };
  const baseDow = new Date(date + "T00:00:00").getDay();
  let m = startMins;
  while (m < endMins) {
    const day = Math.floor(m / 1440);
    const mod = m % 1440;
    const nextEdge = day * 1440 + (mod < 360 ? 360 : mod < 1080 ? 1080 : 1440);
    const stop = Math.min(nextEdge, endMins);
    out[bandAt((baseDow + day) % 7, mod)] += stop - m;
    m = stop;
  }
  return out;
}

export function calcShift(input: Pick<Shift, "date" | "start" | "end" | "breakMins" | "hourlyRate"> & { rates?: PenaltyRates }): ShiftCalc {
  const s = timeToMins(input.start);
  let e = timeToMins(input.end);
  const overnight = e <= s;
  if (overnight) e += 24 * 60;

  const grossMins = e - s;
  const breakMins = Math.max(0, Math.min(input.breakMins || 0, grossMins));
  const netMins = grossMins - breakMins;
  const netHours = roundHours(netMins / 60);
  let pay: number;
  let bands: ShiftCalc["bands"];
  let bandPay: ShiftCalc["bandPay"];
  if (input.rates && grossMins > 0) {
    // Award rates: price each band, then take the unpaid break off at the shift's average rate
    const mins = splitBands(input.date, s, e);
    const k = netMins / grossMins;
    // Each band is priced and rounded on its own so the lines add up exactly, like a payslip
    bandPay = {
      weekday: roundMoney((mins.weekday / 60) * k * input.rates.weekday),
      weeknight: roundMoney((mins.weeknight / 60) * k * input.rates.weeknight),
      saturday: roundMoney((mins.saturday / 60) * k * input.rates.saturday),
      sunday: roundMoney((mins.sunday / 60) * k * input.rates.sunday),
    };
    pay = roundMoney(bandPay.weekday + bandPay.weeknight + bandPay.saturday + bandPay.sunday);
    bands = {
      weekday: roundHours((mins.weekday / 60) * k),
      weeknight: roundHours((mins.weeknight / 60) * k),
      saturday: roundHours((mins.saturday / 60) * k),
      sunday: roundHours((mins.sunday / 60) * k),
    };
  } else {
    pay = roundMoney((netMins / 60) * (input.hourlyRate || 0));
  }
  const effectiveRate = netMins > 0 ? Math.round((pay / (netMins / 60)) * 100) / 100 : input.hourlyRate || 0;

  const startAt = combine(input.date, input.start);
  const endAt = combine(overnight ? addDays(input.date, 1) : input.date, input.end);

  return { grossMins, netMins, netHours, pay, effectiveRate, bands, bandPay, overnight, startAt, endAt };
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
    if (c.bands && c.bandPay && s.rates) {
      line.bands ??= {
        weekday: { hours: 0, rate: s.rates.weekday, pay: 0 },
        weeknight: { hours: 0, rate: s.rates.weeknight, pay: 0 },
        saturday: { hours: 0, rate: s.rates.saturday, pay: 0 },
        sunday: { hours: 0, rate: s.rates.sunday, pay: 0 },
      };
      for (const b of BANDS) {
        line.bands[b].hours = roundHours(line.bands[b].hours + c.bands[b]);
        line.bands[b].pay = roundMoney(line.bands[b].pay + c.bandPay[b]);
      }
      for (const r of [s.rates.weekday, s.rates.weeknight, s.rates.saturday, s.rates.sunday])
        if (!line.rates.includes(r)) line.rates.push(r);
    } else {
      line.flat = { hours: roundHours((line.flat?.hours ?? 0) + c.netHours), pay: roundMoney((line.flat?.pay ?? 0) + c.pay) };
      if (!line.rates.includes(c.effectiveRate)) line.rates.push(c.effectiveRate);
    }

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
    const band = { weekday: 0, weeknight: 0, saturday: 0, sunday: 0 };
    const bandMoney = { weekday: 0, weeknight: 0, saturday: 0, sunday: 0 };
    let anyBands = false;
    const lines = rows.map((s) => {
      const c = calcShift(s);
      hrs += c.netHours;
      pay += c.pay;
      if (c.bands && c.bandPay) {
        anyBands = true;
        for (const b of BANDS) {
          band[b] += c.bands[b];
          bandMoney[b] += c.bandPay[b];
        }
      }
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
        ...(anyBands
          ? [
              ...BANDS.filter((b) => band[b] > 0).map(
                (b) =>
                  `Casual ${BAND_LABEL[b]} - ${roundHours(band[b]).toFixed(2)} hrs${includePay ? ` = ${fmtMoney(roundMoney(bandMoney[b]))}` : ""}`
              ),
              "",
            ]
          : []),
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
