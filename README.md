# ShiftDesk — Personal Roster & Pay Tracker

Next.js 15 (App Router) · TypeScript · Tailwind CSS · Zustand (LocalStorage) · lucide-react

Built for a casual security officer working across several companies and sites: weekly roster, fatigue checks, and pay reconciliation in one place. Everything stays in your browser — no backend, no account.

## Run it

```bash
npm install
npm run dev        # http://localhost:3000
npm run build && npm start
```

### Deploy to Netlify

The app is a static export (`output: "export"`), so `npm run build` writes a plain website to `out/`.

- **Drag and drop:** run `npm run build`, then drag the `out` folder onto app.netlify.com/drop (or your site's Deploys tab).
- **From GitHub:** push this folder; `netlify.toml` already sets build = `npm run build`, publish = `out`.

## Structure

```
app/
  layout.tsx               fonts, dark theme, metadata
  page.tsx                 renders <AppShell/>
components/
  AppShell.tsx             top tabs, hydration gate, shift modal host
  SummaryMetricsBar.tsx    38h meter, rest-gap alerts, long-shift flag, projected pay
  WeeklyRosterView.tsx     Mon–Sun grid, per-day totals, add/edit/duplicate/delete
  ShiftCard.tsx            badge, venue, times, overnight +1, net hrs, $, rest warning
  ShiftModal.tsx           create/edit with live maths, overnight + rest validation
  PaySummaryView.tsx       period selector, KPIs, employer table, ledger, notes, export
  EmployersView.tsx        companies, sites, rate overrides, badge colours, backup
  FixedRosterPanel.tsx     fixed weekly shifts that auto-fill the roster
  ui.tsx                   Button, badges, status pills, week navigator, form fields
lib/
  types.ts                 Employer, Site, Shift, PaymentStatus, WeeklyPaySummary …
  pay.ts                   calcShift, findRestWarnings, buildPaySummary, buildTimesheetText
  dates.ts                 local-time date helpers (no UTC off-by-one in AEST)
  store.ts                 Zustand CRUD store with persist middleware
  mock.ts                  your employers, sites and fixed weekly roster (starting values)
  ui.ts                    static Tailwind colour maps for employer badges
```

## Key rules (all in `lib/pay.ts`)

| Rule | Behaviour |
|---|---|
| Overnight | `end <= start` → shift ends next day (22:00–06:00 = 8h span) |
| Net hours | span − unpaid break, break clamped so it can't go negative |
| Pay | `netMinutes / 60 × rate`, rounded to cents once (no float drift) |
| Weekly load | meter turns amber at 85% of 38h, red at 38h+ |
| Rest gap | < 10h between one shift's end and the next start (checked across week boundaries; overlaps flagged) |
| Long shift | > 12h net flagged |
| Rate precedence | site override → employer default → manual edit in modal |

Thresholds are constants at the top of `lib/pay.ts` (`WEEKLY_HOURS_LIMIT`, `MIN_REST_HOURS`, `LONG_SHIFT_HOURS`).

## Fixed weekly roster

Employers & Sites → **Fixed weekly roster**. Each pattern (employer, site, days, times, break, optional rate) auto-creates real shifts for whatever weeks you view. Extra shifts you add on the Roster tab sit on top.

- Deleting one generated shift skips just that date; it won't come back.
- Editing a generated shift marks it as customised, so later pattern edits leave it alone.
- Editing a pattern updates upcoming scheduled shifts only; past, worked and paid shifts stay as history.
- Pause a pattern to stop it without deleting it.

Starting values live in `lib/mock.ts`.

## Payment status flow

`Scheduled` → `Worked / Pending Pay` → `Paid`

- Finished shifts still marked Scheduled show a **Mark worked** prompt on the card and a bulk banner on the Pay tab.
- Pay tab → By employer → **Mark paid** flips all that company's pending shifts in the period once the money lands.

## Timesheet export

Pay tab → Timesheet export. Pick one employer or all, toggle $ amounts and notes, then **Copy summary**. Output uses WhatsApp `*bold*` / `*_bold italic_*` markers with DD/MM/YYYY dates and a "Week Ending" line, so it pastes cleanly into WhatsApp, SMS or email.

## Data

- Stored under the LocalStorage key `shiftdesk-roster-v2`.
- Employers tab → **Export JSON** for backups; **Reset to my defaults** restores the employers and fixed roster from `lib/mock.ts`; **Clear shifts** wipes shifts and notes but keeps employers and the fixed roster.

## Ideas for v2

- Penalty rates (Sat / Sun / public holiday / night loadings) as per-employer multipliers
- Import JSON backup, and sync via Supabase for multi-device use
- ICS export so shifts land in your phone calendar
- PWA manifest + offline cache for "add to home screen"
