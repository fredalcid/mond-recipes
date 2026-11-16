import Link from "next/link";
import { RecipeImage } from "@/components/ui/RecipeImage";
import { SampleBadge } from "@/components/ui/Badge";
import { formatDate } from "@/lib/format";
import type { ArticleSummary } from "@/lib/content/types";

export function ArticleCard({ article, large = false }: { article: ArticleSummary; large?: boolean }) {
  return (
    <article className="group relative flex h-full flex-col gap-4">
      <div className="relative overflow-hidden rounded-card">
        <RecipeImage
          src={article.imageUrl}
          alt={article.imageAlt ?? ""}
          seed={article.slug}
          className={`${large ? "aspect-16/9" : "aspect-16/10"} transition-transform duration-500 group-hover:scale-[1.02]`}
        />
        {article.isSample && (
          <span className="absolute top-3 left-3">
            <SampleBadge />
          </span>
        )}
      </div>
      {article.categories[0] && (
        <p className="text-xs font-semibold tracking-[0.14em] text-olive-700 uppercase">{article.categories.map((c) => c.name).join(" · ")}</p>
      )}
      <h3 className={`${large ? "text-3xl" : "text-xl"} leading-snug font-semibold text-forest-900`}>
        <Link href={`/articles/${article.slug}`} className="after:absolute after:inset-0">
          {article.title}
        </Link>
      </h3>
      {article.excerpt && <p className="text-ink-muted">{article.excerpt}</p>}
      <p className="mt-auto text-sm text-ink-muted">
        {article.byline} · {formatDate(article.publishedAt)} · {article.readingMinutes} min read
      </p>
    </article>
  );
}
