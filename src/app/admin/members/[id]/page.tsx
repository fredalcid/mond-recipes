import Link from "next/link";
import { notFound } from "next/navigation";
import { Container } from "@/components/ui/Container";
import { FormMessage } from "@/components/ui/Field";
import { AdminHeader, Table } from "@/components/admin/AdminBits";
import { Checkbox, Panel } from "@/components/admin/fields";
import { MemberAvatar } from "@/components/community/MemberAvatar";
import { getCurrentMember } from "@/lib/auth";
import { canManageMembers } from "@/lib/admin";
import { createClient } from "@/lib/supabase/server";
import { MEMBER_COLUMNS, memberFromRow } from "@/lib/community/types";
import { formatDate } from "@/lib/format";
import { removeBlock, setFeatured, setRoles, setSuspension } from "../../moderation-actions";

export const metadata = { title: "Member" };
export const dynamic = "force-dynamic";

/* eslint-disable @typescript-eslint/no-explicit-any -- PostgREST rows */

type Props = { params: Promise<{ id: string }>; searchParams: Promise<{ done?: string; error?: string }> };
const DONE: Record<string, string> = {
  roles: "Team roles saved.",
  suspended: "Member suspended and notified.",
  restored: "Member restored.",
  featured: "Member featured.",
  unfeatured: "Member no longer featured.",
  unblocked: "Block removed.",
};
const ERRORS: Record<string, string> = {
  "last-admin": "The site needs at least one super admin, so that role can't be removed.",
  staff: "Only super admins can suspend team members.",
  reason: "Give a reason when suspending a member.",
  "not-allowed": "You don't have permission to do that.",
  failed: "That didn't work. Please try again.",
};
const ROLE_INFO: [string, string, string][] = [
  ["super_admin", "Super admin", "Everything, including settings, roles, advertising and the newsletter list."],
  ["editor", "Editor", "Recipes, articles, videos, countries, categories and the shop."],
  ["moderator", "Community moderator", "Review submissions and reports, suspend and restore members."],
];

export default async function MemberAdmin({ params, searchParams }: Props) {
  const viewer = await getCurrentMember();
  if (!canManageMembers(viewer)) notFound();
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const sp = await searchParams;
  const superAdmin = viewer!.roles.includes("super_admin");
  const db = await createClient();
  if (!db) return null;

  const { data: p } = await db.from("profiles").select(`${MEMBER_COLUMNS}, bio, is_suspended, suspended_reason, suspended_at, follower_count, following_count, created_at`).eq("id", id).maybeSingle();
  if (!p) notFound();
  const profile = p as any;
  const member = memberFromRow(profile);
  const count = (table: string, col: string, extra?: (q: any) => any) => {
    let q = db.from(table).select("*", { count: "exact", head: true }).eq(col, id);
    if (extra) q = extra(q);
    return q.then((r: any) => r.count ?? 0);
  };
  const [roles, account, recipes, posts, comments, reviews, blocksBy, blocksOf, reportsAgainst, log] = await Promise.all([
    db.from("user_roles").select("role, created_at").eq("user_id", id),
    superAdmin ? db.rpc("admin_member_account", { p_member: id }).then((r: any) => (r.data ?? [])[0] ?? null) : Promise.resolve(null),
    count("recipes", "author_id"),
    count("community_posts", "author_id"),
    count("comments", "author_id"),
    count("recipe_reviews", "author_id"),
    db.from("blocks").select(`created_at, other:profiles!blocks_blocked_id_fkey ( ${MEMBER_COLUMNS} )`).eq("blocker_id", id),
    db.from("blocks").select(`created_at, other:profiles!blocks_blocker_id_fkey ( ${MEMBER_COLUMNS} )`).eq("blocked_id", id),
    db.from("reports").select("id, target_type, reason, status, created_at").eq("target_type", "profile").eq("target_id", id).order("created_at", { ascending: false }).limit(20),
    superAdmin ? db.from("admin_activity_log").select("action, entity_type, details, created_at").eq("entity_id", id).order("created_at", { ascending: false }).limit(20) : Promise.resolve({ data: [] }),
  ]);
  const roleSet = new Set((roles.data ?? []).map((r) => r.role as string));
  const back = `/admin/members/${id}`;
  const btn = "min-h-10 rounded-full px-4 text-sm font-semibold";

  return (
    <Container className="max-w-4xl py-10">
      <AdminHeader title={member.displayName}>
        <Link href={`/members/${member.username}`} className="font-semibold text-forest-900 underline underline-offset-4">
          Public profile →
        </Link>
      </AdminHeader>
      <div className="mb-6 flex flex-col gap-3">
        {sp.done && DONE[sp.done] && <FormMessage tone="success">{DONE[sp.done]}</FormMessage>}
        {sp.error && <FormMessage tone="error">{ERRORS[sp.error] ?? ERRORS.failed}</FormMessage>}
      </div>

      <div className="flex flex-col gap-8">
        <Panel title="Overview">
          <div className="flex items-center gap-4">
            <MemberAvatar member={member} size="lg" />
            <dl className="grid flex-1 gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-ink-muted">Username</dt>
                <dd className="font-semibold">@{member.username}</dd>
              </div>
              <div>
                <dt className="text-ink-muted">Joined</dt>
                <dd className="font-semibold">{formatDate(profile.created_at)}</dd>
              </div>
              {account && (
                <>
                  <div>
                    <dt className="text-ink-muted">Email (super admins only)</dt>
                    <dd className="font-semibold break-all">{account.email}</dd>
                  </div>
                  <div>
                    <dt className="text-ink-muted">Last sign-in</dt>
                    <dd className="font-semibold">{account.last_sign_in_at ? formatDate(account.last_sign_in_at) : "—"}</dd>
                  </div>
                  <div>
                    <dt className="text-ink-muted">Email confirmed</dt>
                    <dd className="font-semibold">{account.email_confirmed_at ? "Yes" : "No"}</dd>
                  </div>
                </>
              )}
              <div>
                <dt className="text-ink-muted">Shared</dt>
                <dd className="font-semibold">
                  {recipes} recipes · {posts} posts · {comments} comments · {reviews} reviews
                </dd>
              </div>
              <div>
                <dt className="text-ink-muted">Followers</dt>
                <dd className="font-semibold">
                  {profile.follower_count} followers · following {profile.following_count}
                </dd>
              </div>
            </dl>
          </div>
          <div className="flex flex-wrap items-center gap-3 border-t border-sand pt-4">
            <form action={setFeatured}>
              <input type="hidden" name="id" value={id} />
              <input type="hidden" name="table" value="profile" />
              <input type="hidden" name="featured" value={member.isFeatured ? "0" : "1"} />
              <input type="hidden" name="back" value={back} />
              <button type="submit" className={`${btn} border border-sand-strong hover:bg-sand`}>
                {member.isFeatured ? "Stop featuring" : "Feature on the community page"}
              </button>
            </form>
          </div>
        </Panel>

        <Panel title="Account status">
          {profile.is_suspended ? (
            <form action={setSuspension} className="flex flex-col gap-3">
              <p>
                <strong className="text-danger">Suspended</strong> since {formatDate(profile.suspended_at)}
                {profile.suspended_reason && `: ${profile.suspended_reason}`}
              </p>
              <input type="hidden" name="id" value={id} />
              <input type="hidden" name="suspend" value="0" />
              <input type="hidden" name="back" value={back} />
              <button type="submit" className={`${btn} self-start bg-forest-900 text-cream`}>
                Restore account
              </button>
            </form>
          ) : viewer!.id === id ? (
            <p className="text-sm text-ink-muted">This is your account.</p>
          ) : (
            <form action={setSuspension} className="flex flex-col gap-3">
              <input type="hidden" name="id" value={id} />
              <input type="hidden" name="suspend" value="1" />
              <input type="hidden" name="back" value={back} />
              <label className="flex flex-col gap-1 text-sm">
                <span className="font-semibold">Reason (shown to the member)</span>
                <input name="reason" required maxLength={500} className="min-h-11 rounded-xl border border-sand-strong px-3" />
              </label>
              <button type="submit" className={`${btn} self-start bg-danger text-white`}>
                Suspend account
              </button>
              <p className="text-xs text-ink-muted">Suspended members can sign in and delete their data, but can&apos;t take part, and their content is hidden.</p>
            </form>
          )}
        </Panel>

        <Panel title="Team roles">
          {superAdmin ? (
            <form action={setRoles} className="flex flex-col gap-2">
              <input type="hidden" name="id" value={id} />
              {ROLE_INFO.map(([key, label, info]) => (
                <div key={key}>
                  <Checkbox name={`role_${key}`} label={label} defaultChecked={roleSet.has(key)} />
                  <p className="ml-7 text-xs text-ink-muted">{info}</p>
                </div>
              ))}
              <p className="text-xs text-ink-muted">Give roles only to people you trust. A role works once the person has confirmed their email.</p>
              <button type="submit" className={`${btn} mt-2 self-start bg-forest-900 text-cream`}>
                Save roles
              </button>
            </form>
          ) : (
            <p className="text-sm">{roleSet.size ? [...roleSet].join(", ").replace("_", " ") : "No team role."} Only super admins can change roles.</p>
          )}
        </Panel>

        <Panel title="Blocks">
          <p className="text-sm text-ink-muted">Members block each other themselves. Remove a block only when there&apos;s a good reason, such as a resolved dispute.</p>
          {[
            ["Members this person blocked", blocksBy.data ?? [], "by"],
            ["Members who blocked this person", blocksOf.data ?? [], "of"],
          ].map(([title, list, dir]) => (
            <section key={title as string}>
              <h3 className="mb-2 font-semibold">{title as string}</h3>
              {(list as any[]).length === 0 ? (
                <p className="text-sm text-ink-muted">None.</p>
              ) : (
                <ul className="flex flex-col gap-2">
                  {(list as any[]).map((b) => {
                    const other = memberFromRow(b.other);
                    return (
                      <li key={other.id} className="flex flex-wrap items-center gap-3 text-sm">
                        <Link href={`/admin/members/${other.id}`} className="font-semibold text-forest-900 hover:underline">
                          {other.displayName}
                        </Link>
                        <span className="text-ink-muted">since {formatDate(b.created_at)}</span>
                        <form action={removeBlock}>
                          <input type="hidden" name="blocker" value={dir === "by" ? id : other.id} />
                          <input type="hidden" name="blocked" value={dir === "by" ? other.id : id} />
                          <input type="hidden" name="back" value={back} />
                          <button type="submit" className="min-h-9 rounded-full px-3 font-semibold text-danger hover:bg-sand">
                            Remove block
                          </button>
                        </form>
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>
          ))}
        </Panel>

        <Panel title="Reports about this member">
          <Table head={["Reason", "Status", "Date"]} empty={(reportsAgainst.data ?? []).length === 0 && "No reports about this profile."}>
            {(reportsAgainst.data ?? []).map((r: any) => (
              <tr key={r.id}>
                <td className="px-4 py-2 capitalize">{r.reason}</td>
                <td className="px-4 py-2 capitalize">{r.status}</td>
                <td className="px-4 py-2">{formatDate(r.created_at)}</td>
              </tr>
            ))}
          </Table>
          <Link href="/admin/moderation?tab=reports" className="text-sm font-semibold text-forest-900 underline">
            Open reports queue
          </Link>
        </Panel>

        {superAdmin && (
          <Panel title="History">
            <Table head={["Date", "Action"]} empty={(log.data ?? []).length === 0 && "No team actions recorded for this member."}>
              {((log.data ?? []) as any[]).map((l, i) => (
                <tr key={i}>
                  <td className="px-4 py-2 whitespace-nowrap">{formatDate(l.created_at)}</td>
                  <td className="px-4 py-2 capitalize">
                    {l.action.replace(/_/g, " ")} {l.details?.reason ? `· “${l.details.reason}”` : ""}
                  </td>
                </tr>
              ))}
            </Table>
          </Panel>
        )}
      </div>
    </Container>
  );
}
