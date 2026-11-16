import type { RecipeSummary } from "@/lib/data/types";

export type Option = { slug: string; name: string };

export type ArticleSummary = {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  imageUrl: string | null;
  imageAlt: string | null;
  categories: Option[];
  byline: string;
  publishedAt: string | null;
  isFeatured: boolean;
  isSample: boolean;
  readingMinutes: number;
};

export type ArticleDetail = ArticleSummary & {
  body: string;
  updatedAt: string | null;
  seoTitle: string | null;
  metaDescription: string | null;
  recipes: RecipeSummary[];
};

export type VideoSummary = {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  youtubeId: string;
  thumbnailUrl: string;
  collection: string | null;
  durationSeconds: number | null;
  publishedAt: string | null;
  isFeatured: boolean;
};

export type VideoDetail = VideoSummary & { seoTitle: string | null; metaDescription: string | null; recipes: RecipeSummary[] };

export type Product = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  imageUrl: string | null;
  imageAlt: string | null;
  category: Option | null;
  brand: string | null;
  retailer: string | null;
  isFeatured: boolean;
  isSponsored: boolean;
  isSample: boolean;
};

export type AdPlacement = {
  key: string;
  isEnabled: boolean;
  adsenseSlot: string | null;
  format: "auto" | "fluid" | "rectangle" | "horizontal";
  fallback: "none" | "newsletter" | "house";
  houseText: string | null;
  houseUrl: string | null;
};

export type ArticleQuery = { category?: string; page?: number; pageSize?: number };

export interface ContentSource {
  readonly mode: "live" | "sample";
  listArticles(q?: ArticleQuery): Promise<{ items: ArticleSummary[]; total: number }>;
  getArticle(slug: string): Promise<ArticleDetail | null>;
  listArticleCategories(): Promise<Option[]>;
  listVideos(limit?: number): Promise<VideoSummary[]>;
  getVideo(slug: string): Promise<VideoDetail | null>;
  listProducts(category?: string): Promise<Product[]>;
  listProductCategories(): Promise<(Option & { count: number })[]>;
  /** For /go/[slug]: where to send the visitor. */
  getProductLink(slug: string): Promise<{ id: string; url: string } | null>;
  listAdPlacements(): Promise<Record<string, AdPlacement>>;
  listIndexable(): Promise<{ path: string; updatedAt: string | null }[]>;
}

export function youtubeThumbnail(id: string) {
  return `https://i.ytimg.com/vi/${id}/hqdefault.jpg`;
}

/** Accepts a YouTube link or bare video ID; returns the 11-character ID or null. */
export function parseYouTubeId(input: string): string | null {
  const s = input.trim();
  if (/^[A-Za-z0-9_-]{11}$/.test(s)) return s;
  try {
    const u = new URL(s);
    const host = u.hostname.replace(/^www\.|^m\./, "");
    let id: string | null = null;
    if (host === "youtu.be") id = u.pathname.slice(1);
    else if (host === "youtube.com" || host === "youtube-nocookie.com") {
      id = u.searchParams.get("v") ?? u.pathname.match(/^\/(?:embed|shorts|live)\/([^/?#]+)/)?.[1] ?? null;
    }
    return id && /^[A-Za-z0-9_-]{11}$/.test(id) ? id : null;
  } catch {
    return null;
  }
}

export function readingMinutes(body: string) {
  return Math.max(1, Math.round(body.trim().split(/\s+/).length / 220));
}

/** Adds a retailer's tracking parameters to a product link without duplicating them. */
export function withTracking(url: string, trackingParams: string | null): string {
  if (!trackingParams) return url;
  const u = new URL(url);
  for (const [k, v] of new URLSearchParams(trackingParams)) if (!u.searchParams.has(k)) u.searchParams.set(k, v);
  return u.toString();
}
