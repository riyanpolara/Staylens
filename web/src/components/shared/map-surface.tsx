/** Decorative terrain so map placeholders read as a map (parks, water, roads). */
export function MapSurface() {
  return (
    <svg
      aria-hidden
      className="absolute inset-0 w-full h-full"
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
    >
      <rect width="100" height="100" fill="#eff4ff" />
      <ellipse cx="22" cy="30" rx="16" ry="11" fill="#b1f0ce" opacity="0.5" />
      <ellipse cx="78" cy="18" rx="12" ry="8" fill="#b1f0ce" opacity="0.4" />
      <ellipse cx="68" cy="78" rx="18" ry="12" fill="#b1f0ce" opacity="0.45" />
      <ellipse cx="12" cy="82" rx="10" ry="7" fill="#b1f0ce" opacity="0.35" />
      <path
        d="M -2 58 C 20 52, 32 66, 50 60 S 82 44, 104 52 L 104 46 C 82 38, 66 56, 48 54 S 18 46, -2 52 Z"
        fill="#dee9fc"
      />
      <g stroke="#ffffff" strokeWidth="1.6" fill="none" opacity="0.9">
        <path d="M 0 22 H 100" />
        <path d="M 0 72 H 100" />
        <path d="M 30 0 V 100" />
        <path d="M 62 0 V 100" />
        <path d="M 0 40 C 30 38, 60 46, 100 38" />
      </g>
      <g stroke="#d9e3f6" strokeWidth="0.5" fill="none" opacity="0.8">
        <path d="M 0 10 H 100" /><path d="M 0 50 H 100" /><path d="M 0 88 H 100" />
        <path d="M 14 0 V 100" /><path d="M 46 0 V 100" /><path d="M 84 0 V 100" />
      </g>
    </svg>
  );
}
