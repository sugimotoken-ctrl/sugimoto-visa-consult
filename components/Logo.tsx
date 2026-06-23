// Sugimoto Visa wordmark — orange flame mark + serif wordmark.
// Recreated in SVG/markup so it stays crisp everywhere and matches brand colors.
export function FlameMark({ size = 36 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      {/* Stylized flame / brushstroke */}
      <path
        d="M38 4c2 10-8 14-12 22-4 8 0 16 6 18-9 1-18-6-18-17 0-13 16-16 24-23z"
        fill="#DD6B3E"
      />
      <path
        d="M30 26c5 4 6 10 3 16-2 5-7 7-7 12 6-1 13-6 14-15 1-7-4-12-10-13z"
        fill="#1B2A4A"
      />
    </svg>
  );
}

export function Logo({
  size = 36,
  stacked = false,
}: {
  size?: number;
  stacked?: boolean;
}) {
  return (
    <div className="flex items-center gap-3">
      <FlameMark size={size} />
      <div className={stacked ? "leading-none" : "leading-tight"}>
        <div
          className="font-serif tracking-[0.18em] text-[var(--navy)]"
          style={{ fontSize: size * 0.62, fontWeight: 600 }}
        >
          SUGIMOTO
        </div>
        <div
          className="tracking-[0.45em] text-[var(--navy)]"
          style={{ fontSize: size * 0.32 }}
        >
          VISA
        </div>
      </div>
    </div>
  );
}
