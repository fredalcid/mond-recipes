const tones = {
  sand: "bg-sand",
  olive: "bg-forest-100",
  gold: "bg-[#f8e3b4]",
  cream: "bg-[#f6efe2]",
} as const;

export type PhotoTone = keyof typeof tones;

/**
 * Stand-in for food photography until licensed photos are uploaded.
 * It is decorative, so screen readers skip it; the card text carries the meaning.
 */
export function PhotoPlaceholder({
  tone = "sand",
  label = "Photo coming soon",
  className = "",
}: {
  tone?: PhotoTone;
  label?: string;
  className?: string;
}) {
  return (
    <div
      aria-hidden="true"
      className={`relative flex items-center justify-center overflow-hidden ${tones[tone]} ${className}`}
    >
      <span className="absolute inset-0 bg-[radial-gradient(rgb(30_55_19/0.08)_1.4px,transparent_1.4px)] bg-size-[12px_12px]" />
      <span className="relative flex flex-col items-center gap-2 text-forest-900/55">
        <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 7.5h3.2L8 5h8l1.8 2.5H21V19H3z" />
          <circle cx="12" cy="13" r="3.6" />
        </svg>
        <span className="text-xs font-medium">{label}</span>
      </span>
    </div>
  );
}
