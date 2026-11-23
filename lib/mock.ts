import type { Employer, RecurringShift } from "./types";

/**
 * Dhruv's real employers, sites and fixed weekly roster.
 * Edit any of this in the app under Employers & Sites — these are only the
 * starting values loaded on first open (or via "Reset to my defaults").
 */
/** Added Oct 2026. $35/h confirmed; pay cycle and sites still placeholders. */
export const SAI_EMPLOYER: Employer = {
  id: "emp_sai",
  name: "SAI Security",
  code: "SAI",
  color: "lime",
  defaultRate: 35.0,
  payCycle: "weekly",
  paymentType: "payroll",
  sites: [],
};

/** Added Oct 2026. $27/h confirmed; pay cycle, payment method and sites still placeholders. */
export const PSG_EMPLOYER: Employer = {
  id: "emp_psg",
  name: "PSG Security",
  code: "PSG",
  color: "amber",
  defaultRate: 27.0,
  payCycle: "weekly",
  paymentType: "payroll",
  sites: [],
};

/** Added Nov 2026. $30/h weekdays, $35/h Sat & Sun; pay cycle and sites still placeholders. */
export const JR_EMPLOYER: Employer = {
  id: "emp_jr",
  name: "JR Security",
  code: "JR",
  color: "cyan",
  defaultRate: 30.0,
  weekendRate: 35.0,
  payCycle: "weekly",
  paymentType: "payroll",
  sites: [],
};

/** CityView was removed in Nov 2026; past CityView shifts stay as pay history */
export const RETIRED_EMPLOYER_IDS = ["emp_cityview"];

export const BORDER_RATES = { weekday: 35.5, weeknight: 41.69, saturday: 49.7, sunday: 63.9 };

/** Added Nov 2026: Border Mon & Wed 02:00–06:00 from the week of 14 Dec (Tue/Thu 01:30 pattern continues) */
export const BORDER_MON_WED: RecurringShift = {
  id: "rec_border_mon_wed",
  employerId: "emp_border",
  site: "Surfers City Gate Access",
  weekdays: [0, 2], // Mon, Wed
  start: "02:00",
  end: "06:00",
  breakMins: 0,
  startDate: "2026-12-14",
  active: true,
};

export const DEFAULT_EMPLOYERS: Employer[] = [
  {
    id: "emp_border",
    name: "Border Security (COGC)",
    code: "BORDER",
    color: "sky",
    // Casual award rates from payslip (Nov 2026). Weeknight = Mon–Fri 6pm–6am.
    defaultRate: 35.5,
    penaltyRates: BORDER_RATES,
    payCycle: "fortnightly",
    paymentType: "payroll",
    timesheetVia: "Email — Excel COGC Static Time Sheet, submit by Monday 9am",
    sites: [
      { id: "st_surfers", name: "Surfers City Gate Access" },
      { id: "st_gcuh", name: "Gold Coast University Hospital Car Park" },
      { id: "st_coomera", name: "Coomera Hub Centre (Upper Coomera)" },
      { id: "st_southport", name: "Southport Chambers" },
      { id: "st_marina", name: "Marina Mirage" },
      { id: "st_broadbeach", name: "Broadbeach Cultural Centre" },
    ],
  },
  {
    id: "emp_constant",
    name: "Constant Security",
    code: "CONST",
    color: "orange",
    defaultRate: 46.86,
    payCycle: "fortnightly",
    paymentType: "payroll",
    payDay: "Thursday",
    timesheetVia: "WhatsApp (bold/italic format)",
    sites: [{ id: "st_const_thu", name: "Constant – Thursday shift" }],
  },
  {
    id: "emp_besecure",
    name: "BeSecure",
    code: "BESEC",
    color: "rose",
    defaultRate: 30.0,
    payCycle: "weekly",
    paymentType: "payroll",
    timesheetVia: "WhatsApp format",
    sites: [],
  },
  {
    id: "emp_ppg",
    name: "Premier Protection Group",
    code: "PPG",
    color: "emerald",
    defaultRate: 30.0,
    payCycle: "weekly",
    paymentType: "invoice",
    timesheetVia: "Invoice PDF (INV-DDMM)",
    sites: [],
  },
  SAI_EMPLOYER,
  PSG_EMPLOYER,
  JR_EMPLOYER,
];

/** Week the fixed roster starts from (Mon 28/09/2026) */
const ROSTER_START = "2026-09-28";

export const DEFAULT_RECURRING: RecurringShift[] = [
  {
    id: "rec_border_tue_thu",
    employerId: "emp_border",
    site: "Surfers City Gate Access",
    weekdays: [1, 3], // Tue, Thu
    start: "01:30",
    end: "06:00",
    breakMins: 0,
    startDate: ROSTER_START,
    active: true,
  },
  BORDER_MON_WED,
  {
    id: "rec_const_thu",
    employerId: "emp_constant",
    site: "Constant – Thursday shift",
    weekdays: [3], // Thu
    start: "16:00",
    end: "22:00",
    breakMins: 0,
    startDate: ROSTER_START,
    active: true,
  },
];
