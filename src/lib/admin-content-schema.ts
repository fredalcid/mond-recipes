import { z } from "zod";
import { parseYouTubeId } from "@/lib/content/types";

const SLUG = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const slug = z.string().trim().regex(SLUG, "Use lowercase letters, numbers and hyphens only.").max(90);
const opt = (max: number) => z.string().trim().max(max).transform((v) => v || null);
// An unchecked checkbox is simply missing from the form data.
const bool = z
  .string()
  .optional()
  .transform((v) => v === "on" || v === "true");
const status = z.enum(["draft", "pending", "published", "unpublished"]);
const uuidList = z.array(z.string().uuid()).max(30);

export const articleSchema = z.object({
  id: z.string().uuid().or(z.literal("")).optional(),
  title: z.string().trim().min(3, "Add a title.").max(160),
  slug,
  excerpt: opt(400),
  body: z.string().max(100000),
  hero_alt: opt(200),
  byline: opt(80),
  status,
  is_featured: bool,
  seo_title: opt(70),
  meta_description: opt(300),
  categories: z.array(z.string().regex(SLUG)).max(9),
  recipes: uuidList,
  remove_image: bool,
});

export const videoSchema = z.object({
  id: z.string().uuid().or(z.literal("")).optional(),
  title: z.string().trim().min(3, "Add a title.").max(160),
  slug,
  youtube: z
    .string()
    .trim()
    .transform((v, ctx) => {
      const id = parseYouTubeId(v);
      if (!id) ctx.addIssue({ code: "custom", message: "Paste a YouTube link or 11-character video ID." });
      return id ?? "";
    }),
  description: opt(5000),
  collection: opt(60),
  duration: z
    .string()
    .trim()
    .transform((v, ctx) => {
      if (!v) return null;
      const m = v.match(/^(?:(\d+):)?(\d{1,2}):(\d{2})$|^(\d+)$/);
      if (!m) {
        ctx.addIssue({ code: "custom", message: "Use minutes:seconds, e.g. 4:35." });
        return null;
      }
      return m[4] ? Number(m[4]) : Number(m[1] ?? 0) * 3600 + Number(m[2]) * 60 + Number(m[3]);
    }),
  status,
  is_featured: bool,
  seo_title: opt(70),
  meta_description: opt(300),
  recipes: uuidList,
});

export const productSchema = z.object({
  id: z.string().uuid().or(z.literal("")).optional(),
  name: z.string().trim().min(2, "Add a product name.").max(140),
  slug,
  description: opt(600),
  image_alt: opt(200),
  category: z.string().regex(SLUG).or(z.literal("")),
  brand: opt(80),
  retailer: z.string().regex(/^\d*$/),
  affiliate_url: z.string().trim().url("Paste the full product link.").startsWith("https://", "Links must start with https://").max(2000),
  is_active: bool,
  is_featured: bool,
  is_sponsored: bool,
  display_order: z.coerce.number().int().min(0).max(9999).default(0),
  remove_image: bool,
});

export const retailerSchema = z.object({
  id: z.string().regex(/^\d*$/).optional(),
  name: z.string().trim().min(2).max(80),
  slug,
  website_url: z.string().trim().url().startsWith("https://").or(z.literal("")).transform((v) => v || null),
  tracking_params: z
    .string()
    .trim()
    .regex(/^[A-Za-z0-9_.~=&%-]*$/, "Only letters, numbers and = & - _ . ~ %, e.g. tag=mondrecipes-20")
    .max(200)
    .transform((v) => v || null),
  is_active: bool,
});

export const placementSchema = z
  .object({
    key: z.string().regex(/^[a-z0-9_]+$/),
    is_enabled: bool,
    adsense_slot: z.string().trim().regex(/^(\d{6,20})?$/, "AdSense slot IDs are numbers only.").transform((v) => v || null),
    ad_format: z.enum(["auto", "fluid", "rectangle", "horizontal"]),
    fallback_kind: z.enum(["none", "newsletter", "house"]),
    house_text: opt(160),
    house_url: z.string().trim().regex(/^(https:\/\/\S+|\/\S*)?$/, "Use a full https:// link or a path like /shop.").transform((v) => v || null),
  })
  .refine((v) => v.fallback_kind !== "house" || (v.house_text && v.house_url), { message: "House ads need text and a link.", path: ["house_text"] });

/** Reads repeated checkbox / multi-select values from FormData. */
export function formToObject(fd: FormData, lists: string[]) {
  const out: Record<string, unknown> = {};
  for (const [k, v] of fd.entries()) if (typeof v === "string" && !lists.includes(k)) out[k] = v;
  for (const k of lists) out[k] = fd.getAll(k).filter((v): v is string => typeof v === "string" && v !== "");
  return out;
}
