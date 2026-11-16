import { z } from "zod";
import { UNITS } from "@/lib/units";

const SLUG = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const slugList = z.array(z.string().regex(SLUG)).max(60);
const optInt = (min: number, max: number) =>
  z.union([z.literal(""), z.coerce.number().int().min(min).max(max)]).optional().transform((v) => (v === "" || v === undefined ? "" : String(v)));
const text = (max: number) => z.string().trim().max(max).optional().default("");

export const recipePayloadSchema = z
  .object({
    id: z.string().uuid().optional().or(z.literal("")),
    kind: z.enum(["food", "drink"]),
    title: z.string().trim().min(3, "Give the recipe a title (at least 3 characters).").max(140),
    slug: z.string().trim().regex(SLUG, "Use lowercase letters, numbers and hyphens only.").max(80),
    summary: text(600),
    status: z.enum(["draft", "pending", "published", "unpublished", "rejected"]),
    verification: z.enum(["community", "editorial", "test_kitchen"]),
    verificationConfirmed: z.boolean().optional(),
    prep_minutes: optInt(0, 2880),
    cook_minutes: optInt(0, 2880),
    servings: optInt(1, 100),
    serving_unit: text(30),
    difficulty: z.enum(["", "easy", "medium", "hard"]).default(""),
    tips: text(4000),
    substitutions: text(4000),
    drink_category: z.string().regex(SLUG).or(z.literal("")).default(""),
    alcohol_percent: z.union([z.literal(""), z.coerce.number().min(0).max(100)]).optional().transform((v) => (v === "" || v === undefined ? "" : String(v))),
    hero_image_path: text(300),
    remove_image: z.boolean().optional().default(false),
    seo_title: text(70),
    meta_description: text(300),
    canonical_url: z
      .string()
      .trim()
      .max(500)
      .refine((v) => v === "" || /^https:\/\/\S+$/.test(v), "Use a full https:// address, or leave it empty.")
      .optional()
      .default(""),
    noindex: z.boolean().optional().default(false),
    remove_og_image: z.boolean().optional().default(false),
    countries: slugList.default([]),
    regions: slugList.default([]),
    cuisines: z.array(z.string().trim().min(2).max(60)).max(10).default([]),
    categories: slugList.default([]),
    diets: slugList.default([]),
    allergens: slugList.default([]),
    ingredients: z
      .array(
        z.object({
          name: z.string().trim().max(120),
          quantity: z.union([z.literal(""), z.coerce.number().positive().max(100000)]).transform((v) => (v === "" ? "" : String(v))),
          unit: z.enum(["", ...UNITS] as [string, ...string[]]),
          note: text(200),
          group: text(60),
        }),
      )
      .max(80),
    steps: z
      .array(
        z.object({
          body: z.string().trim().max(2000),
          timer_minutes: z.union([z.literal(""), z.coerce.number().min(0).max(1440)]).optional(),
        }),
      )
      .max(60),
    source: z.object({
      type: z.enum(["", "original", "family", "adapted", "licensed", "test_kitchen"]).default(""),
      description: text(300),
      url: z.string().trim().url().max(500).or(z.literal("")).default(""),
    }),
  })
  .superRefine((v, ctx) => {
    const ingredients = v.ingredients.filter((i) => i.name);
    const steps = v.steps.filter((s) => s.body);
    if (v.status === "published") {
      if (ingredients.length === 0) ctx.addIssue({ code: "custom", path: ["ingredients"], message: "Add at least one ingredient before publishing." });
      if (steps.length === 0) ctx.addIssue({ code: "custom", path: ["steps"], message: "Add at least one step before publishing." });
      if (v.countries.length === 0) ctx.addIssue({ code: "custom", path: ["countries"], message: "Choose at least one country before publishing." });
    }
    if (v.kind === "drink" && !v.drink_category) ctx.addIssue({ code: "custom", path: ["drink_category"], message: "Choose a drink type." });
    if (v.verification === "test_kitchen" && !v.verificationConfirmed)
      ctx.addIssue({ code: "custom", path: ["verification"], message: "Confirm the recipe passed test-kitchen testing before giving it this badge." });
    if (v.source.type === "licensed" && !v.source.description)
      ctx.addIssue({ code: "custom", path: ["source"], message: "Describe the licence for licensed recipes." });
  });

export type RecipePayload = z.input<typeof recipePayloadSchema>;

/** Shape sent to the database function admin_save_recipe. */
export function toDatabasePayload(v: z.output<typeof recipePayloadSchema>) {
  const { verificationConfirmed: _confirmed, steps, ...rest } = v;
  void _confirmed;
  return {
    ...rest,
    id: v.id || null,
    steps: steps
      .filter((s) => s.body)
      .map((s) => ({ body: s.body, timer_seconds: s.timer_minutes ? String(Math.round(Number(s.timer_minutes) * 60)) : "" })),
    ingredients: v.ingredients.filter((i) => i.name),
  };
}

export const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/avif"] as const;
export const MAX_IMAGE_BYTES = 8 * 1024 * 1024;

export function validateImage(file: File | null): string | null {
  if (!file || file.size === 0) return null;
  if (!(IMAGE_TYPES as readonly string[]).includes(file.type)) return "Upload a JPEG, PNG, WebP or AVIF image.";
  if (file.size > MAX_IMAGE_BYTES) return "Images must be 8 MB or smaller.";
  return null;
}

/** Reads the first bytes of an upload and reports the real image type (the browser's label can be faked). */
export function sniffImageType(bytes: Uint8Array): string | null {
  const b = (i: number) => bytes[i];
  if (b(0) === 0xff && b(1) === 0xd8 && b(2) === 0xff) return "image/jpeg";
  if (b(0) === 0x89 && b(1) === 0x50 && b(2) === 0x4e && b(3) === 0x47) return "image/png";
  const ascii = (from: number, to: number) => String.fromCharCode(...bytes.slice(from, to));
  if (ascii(0, 4) === "RIFF" && ascii(8, 12) === "WEBP") return "image/webp";
  if (ascii(4, 8) === "ftyp" && /^(avif|avis|mif1|msf1)$/.test(ascii(8, 12))) return "image/avif";
  return null;
}

/** validateImage plus a check that the file really is the image type it claims to be. */
export async function checkImageFile(file: File | null): Promise<string | null> {
  const problem = validateImage(file);
  if (problem || !file || file.size === 0) return problem;
  const head = new Uint8Array(await file.slice(0, 16).arrayBuffer());
  const real = sniffImageType(head);
  if (!real) return "This file isn't a valid JPEG, PNG, WebP or AVIF image.";
  if (real !== file.type) return "The file type doesn't match its contents. Save the image again and retry.";
  return null;
}
