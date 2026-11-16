import Link from "next/link";
import { notFound } from "next/navigation";
import { Container } from "@/components/ui/Container";
import { AdminHeader, DeleteBox, SavedNotices } from "@/components/admin/AdminBits";
import { getCurrentMember } from "@/lib/auth";
import { canEditContent } from "@/lib/admin";
import { VideoForm } from "../VideoForm";
import { loadVideo } from "../../content-data";

export const metadata = { title: "Edit video" };
type Props = { params: Promise<{ id: string }>; searchParams: Promise<{ saved?: string; delete?: string }> };

export default async function EditVideo({ params, searchParams }: Props) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id) || !canEditContent(await getCurrentMember())) notFound();
  const { saved, delete: del } = await searchParams;
  const video = await loadVideo(id);
  if (!video) notFound();
  return (
    <Container className="max-w-4xl py-10">
      <AdminHeader title="Edit video">
        {video.status === "published" && (
          <Link href={`/videos/${video.slug}`} className="font-semibold text-forest-900 underline underline-offset-4">
            View on the site →
          </Link>
        )}
      </AdminHeader>
      <div className="mb-6 flex flex-col gap-3">
        <SavedNotices saved={saved} del={del} noun="video" />
      </div>
      <VideoForm video={video} />
      <DeleteBox table="videos" id={id} noun="video" />
    </Container>
  );
}
