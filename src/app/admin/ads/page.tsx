import { notFound } from "next/navigation";
import { Container } from "@/components/ui/Container";
import { AdminHeader } from "@/components/admin/AdminBits";
import { AdminForm } from "@/components/admin/AdminForm";
import { Checkbox, Select, TextInput } from "@/components/admin/fields";
import { FormMessage } from "@/components/ui/Field";
import { getCurrentMember } from "@/lib/auth";
import { savePlacement } from "../content-actions";
import { db } from "../content-data";

export const metadata = { title: "Advertising" };

type Placement = {
  key: string;
  name: string;
  location: string;
  is_enabled: boolean;
  adsense_slot: string | null;
  ad_format: string;
  fallback_kind: string;
  house_text: string | null;
  house_url: string | null;
};

const FORMATS: [string, string][] = [
  ["auto", "Responsive (recommended)"],
  ["fluid", "In-feed / fluid"],
  ["rectangle", "Rectangle"],
  ["horizontal", "Horizontal banner"],
];
const FALLBACKS: [string, string][] = [
  ["none", "Nothing (the space collapses)"],
  ["newsletter", "Newsletter sign-up"],
  ["house", "Our own promotion (text and link)"],
];

export default async function AdsAdmin() {
  const member = await getCurrentMember();
  if (!member?.roles.includes("super_admin")) notFound();
  const { data } = await (await db()).from("ad_placements").select("*").order("display_order");
  const rows = (data ?? []) as Placement[];
  const client = process.env.NEXT_PUBLIC_ADSENSE_CLIENT;

  return (
    <Container className="max-w-4xl py-10">
      <AdminHeader title="Advertising" />
      <div className="mb-8 flex flex-col gap-3">
        {client ? (
          <FormMessage tone="info">
            AdSense publisher ID is set ({client}). Ads only show to visitors who accept advertising cookies, and only after Google approves your site.
          </FormMessage>
        ) : (
          <FormMessage tone="info">
            AdSense isn&apos;t connected (NEXT_PUBLIC_ADSENSE_CLIENT is empty). Enabled placements show their fallback until it is. See the README for the setup steps.
          </FormMessage>
        )}
        <p className="text-sm text-ink-muted">
          Every ad is labelled “Advertisement”. Placements are switched off by default; turn on only those you want. The fallback shows when no ad is available or the visitor declined advertising cookies.
        </p>
      </div>
      <div className="flex flex-col gap-4">
        {rows.map((p) => (
          <details key={p.key} className="rounded-card border border-sand-strong bg-white p-5">
            <summary className="flex cursor-pointer flex-wrap items-center gap-3">
              <span className="text-lg font-semibold text-forest-900">{p.name}</span>
              <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${p.is_enabled ? "bg-forest-900 text-cream" : "bg-sand text-ink"}`}>{p.is_enabled ? "On" : "Off"}</span>
              <span className="w-full text-sm text-ink-muted">{p.location}</span>
            </summary>
            <div className="mt-4">
              <AdminForm action={savePlacement} submitLabel="Save placement">
                <input type="hidden" name="key" value={p.key} />
                <Checkbox name="is_enabled" label="Show this placement" defaultChecked={p.is_enabled} />
                <div className="grid gap-4 sm:grid-cols-2">
                  <TextInput name="adsense_slot" label="AdSense ad unit ID" defaultValue={p.adsense_slot} hint="The number from AdSense → Ads → By ad unit." />
                  <Select name="ad_format" label="Format" options={FORMATS} defaultValue={p.ad_format} />
                </div>
                <Select name="fallback_kind" label="When no ad is shown" options={FALLBACKS} defaultValue={p.fallback_kind} />
                <div className="grid gap-4 sm:grid-cols-2">
                  <TextInput name="house_text" label="Promotion text" defaultValue={p.house_text} maxLength={160} hint="Only for “Our own promotion”." />
                  <TextInput name="house_url" label="Promotion link" defaultValue={p.house_url} hint="e.g. /shop or https://…" />
                </div>
              </AdminForm>
            </div>
          </details>
        ))}
      </div>
    </Container>
  );
}
