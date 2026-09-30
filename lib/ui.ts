import type { BadgeColor } from "./types";

/** Static class strings so Tailwind's JIT can see every colour at build time. */
export const BADGE: Record<
  BadgeColor,
  { dot: string; chip: string; bar: string; ring: string; text: string; soft: string }
> = {
  emerald: { dot: "bg-emerald-400", chip: "bg-emerald-500/15 text-emerald-300 ring-emerald-500/30", bar: "bg-emerald-400", ring: "ring-emerald-500/40", text: "text-emerald-300", soft: "border-l-emerald-400" },
  sky:     { dot: "bg-sky-400",     chip: "bg-sky-500/15 text-sky-300 ring-sky-500/30",             bar: "bg-sky-400",     ring: "ring-sky-500/40",     text: "text-sky-300",     soft: "border-l-sky-400" },
  amber:   { dot: "bg-amber-400",   chip: "bg-amber-500/15 text-amber-300 ring-amber-500/30",       bar: "bg-amber-400",   ring: "ring-amber-500/40",   text: "text-amber-300",   soft: "border-l-amber-400" },
  violet:  { dot: "bg-violet-400",  chip: "bg-violet-500/15 text-violet-300 ring-violet-500/30",    bar: "bg-violet-400",  ring: "ring-violet-500/40",  text: "text-violet-300",  soft: "border-l-violet-400" },
  rose:    { dot: "bg-rose-400",    chip: "bg-rose-500/15 text-rose-300 ring-rose-500/30",          bar: "bg-rose-400",    ring: "ring-rose-500/40",    text: "text-rose-300",    soft: "border-l-rose-400" },
  cyan:    { dot: "bg-cyan-400",    chip: "bg-cyan-500/15 text-cyan-300 ring-cyan-500/30",          bar: "bg-cyan-400",    ring: "ring-cyan-500/40",    text: "text-cyan-300",    soft: "border-l-cyan-400" },
  orange:  { dot: "bg-orange-400",  chip: "bg-orange-500/15 text-orange-300 ring-orange-500/30",    bar: "bg-orange-400",  ring: "ring-orange-500/40",  text: "text-orange-300",  soft: "border-l-orange-400" },
  lime:    { dot: "bg-lime-400",    chip: "bg-lime-500/15 text-lime-300 ring-lime-500/30",          bar: "bg-lime-400",    ring: "ring-lime-500/40",    text: "text-lime-300",    soft: "border-l-lime-400" },
};

export const BADGE_COLORS = Object.keys(BADGE) as BadgeColor[];

export const STATUS_STYLE = {
  scheduled: "bg-zinc-700/40 text-zinc-300 ring-zinc-600/50",
  worked: "bg-amber-500/15 text-amber-300 ring-amber-500/30",
  paid: "bg-emerald-500/15 text-emerald-300 ring-emerald-500/30",
} as const;

export const cn = (...c: Array<string | false | null | undefined>) => c.filter(Boolean).join(" ");
