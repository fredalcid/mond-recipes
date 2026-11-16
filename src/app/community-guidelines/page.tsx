import type { Metadata } from "next";
import Link from "next/link";
import { InfoPage } from "@/components/layout/InfoPage";

export const metadata: Metadata = { title: "Community Guidelines", alternates: { canonical: "/community-guidelines" } };

export default function CommunityGuidelinesPage() {
  return (
    <InfoPage
      title="Community Guidelines"
      intro="Mònd Recipes is a place to share good food and learn from cooks around the world. These guidelines keep it friendly, safe and trustworthy."
      note="Draft for legal review before launch."
    >
      <h2>Share your own work</h2>
      <ul>
        <li>Only post recipes, photos and videos you created yourself, or that you have permission to share.</li>
        <li>Don&apos;t copy recipes, text or photos from websites, books, magazines or other members. If you adapted a recipe, say where it came from.</li>
        <li>Only show people in photos or videos if they agreed to appear. Don&apos;t post children without their parent&apos;s permission.</li>
      </ul>
      <h2>Be kind and respectful</h2>
      <ul>
        <li>Disagree about food, not about people. No insults, harassment, threats or bullying.</li>
        <li>No hate speech or mocking of anyone&apos;s culture, religion, nationality, ethnicity, gender, sexuality or disability. Food traditions deserve respect.</li>
        <li>When a dish belongs to more than one culture, welcome the different versions.</li>
      </ul>
      <h2>Keep it safe and honest</h2>
      <ul>
        <li>Don&apos;t share food safety advice that could make someone ill (for example unsafe canning, raw food or allergy claims).</li>
        <li>Don&apos;t make medical claims about food curing or treating illnesses.</li>
        <li>Reviews must be about a recipe you actually cooked. Don&apos;t review your own recipes or ask others to boost them.</li>
        <li>No spam, advertising, affiliate links or self-promotion without our written agreement.</li>
        <li>No sexual, violent or shocking content.</li>
      </ul>
      <h2>How moderation works</h2>
      <ul>
        <li>New recipes, photos, videos and tips are reviewed by a moderator before they appear.</li>
        <li>Comments and reviews appear straight away. Anyone can report something that breaks these guidelines; after several reports it is hidden until a moderator checks it.</li>
        <li>Moderators may decline, remove or edit content that breaks these guidelines, and may suspend accounts that break them repeatedly or seriously.</li>
        <li>You&apos;ll get a notification when we decide about your recipe or post. If you think we got it wrong, <Link href="/contact">contact us</Link>.</li>
      </ul>
      <h2>Your controls</h2>
      <ul>
        <li>Block a member from their profile to stop seeing their content and stop them interacting with you.</li>
        <li>Choose your notifications in <Link href="/account/notifications">notification settings</Link>.</li>
        <li>You can delete your posts, comments and reviews at any time, or <Link href="/account/delete">delete your account</Link> and everything you shared.</li>
      </ul>
    </InfoPage>
  );
}
