import Link from "next/link";
import { Container } from "@/components/ui/Container";
import { AdminHeader, StatusBadge, Table } from "@/components/admin/AdminBits";
import { formatDate } from "@/lib/format";
import { db } from "../content-data";

export const metadata = { title: "Videos" };

export default async function AdminVideos() {
  const { data, error } = await (await db()).from("videos").select("id, title, status, collection, updated_at").order("updated_at", { ascending: false }).limit(300);
  return (
    <Container className="py-10">
      <AdminHeader title="Videos" action={{ href: "/admin/videos/new", label: "Add video" }} />
      {error && <p role="alert" className="mb-4 text-danger">Couldn&apos;t load videos: {error.message}</p>}
      <Table head={["Title", "Collection", "Status", "Updated"]} empty={!error && (data ?? []).length === 0 && "No videos yet."}>
        {(data ?? []).map((v) => (
          <tr key={v.id}>
            <td className="px-4 py-3">
              <Link href={`/admin/videos/${v.id}`} className="font-semibold text-forest-900 underline-offset-4 hover:underline">
                {v.title}
              </Link>
            </td>
            <td className="px-4 py-3 text-ink-muted">{v.collection ?? "—"}</td>
            <td className="px-4 py-3">
              <StatusBadge status={v.status} />
            </td>
            <td className="px-4 py-3 text-ink-muted">{formatDate(v.updated_at)}</td>
          </tr>
        ))}
      </Table>
    </Container>
  );
}
