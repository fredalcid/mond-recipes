import type { Verification } from "@/lib/data/types";

/**
 * Shows how a recipe was reviewed. Community recipes get no badge on cards.
 * The level comes from the database and can only be set by editors.
 */
export function VerificationBadge({ level, compact = false }: { level: Verification; compact?: boolean }) {
  if (level === "community") {
    if (compact) return null;
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-sand px-3 py-1 text-xs font-semibold text-ink">
        Community recipe
      </span>
    );
  }
  const testKitchen = level === "test_kitchen";
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${
        testKitchen ? "bg-forest-900 text-cream" : "bg-forest-100 text-forest-900"
      }`}
    >
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M20 6L9 17l-5-5" />
      </svg>
      {testKitchen ? "Test-kitchen verified" : "Editorially reviewed"}
    </span>
  );
}
