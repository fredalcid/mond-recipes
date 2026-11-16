import type { Metadata } from "next";
import Link from "next/link";
import { InfoPage } from "@/components/layout/InfoPage";
import { CookieSettingsButton } from "@/components/privacy/ConsentManager";

export const metadata: Metadata = {
  title: "Cookie Policy",
  description: "The cookies and similar technologies Mònd Recipes uses, what each one does, and how to change your choice.",
  alternates: { canonical: "/cookies" },
};

const rows: [string, string, string, string][] = [
  ["sb-…-auth-token", "Mònd Recipes (Supabase)", "Keeps you signed in. Only set when you sign in.", "Until you sign out (refreshed while you use the site)"],
  ["mond_consent", "Mònd Recipes", "Remembers your cookie choices.", "12 months"],
  ["mond:recent-searches (browser storage)", "Mònd Recipes", "Shows your last searches in the search box. Stays on your device.", "Until you clear it"],
  ["Cloudflare Turnstile (challenge data, not tracking cookies)", "Cloudflare", "Checks that a person, not a bot, is filling in sign-up and posting forms.", "While the form is open"],
];
const optional: [string, string, string, string][] = [
  ["_ga, _ga_…", "Google Analytics", "Counts visits and shows which pages are used, so we can improve the site. IP addresses are anonymised.", "Up to 2 years"],
  ["Google AdSense cookies (e.g. __gads, __gpi, IDE)", "Google", "Shows ads and measures them. With your consent, ads may be personalised.", "Up to 13 months"],
];

function Table({ items, label }: { items: [string, string, string, string][]; label: string }) {
  return (
    <div className="overflow-x-auto" tabIndex={0} role="region" aria-label={label}>
      <table>
        <thead>
          <tr>
            <th scope="col">Name</th>
            <th scope="col">Set by</th>
            <th scope="col">Purpose</th>
            <th scope="col">Lasts</th>
          </tr>
        </thead>
        <tbody>
          {items.map(([a, b, c, d]) => (
            <tr key={a}>
              <td>
                <code>{a}</code>
              </td>
              <td>{b}</td>
              <td>{c}</td>
              <td>{d}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function CookiesPage() {
  const optionalOn = Boolean(process.env.NEXT_PUBLIC_GA_ID || process.env.NEXT_PUBLIC_ADSENSE_CLIENT);
  return (
    <InfoPage
      title="Cookie Policy"
      intro="Cookies are small files a website saves in your browser. Here is every one we use and why."
      note="Draft for legal review before launch."
    >
      <h2>Your choice</h2>
      {optionalOn ? (
        <>
          <p>
            Analytics and advertising cookies are <strong>off until you say yes</strong>. You can change your choice at any time, here or with{" "}
            <strong>Cookie settings</strong> at the bottom of every page.
          </p>
          <CookieSettingsButton className="inline-flex min-h-11 items-center rounded-full bg-forest-900 px-5 font-semibold text-cream hover:bg-forest-800" />
        </>
      ) : (
        <p>
          Right now the site uses <strong>only the cookies needed for it to work</strong>. Analytics and advertising aren&apos;t switched on. If they are added, they
          will stay off until you say yes, and a <strong>Cookie settings</strong> link will appear at the bottom of every page.
        </p>
      )}

      <h2>Needed for the site to work</h2>
      <p>These are always on, because the site can&apos;t work properly without them. They aren&apos;t used for advertising.</p>
      <Table items={rows} label="Cookies needed for the site to work" />

      <h2>Only with your consent</h2>
      <p>
        These are only set if you accept them, and only once the matching service is switched on. Google&apos;s use of this information is described in{" "}
        <a href="https://policies.google.com/technologies/partner-sites" rel="noopener noreferrer">
          How Google uses information from sites that use its services
        </a>
        .
      </p>
      <Table items={optional} label="Optional cookies" />

      <h2>Videos</h2>
      <p>
        Videos are played from YouTube in privacy-enhanced mode (youtube-nocookie.com). YouTube may set cookies once you press play.
      </p>

      <h2>Shop links</h2>
      <p>
        When you open a product from the Shop, you go to the retailer&apos;s website. The retailer and its affiliate network may then set their own cookies to record
        that you came from us. Their policies apply. See our <Link href="/affiliate-disclosure">Affiliate Disclosure</Link>.
      </p>

      <h2>More</h2>
      <p>
        You can also block or delete cookies in your browser settings. Blocking the sign-in cookie will stop you from signing in. Read our{" "}
        <Link href="/privacy">Privacy Policy</Link> for your other rights.
      </p>
    </InfoPage>
  );
}
