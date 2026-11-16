import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { supabaseAnonKey, supabaseUrl } from "@/lib/env";
import { supabaseSource } from "@/lib/data/supabase-source";
import type { ContentSource } from "./types";
import { readingMinutes, withTracking, youtubeThumbnail } from "./types";

/* eslint-disable @typescript-eslint/no-explicit-any -- untyped PostgREST rows, mapped explicitly */

let anon: SupabaseClient | null = null;
const db = () => (anon ??= createClient(supabaseUrl, supabaseAnonKey, { auth: { persistSession: false, autoRefreshToken: false } }));

export function mediaUrl(path: string | null | undefined): string | null {
  if (!path) return null;
  if (/^https?:\/\//.test(path)) return path;
  return `${supabaseUrl}/storage/v1/object/public/media/${path.split("/").map(encodeURIComponent).join("/")}`;
}

function fail(error: { message: string } | null, what: string) {
  if (error) throw new Error(`${what}: ${error.message}`);
}

const ARTICLE_LIST = "id, slug, title, excerpt, hero_image_path, hero_alt, byline, published_at, is_featured, is_sample, body, author:profiles ( display_name ), article_category_links ( article_categories ( slug, name ) )";

function mapArticle(a: any) {
  return {
    id: a.id,
    slug: a.slug,
    title: a.title,
    excerpt: a.excerpt,
    imageUrl: mediaUrl(a.hero_image_path),
    imageAlt: a.hero_alt,
    categories: (a.article_category_links ?? []).map((l: any) => l.article_categories).filter(Boolean),
    byline: a.byline || a.author?.display_name || "Mònd Recipes",
    publishedAt: a.published_at,
    isFeatured: a.is_featured,
    isSample: a.is_sample,
    readingMinutes: readingMinutes(a.body ?? ""),
  };
}

function mapVideo(v: any) {
  return {
    id: v.id,
    slug: v.slug,
    title: v.title,
    description: v.description,
    youtubeId: v.provider_video_id,
    thumbnailUrl: youtubeThumbnail(v.provider_video_id),
    collection: v.collection,
    durationSeconds: v.duration_seconds,
    publishedAt: v.published_at,
    isFeatured: v.is_featured,
  };
}

async function recipesByIds(ids: string[]) {
  if (!ids.length) return [];
  const { data } = await db().from("recipes").select("slug, kind").in("id", ids).eq("status", "published");
  const out = [];
  for (const r of (data ?? []) as any[]) {
    const d = await supabaseSource.getRecipe(r.slug, r.kind);
    if (d) out.push(d);
  }
  return out;
}

export const supabaseContent: ContentSource = {
  mode: "live",

  async listArticles(q = {}) {
    const size = q.pageSize ?? 12;
    const page = Math.max(1, q.page ?? 1);
    let query = db()
      .from("articles")
      .select(q.category ? `${ARTICLE_LIST.replace("article_category_links (", "article_category_links!inner (")}` : ARTICLE_LIST, { count: "exact" })
      .eq("status", "published")
      .order("is_featured", { ascending: false })
      .order("published_at", { ascending: false })
      .range((page - 1) * size, page * size - 1);
    if (q.category) query = query.eq("article_category_links.article_categories.slug", q.category);
    const { data, error, count } = await query;
    fail(error, "listArticles");
    return { items: ((data ?? []) as any[]).map(mapArticle), total: count ?? 0 };
  },

  async getArticle(slug) {
    const { data, error } = await db()
      .from("articles")
      .select(`${ARTICLE_LIST}, updated_at, seo_title, meta_description, canonical_url, noindex, article_recipes ( recipe_id )`)
      .eq("slug", slug)
      .eq("status", "published")
      .maybeSingle();
    fail(error, "getArticle");
    if (!data) return null;
    const a = data as any;
    return {
      ...mapArticle(a),
      body: a.body,
      updatedAt: a.updated_at,
      seoTitle: a.seo_title,
      canonicalUrl: a.canonical_url,
      noindex: Boolean(a.noindex),
      metaDescription: a.meta_description,
      recipes: await recipesByIds((a.article_recipes ?? []).map((x: any) => x.recipe_id)),
    };
  },

  async listArticleCategories() {
    const { data, error } = await db().from("article_categories").select("slug, name").order("display_order");
    fail(error, "listArticleCategories");
    return data ?? [];
  },

  async listVideos(limit = 24) {
    const { data, error } = await db()
      .from("videos")
      .select("*")
      .eq("status", "published")
      .order("is_featured", { ascending: false })
      .order("published_at", { ascending: false })
      .limit(limit);
    fail(error, "listVideos");
    return ((data ?? []) as any[]).map(mapVideo);
  },

  async getVideo(slug) {
    const { data, error } = await db().from("videos").select("*, video_recipes ( recipe_id )").eq("slug", slug).eq("status", "published").maybeSingle();
    fail(error, "getVideo");
    if (!data) return null;
    const v = data as any;
    return {
      ...mapVideo(v),
      seoTitle: v.seo_title,
      metaDescription: v.meta_description,
      canonicalUrl: v.canonical_url,
      noindex: Boolean(v.noindex),
      recipes: await recipesByIds((v.video_recipes ?? []).map((x: any) => x.recipe_id)),
    };
  },

  async listProducts(category) {
    let q = db()
      .from("products")
      .select(`id, slug, name, description, image_path, image_alt, brand, is_featured, is_sponsored, retailers ( name ), product_categories${category ? "!inner" : ""} ( slug, name )`)
      .eq("is_active", true)
      .neq("link_status", "broken")
      .order("is_featured", { ascending: false })
      .order("display_order")
      .order("name")
      .limit(200);
    if (category) q = q.eq("product_categories.slug", category);
    const { data, error } = await q;
    fail(error, "listProducts");
    return ((data ?? []) as any[]).map((p) => ({
      id: p.id,
      slug: p.slug,
      name: p.name,
      description: p.description,
      imageUrl: mediaUrl(p.image_path),
      imageAlt: p.image_alt,
      category: p.product_categories ?? null,
      brand: p.brand,
      retailer: p.retailers?.name ?? null,
      isFeatured: p.is_featured,
      isSponsored: p.is_sponsored,
      isSample: false,
    }));
  },

  async listProductCategories() {
    const { data, error } = await db().from("product_categories").select("slug, name, products ( count )").eq("products.is_active", true).order("display_order");
    fail(error, "listProductCategories");
    return ((data ?? []) as any[]).map((c) => ({ slug: c.slug, name: c.name, count: c.products?.[0]?.count ?? 0 }));
  },

  async getProductLink(slug) {
    const { data, error } = await db()
      .from("products")
      .select("id, affiliate_url, retailers ( tracking_params )")
      .eq("slug", slug)
      .eq("is_active", true)
      .maybeSingle();
    fail(error, "getProductLink");
    if (!data) return null;
    const p = data as any;
    return { id: p.id, url: withTracking(p.affiliate_url, p.retailers?.tracking_params ?? null) };
  },

  async listAdPlacements() {
    const { data, error } = await db().from("ad_placements").select("*");
    fail(error, "listAdPlacements");
    return Object.fromEntries(
      ((data ?? []) as any[]).map((p) => [
        p.key,
        {
          key: p.key,
          isEnabled: p.is_enabled,
          adsenseSlot: p.adsense_slot,
          format: p.ad_format,
          fallback: p.fallback_kind,
          houseText: p.house_text,
          houseUrl: p.house_url,
        },
      ]),
    );
  },

  async listIndexable() {
    const [a, v] = await Promise.all([
      db().from("articles").select("slug, updated_at").eq("status", "published").eq("is_sample", false).eq("noindex", false),
      db().from("videos").select("slug, updated_at").eq("status", "published").eq("noindex", false),
    ]);
    return [
      ...((a.data ?? []) as any[]).map((x) => ({ path: `/articles/${x.slug}`, updatedAt: x.updated_at })),
      ...((v.data ?? []) as any[]).map((x) => ({ path: `/videos/${x.slug}`, updatedAt: x.updated_at })),
    ];
  },
};
