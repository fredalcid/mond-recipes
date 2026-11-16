import { notFound } from "next/navigation";
import { Container } from "@/components/ui/Container";
import { AdminHeader } from "@/components/admin/AdminBits";
import { AdminForm } from "@/components/admin/AdminForm";
import { Checkbox, Panel, TextArea, TextInput } from "@/components/admin/fields";
import { getCurrentMember } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { HOMEPAGE_SECTIONS, SOCIAL_NETWORKS, parseSettings } from "@/lib/settings";
import { saveBrand, saveContact, saveHomepage } from "./actions";

export const metadata = { title: "Website settings" };
export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const member = await getCurrentMember();
  if (!member?.roles.includes("super_admin")) notFound();
  const db = (await createClient())!;
  // Read straight from the database (not the cache) so the form always shows the saved values.
  const { data } = await db.from("site_settings").select("key, value");
  const s = parseSettings(data ?? []);
  const raw = new Map((data ?? []).map((r) => [r.key, r.value]));
  const socialByNetwork = new Map(((raw.get("social.links") as { network: string; url: string }[] | undefined) ?? []).map((x) => [x.network, x.url]));

  return (
    <Container className="max-w-4xl py-10">
      <AdminHeader title="Website settings" />
      <div className="flex flex-col gap-8">
        <AdminForm action={saveBrand} submitLabel="Save brand" multipart>
          <Panel title="Brand">
            <div className="grid gap-4 sm:grid-cols-2">
              <TextInput name="name" label="Website name" defaultValue={s.name} required maxLength={60} />
              <TextInput name="tagline" label="Tagline" defaultValue={s.tagline} maxLength={80} />
            </div>
            <TextArea name="description" label="Short description" defaultValue={s.description} rows={2} maxLength={300} hint="Shown in the footer." />
            <div className="flex flex-col gap-2">
              <span className="text-sm font-semibold">Logo</span>
              {/* eslint-disable-next-line @next/next/no-img-element -- admin preview */}
              <img src={s.logoUrl ?? "/brand/mond-badge.png"} alt="Current logo" className="h-20 w-20 rounded-lg border border-sand bg-white object-contain p-1" />
              <label htmlFor="f-logo" className="text-xs text-ink-muted">
                {s.logoUrl ? "Uploaded logo in use." : "The built-in Mònd Recipes badge is in use."} Upload a square PNG or WebP (transparent background works best).
              </label>
              <input id="f-logo" name="logo" type="file" accept="image/png,image/webp,image/jpeg" className="text-sm" />
              {s.logoUrl && <Checkbox name="remove_logo" label="Go back to the built-in badge" />}
            </div>
          </Panel>
        </AdminForm>

        <AdminForm action={saveContact} submitLabel="Save contact details">
          <Panel title="Contact details and social media">
            <div className="grid gap-4 sm:grid-cols-2">
              <TextInput name="email" label="Public contact email (optional)" type="email" defaultValue={s.contactEmail} hint="Shown on the Contact page. Messages from the form still go to CONTACT_EMAIL." />
              <TextInput
                name="mailing_address"
                label="Mailing address"
                defaultValue={s.mailingAddress}
                hint="Shown in the footer. Canada's anti-spam law requires it in every newsletter."
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              {SOCIAL_NETWORKS.map(([key, label]) => (
                <TextInput key={key} name={`social_${key}`} label={label} defaultValue={socialByNetwork.get(key)} hint="Full https:// address, or empty." />
              ))}
            </div>
          </Panel>
        </AdminForm>

        <AdminForm action={saveHomepage} submitLabel="Save homepage and footer">
          <Panel title="Homepage sections">
            <p className="text-sm text-ink-muted">Switch sections off while they have nothing to show. Empty sections hide themselves anyway.</p>
            <div className="grid gap-x-6 sm:grid-cols-3">
              {HOMEPAGE_SECTIONS.map(([key, label]) => (
                <Checkbox key={key} name={`section_${key}`} label={label} defaultChecked={s.sections[key]} />
              ))}
            </div>
            <TextArea name="newsletter_intro" label="Newsletter sign-up text" defaultValue={s.newsletterIntro} rows={2} maxLength={300} hint="Describe honestly what subscribers will receive and how often." />
            <TextInput name="footer_note" label="Footer note" defaultValue={s.footerNote} maxLength={200} />
          </Panel>
        </AdminForm>
      </div>
    </Container>
  );
}
