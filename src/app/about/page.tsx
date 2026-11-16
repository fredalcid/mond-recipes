import type { Metadata } from "next";
import Link from "next/link";
import { InfoPage } from "@/components/layout/InfoPage";

export const metadata: Metadata = {
  title: "About Mònd Recipes",
  description: "Mònd Recipes is an international food platform for discovering, cooking and sharing recipes from around the world.",
  alternates: { canonical: "/about" },
};

export default function AboutPage() {
  return (
    <InfoPage title="About Mònd Recipes" intro="Discover the world, one recipe at a time.">
      <p>
        Mònd Recipes is a home for cooking from every corner of the world. Here you can explore dishes by country, learn about the food cultures
        behind them, find drinks and teas to go with them, and share what you cook with other food lovers.
      </p>
      <h2>What makes a recipe trustworthy</h2>
      <p>Every recipe on Mònd Recipes shows how it was reviewed, so you always know what to expect:</p>
      <ul>
        <li>
          <strong>Test-kitchen verified</strong>: cooked and checked by our team before publishing.
        </li>
        <li>
          <strong>Editorially reviewed</strong>: read and checked by an editor for clear, complete instructions.
        </li>
        <li>
          <strong>Community recipe</strong>: shared by a member and approved by our moderators.
        </li>
      </ul>
      <p>We never show a badge a recipe hasn&apos;t earned, and ratings and reviews come only from real members.</p>
      <h2>Respecting food cultures</h2>
      <p>
        Many dishes are shared across borders and traditions. When a dish belongs to more than one place, we say so, and we ask contributors to tell us
        where their recipe comes from.
      </p>
      <h2>Get in touch</h2>
      <p>
        Questions, corrections or ideas? <Link href="/contact">Contact us</Link>. Interested in working together? See{" "}
        <Link href="/advertise">Advertise with us</Link>.
      </p>
    </InfoPage>
  );
}
