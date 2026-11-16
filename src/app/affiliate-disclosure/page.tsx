import type { Metadata } from "next";
import Link from "next/link";
import { InfoPage } from "@/components/layout/InfoPage";

export const metadata: Metadata = { title: "Affiliate Disclosure", alternates: { canonical: "/affiliate-disclosure" } };

export default function AffiliateDisclosurePage() {
  return (
    <InfoPage
      title="Affiliate Disclosure"
      intro="How Mònd Recipes earns money from product recommendations."
      note="Draft for legal review before launch."
    >
      <p>
        Some links on Mònd Recipes, including every product in our <Link href="/shop">Shop</Link>, are affiliate links. If you click one and buy
        something, the retailer may pay us a commission. The price you pay is the same.
      </p>
      <h2>What this means for you</h2>
      <ul>
        <li>We don&apos;t sell products ourselves and there is no checkout on Mònd Recipes. You buy directly from the retailer, under their terms.</li>
        <li>We only recommend products we believe are useful for home cooks. Commissions do not decide which products we include.</li>
        <li>We don&apos;t show prices, because they change often. Check the current price on the retailer&apos;s website.</li>
        <li>
          Products clearly marked <strong>Sponsored</strong> are paid placements from a brand or retailer.
        </li>
      </ul>
      <h2>Affiliate programs</h2>
      <p>We may take part in programs such as the Amazon Associates program and others. As an affiliate, we earn from qualifying purchases.</p>
      <h2>Questions</h2>
      <p>
        If you have questions about a recommendation, please <Link href="/contact">contact us</Link>.
      </p>
    </InfoPage>
  );
}
