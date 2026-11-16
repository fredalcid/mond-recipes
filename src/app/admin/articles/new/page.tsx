import { notFound } from "next/navigation";
import { Container } from "@/components/ui/Container";
import { AdminHeader } from "@/components/admin/AdminBits";
import { getCurrentMember } from "@/lib/auth";
import { canEditContent } from "@/lib/admin";
import { ArticleForm } from "../ArticleForm";

export const metadata = { title: "New article" };

export default async function NewArticle() {
  if (!canEditContent(await getCurrentMember())) notFound();
  return (
    <Container className="max-w-4xl py-10">
      <AdminHeader title="New article" />
      <ArticleForm />
    </Container>
  );
}
