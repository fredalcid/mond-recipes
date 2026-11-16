import { RecipeImage } from "@/components/ui/RecipeImage";
import { Badge, SampleBadge } from "@/components/ui/Badge";
import type { Product } from "@/lib/content/types";

/**
 * Product card. Image, name and button all go to /go/<product>, which records
 * the click and sends the visitor to the retailer. No prices are shown.
 */
export function ProductCard({ product, from }: { product: Product; from: string }) {
  const href = `/go/${product.slug}?from=${encodeURIComponent(from)}`;
  const linkProps = { href, target: "_blank", rel: "sponsored nofollow noopener" } as const;
  return (
    <article className="group flex h-full flex-col overflow-hidden rounded-card bg-white shadow-card">
      <div className="relative">
        {product.isSample ? (
          <RecipeImage src={null} alt="" seed={product.slug} className="aspect-square" />
        ) : (
          <a {...linkProps} tabIndex={-1} aria-hidden="true">
            <RecipeImage src={product.imageUrl} alt={product.imageAlt ?? product.name} seed={product.slug} className="aspect-square transition-transform duration-500 group-hover:scale-[1.03]" />
          </a>
        )}
        <span className="absolute top-3 left-3 flex gap-2">
          {product.isSample && <SampleBadge />}
          {product.isSponsored && <Badge tone="sponsored">Sponsored</Badge>}
        </span>
      </div>
      <div className="flex flex-1 flex-col gap-2 p-5">
        {product.category && <p className="text-xs font-semibold tracking-[0.14em] text-olive-700 uppercase">{product.category.name}</p>}
        <h3 className="text-lg leading-snug font-semibold text-forest-900">
          {product.isSample ? product.name : <a {...linkProps} className="hover:underline">{product.name}</a>}
        </h3>
        {product.brand && <p className="text-sm text-ink-muted">{product.brand}</p>}
        {product.description && <p className="text-sm leading-relaxed text-ink-muted">{product.description}</p>}
        <div className="mt-auto pt-3">
          {product.isSample ? (
            <p className="text-sm text-ink-muted">Sample product, no retailer link.</p>
          ) : (
            <a {...linkProps} className="inline-flex min-h-11 items-center gap-2 rounded-full bg-forest-900 px-5 text-sm font-semibold text-cream hover:bg-forest-800">
              View product{product.retailer ? ` at ${product.retailer}` : ""}
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
                <path d="M7 17L17 7M8 7h9v9" />
              </svg>
              <span className="sr-only">(opens the retailer&apos;s website in a new tab)</span>
            </a>
          )}
        </div>
      </div>
    </article>
  );
}
