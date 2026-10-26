"use client";

import { useMemo } from "react";
import { fmtDow, weekDays } from "@/lib/dates";
import { calcShift, fmtHours, fmtMoney } from "@/lib/pay";
import type { ISODate, Shift } from "@/lib/types";

/** Half-circle gauge built from tick segments, filled up to the value */
export function HoursGauge({ hours, limit }: { hours: number; limit: number }) {
  const max = Math.max(limit * 1.5, Math.ceil(hours / 5) * 5);
  const ticks = 44;
  const filled = Math.round((Math.min(hours, max) / max) * ticks);
  const limitTick = Math.round((limit / max) * ticks);
  const over = hours >= limit;
  const W = 220;
  const cx = W / 2;
  const cy = 112;
  return (
    <figure className="relative mx-auto w-full max-w-[260px]" aria-label={`${fmtHours(hours)} of ${limit} hours this week`}>
      <svg viewBox={`0 0 ${W} 124`} className="block w-full">
        {Array.from({ length: ticks + 1 }, (_, i) => {
          const a = Math.PI - (i / ticks) * Math.PI;
          const r0 = 78;
          const r1 = i === limitTick ? 106 : 100;
          const x0 = cx + r0 * Math.cos(a);
          const y0 = cy - r0 * Math.sin(a);
          const x1 = cx + r1 * Math.cos(a);
          const y1 = cy - r1 * Math.sin(a);
          const on = i <= filled;
          const colour = !on ? "rgb(var(--z700))" : over && i > limitTick ? "#FF6961" : "rgb(var(--accent))";
          return <line key={i} x1={x0} y1={y0} x2={x1} y2={y1} strokeWidth={i === limitTick ? 2.5 : 3.2} strokeLinecap="round" style={{ stroke: i === limitTick && !on ? "rgb(var(--z300))" : colour }} />;
        })}
      </svg>
      <figcaption className="absolute inset-x-0 bottom-0 text-center">
        <span className="font-serif text-[44px] leading-none text-zinc-50">{fmtHours(hours).replace("h", "")}</span>
        <span className="ml-1 text-[15px] text-zinc-400">/ {limit}h</span>
      </figcaption>
    </figure>
  );
}

/** Pay per day across the week as a smooth area line */
export function EarningsChart({ shifts, weekStart, today }: { shifts: Shift[]; weekStart: ISODate; today: ISODate }) {
  const days = weekDays(weekStart);
  const data = useMemo(
    () => days.map((d) => shifts.filter((s) => s.date === d).reduce((a, s) => a + calcShift(s).pay, 0)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [shifts, weekStart]
  );
  const W = 640;
  const H = 150;
  const pad = 10;
  const max = Math.max(1, ...data);
  const pts = data.map((v, i) => [pad + (i / 6) * (W - pad * 2), H - pad - (v / max) * (H - pad * 2 - 18)] as const);
  // Catmull-Rom → cubic Bézier for a soft line
  const path = pts
    .map(([x, y], i) => {
      if (i === 0) return `M ${x} ${y}`;
      const [x0, y0] = pts[Math.max(0, i - 2)];
      const [x1, y1] = pts[i - 1];
      const [x3, y3] = pts[Math.min(pts.length - 1, i + 1)];
      const c1x = x1 + (x - x0) / 6;
      const c1y = y1 + (y - y0) / 6;
      const c2x = x - (x3 - x1) / 6;
      const c2y = y - (y3 - y1) / 6;
      return `C ${c1x} ${c1y} ${c2x} ${c2y} ${x} ${y}`;
    })
    .join(" ");
  const area = `${path} L ${pts[6][0]} ${H} L ${pts[0][0]} ${H} Z`;
  const peak = data.indexOf(max);

  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} className="block h-[150px] w-full" preserveAspectRatio="none" aria-label={`Pay by day: ${days.map((d, i) => `${fmtDow(d)} ${fmtMoney(data[i])}`).join(", ")}`}>
        <defs>
          <linearGradient id="earn-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" style={{ stopColor: "rgb(var(--accent))", stopOpacity: 0.35 }} />
            <stop offset="1" style={{ stopColor: "rgb(var(--accent))", stopOpacity: 0 }} />
          </linearGradient>
        </defs>
        <path d={area} fill="url(#earn-fill)" />
        <path d={path} fill="none" strokeWidth={2.5} vectorEffect="non-scaling-stroke" style={{ stroke: "rgb(var(--accent))" }} />
        {max > 1 && <circle cx={pts[peak][0]} cy={pts[peak][1]} r={5} style={{ fill: "rgb(var(--accent))" }} />}
      </svg>
      <div className="mt-2 grid grid-cols-7 text-center text-[12px]">
        {days.map((d, i) => (
          <span key={d} className={d === today ? "font-semibold text-zinc-50" : "text-zinc-500"}>
            {fmtDow(d)}
            <span className="block text-zinc-400">{data[i] ? `$${Math.round(data[i])}` : "–"}</span>
          </span>
        ))}
      </div>
    </div>
  );
}
