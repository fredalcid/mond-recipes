import { notFound } from "next/navigation";
import { Container } from "@/components/ui/Container";
import { AdminHeader } from "@/components/admin/AdminBits";
import { getCurrentMember } from "@/lib/auth";
import { canEditContent } from "@/lib/admin";
import { VideoForm } from "../VideoForm";

export const metadata = { title: "Add video" };

export default async function NewVideo() {
  if (!canEditContent(await getCurrentMember())) notFound();
  return (
    <Container className="max-w-4xl py-10">
      <AdminHeader title="Add video" />
      <VideoForm />
    </Container>
  );
}
