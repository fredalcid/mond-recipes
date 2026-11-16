import type { Metadata, Viewport } from "next";
import "@fontsource-variable/fraunces";
import "@fontsource-variable/inter";
import "./globals.css";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { ConsentManager } from "@/components/privacy/ConsentManager";
import { AdSlot } from "@/components/ads/AdSlot";
import { site } from "@/lib/site";
import { getSiteSettings } from "@/lib/settings";

export async function generateMetadata(): Promise<Metadata> {
  const s = await getSiteSettings();
  return {
    metadataBase: new URL(site.url),
    title: { default: s.seo.defaultTitle, template: `%s · ${s.name}` },
    description: s.seo.defaultDescription,
    applicationName: s.name,
    // Until a super admin allows indexing (Admin → SEO), search engines are asked to stay away.
    robots: s.seo.allowIndexing ? undefined : { index: false, follow: false },
    openGraph: {
      type: "website",
      siteName: s.name,
      locale: "en_CA",
      images: s.seo.ogImageUrl
        ? [{ url: s.seo.ogImageUrl, width: 1200, height: 630, alt: s.name }]
        : [{ url: "/brand/mond-badge.png", width: 312, height: 312, alt: `${s.name} logo` }],
    },
    twitter: { card: s.seo.ogImageUrl ? "summary_large_image" : "summary" },
  };
}

export const viewport: Viewport = {
  themeColor: "#1e3713",
};

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const settings = await getSiteSettings();
  return (
    <html lang="en">
      <body className="flex min-h-dvh flex-col antialiased">
        <Header name={settings.name} logoUrl={settings.logoUrl} />
        <main id="main" className="flex-1">
          {children}
        </main>
        <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
          <AdSlot id="footer" />
        </div>
        <Footer settings={settings} />
        <ConsentManager />
      </body>
    </html>
  );
}
