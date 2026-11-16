"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";

export type NavGroup = { title: string; links: [string, string][] };

/** Admin menu grouped by area. Only the sections the person's roles allow are passed in. */
export function AdminNav({ groups }: { groups: NavGroup[] }) {
  const pathname = usePathname();
  const params = useSearchParams();
  const current = `${pathname}${params.get("kind") === "drink" ? "?kind=drink" : ""}`;
  const isActive = (href: string) => (href === "/admin" ? pathname === "/admin" : href.includes("?") ? current === href : current.startsWith(href) && !(href === "/admin/recipes" && current.includes("kind=drink")));
  return (
    <nav aria-label="Admin" className="flex flex-wrap gap-x-6 gap-y-2">
      {groups.map((g) => (
        <div key={g.title} className="flex flex-wrap items-center gap-1">
          <span className="mr-1 text-xs font-semibold tracking-wide text-ink-muted uppercase">{g.title}</span>
          {g.links.map(([href, label]) => (
            <Link
              key={href}
              href={href}
              aria-current={isActive(href) ? "page" : undefined}
              className={`inline-flex min-h-10 items-center rounded-full px-3 text-sm font-medium ${isActive(href) ? "bg-forest-900 text-cream" : "hover:bg-sand"}`}
            >
              {label}
            </Link>
          ))}
        </div>
      ))}
    </nav>
  );
}
