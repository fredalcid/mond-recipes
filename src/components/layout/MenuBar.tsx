"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { NavItem } from "@/lib/site";

/**
 * Menu bar under the logo row, on screens narrower than 1280px (wider screens show the same
 * links inline in the header). Always visible, so the sections are one tap away without opening
 * the ☰ menu. On narrow phones it scrolls sideways.
 */
export function MenuBar({ items }: { items: readonly NavItem[] }) {
  const pathname = usePathname() ?? "/";
  return (
    <nav aria-label="Sections" className="bg-forest-900 xl:hidden">
      <ul className="mx-auto flex max-w-7xl items-center gap-1 overflow-x-auto px-2 [scrollbar-width:none] sm:justify-center sm:px-4 [&::-webkit-scrollbar]:hidden">
        {items.map((item) => {
          const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
          return (
            <li key={item.href} className="shrink-0">
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={`relative inline-flex min-h-11 items-center px-3 text-[14px] font-medium whitespace-nowrap transition-colors ${
                  active ? "text-gold-500" : "text-cream/90 hover:text-gold-500"
                }`}
              >
                {item.label}
                <span
                  aria-hidden="true"
                  className={`absolute inset-x-3 bottom-1.5 h-0.5 rounded-full bg-gold-500 ${active ? "opacity-100" : "opacity-0"}`}
                />
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
