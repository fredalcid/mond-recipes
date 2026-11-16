import Link from "next/link";
import { notFound } from "next/navigation";
import { Container } from "@/components/ui/Container";
import { AdminHeader } from "@/components/admin/AdminBits";
import { AdminForm } from "@/components/admin/AdminForm";
import { Select, TextArea, TextInput } from "@/components/admin/fields";
import { getCurrentMember } from "@/lib/auth";
import { canModerate } from "@/lib/admin";
import { createClient } from "@/lib/supabase/server";
import { formatDate } from "@/lib/format";
import { saveChallenge } from "../moderation-actions";

export const metadata = { title: "Challenges" };
export const dynamic = "force-dynamic";

type Row = { id: string; slug: string; title: string; description: string | null; starts_on: string; ends_on: string; status: string; sponsor_name: string | null };
const STATUS: [string, string][] = [
  ["draft", "Draft"],
  ["published", "Published"],
  ["unpublished", "Unpublished"],
];

function Fields({ c }: { c?: Row }) {
  return (
    <>
      <input type="hidden" name="id" value={c?.id ?? ""} />
      <div className="grid gap-4 sm:grid-cols-2">
        <TextInput name="title" label="Title" defaultValue={c?.title} required maxLength={120} />
        <TextInput name="slug" label="Web address" defaultValue={c?.slug} hint="e.g. soup-week" required />
        <TextInput name="starts_on" label="Starts" type="date" defaultValue={c?.starts_on} required />
        <TextInput name="ends_on" label="Ends" type="date" defaultValue={c?.ends_on} required />
      </div>
      <TextArea name="description" label="Description" defaultValue={c?.description} rows={4} maxLength={3000} hint="What to cook, and any rules. Don't promise prizes you haven't arranged." />
      <div className="grid gap-4 sm:grid-cols-2">
        <Select name="status" label="Status" options={STATUS} defaultValue={c?.status ?? "draft"} />
        <TextInput name="sponsor_name" label="Sponsor (optional)" defaultValue={c?.sponsor_name} hint="Shown as “Sponsored by …”." maxLength={80} />
      </div>
    </>
  );
}

export default async function ChallengesAdmin() {
  if (!canModerate(await getCurrentMember())) notFound();
  const { data } = await (await createClient())!.from("challenges").select("*").order("starts_on", { ascending: false });
  const rows = (data ?? []) as Row[];
  return (
    <Container className="max-w-4xl py-10">
      <AdminHeader title="Challenges" />
      <div className="flex flex-col gap-4">
        {rows.map((c) => (
          <details key={c.id} className="rounded-card border border-sand-strong bg-white p-5">
            <summary className="flex cursor-pointer flex-wrap items-center gap-3">
              <span className="text-lg font-semibold text-forest-900">{c.title}</span>
              <span className="text-sm text-ink-muted">
                {formatDate(c.starts_on)} – {formatDate(c.ends_on)} · {c.status}
              </span>
              {c.status === "published" && (
                <Link href={`/community/challenges/${c.slug}`} className="text-sm font-semibold text-forest-900 underline">
                  View
                </Link>
              )}
            </summary>
            <div className="mt-4">
              <AdminForm action={saveChallenge} submitLabel="Save challenge">
                <Fields c={c} />
              </AdminForm>
            </div>
          </details>
        ))}
        <section className="rounded-card border border-sand-strong bg-white p-5">
          <h2 className="mb-4 text-2xl font-semibold text-forest-900">New challenge</h2>
          <AdminForm action={saveChallenge} submitLabel="Create challenge">
            <Fields />
          </AdminForm>
        </section>
      </div>
    </Container>
  );
}
