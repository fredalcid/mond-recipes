import { AdminForm } from "@/components/admin/AdminForm";
import { Checkbox, ImageField, Panel, Select, TextArea, TextInput } from "@/components/admin/fields";
import { mediaUrl } from "@/lib/content/supabase";
import { saveProduct } from "../content-actions";
import { shopOptions, type loadProduct } from "../content-data";

type ProductRow = NonNullable<Awaited<ReturnType<typeof loadProduct>>>;

export async function ProductForm({ product }: { product?: ProductRow }) {
  const { categories, retailers } = await shopOptions();
  const p = product;
  return (
    <AdminForm action={saveProduct} submitLabel={p ? "Save product" : "Add product"} multipart>
      <input type="hidden" name="id" value={p?.id ?? ""} />
      <Panel title="Product">
        <TextInput name="name" label="Product name" defaultValue={p?.name} required maxLength={140} />
        <TextInput name="slug" label="Short name" defaultValue={p?.slug} hint="Used in the tracked link /go/short-name. Lowercase words joined by hyphens." required />
        <TextArea name="description" label="Why we recommend it" defaultValue={p?.description} rows={3} maxLength={600} />
        <div className="grid gap-4 sm:grid-cols-2">
          <TextInput name="brand" label="Brand (optional)" defaultValue={p?.brand} maxLength={80} />
          <Select name="category" label="Category" options={categories} defaultValue={p?.category ?? ""} />
        </div>
      </Panel>
      <Panel title="Retailer link">
        <Select name="retailer" label="Retailer" options={retailers} defaultValue={p?.retailer_id ? String(p.retailer_id) : ""} hint="The retailer's tracking code (for example your Amazon tag) is added automatically." />
        <TextInput name="affiliate_url" label="Product link" type="url" defaultValue={p?.affiliate_url} hint="The full https:// link to the product on the retailer's website." required />
        <p className="text-sm text-ink-muted">Visitors always leave Mònd Recipes to buy. There is no cart or checkout on this site, and prices are not shown because they change.</p>
      </Panel>
      <Panel title="Image">
        <ImageField name="image" label="Upload image" currentUrl={mediaUrl(p?.image_path)} altName="image_alt" altDefault={p?.image_alt} />
        <p className="text-sm text-ink-muted">Use your own photo, or one the retailer&apos;s affiliate program allows you to use.</p>
      </Panel>
      <Panel title="Display">
        <Checkbox name="is_active" label="Show in the Shop" defaultChecked={p ? p.is_active : true} />
        <Checkbox name="is_featured" label="Featured (shown first and on the homepage)" defaultChecked={p?.is_featured} />
        <Checkbox name="is_sponsored" label="Sponsored placement (shows a “Sponsored” label)" defaultChecked={p?.is_sponsored} />
        <TextInput name="display_order" label="Order" type="number" defaultValue={p?.display_order ?? 0} hint="Lower numbers come first." />
      </Panel>
    </AdminForm>
  );
}
