import Link from "next/link";
import { Container } from "@/components/ui/Container";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { Pagination } from "@/components/ui/Pagination";
import { RecipeGrid } from "@/components/cards/RecipeCard";
import { SampleNotice } from "@/components/ui/SampleNotice";
import { SearchBox } from "./SearchBox";
import { FilterForm } from "./FilterForm";
import { getData, type FilterOptions, type RecipeKind, type SearchResult, type SearchParams } from "@/lib/data";
import { toQueryParams } from "@/lib/search-params";

/** Shared search page for recipes and drinks. */
export async function RecipeSearchView({
  kind,
  path,
  title,
  eyebrow,
  intro,
  params,
  crumb,
  children,
}: {
  kind: RecipeKind;
  path: string;
  title: string;
  eyebrow: string;
  intro: string;
  params: SearchParams;
  crumb: string;
  children?: React.ReactNode;
}) {
  const data = getData();
  let result: SearchResult | null = null;
  let options: FilterOptions | null = null;
  try {
    [result, options] = await Promise.all([data.searchRecipes({ ...params, kind }), data.getFilterOptions()]);
  } catch (e) {
    console.error(e);
  }
  const query = toQueryParams(params);
  const filtered = Object.entries(query).some(([k, v]) => k !== "sort" && v !== undefined);
  const noun = kind === "drink" ? "drink" : "recipe";

  return (
    <Container className="py-10 sm:py-14">
      <Breadcrumbs items={[{ label: crumb }]} />
      <header className="max-w-3xl">
        <p className="text-xs font-semibold tracking-[0.2em] text-olive-700 uppercase">{eyebrow}</p>
        <h1 className="mt-2 text-4xl font-semibold text-forest-900 sm:text-5xl">{title}</h1>
        <p className="mt-3 text-lg text-ink-muted">{intro}</p>
      </header>

      <div className="mt-8 max-w-3xl">
        <SearchBox
          action={path}
          defaultValue={params.q ?? ""}
          label={`Search ${noun}s`}
          placeholder={kind === "drink" ? "Search drinks, teas or ingredients" : "Search by recipe name or ingredient"}
        />
        {kind === "food" && (
          <p className="mt-3 text-sm text-ink-muted">
            Have ingredients to use up?{" "}
            <Link href="/ingredients" className="font-semibold text-forest-900 underline underline-offset-4">
              Find recipes by what you have
            </Link>
          </p>
        )}
      </div>

      {children}

      {data.mode === "sample" && (
        <div className="mt-8">
          <SampleNotice />
        </div>
      )}

      {!result || !options ? (
        <p role="alert" className="mt-10 rounded-card bg-sand p-6">
          Search is temporarily unavailable. Please try again in a moment.
        </p>
      ) : (
        <div className="mt-10 grid gap-8 lg:grid-cols-[280px_1fr]">
          <aside>
            <FilterForm action={path} values={{ ...query, q: params.q }} options={options} variant={kind} />
          </aside>
          <section aria-labelledby="results-heading" aria-live="polite">
            <h2 id="results-heading" className="mb-5 font-sans text-base font-semibold text-ink">
              {result.total === 0
                ? `No ${noun}s found`
                : `${result.total.toLocaleString("en-CA")} ${noun}${result.total === 1 ? "" : "s"}${params.q ? ` for “${params.q}”` : ""}`}
            </h2>
            {result.total === 0 ? (
              <EmptyState path={path} filtered={filtered} q={params.q} noun={noun} />
            ) : (
              <>
                <RecipeGrid recipes={result.items} columns={3} />
                <Pagination path={path} query={query} page={result.page} total={result.total} pageSize={result.pageSize} />
              </>
            )}
          </section>
        </div>
      )}
    </Container>
  );
}

function EmptyState({ path, filtered, q, noun }: { path: string; filtered: boolean; q?: string; noun: string }) {
  return (
    <div className="rounded-card border border-dashed border-sand-strong bg-white/70 p-8">
      <p className="text-lg font-semibold text-forest-900">Nothing matches {filtered ? "all of these choices" : "yet"}.</p>
      <ul className="mt-3 list-disc space-y-1 pl-5 text-ink-muted">
        {q && <li>Check the spelling, or try a single ingredient such as “rice” or “mint”.</li>}
        {filtered && <li>Remove a filter or two to widen the search.</li>}
        <li>Browse by country to discover something new.</li>
      </ul>
      <div className="mt-5 flex flex-wrap gap-3">
        {filtered && (
          <Link href={path} className="inline-flex min-h-11 items-center rounded-full bg-forest-900 px-5 font-semibold text-cream">
            Show all {noun}s
          </Link>
        )}
        <Link href="/countries" className="inline-flex min-h-11 items-center rounded-full border border-sand-strong bg-white px-5 font-semibold text-forest-900">
          Explore by country
        </Link>
      </div>
    </div>
  );
}
