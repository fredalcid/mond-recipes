import type { ReactNode } from "react";

type Tone = "sample" | "verified" | "editorial" | "community" | "sponsored" | "neutral";

const tones: Record<Tone, string> = {
  sample: "bg-gold-500 text-forest-950",
  verified: "bg-forest-900 text-cream",
  editorial: "bg-forest-100 text-forest-900",
  community: "bg-sand text-ink",
  sponsored: "bg-ink text-cream",
  neutral: "bg-white/80 text-ink",
};

export function Badge({ tone = "neutral", children }: { tone?: Tone; children: ReactNode }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold tracking-wide uppercase ${tones[tone]}`}
    >
      {children}
    </span>
  );
}

/** Marks demonstration content so it is never mistaken for real data. */
export function SampleBadge() {
  return <Badge tone="sample">Sample</Badge>;
}
