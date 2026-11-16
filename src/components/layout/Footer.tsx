import Image from "next/image";
import Link from "next/link";
import { Container } from "@/components/ui/Container";
import { NewsletterForm } from "@/components/forms/NewsletterForm";
import { footerNav, primaryNav } from "@/lib/site";
import type { SiteSettings } from "@/lib/settings";
import { CookieSettingsButton } from "@/components/privacy/ConsentManager";

/** Brand text, social links and the footer note come from Admin → Settings. */
export function Footer({ settings }: { settings: SiteSettings }) {
  const socialLinks = settings.social;
  return (
    <footer className="mt-24 bg-forest-900 text-cream">
      <Container className="grid gap-12 py-16 lg:grid-cols-12">
        <div className="lg:col-span-4">
          <div className="flex items-center gap-3">
            {settings.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element -- uploaded logo from Storage
              <img src={settings.logoUrl} alt="" width={64} height={64} className="h-16 w-16 object-contain" />
            ) : (
              <Image src="/brand/mond-badge.png" alt="" width={64} height={64} />
            )}
            <div>
              <p className="font-display text-2xl font-semibold">{settings.name}</p>
              <p className="text-sm tracking-[0.2em] text-gold-500 uppercase">{settings.tagline}</p>
            </div>
          </div>
          <p className="mt-5 max-w-sm text-sm leading-relaxed text-cream/80">{settings.description}</p>
          {socialLinks.length > 0 && (
            <ul className="mt-6 flex flex-wrap gap-x-4" aria-label="Follow us">
              {socialLinks.map((s) => (
                <li key={s.href}>
                  <a href={s.href} rel="noopener me" className="inline-flex min-h-11 items-center text-sm underline-offset-4 hover:underline">
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
          <p>
            © {new Date().getFullYear()} {settings.name}. All rights reserved.
            {settings.mailingAddress && <span className="block">{settings.mailingAddress}</span>}
          </p>
          <div className="flex flex-wrap items-center gap-4">
            <CookieSettingsButton className="min-h-11 underline-offset-4 hover:text-cream hover:underline" />
            <p>{settings.footerNote}</p>
          </div>
        </Container>
      </div>
    </footer>
  );
}
