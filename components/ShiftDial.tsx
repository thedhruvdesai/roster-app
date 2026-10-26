"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useState } from "react";
import type { GlowArc } from "./DialGlow";

// three.js only downloads after the page has painted, in its own chunk
const DialGlow = dynamic(() => import("./DialGlow"), { ssr: false });
import { calcShift } from "@/lib/pay";
import type { Employer, Shift } from "@/lib/types";
import { BADGE_HEX } from "@/lib/ui";

const H = 3_600_000;
const SIZE = 268;
const C = SIZE / 2;
const R = 96; // ring radius
const W = 16; // ring thickness

/** Clock angle in degrees for a timestamp: midnight at the top, clockwise, like the Watch sleep dial */
function angleOf(t: number) {
  const d = new Date(t);
  return ((d.getHours() + d.getMinutes() / 60) / 24) * 360;
}

function point(deg: number, r = R) {
  const rad = ((deg - 90) * Math.PI) / 180;
  return [C + r * Math.cos(rad), C + r * Math.sin(rad)] as const;
}

function arcPath(t0: number, t1: number) {
  const a0 = angleOf(t0);
  const sweep = Math.min(359.5, ((t1 - t0) / H) * 15);
  const [x0, y0] = point(a0);
  const [x1, y1] = point(a0 + sweep);
  return `M ${x0} ${y0} A ${R} ${R} 0 ${sweep > 180 ? 1 : 0} 1 ${x1} ${y1}`;
}

interface Props {
  shifts: Shift[];
  employers: Employer[];
  now: number;
  /** Shift highlighted in the centre (current or next) */
  focus?: Shift;
  centre: string;
  caption: string;
}

/**
 * The next 24 hours on a clock face. Each shift is an arc in its employer colour,
 * the indigo hand is now. Arcs draw in once when the page loads.
 */
export function ShiftDial({ shifts, employers, now, focus, centre, caption }: Props) {
  const arcs = useMemo(() => {
    const end = now + 24 * H;
    const out: { id: string; d: string; color: string; focus: boolean; label: string; start: number; sweep: number }[] = [];
    for (const s of shifts) {
      const c = calcShift(s);
      let a = c.startAt.getTime();
      let b = c.endAt.getTime();
      const isFocus = focus?.id === s.id;
      if (b <= now || (a >= end && !isFocus)) continue;
      a = Math.max(a, now);
      if (!isFocus) b = Math.min(b, end);
      const e = employers.find((x) => x.id === s.employerId);
      out.push({
        id: s.id,
        d: arcPath(a, b),
        color: e ? BADGE_HEX[e.color] : "#8E8E93",
        focus: isFocus,
        label: `${e?.code ?? "Shift"} ${s.start} to ${s.end}`,
        start: angleOf(a),
        sweep: Math.min(359.5, ((b - a) / H) * 15),
      });
    }
    return out;
  }, [shifts, employers, now, focus]);

  // Round to whole degrees so the dust only re-scatters when a shift really changes
  const glowKey = arcs.map((a) => `${Math.round(a.start)}:${Math.round(a.sweep)}:${a.color}`).join("|");
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const glowArcs = useMemo<GlowArc[]>(() => arcs.map((a) => ({ start: a.start, sweep: a.sweep, color: a.color })), [glowKey]);

  // Wait for first paint and a quiet moment before starting WebGL
  const [glow, setGlow] = useState(false);
  useEffect(() => {
    const start = () => setGlow(true);
    const w = window as Window & { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number };
    if (w.requestIdleCallback) w.requestIdleCallback(start, { timeout: 1500 });
    else setTimeout(start, 400);
  }, []);

  const nowDeg = angleOf(now);
  const [hx, hy] = point(nowDeg, R - W / 2 - 4);
  const [hx2, hy2] = point(nowDeg, R + W / 2 + 4);

  return (
    <figure className="relative mx-auto w-[min(268px,76vw)] shrink-0" aria-label={`Next 24 hours: ${arcs.map((a) => a.label).join(", ") || "no shifts"}`}>
      {glow && (
        <div className="pointer-events-none absolute -inset-[15%]">
          <DialGlow arcs={glowArcs} />
        </div>
      )}
      <svg viewBox={`0 0 ${SIZE} ${SIZE}`} className="relative block h-auto w-full">
        {/* track */}
        <circle cx={C} cy={C} r={R} fill="none" stroke="#2C2C2E" strokeOpacity={0.6} strokeWidth={W} />
        {/* hour ticks */}
        {Array.from({ length: 24 }, (_, h) => {
          const major = h % 6 === 0;
          const [x0, y0] = point(h * 15, R + W / 2 + 4);
          const [x1, y1] = point(h * 15, R + W / 2 + (major ? 10 : 7));
          return <line key={h} x1={x0} y1={y0} x2={x1} y2={y1} stroke={major ? "#8E8E93" : "#48484A"} strokeWidth={major ? 2 : 1} strokeLinecap="round" />;
        })}
        {[0, 6, 12, 18].map((h) => {
          const [x, y] = point(h * 15, R + W / 2 + 20);
          return (
            <text key={h} x={x} y={y} textAnchor="middle" dominantBaseline="central" fill="#8E8E93" fontSize="11" fontWeight="600">
              {String(h).padStart(2, "0")}
            </text>
          );
        })}
        {/* shifts */}
        {arcs.map((a, i) => (
          <path
            key={a.id}
            d={a.d}
            fill="none"
            stroke={a.color}
            strokeWidth={a.focus ? W : W - 6}
            strokeLinecap="round"
            pathLength={1}
            className="dial-arc"
            style={{ animationDelay: `${120 + i * 90}ms`, opacity: a.focus ? 1 : 0.75 }}
          />
        ))}
        {/* now hand */}
        <line x1={hx} y1={hy} x2={hx2} y2={hy2} stroke="#7D7AFF" strokeWidth={3} strokeLinecap="round" />
        <circle cx={hx} cy={hy} r={3.5} fill="#7D7AFF" />
      </svg>
      <figcaption className="absolute inset-0 flex flex-col items-center justify-center text-center">
        <span className="text-[28px] font-bold leading-none tracking-tight text-zinc-50">{centre}</span>
        <span className="mt-1.5 text-[13px] font-medium text-zinc-400">{caption}</span>
      </figcaption>
    </figure>
  );
}

