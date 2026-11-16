import Link from "next/link";
import { buildQuery } from "@/lib/search-params";

export function Pagination({
  path,
  query,
  page,
  total,
  pageSize,
}: {
  path: string;
  query: Record<string, string | number | undefined>;
  page: number;
  total: number;
  pageSize: number;
}) {
  const pages = Math.ceil(total / pageSize);
  if (pages <= 1) return null;
  const href = (p: number) => `${path}${buildQuery({ ...query, page: p > 1 ? p : undefined })}`;
  const nums = Array.from({ length: pages }, (_, i) => i + 1).filter((n) => n === 1 || n === pages || Math.abs(n - page) <= 1);

  const linkCls = "inline-flex min-h-11 min-w-11 items-center justify-center rounded-full px-3 text-sm font-semibold";
  return (
    <nav aria-label="Pagination" className="mt-10 flex flex-wrap items-center justify-center gap-2">
      {page > 1 && (
        <Link href={href(page - 1)} rel="prev" className={`${linkCls} border border-sand-strong bg-white hover:border-forest-900`}>
          ← Previous
        </Link>
      )}
      {nums.map((n, i) => (
        <span key={n} className="flex items-center gap-2">
          {i > 0 && n - nums[i - 1] > 1 && <span aria-hidden="true">…</span>}
          {n === page ? (
            <span aria-current="page" className={`${linkCls} bg-forest-900 text-cream`}>
              {n}
            </span>
          ) : (
            <Link href={href(n)} className={`${linkCls} hover:bg-sand`} aria-label={`Page ${n}`}>
              {n}
            </Link>
          )}
        </span>
      ))}
      {page < pages && (
        <Link href={href(page + 1)} rel="next" className={`${linkCls} border border-sand-strong bg-white hover:border-forest-900`}>
          Next →
        </Link>
      )}
    </nav>
  );
}
