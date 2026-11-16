import type { Metadata } from "next";
import Link from "next/link";
import { InfoPage } from "@/components/layout/InfoPage";
import { getSiteSettings } from "@/lib/settings";

export const metadata: Metadata = {
  title: "Terms of Service",
  description: "The rules for using Mònd Recipes: accounts, what you share, our content, Shop links, advertising and your rights as a consumer.",
  alternates: { canonical: "/terms" },
};

export default async function TermsPage() {
  const { name: siteName } = await getSiteSettings();
  return (
    <InfoPage
      title="Terms of Service"
      intro={`The rules for using ${siteName}. By using the site or creating an account, you agree to them.`}
      note="Draft for legal review before launch. Nothing in these terms limits rights you have under Quebec's Consumer Protection Act or other laws that can't be waived."
    >
      <h2>Using the site</h2>
      <p>
        You can browse recipes, drinks, teas, articles and videos without an account. Please use the site lawfully and don&apos;t try to disrupt it, get around its
        security, or collect other people&apos;s information from it.
      </p>

      <h2>Your account</h2>
      <ul>
        <li>You must be 14 or older to create an account.</li>
        <li>Give accurate information, keep your password private, and tell us if you think someone else has used your account.</li>
        <li>One person, one account. Usernames that impersonate someone or are offensive may be changed.</li>
        <li>
          You can delete your account at any time in <Link href="/account/delete">your account settings</Link>.
        </li>
      </ul>

      <h2>What you share</h2>
      <p>
        You keep ownership of the recipes, photos, videos, comments and reviews you post. By posting, you give {siteName} a non-exclusive, royalty-free licence to
        host, show, adapt for display (for example resizing photos) and share them on the site and in our newsletter and social media, for as long as they stay on the
        site. You can remove your content at any time; copies may remain for a short time in backups.
      </p>
      <p>When you post, you confirm that:</p>
      <ul>
        <li>it is yours, or you have permission to share it (don&apos;t copy recipes, photos or text from cookbooks or other websites);</li>
        <li>people shown in your photos or videos agreed to it;</li>
        <li>
          it follows our <Link href="/community-guidelines">Community Guidelines</Link>.
        </li>
      </ul>
      <p>
        Moderators may review, hide or remove content and suspend accounts that break these terms or the guidelines. Member recipes are labelled as member
        contributions; only recipes our team has actually tested are marked as tested.
      </p>

      <h2>Our content</h2>
      <p>
        Recipes, articles, photos, videos, design and the {siteName} name and logo belong to {siteName} or to the people who licensed them to us. You may use them for
        your own cooking and share links to them. Please don&apos;t republish them without permission.
      </p>

      <h2>Cooking safely</h2>
      <p>
        Recipes and articles are general information. Check ingredients for allergies and dietary needs, follow safe food-handling practices, and use your judgement
        with heat, knives and equipment. Nutrition information, where shown, is an estimate. Drink alcohol responsibly and only if you are of legal drinking age.
      </p>

      <h2>Shop and affiliate links</h2>
      <p>
        {siteName} doesn&apos;t sell products. Every product in the <Link href="/shop">Shop</Link> links to an outside retailer, and you buy directly from them under
        their terms, prices, delivery and return policies. We may earn a commission. See our <Link href="/affiliate-disclosure">Affiliate Disclosure</Link>. We
        aren&apos;t responsible for the retailer&apos;s products or service, but tell us about a problem link and we&apos;ll look at it.
      </p>

      <h2>Advertising</h2>
      <p>Ads are clearly labelled. An ad doesn&apos;t mean we endorse the advertiser.</p>

      <h2>Copyright complaints</h2>
      <p>
        If you believe something on the site infringes your copyright, <Link href="/contact?topic=copyright">contact us</Link> with the page address, the work you own,
        and your contact details. We will review it and, where appropriate, remove the content and notify the person who posted it.
      </p>

      <h2>Availability and liability</h2>
      <p>
        We work to keep the site running and accurate, but it may sometimes be unavailable or contain errors. To the extent the law allows, {siteName} isn&apos;t
        responsible for indirect losses from using the site. This doesn&apos;t limit any liability that can&apos;t be excluded by law.
      </p>

      <h2>Privacy</h2>
      <p>
        Our <Link href="/privacy">Privacy Policy</Link> explains how we handle personal information, and our <Link href="/cookies">Cookie Policy</Link> explains
        cookies.
      </p>

      <h2>Changes and law</h2>
      <p>
        If we make an important change, we will post the new terms here and tell members before they apply. These terms are governed by the laws of Quebec and of
        Canada that apply there. They are available in French on request.
      </p>

      <h2>Contact</h2>
      <p>
        Questions? Use the <Link href="/contact">Contact page</Link>.
      </p>
    </InfoPage>
  );
}
