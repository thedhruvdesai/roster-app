// ─────────────────────────────────────────────────────────────
// Domain model
// ─────────────────────────────────────────────────────────────

/** ISO calendar date in local time, e.g. "2026-09-30" */
export type ISODate = string;
/** 24h wall-clock time, e.g. "22:00" */
export type HHMM = string;

export type PaymentStatus = "scheduled" | "worked" | "paid";

export const PAYMENT_STATUS_LABEL: Record<PaymentStatus, string> = {
  scheduled: "Scheduled",
  worked: "Worked / Pending Pay",
  paid: "Paid",
};

export type BadgeColor =
  | "emerald"
  | "sky"
  | "amber"
  | "violet"
  | "rose"
  | "cyan"
  | "orange"
  | "lime";

export interface Site {
  id: string;
  name: string;
  address?: string;
  /** Optional site-specific rate that overrides the employer default */
  rateOverride?: number;
}

/** Casual award rates by when the hours fall. Weeknight = Mon–Fri hours from 6pm to 6am. */
export interface PenaltyRates {
  weekday: number;
  weeknight: number;
  saturday: number;
  sunday: number;
}

export interface Employer {
  id: string;
  name: string;
  /** Short code (up to 8 chars) shown on compact badges */
  code: string;
  color: BadgeColor;
  /** Default base hourly rate in AUD */
  defaultRate: number;
  /** Saturday & Sunday rate, if different (shift's start day decides) */
  weekendRate?: number;
  /** When set, shifts are paid by the hour at these rates (overrides defaultRate/weekendRate) */
  penaltyRates?: PenaltyRates;
  payCycle: "weekly" | "fortnightly" | "monthly";
  contactName?: string;
  contactPhone?: string;
  timesheetEmail?: string;
  /** How pay arrives */
  paymentType?: "payroll" | "cash" | "invoice";
  /** e.g. "Thursday" */
  payDay?: string;
  /** How / where timesheets go, e.g. "WhatsApp (saved format)" */
  timesheetVia?: string;
  sites: Site[];
  archived?: boolean;
}

export interface Shift {
  id: string;
  employerId: string;
  /** Free text so one-off venues don't need a saved Site */
  site: string;
  /** The date the shift STARTS on */
  date: ISODate;
  start: HHMM;
  end: HHMM;
  breakMins: number;
  /** Flat rate, or for award-rated shifts the weekday base (display only) */
  hourlyRate: number;
  /** Award rates copied from the employer when the shift was made; pay is split by when hours fall */
  rates?: PenaltyRates;
  status: PaymentStatus;
  notes?: string;
  /** Set when this shift was generated from a fixed weekly roster pattern */
  recurringId?: string;
  /** True once a generated shift is edited by hand (pattern edits won't overwrite it) */
  customised?: boolean;
  createdAt: number;
  updatedAt: number;
}

/** Derived per-shift numbers — never persisted */
export interface ShiftCalc {
  grossMins: number;
  netMins: number;
  netHours: number;
  pay: number;
  /** Average $/h actually earned (differs from hourlyRate on award-rated shifts) */
  effectiveRate: number;
  /** Hours in each award band, only for award-rated shifts */
  bands?: { weekday: number; weeknight: number; saturday: number; sunday: number };
  overnight: boolean;
  startAt: Date;
  endAt: Date;
}

export interface EmployerPayLine {
  employer: Employer;
  shiftCount: number;
  hours: number;
  /** Unique rates used across the period (for display) */
  rates: number[];
  total: number;
  paid: number;
  pending: number;
  scheduled: number;
}

export interface WeeklyPaySummary {
  from: ISODate;
  to: ISODate;
  shiftCount: number;
  totalHours: number;
  grossProjected: number;
  /** worked + paid */
  verified: number;
  paid: number;
  pendingPay: number;
  scheduled: number;
  byEmployer: EmployerPayLine[];
}

export interface RestWarning {
  prevShiftId: string;
  nextShiftId: string;
  gapHours: number;
}

export interface WeekNote {
  /** keyed by Monday ISO date of the week */
  weekStart: ISODate;
  text: string;
  timesheetSubmitted: boolean;
  updatedAt: number;
}

/** Weekday index used across the app: 0 = Mon … 6 = Sun */
export type Weekday = 0 | 1 | 2 | 3 | 4 | 5 | 6;

/** A fixed weekly shift that auto-fills the roster */
export interface RecurringShift {
  id: string;
  employerId: string;
  site: string;
  weekdays: Weekday[];
  start: HHMM;
  end: HHMM;
  breakMins: number;
  /** Blank = use the employer / site default rate at generation time */
  hourlyRate?: number;
  /** First date the pattern applies from */
  startDate: ISODate;
  endDate?: ISODate;
  active: boolean;
  notes?: string;
}
