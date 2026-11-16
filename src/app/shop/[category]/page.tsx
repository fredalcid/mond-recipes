import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ShopView } from "@/components/shop/ShopView";
import { getContent } from "@/lib/content";

type Props = { params: Promise<{ category: string }> };
export const revalidate = 300;
export async function generateStaticParams() {
  return [];
}

async function find(slug: string) {
  const cats = await getContent().listProductCategories();
  return cats.find((c) => c.slug === slug) ?? null;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const c = await find((await params).category);
  if (!c) return { title: "Not found", robots: { index: false } };
  return { title: `${c.name} · Shop`, alternates: { canonical: `/shop/${c.slug}` }, robots: c.count === 0 ? { index: false, follow: true } : undefined };
}

export default async function ShopCategoryPage({ params }: Props) {
  const c = await find((await params).category);
  if (!c) notFound();
  return <ShopView category={c} />;
}
