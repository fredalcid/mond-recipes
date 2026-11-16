import Link from "next/link";
import { Logo } from "@/components/brand/Logo";
import { Container } from "@/components/ui/Container";
import { primaryNav } from "@/lib/site";
import { AuthNav } from "./AuthNav";
import { MobileMenu } from "./MobileMenu";
import { NavLinks } from "./NavLinks";

export function Header({ name, logoUrl }: { name?: string; logoUrl?: string | null }) {
  return (
    <header className="sticky top-0 z-40 border-b border-sand-strong/70 bg-ivory">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:rounded-full focus:bg-forest-900 focus:px-4 focus:py-2 focus:text-cream"
      >
        Skip to content
      </a>
      <Container className="flex h-[72px] items-center justify-between gap-4">
        <Logo size={46} name={name} logoUrl={logoUrl} />
        <NavLinks items={primaryNav} />
        <div className="flex items-center gap-1 sm:gap-2">
          <Link
            href="/recipes"
            aria-label="Search recipes"
            className="flex h-11 w-11 items-center justify-center rounded-full text-forest-900 hover:bg-sand"
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
              <circle cx="11" cy="11" r="7" />
              <path d="M20 20l-3.5-3.5" />
            </svg>
          </Link>
          <div className="hidden xl:block">
            <AuthNav />
          </div>
          <MobileMenu />
        </div>
      </Container>
    </header>
  );
}
