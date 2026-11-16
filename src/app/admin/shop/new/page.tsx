import { notFound } from "next/navigation";
import { Container } from "@/components/ui/Container";
import { AdminHeader } from "@/components/admin/AdminBits";
import { getCurrentMember } from "@/lib/auth";
import { canEditContent } from "@/lib/admin";
import { ProductForm } from "../ProductForm";

export const metadata = { title: "Add product" };

export default async function NewProduct() {
  if (!canEditContent(await getCurrentMember())) notFound();
  return (
    <Container className="max-w-4xl py-10">
      <AdminHeader title="Add product" />
      <ProductForm />
    </Container>
  );
}
