import { notFound } from "next/navigation";
import { getCurrentMember } from "@/lib/auth";
import { canEditContent } from "@/lib/admin";
import Link from "next/link";
import { Container } from "@/components/ui/Container";
import { AdminHeader, Table } from "@/components/admin/AdminBits";
import { Badge } from "@/components/ui/Badge";
import { formatDate } from "@/lib/format";
import { db } from "../content-data";

export const metadata = { title: "Shop" };
type Props = { searchParams: Promise<{ days?: string }> };
const PERIODS = [7, 30, 90, 365];

export default async function AdminShop({ searchParams }: Props) {
  if (!canEditContent(await getCurrentMember())) notFound();
  const { days: d } = await searchParams;
  const days = PERIODS.includes(Number(d)) ? Number(d) : 30;
  const client = await db();
  const [{ data: products, error }, { data: report }] = await Promise.all([
    client.from("products").select("id, name, slug, is_active, is_featured, is_sponsored, link_status, link_http_status, link_checked_at").order("display_order").order("name"),
    client.rpc("product_click_report", { p_days: days }),
  ]);
  const clicks = new Map<string, { clicks: number; last: string | null }>(
    ((report ?? []) as { product_id: string; clicks: number; last_click: string | null }[]).map((r) => [r.product_id, { clicks: Number(r.clicks), last: r.last_click }]),
  );
  const total = [...clicks.values()].reduce((s, r) => s + r.clicks, 0);
  const broken = (products ?? []).filter((p) => p.link_status === "broken").length;

  return (
    <Container className="py-10">
      <AdminHeader title="Shop" action={{ href: "/admin/shop/new", label: "Add product" }}>
        <Link href="/admin/shop/retailers" className="font-semibold text-forest-900 underline underline-offset-4">
          Retailers and tracking codes
        </Link>
      </AdminHeader>

      <div className="mb-6 flex flex-wrap items-center gap-4">
        <p className="text-lg">
          <strong>{total}</strong> outbound clicks in the last {days} days
          {broken > 0 && <span className="ml-3 font-semibold text-danger">{broken} broken link{broken > 1 ? "s" : ""}</span>}
        </p>
        <nav aria-label="Report period" className="flex gap-1">
          {PERIODS.map((p) => (
            <Link key={p} href={`/admin/shop?days=${p}`} aria-current={p === days ? "page" : undefined} className={`inline-flex min-h-10 items-center rounded-full px-3 text-sm font-semibold ${p === days ? "bg-forest-900 text-cream" : "bg-white hover:bg-sand"}`}>
              {p} days
            </Link>
          ))}
        </nav>
      </div>
      <p className="mb-6 text-sm text-ink-muted">
        Clicks count visits to the retailer, not sales. Commissions and sales are reported in each affiliate program&apos;s own dashboard. Obvious bots are not counted.
      </p>

      {error && <p role="alert" className="mb-4 text-danger">Couldn&apos;t load products: {error.message}</p>}
      <Table head={["Product", "Clicks", "Last click", "Link check", "Shown"]} empty={!error && (products ?? []).length === 0 && "No products yet. Add a retailer first, then your first product."}>
        {(products ?? []).map((p) => {
          const c = clicks.get(p.id);
          return (
            <tr key={p.id}>
              <td className="px-4 py-3">
                <Link href={`/admin/shop/${p.id}`} className="font-semibold text-forest-900 underline-offset-4 hover:underline">
                  {p.name}
                </Link>
                <span className="ml-2 inline-flex gap-1">
                  {p.is_featured && <Badge tone="editorial">Featured</Badge>}
                  {p.is_sponsored && <Badge tone="sponsored">Sponsored</Badge>}
                </span>
              </td>
              <td className="px-4 py-3 font-semibold tabular-nums">{c?.clicks ?? 0}</td>
              <td className="px-4 py-3 text-ink-muted">{c?.last ? formatDate(c.last) : "—"}</td>
              <td className="px-4 py-3">
                {p.link_status === "broken" ? (
                  <span className="font-semibold text-danger">Broken{p.link_http_status ? ` (${p.link_http_status})` : ""}</span>
                ) : p.link_status === "ok" ? (
                  <span className="text-olive-700">Working</span>
                ) : (
                  <span className="text-ink-muted">Not checked yet</span>
                )}
                {p.link_checked_at && <span className="block text-xs text-ink-muted">{formatDate(p.link_checked_at)}</span>}
              </td>
              <td className="px-4 py-3">{p.is_active ? "Yes" : "Hidden"}</td>
            </tr>
          );
        })}
      </Table>
    </Container>
  );
}
