import type { Metadata } from "next";
import Link from "next/link";
import { InfoPage } from "@/components/layout/InfoPage";

export const metadata: Metadata = { title: "Advertise With Us", alternates: { canonical: "/advertise" } };

export default function AdvertisePage() {
  return (
    <InfoPage title="Advertise With Us" intro="Reach home cooks who love discovering food from around the world.">
      <p>We work with food, kitchen and travel brands that fit what our readers cook and enjoy. Options include:</p>
      <ul>
        <li>Sponsored country weeks and cooking challenges</li>
        <li>Sponsored product placements in our Shop (always labelled “Sponsored”)</li>
        <li>Newsletter sponsorships</li>
        <li>Recipe and video collaborations</li>
      </ul>
      <p>
        Sponsored content is always clearly labelled, and we only partner with brands we&apos;d recommend to our own families.
      </p>
      <p>
        To start a conversation, <Link href="/contact?topic=advertising">contact us</Link> and choose “Advertising and partnerships”.
      </p>
    </InfoPage>
  );
}
