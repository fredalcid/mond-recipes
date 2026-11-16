/** "1 hr 15 min", "45 min" */
export function formatMinutes(total: number | null | undefined): string {
  if (total == null || !Number.isFinite(total) || total < 0) return "—";
  const minutes = Math.round(total);
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m === 0 ? `${h} hr` : `${h} hr ${m} min`;
}

/** URL-friendly slug that keeps accented letters readable: "Mònd Crème" -> "mond-creme" */
export function slugify(input: string): string {
  return input
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

/** Average rating text that never invents data. */
export function formatRating(average: number | null | undefined, count: number | null | undefined): string {
  if (!count || count < 1 || average == null) return "Not yet rated";
  const reviews = count === 1 ? "1 rating" : `${count.toLocaleString("en-CA")} ratings`;
  return `${average.toFixed(1)} · ${reviews}`;
}

export function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "—" : d.toLocaleDateString("en-CA", { year: "numeric", month: "short", day: "numeric" });
}
