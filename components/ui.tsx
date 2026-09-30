"use client";

import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import type { ButtonHTMLAttributes, ReactNode } from "react";
import { addDays, fmtRange, startOfWeek, todayISO } from "@/lib/dates";
import type { Employer, ISODate, PaymentStatus } from "@/lib/types";
import { PAYMENT_STATUS_LABEL } from "@/lib/types";
import { BADGE, STATUS_STYLE, cn } from "@/lib/ui";

// ── Buttons ──────────────────────────────────────────────
type Variant = "primary" | "ghost" | "outline" | "danger";
const VARIANT: Record<Variant, string> = {
  primary: "bg-vest text-vest-ink hover:bg-vest-soft font-semibold",
  ghost: "text-zinc-300 hover:bg-zinc-800 hover:text-zinc-100",
  outline: "border border-zinc-700 text-zinc-100 hover:bg-zinc-800 hover:border-zinc-600",
  danger: "bg-rose-500/15 text-rose-300 hover:bg-rose-500/25 ring-1 ring-inset ring-rose-500/30",
};

export function Button({
  variant = "outline",
  size = "md",
  className,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: "sm" | "md" }) {
  return (
    <button
      {...rest}
      className={cn(
        "inline-flex items-center justify-center gap-1.5 rounded-lg font-medium transition-colors",
        "disabled:opacity-40 disabled:pointer-events-none",
        size === "sm" ? "h-8 px-2.5 text-xs" : "h-10 px-3.5 text-sm",
        VARIANT[variant],
        className
      )}
    />
  );
}

export function IconButton({ label, className, ...rest }: ButtonHTMLAttributes<HTMLButtonElement> & { label: string }) {
  return (
    <button
      {...rest}
      aria-label={label}
      title={label}
      className={cn(
        "inline-flex h-8 w-8 items-center justify-center rounded-md text-zinc-400 transition-colors",
        "hover:bg-zinc-800 hover:text-zinc-100",
        className
      )}
    />
  );
}

// ── Badges ───────────────────────────────────────────────
export function EmployerBadge({ employer, compact = false }: { employer?: Employer; compact?: boolean }) {
  if (!employer)
    return <span className="rounded-md bg-zinc-800 px-1.5 py-0.5 text-xs text-zinc-400">Unknown</span>;
  const c = BADGE[employer.color];
  return (
    <span
      className={cn(
        "inline-flex max-w-full shrink-0 items-center gap-1.5 rounded px-1.5 py-0.5 text-xs font-semibold ring-1 ring-inset",
        c.chip
      )}
      title={employer.name}
    >
      <span className={cn("h-1.5 w-1.5 shrink-0 rounded-full", c.dot)} />
      <span className="truncate">{compact ? employer.code : employer.name}</span>
    </span>
  );
}

export function StatusPill({ status, short = false }: { status: PaymentStatus; short?: boolean }) {
  const label = short ? { scheduled: "Scheduled", worked: "Pending", paid: "Paid" }[status] : PAYMENT_STATUS_LABEL[status];
  return (
    <span className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset", STATUS_STYLE[status])}>
      {label}
    </span>
  );
}

// ── Empty state ──────────────────────────────────────────
export function EmptyState({
  icon,
  title,
  body,
  action,
}: {
  icon: ReactNode;
  title: string;
  body: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-start rounded-xl border border-dashed border-zinc-700 bg-zinc-900/40 px-6 py-8">
      <div className="mb-3 text-zinc-400">{icon}</div>
      <p className="font-display text-xl font-semibold text-zinc-100">{title}</p>
      <p className="mt-1 max-w-sm text-sm text-zinc-500">{body}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

// ── Card shell ───────────────────────────────────────────
export function Panel({ className, children }: { className?: string; children: ReactNode }) {
  return <section className={cn("rounded-xl border border-zinc-800 bg-zinc-900", className)}>{children}</section>;
}

// ── Week navigator ───────────────────────────────────────
export function WeekNavigator({ weekStart, onChange }: { weekStart: ISODate; onChange: (iso: ISODate) => void }) {
  const current = startOfWeek(todayISO());
  const isCurrent = weekStart === current;
  const rel = Math.round(
    (new Date(weekStart).getTime() - new Date(current).getTime()) / (7 * 86_400_000)
  );
  const relLabel = isCurrent ? "This week" : rel === -1 ? "Last week" : rel === 1 ? "Next week" : rel < 0 ? `${-rel} weeks ago` : `In ${rel} weeks`;

  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center rounded-lg border border-zinc-800 bg-zinc-900">
        <IconButton label="Previous week" onClick={() => onChange(addDays(weekStart, -7))}>
          <ChevronLeft size={16} />
        </IconButton>
        <div className="min-w-[9.5rem] px-2 text-center">
          <p className="font-display text-lg font-semibold leading-tight text-zinc-50">{fmtRange(weekStart, addDays(weekStart, 6))}</p>
          <p className="text-xs leading-tight text-zinc-400">{relLabel}</p>
        </div>
        <IconButton label="Next week" onClick={() => onChange(addDays(weekStart, 7))}>
          <ChevronRight size={16} />
        </IconButton>
      </div>
      <Button size="sm" variant="ghost" disabled={isCurrent} onClick={() => onChange(current)}>
        <CalendarDays size={14} /> Today
      </Button>
    </div>
  );
}

// ── Form primitives ──────────────────────────────────────
export const inputCls =
  "h-11 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 text-[15px] text-zinc-50 placeholder:text-zinc-600 " +
  "focus:border-vest/70 focus:outline-none focus:ring-2 focus:ring-vest/20 [color-scheme:dark]";

export function Field({ label, hint, error, children, className }: { label: string; hint?: string; error?: string; children: ReactNode; className?: string }) {
  return (
    <label className={cn("block", className)}>
      <span className="mb-1.5 block text-sm font-medium text-zinc-300">{label}</span>
      {children}
      {error ? <span className="mt-1 block text-xs text-rose-400">{error}</span> : hint ? <span className="mt-1 block text-xs text-zinc-500">{hint}</span> : null}
    </label>
  );
}
