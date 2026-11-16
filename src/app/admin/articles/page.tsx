import { notFound } from "next/navigation";
import { getCurrentMember } from "@/lib/auth";
import { canEditContent } from "@/lib/admin";
import Link from "next/link";
import { Container } from "@/components/ui/Container";
import { AdminHeader, StatusBadge, Table } from "@/components/admin/AdminBits";
import { formatDate } from "@/lib/format";
import { db } from "../content-data";

export const metadata = { title: "Articles" };

export default async function AdminArticles() {
  if (!canEditContent(await getCurrentMember())) notFound();
  const { data, error } = await (await db()).from("articles").select("id, title, slug, status, is_featured, is_sample, updated_at").order("updated_at", { ascending: false }).limit(300);
  return (
    <Container className="py-10">
      <AdminHeader title="Articles" action={{ href: "/admin/articles/new", label: "New article" }} />
      {error && <p role="alert" className="mb-4 text-danger">Couldn&apos;t load articles: {error.message}</p>}
      <Table head={["Title", "Status", "Updated"]} empty={!error && (data ?? []).length === 0 && "No articles yet."}>
        {(data ?? []).map((a) => (
          <tr key={a.id}>
            <td className="px-4 py-3">
              <Link href={`/admin/articles/${a.id}`} className="font-semibold text-forest-900 underline-offset-4 hover:underline">
                {a.title}
              </Link>
              {a.is_featured && <span className="ml-2 text-xs text-ink-muted">Featured</span>}
              {a.is_sample && <span className="ml-2 text-xs text-ink-muted">Sample</span>}
            </td>
            <td className="px-4 py-3">
              <StatusBadge status={a.status} />
            </td>
            <td className="px-4 py-3 text-ink-muted">{formatDate(a.updated_at)}</td>
          </tr>
        ))}
      </Table>
    </Container>
  );
}
