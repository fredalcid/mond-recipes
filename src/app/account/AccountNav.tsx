"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  ["/account", "Overview"],
  ["/account/profile", "Profile"],
  ["/account/contributions", "My contributions"],
  ["/account/saved", "Saved recipes"],
  ["/notifications", "Notifications"],
  ["/account/notifications", "Notification settings"],
  ["/account/blocked", "Blocked members"],
  ["/account/delete", "Delete account"],
] as const;

export function AccountNav() {
  const pathname = usePathname();
  return (
    <nav aria-label="Account" className="-mx-4 overflow-x-auto px-4 lg:mx-0 lg:px-0">
      <ul className="flex gap-1 lg:sticky lg:top-24 lg:flex-col">
        {LINKS.map(([href, label]) => (
          <li key={href} className="shrink-0">
            <Link
              href={href}
              aria-current={pathname === href ? "page" : undefined}
              className={`flex min-h-11 items-center rounded-full px-4 text-sm font-semibold lg:rounded-xl ${pathname === href ? "bg-forest-900 text-cream" : "hover:bg-sand"}`}
            >
              {label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
