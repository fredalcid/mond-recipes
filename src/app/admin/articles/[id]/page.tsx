import Link from "next/link";
import { notFound } from "next/navigation";
import { Container } from "@/components/ui/Container";
import { AdminHeader, DeleteBox, SavedNotices } from "@/components/admin/AdminBits";
import { getCurrentMember } from "@/lib/auth";
import { canEditContent } from "@/lib/admin";
import { ArticleForm } from "../ArticleForm";
import { loadArticle } from "../../content-data";

export const metadata = { title: "Edit article" };
type Props = { params: Promise<{ id: string }>; searchParams: Promise<{ saved?: string; delete?: string }> };

export default async function EditArticle({ params, searchParams }: Props) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id) || !canEditContent(await getCurrentMember())) notFound();
  const { saved, delete: del } = await searchParams;
  const article = await loadArticle(id);
  if (!article) notFound();
  return (
    <Container className="max-w-4xl py-10">
      <AdminHeader title="Edit article">
        {article.status === "published" && (
          <Link href={`/articles/${article.slug}`} className="font-semibold text-forest-900 underline underline-offset-4">
            View on the site →
          </Link>
        )}
      </AdminHeader>
      <div className="mb-6 flex flex-col gap-3">
        <SavedNotices saved={saved} del={del} noun="article" />
      </div>
      <ArticleForm article={article} />
      <DeleteBox table="articles" id={id} noun="article" />
    </Container>
  );
}
