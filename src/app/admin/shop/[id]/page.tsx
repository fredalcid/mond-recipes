import { notFound } from "next/navigation";
import { Container } from "@/components/ui/Container";
import { AdminHeader, DeleteBox, SavedNotices } from "@/components/admin/AdminBits";
import { getCurrentMember } from "@/lib/auth";
import { canEditContent } from "@/lib/admin";
import { ProductForm } from "../ProductForm";
import { loadProduct } from "../../content-data";

export const metadata = { title: "Edit product" };
type Props = { params: Promise<{ id: string }>; searchParams: Promise<{ saved?: string; delete?: string }> };

export default async function EditProduct({ params, searchParams }: Props) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id) || !canEditContent(await getCurrentMember())) notFound();
  const { saved, delete: del } = await searchParams;
  const product = await loadProduct(id);
  if (!product) notFound();
  return (
    <Container className="max-w-4xl py-10">
      <AdminHeader title="Edit product" />
      <div className="mb-6 flex flex-col gap-3">
        <SavedNotices saved={saved} del={del} noun="product" />
        {product.link_status === "broken" && (
          <p role="alert" className="rounded-xl bg-danger/10 px-4 py-3 font-semibold text-danger">
            The last link check failed{product.link_http_status ? ` (HTTP ${product.link_http_status})` : ""}. Check the product still exists at the retailer.
          </p>
        )}
      </div>
      <ProductForm product={product} />
      <DeleteBox table="products" id={id} noun="product" />
    </Container>
  );
}
