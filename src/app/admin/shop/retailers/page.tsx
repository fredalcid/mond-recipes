import { notFound } from "next/navigation";
import { Container } from "@/components/ui/Container";
import { AdminHeader } from "@/components/admin/AdminBits";
import { AdminForm } from "@/components/admin/AdminForm";
import { Checkbox, TextInput } from "@/components/admin/fields";
import { getCurrentMember } from "@/lib/auth";
import { canEditContent } from "@/lib/admin";
import { saveRetailer } from "../../content-actions";
import { db } from "../../content-data";

export const metadata = { title: "Retailers" };

type Retailer = { id: number; name: string; slug: string; website_url: string | null; tracking_params: string | null; is_active: boolean };

function RetailerFields({ r }: { r?: Retailer }) {
  return (
    <>
      <input type="hidden" name="id" value={r?.id ?? ""} />
      <div className="grid gap-4 sm:grid-cols-2">
        <TextInput name="name" label="Name" defaultValue={r?.name} required />
        <TextInput name="slug" label="Short name" defaultValue={r?.slug} hint="e.g. amazon-ca" required />
        <TextInput name="website_url" label="Website (optional)" defaultValue={r?.website_url} />
        <TextInput name="tracking_params" label="Tracking code" defaultValue={r?.tracking_params} hint="Added to every link, e.g. tag=mondrecipes-20. Leave empty if your links already include it." />
      </div>
      <Checkbox name="is_active" label="Active" defaultChecked={r ? r.is_active : true} />
    </>
  );
}

export default async function Retailers() {
  if (!canEditContent(await getCurrentMember())) notFound();
  const { data } = await (await db()).from("retailers").select("id, name, slug, website_url, tracking_params, is_active").order("name");
  const rows = (data ?? []) as Retailer[];
  return (
    <Container className="max-w-4xl py-10">
      <AdminHeader title="Retailers" />
      <p className="mb-8 text-ink-muted">
        Add each store or affiliate program you link to. Only add tracking codes from programs you have joined and been accepted into.
      </p>
      <div className="flex flex-col gap-6">
        {rows.map((r) => (
          <details key={r.id} className="rounded-card border border-sand-strong bg-white p-5">
            <summary className="cursor-pointer text-lg font-semibold text-forest-900">
              {r.name} {!r.is_active && <span className="text-sm text-ink-muted">(inactive)</span>}
            </summary>
            <div className="mt-4">
              <AdminForm action={saveRetailer} submitLabel="Save retailer">
                <RetailerFields r={r} />
              </AdminForm>
            </div>
          </details>
        ))}
        <section className="rounded-card border border-sand-strong bg-white p-5">
          <h2 className="mb-4 text-2xl font-semibold text-forest-900">Add a retailer</h2>
          <AdminForm action={saveRetailer} submitLabel="Add retailer">
            <RetailerFields />
          </AdminForm>
        </section>
      </div>
    </Container>
  );
}
