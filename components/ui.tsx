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
  // iOS button styles: filled, plain (tinted text), gray (tinted), destructive
  primary: "bg-vest text-vest-ink font-semibold active:opacity-70",
  ghost: "text-vest hover:bg-zinc-800/60 active:opacity-60",
  outline: "bg-zinc-800 text-zinc-50 hover:bg-zinc-700 active:opacity-70",
  danger: "bg-rose-500/15 text-rose-400 hover:bg-rose-500/25 active:opacity-70",
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
        "inline-flex items-center justify-center gap-1.5 rounded-full font-medium transition-[background-color,opacity]",
        "disabled:opacity-40 disabled:pointer-events-none",
        size === "sm" ? "h-8 px-3 text-[13px]" : "h-11 px-5 text-[17px]",
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
        "inline-flex h-8 w-8 items-center justify-center rounded-full text-zinc-400 transition-colors active:opacity-60",
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
        "inline-flex max-w-full shrink-0 items-center gap-1.5 rounded-md px-1.5 py-0.5 text-xs font-semibold",
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
    <span className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold", STATUS_STYLE[status])}>
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
    <div className="flex flex-col items-center rounded-2xl bg-zinc-900 px-6 py-10 text-center">
      <div className="mb-3 text-zinc-400">{icon}</div>
      <p className="text-[20px] font-semibold text-zinc-50">{title}</p>
      <p className="mt-1 max-w-sm text-[15px] text-zinc-400">{body}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

// ── Card shell ───────────────────────────────────────────
export function Panel({ className, children }: { className?: string; children: ReactNode }) {
  return <section className={cn("rounded-2xl bg-zinc-900", className)}>{children}</section>;
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
      <div className="flex items-center rounded-full bg-zinc-900">
        <IconButton label="Previous week" onClick={() => onChange(addDays(weekStart, -7))}>
          <ChevronLeft size={20} className="text-vest" />
        </IconButton>
        <div className="min-w-[9.5rem] px-2 text-center">
          <p className="text-[17px] font-semibold leading-tight text-zinc-50">{fmtRange(weekStart, addDays(weekStart, 6))}</p>
          <p className="text-xs leading-tight text-zinc-400">{relLabel}</p>
        </div>
        <IconButton label="Next week" onClick={() => onChange(addDays(weekStart, 7))}>
          <ChevronRight size={20} className="text-vest" />
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
  "h-11 w-full rounded-[10px] border border-transparent bg-zinc-800 px-3.5 text-[17px] text-zinc-50 placeholder:text-zinc-500 " +
  "focus:border-sky-500 focus:outline-none [color-scheme:dark]";

export function Field({ label, hint, error, children, className }: { label: string; hint?: string; error?: string; children: ReactNode; className?: string }) {
  return (
    <label className={cn("block", className)}>
      <span className="mb-1.5 block pl-1 text-[13px] text-zinc-400">{label}</span>
      {children}
      {error ? <span className="mt-1 block text-xs text-rose-400">{error}</span> : hint ? <span className="mt-1 block text-xs text-zinc-500">{hint}</span> : null}
    </label>
  );
}
