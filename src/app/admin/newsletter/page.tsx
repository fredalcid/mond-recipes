import Link from "next/link";
import { notFound } from "next/navigation";
import { Container } from "@/components/ui/Container";
import { AdminHeader, Table } from "@/components/admin/AdminBits";
import { getCurrentMember } from "@/lib/auth";
import { formatDate } from "@/lib/format";
import { db } from "../content-data";
import { manageSubscriber } from "../moderation-actions";

export const metadata = { title: "Newsletter" };
type Props = { searchParams: Promise<{ status?: string; q?: string; done?: string; error?: string }> };
const STATUSES = ["confirmed", "pending", "unsubscribed"] as const;

export default async function NewsletterAdmin({ searchParams }: Props) {
  const member = await getCurrentMember();
  if (!member?.roles.includes("super_admin")) notFound();
  const { status, q: rawQ, done, error } = await searchParams;
  const q = (rawQ ?? "").trim().toLowerCase().slice(0, 120);
  const filter = (STATUSES as readonly string[]).includes(status ?? "") ? status! : "confirmed";
  const client = await db();
  const counts = await Promise.all(STATUSES.map((s) => client.from("newsletter_subscribers").select("id", { count: "exact", head: true }).eq("status", s)));
  const { data } = await client.from("newsletter_subscribers").select("id, email, status, source, consent_at, confirmed_at, unsubscribed_at").eq("status", filter).ilike("email", q ? `%${q.replace(/[%_,()]/g, "")}%` : "%").order("created_at", { ascending: false }).limit(200);

  return (
    <Container className="py-10">
      <AdminHeader title="Newsletter">
        <a href="/admin/newsletter/export" download className="inline-flex min-h-11 items-center rounded-full bg-forest-900 px-5 font-semibold text-cream hover:bg-forest-800">
          Download confirmed (CSV)
        </a>
      </AdminHeader>
      <nav aria-label="Subscriber status" className="mb-4 flex flex-wrap gap-2">
        {STATUSES.map((s, i) => (
          <Link key={s} href={`/admin/newsletter?status=${s}`} aria-current={s === filter ? "page" : undefined} className={`inline-flex min-h-10 items-center rounded-full px-4 text-sm font-semibold capitalize ${s === filter ? "bg-forest-900 text-cream" : "bg-white hover:bg-sand"}`}>
            {s} ({counts[i].count ?? 0})
          </Link>
        ))}
      </nav>
      <p className="mb-6 max-w-3xl text-sm text-ink-muted">
        Only confirmed subscribers gave express consent through the double opt-in link, so only they should receive newsletters (Canada&apos;s anti-spam law). Every email you send must include an unsubscribe link and your mailing address. Keep this list private.
      </p>
      <form className="mb-4 flex flex-wrap items-end gap-3" role="search">
        <input type="hidden" name="status" value={filter} />
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-semibold">Find an email address</span>
          <input name="q" type="search" defaultValue={q} className="min-h-11 w-72 max-w-full rounded-xl border border-sand-strong px-3" />
        </label>
        <button type="submit" className="min-h-11 rounded-full bg-forest-900 px-5 font-semibold text-cream">
          Search
        </button>
      </form>
      {done && (
        <p role="status" className="mb-4 rounded-xl bg-sand px-4 py-2 text-sm">
          {done === "deleted" ? "Subscriber deleted permanently." : "Subscriber unsubscribed."}
        </p>
      )}
      {error && (
        <p role="alert" className="mb-4 text-sm text-danger">
          That didn&apos;t work.
        </p>
      )}
      <Table head={["Email", "Source", "Consent given", "Confirmed", "Unsubscribed", ""]} empty={(data ?? []).length === 0 && `No ${filter} subscribers.`}>
        {(data ?? []).map((s) => (
          <tr key={s.id}>
            <td className="px-4 py-3 font-medium">{s.email}</td>
            <td className="px-4 py-3 text-ink-muted">{s.source ?? "—"}</td>
            <td className="px-4 py-3 text-ink-muted">{formatDate(s.consent_at)}</td>
            <td className="px-4 py-3 text-ink-muted">{s.confirmed_at ? formatDate(s.confirmed_at) : "—"}</td>
            <td className="px-4 py-3 text-ink-muted">{s.unsubscribed_at ? formatDate(s.unsubscribed_at) : "—"}</td>
            <td className="px-4 py-3">
              <form action={manageSubscriber} className="flex gap-1">
                <input type="hidden" name="id" value={s.id} />
                <input type="hidden" name="back" value={`/admin/newsletter?status=${filter}`} />
                {s.status !== "unsubscribed" && (
                  <button type="submit" name="action" value="unsubscribe" className="min-h-9 rounded-full px-3 text-sm font-semibold hover:bg-sand">
                    Unsubscribe
                  </button>
                )}
                <button type="submit" name="action" value="delete" className="min-h-9 rounded-full px-3 text-sm font-semibold text-danger hover:bg-sand">
                  Delete
                </button>
              </form>
            </td>
          </tr>
        ))}
      </Table>
      {(data ?? []).length === 200 && <p className="mt-3 text-sm text-ink-muted">Showing the newest 200. Download the CSV for the full list.</p>}
    </Container>
  );
}
