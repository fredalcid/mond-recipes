import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PlannedPage } from "@/components/layout/PlannedPage";
import { plannedPages } from "@/lib/site";

type Props = { params: Promise<{ slug: string }>; searchParams: Promise<{ q?: string }> };

export function generateStaticParams() {
  return Object.keys(plannedPages).map((slug) => ({ slug }));
}

export const dynamicParams = false;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const page = plannedPages[slug];
  return { title: page?.title ?? "Not found", robots: { index: false, follow: true } };
}

export default async function Page({ params, searchParams }: Props) {
  const { slug } = await params;
  const page = plannedPages[slug];
  if (!page) notFound();
  const { q } = await searchParams;
  const query = typeof q === "string" ? q.trim().slice(0, 100) : undefined;
  return <PlannedPage {...page} query={slug === "recipes" && query ? query : undefined} />;
}
