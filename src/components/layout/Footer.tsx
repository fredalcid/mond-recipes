import Image from "next/image";
import Link from "next/link";
import { Container } from "@/components/ui/Container";
import { NewsletterForm } from "@/components/forms/NewsletterForm";
import { footerNav, primaryNav, site } from "@/lib/site";
import { CookieSettingsButton } from "@/components/privacy/ConsentManager";

/** Social profiles are listed here once the accounts exist (managed in site settings in Phase 5). */
const socialLinks: { label: string; href: string }[] = [];

export function Footer() {
  return (
    <footer className="mt-24 bg-forest-900 text-cream">
      <Container className="grid gap-12 py-16 lg:grid-cols-12">
        <div className="lg:col-span-4">
          <div className="flex items-center gap-3">
            <Image src="/brand/mond-badge.png" alt="" width={64} height={64} />
            <div>
              <p className="font-display text-2xl font-semibold">Mònd Recipes</p>
              <p className="text-sm tracking-[0.2em] text-gold-500 uppercase">{site.tagline}</p>
            </div>
          </div>
          <p className="mt-5 max-w-sm text-sm leading-relaxed text-cream/80">{site.description}</p>
          {socialLinks.length > 0 && (
            <ul className="mt-6 flex gap-3">
              {socialLinks.map((s) => (
                <li key={s.href}>
                  <a href={s.href} rel="noopener" className="underline-offset-4 hover:underline">
                    {s.label}
                  </a>
                </li>
              ))}
            </ul>
          )}
        </div>

        <nav aria-label="Explore" className="lg:col-span-2">
          <h2 className="mb-4 font-sans text-sm font-semibold tracking-[0.14em] text-gold-500 uppercase">Explore</h2>
          <ul className="space-y-1">
            {primaryNav.slice(1).map((item) => (
              <li key={item.href}>
                <Link href={item.href} className="inline-block py-1.5 text-sm text-cream/85 hover:text-cream hover:underline">
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        {footerNav.map((group) => (
          <nav key={group.heading} aria-label={group.heading} className="lg:col-span-2">
            <h2 className="mb-4 font-sans text-sm font-semibold tracking-[0.14em] text-gold-500 uppercase">{group.heading}</h2>
            <ul className="space-y-1">
              {group.links.map((item) => (
                <li key={item.href}>
                  <Link href={item.href} className="inline-block py-1.5 text-sm text-cream/85 hover:text-cream hover:underline">
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        ))}

        <div className="lg:col-span-2">
          <h2 className="mb-4 font-sans text-sm font-semibold tracking-[0.14em] text-gold-500 uppercase">Newsletter</h2>
          <NewsletterForm source="footer" tone="dark" stacked />
        </div>
      </Container>
      <div className="border-t border-forest-800">
        <Container className="flex flex-wrap items-center justify-between gap-3 py-6 text-xs text-cream/70">
          <p>© {new Date().getFullYear()} Mònd Recipes. All rights reserved.</p>
          <div className="flex flex-wrap items-center gap-4">
            <CookieSettingsButton className="min-h-11 underline-offset-4 hover:text-cream hover:underline" />
            <p>Recipes and photos on this site are original or used with permission.</p>
          </div>
        </Container>
      </div>
    </footer>
  );
}
