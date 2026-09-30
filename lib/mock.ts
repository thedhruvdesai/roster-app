import type { Employer, RecurringShift } from "./types";

/**
 * Dhruv's real employers, sites and fixed weekly roster.
 * Edit any of this in the app under Employers & Sites — these are only the
 * starting values loaded on first open (or via "Reset to my defaults").
 */
export const DEFAULT_EMPLOYERS: Employer[] = [
  {
    id: "emp_border",
    name: "Border Security (COGC)",
    code: "BORDER",
    color: "sky",
    // $27.00 base + 25% casual loading = $33.75/hr
    defaultRate: 33.75,
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
    color: "amber",
    defaultRate: 46.86,
    payCycle: "fortnightly",
    paymentType: "payroll",
    payDay: "Thursday",
    timesheetVia: "WhatsApp (bold/italic format)",
    sites: [{ id: "st_const_thu", name: "Constant – Thursday shift" }],
  },
  {
    id: "emp_cityview",
    name: "CityView Security",
    code: "CITYVIEW",
    color: "violet",
    defaultRate: 27.0,
    payCycle: "fortnightly",
    paymentType: "cash",
    timesheetVia: "WhatsApp (saved format)",
    sites: [{ id: "st_cityview", name: "CityView – Night Static" }],
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
  {
    id: "rec_cityview_weekend",
    employerId: "emp_cityview",
    site: "CityView – Night Static",
    weekdays: [4, 5, 6], // Fri, Sat, Sun
    start: "18:00",
    end: "06:00",
    breakMins: 0,
    startDate: ROSTER_START,
    active: true,
  },
];
