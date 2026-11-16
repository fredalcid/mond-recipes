/**
 * Ingredient quantities: scaling and metric/US conversion.
 *
 * - Volume converts to volume and weight converts to weight exactly.
 * - Volume converts to weight ONLY when the ingredient has a known density
 *   (grams per cup). Those results are marked approximate.
 * - Counted items (cloves, pieces, pinches…) never change units.
 * Cups are US customary cups (236.6 ml).
 */

export type MeasureSystem = "original" | "metric" | "us";

const ML: Record<string, number> = { tsp: 4.92892, tbsp: 14.7868, cup: 236.588, fl_oz: 29.5735, ml: 1, l: 1000 };
const G: Record<string, number> = { g: 1, kg: 1000, oz: 28.3495, lb: 453.592 };
const CUP_ML = ML.cup;

export type Quantity = { quantity: number | null; unit: string | null; approximate: boolean };

export function scale(quantity: number | null, factor: number): number | null {
  if (quantity == null) return null;
  return quantity * factor;
}

export function convert(q: number | null, unit: string | null, system: MeasureSystem, gramsPerCup: number | null = null): Quantity {
  if (q == null || unit == null || system === "original") return { quantity: q, unit, approximate: false };

  if (system === "metric") {
    if (unit in G) {
      const g = q * G[unit];
      return g >= 1000 ? { quantity: g / 1000, unit: "kg", approximate: false } : { quantity: g, unit: "g", approximate: false };
    }
    if (unit === "cup" || unit === "fl_oz") {
      const ml = q * ML[unit];
      if (gramsPerCup && unit === "cup") return { quantity: (ml / CUP_ML) * gramsPerCup, unit: "g", approximate: true };
      return ml >= 1000 ? { quantity: ml / 1000, unit: "l", approximate: false } : { quantity: ml, unit: "ml", approximate: false };
    }
    return { quantity: q, unit, approximate: false }; // tsp, tbsp, ml, l and counts
  }

  // US customary
  if (unit === "g" || unit === "kg") {
    const oz = (q * G[unit]) / G.oz;
    return oz >= 16 ? { quantity: oz / 16, unit: "lb", approximate: false } : { quantity: oz, unit: "oz", approximate: false };
  }
  if (unit === "ml" || unit === "l") {
    const ml = q * ML[unit];
    if (ml >= CUP_ML / 4) return { quantity: ml / CUP_ML, unit: "cup", approximate: false };
    if (ml >= ML.tbsp) return { quantity: ml / ML.tbsp, unit: "tbsp", approximate: false };
    return { quantity: ml / ML.tsp, unit: "tsp", approximate: false };
  }
  return { quantity: q, unit, approximate: false };
}

const FRACTIONS: [number, string][] = [
  [0, ""], [1 / 8, "⅛"], [1 / 4, "¼"], [1 / 3, "⅓"], [1 / 2, "½"], [2 / 3, "⅔"], [3 / 4, "¾"], [1, ""],
];

/** Kitchen-friendly number: fractions for spoons/cups/counts, rounded numbers for g and ml. */
export function formatQuantity(q: number | null, unit: string | null): string {
  if (q == null) return "";
  if (unit === "g" || unit === "ml") {
    if (q >= 100) return String(Math.round(q / 5) * 5);
    if (q >= 10) return String(Math.round(q));
    return String(Math.round(q * 10) / 10);
  }
  if (unit === "kg" || unit === "l") return String(Math.round(q * 100) / 100);
  const whole = Math.floor(q + 1e-9);
  const rest = q - whole;
  let best = FRACTIONS[0];
  for (const f of FRACTIONS) if (Math.abs(rest - f[0]) < Math.abs(rest - best[0])) best = f;
  const w = best[0] === 1 ? whole + 1 : whole;
  if (w === 0 && best[1] === "") return q > 0 ? "⅛" : "0";
  return `${w > 0 ? w : ""}${best[1]}`;
}

const LABELS: Record<string, [string, string]> = {
  g: ["g", "g"], kg: ["kg", "kg"], ml: ["ml", "ml"], l: ["L", "L"], tsp: ["tsp", "tsp"], tbsp: ["tbsp", "tbsp"],
  cup: ["cup", "cups"], fl_oz: ["fl oz", "fl oz"], oz: ["oz", "oz"], lb: ["lb", "lb"],
  piece: ["", ""], clove: ["clove", "cloves"], can: ["can", "cans"], pinch: ["pinch", "pinches"], sprig: ["sprig", "sprigs"],
  bunch: ["bunch", "bunches"], stick: ["stick", "sticks"], pod: ["pod", "pods"], leaf: ["", ""],
};

export function unitLabel(unit: string | null, quantity: number | null): string {
  if (!unit) return "";
  const l = LABELS[unit];
  if (!l) return unit;
  return quantity != null && quantity > 1.01 ? l[1] : l[0];
}

export const UNITS = Object.keys(LABELS);
