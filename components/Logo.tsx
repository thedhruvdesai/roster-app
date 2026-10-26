/**
 * ShiftDesk mark: an "S" drawn as two three-quarter arcs of a clock.
 * The top arc is night (indigo), the bottom arc is day (white),
 * and they meet in the middle: the shift change.
 */
export function LogoMark({ size = 32, tile = true, className }: { size?: number; tile?: boolean; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" className={className} aria-hidden="true">
      {tile && (
        <>
          <defs>
            <linearGradient id="sd-tile" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#000000" />
              <stop offset="1" stopColor="#000000" />
            </linearGradient>
          </defs>
          <rect width="100" height="100" rx="22.5" fill="url(#sd-tile)" />
          <rect x="0.5" y="0.5" width="99" height="99" rx="22" fill="none" stroke="#FFFFFF" strokeOpacity="0.14" />
        </>
      )}
      <path d="M66 34 A16 16 0 1 0 50 50" fill="none" stroke="#7D7AFF" strokeWidth="11" strokeLinecap="round" />
      {/* thin cut where night crosses over day */}
      <path d="M50 50 A16 16 0 1 1 34 66" fill="none" stroke="#000" strokeWidth="17" strokeLinecap="round" />
      <path d="M50 50 A16 16 0 1 1 34 66" fill="none" stroke="#F2F2F7" strokeWidth="11" strokeLinecap="round" />
    </svg>
  );
}

export function Logo({ size = 32 }: { size?: number }) {
  return (
    <span className="inline-flex items-center gap-2.5">
      <LogoMark size={size} />
      <span className="text-[19px] font-bold tracking-[-0.03em] text-zinc-50">
        ShiftDesk
      </span>
    </span>
  );
}
