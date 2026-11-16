import Link from "next/link";
import { notFound } from "next/navigation";
import { Container } from "@/components/ui/Container";
import { FormMessage } from "@/components/ui/Field";
import { AdminHeader, Table } from "@/components/admin/AdminBits";
import { getCurrentMember } from "@/lib/auth";
import { canManageMembers } from "@/lib/admin";
import { createClient } from "@/lib/supabase/server";
import { formatDate } from "@/lib/format";
import { setFeatured, setSuspension } from "../moderation-actions";

export const metadata = { title: "Members" };
export const dynamic = "force-dynamic";

type Props = { searchParams: Promise<{ q?: string; filter?: string; done?: string; error?: string }> };
const DONE: Record<string, string> = { suspended: "Member suspended and notified.", restored: "Member restored.", featured: "Member featured.", unfeatured: "Member no longer featured." };
const ERRORS: Record<string, string> = {
  reason: "Give a reason when suspending a member. They will see it.",
  staff: "Only super admins can suspend team members.",
  "not-allowed": "You don't have permission to do that.",
  failed: "That didn't work. Please try again.",
};

export default async function MembersAdmin({ searchParams }: Props) {
  const member = await getCurrentMember();
  if (!canManageMembers(member)) notFound();
  const sp = await searchParams;
  const q = (sp.q ?? "").trim().slice(0, 60);
  const db = (await createClient())!;
  let query = db.from("profiles").select("id, username, display_name, is_suspended, suspended_reason, is_featured, follower_count, created_at").order("created_at", { ascending: false }).limit(100);
  if (q) query = query.or(`username.ilike.%${q.replace(/[%,()]/g, "")}%,display_name.ilike.%${q.replace(/[%,()]/g, "")}%`);
  if (sp.filter === "suspended") query = query.eq("is_suspended", true);
  if (sp.filter === "featured") query = query.eq("is_featured", true);
  const { data, error } = await query;
  const back = `/admin/members?${new URLSearchParams({ ...(q ? { q } : {}), ...(sp.filter ? { filter: sp.filter } : {}) })}`;

  return (
    <Container className="py-10">
      <AdminHeader title="Members" />
      <form className="mb-4 flex flex-wrap items-end gap-3" role="search">
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-semibold">Find a member</span>
          <input name="q" defaultValue={q} placeholder="Name or username" className="min-h-11 w-72 max-w-full rounded-xl border border-sand-strong px-3" />
        </label>
        <select name="filter" defaultValue={sp.filter ?? ""} aria-label="Show" className="min-h-11 rounded-xl border border-sand-strong bg-white px-3">
          <option value="">All members</option>
          <option value="suspended">Suspended</option>
          <option value="featured">Featured</option>
        </select>
        <button type="submit" className="min-h-11 rounded-full bg-forest-900 px-5 font-semibold text-cream">
          Search
        </button>
      </form>
      <div className="mb-4 flex flex-col gap-3">
        {sp.done && DONE[sp.done] && <FormMessage tone="success">{DONE[sp.done]}</FormMessage>}
        {sp.error && <FormMessage tone="error">{ERRORS[sp.error] ?? ERRORS.failed}</FormMessage>}
      </div>
      {error && <p className="text-danger">Couldn&apos;t load members.</p>}
      <Table head={["Member", "Joined", "Followers", "Featured", "Account"]} empty={!error && (data ?? []).length === 0 && "No members found."}>
        {(data ?? []).map((m) => (
          <tr key={m.id} className="align-top">
            <td className="px-4 py-3">
              <Link href={`/admin/members/${m.id}`} className="font-semibold text-forest-900 hover:underline">
                {m.display_name}
              </Link>
              <span className="block text-xs text-ink-muted">@{m.username}</span>
            </td>
            <td className="px-4 py-3 text-ink-muted">{formatDate(m.created_at)}</td>
            <td className="px-4 py-3 tabular-nums">{m.follower_count}</td>
            <td className="px-4 py-3">
              <form action={setFeatured}>
                <input type="hidden" name="id" value={m.id} />
                <input type="hidden" name="table" value="profile" />
                <input type="hidden" name="featured" value={m.is_featured ? "0" : "1"} />
                <input type="hidden" name="back" value={back} />
                <button type="submit" className="min-h-9 rounded-full border border-sand-strong px-3 text-sm font-semibold hover:bg-sand">
                  {m.is_featured ? "Unfeature" : "Feature"}
                </button>
              </form>
            </td>
            <td className="px-4 py-3">
              {m.id === member!.id ? (
                <span className="text-sm text-ink-muted">You</span>
              ) : m.is_suspended ? (
                <form action={setSuspension} className="flex flex-col gap-1">
                  <span className="text-sm font-semibold text-danger">Suspended</span>
                  {m.suspended_reason && <span className="text-xs text-ink-muted">{m.suspended_reason}</span>}
                  <input type="hidden" name="id" value={m.id} />
                  <input type="hidden" name="suspend" value="0" />
                  <input type="hidden" name="back" value={back} />
                  <button type="submit" className="min-h-9 self-start rounded-full border border-forest-900 px-3 text-sm font-semibold text-forest-900">
                    Restore
                  </button>
                </form>
              ) : (
                <details>
                  <summary className="cursor-pointer text-sm font-semibold text-danger">Suspend…</summary>
                  <form action={setSuspension} className="mt-2 flex flex-col gap-2">
                    <input type="hidden" name="id" value={m.id} />
                    <input type="hidden" name="suspend" value="1" />
                    <input type="hidden" name="back" value={back} />
                    <label className="text-xs font-semibold" htmlFor={`reason-${m.id}`}>
                      Reason (shown to the member)
                    </label>
                    <input id={`reason-${m.id}`} name="reason" required maxLength={500} className="min-h-10 rounded-lg border border-sand-strong px-2 text-sm" />
                    <button type="submit" className="min-h-9 self-start rounded-full bg-danger px-3 text-sm font-semibold text-white">
                      Suspend account
                    </button>
                  </form>
                </details>
              )}
            </td>
          </tr>
        ))}
      </Table>
      <p className="mt-4 text-sm text-ink-muted">Suspended members can sign in and delete their data, but can&apos;t post, comment, like or follow, and their content is hidden.</p>
    </Container>
  );
}
