import Link from "next/link";
import { Badge } from "@/components/ui/Badge";
import { FormMessage } from "@/components/ui/Field";
import { deleteContent } from "@/app/admin/content-actions";

export const STATUS_OPTIONS: [string, string][] = [
  ["draft", "Draft"],
  ["pending", "Pending review"],
  ["published", "Published"],
  ["unpublished", "Unpublished"],
];

export function StatusBadge({ status }: { status: string }) {
  return <Badge tone={status === "published" ? "verified" : status === "pending" ? "sample" : "community"}>{status}</Badge>;
}

export function AdminHeader({ title, action, children }: { title: string; action?: { href: string; label: string }; children?: React.ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
      <h1 className="text-4xl font-semibold text-forest-900">{title}</h1>
      <div className="flex flex-wrap items-center gap-3">
        {children}
        {action && (
          <Link href={action.href} className="inline-flex min-h-11 items-center rounded-full bg-forest-900 px-5 font-semibold text-cream hover:bg-forest-800">
            {action.label}
          </Link>
        )}
      </div>
    </div>
  );
}

export function Table({ head, children, empty }: { head: string[]; children: React.ReactNode; empty?: string | false }) {
  if (empty) return <p className="rounded-card border border-dashed border-sand-strong bg-white p-8 text-ink-muted">{empty}</p>;
  return (
    <div className="overflow-x-auto rounded-card border border-sand-strong bg-white">
      <table className="w-full min-w-[640px] text-left text-sm">
        <thead className="bg-sand/60 text-xs tracking-wide text-ink-muted uppercase">
          <tr>
            {head.map((h) => (
              <th key={h} scope="col" className="px-4 py-3">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-sand">{children}</tbody>
      </table>
    </div>
  );
}

export function SavedNotices({ saved, del, noun }: { saved?: string; del?: string; noun: string }) {
  return (
    <>
      {saved === "1" && <FormMessage tone="success">Saved. Public pages update within a few minutes.</FormMessage>}
      {del === "confirm" && <FormMessage tone="error">Type DELETE in the box to confirm.</FormMessage>}
      {del === "failed" && <FormMessage tone="error">The {noun} couldn&apos;t be deleted.</FormMessage>}
    </>
  );
}

export function DeleteBox({ table, id, noun }: { table: "articles" | "videos" | "products"; id: string; noun: string }) {
  return (
    <form action={deleteContent} className="mt-10 flex flex-wrap items-end gap-3 rounded-card border border-danger/30 bg-white p-5">
      <input type="hidden" name="table" value={table} />
      <input type="hidden" name="id" value={id} />
      <div className="flex flex-col gap-1">
        <label htmlFor="confirm-delete" className="text-sm font-semibold">
          Delete this {noun} permanently. Type DELETE to confirm.
        </label>
        <input id="confirm-delete" name="confirm" autoComplete="off" className="min-h-11 rounded-xl border border-sand-strong px-3" />
      </div>
      <button type="submit" className="min-h-11 rounded-full border border-danger px-5 font-semibold text-danger hover:bg-danger hover:text-white">
        Delete {noun}
      </button>
    </form>
  );
}
