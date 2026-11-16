import type { Metadata } from "next";
import Link from "next/link";
import { InfoPage } from "@/components/layout/InfoPage";
import { getSiteSettings } from "@/lib/settings";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "What personal information Mònd Recipes collects, why, who we share it with, how long we keep it, and how to use your privacy rights.",
  alternates: { canonical: "/privacy" },
};

export default async function PrivacyPage() {
  const { privacyOfficer, contactEmail, mailingAddress, name: siteName } = await getSiteSettings();
  return (
    <InfoPage
      title="Privacy Policy"
      intro={`How ${siteName} collects, uses and protects your personal information, in plain language.`}
      note="Draft for legal review before launch. Written to follow Quebec's Act respecting the protection of personal information in the private sector (as amended by Law 25), Canada's PIPEDA and Canada's Anti-Spam Legislation (CASL)."
    >
      <h2>Who is responsible</h2>
      <p>
        {siteName} is responsible for the personal information described here. Our person in charge of the protection of personal information is:
      </p>
      {privacyOfficer ? (
        <p>
          <strong>{privacyOfficer.name}</strong>, {privacyOfficer.title}
          <br />
          Email: <a href={`mailto:${privacyOfficer.email}`}>{privacyOfficer.email}</a>
          {mailingAddress && (
            <>
              <br />
              Mail: {mailingAddress}
            </>
          )}
        </p>
      ) : (
        <p>
          Contact details will be published here before launch. Until then, write to us through the <Link href="/contact?topic=privacy">Contact page</Link>
          {contactEmail ? (
            <>
              {" "}or at <a href={`mailto:${contactEmail}`}>{contactEmail}</a>
            </>
          ) : null}
          .
        </p>
      )}

      <h2>What we collect and why</h2>
      <p>We only collect what we need for the purposes below. We don&apos;t sell personal information.</p>
      <ul>
        <li>
          <strong>Your account:</strong> email address, password (stored only as a secure hash by our login provider), display name and username. Used to create and
          secure your account and to let you sign in.
        </li>
        <li>
          <strong>Your profile and what you share:</strong> optional picture, bio and country; recipes, posts, photos, videos, comments, reviews, likes, follows and
          saved recipes. Used to show your contributions in the community. Public posts and your public profile can be seen by anyone.
        </li>
        <li>
          <strong>Newsletter:</strong> email address, the wording you agreed to, and when and from where you agreed. Used only to send the newsletter you asked for and
          to prove your consent, as Canada&apos;s anti-spam law requires.
        </li>
        <li>
          <strong>Contact messages:</strong> name, email and message. Used to reply to you. Messages are delivered to our inbox by email and are not stored on the
          website.
        </li>
        <li>
          <strong>Safety and moderation:</strong> reports you make, moderation decisions and a short-lived record of request counts used to stop spam and abuse.
        </li>
        <li>
          <strong>Shop link clicks:</strong> which product was clicked, the page it was clicked from and the website you came from. No name, email or IP address is
          stored. Used to count clicks and check that links still work.
        </li>
        <li>
          <strong>Analytics and advertising (only if you agree):</strong> if you accept analytics or advertising cookies, Google Analytics and Google AdSense may
          collect information about your device and how you use the site. See the <Link href="/cookies">Cookie Policy</Link>.
        </li>
      </ul>

      <h2>Your consent</h2>
      <p>
        We ask for your consent separately for each purpose that needs it: creating an account, joining the newsletter, and analytics or advertising cookies. You can
        withdraw consent at any time: unsubscribe from any newsletter email, change your cookie choice with <strong>Cookie settings</strong> (see the <Link href="/cookies">Cookie Policy</Link>), or
        delete your account. Withdrawing consent doesn&apos;t affect what was done before.
      </p>

      <h2>Children</h2>
      <p>
        Accounts are for people aged 14 and older. We don&apos;t knowingly collect personal information from children under 14. If you believe a child under 14 has
        created an account, contact us and we will delete it.
      </p>

      <h2>Who we share it with</h2>
      <p>We use these service providers to run the website. They may only use your information to provide their service to us.</p>
      <ul>
        <li>
          <strong>Supabase</strong>: database, login and file storage.
        </li>
        <li>
          <strong>Hostinger</strong>: website hosting.
        </li>
        <li>
          <strong>Resend</strong>: sending account and newsletter emails.
        </li>
        <li>
          <strong>Cloudflare Turnstile</strong>: checking that forms are filled in by a person, not a bot.
        </li>
        <li>
          <strong>Google</strong> (Analytics, AdSense, YouTube): only if you accept the matching cookies, or when you play a video.
        </li>
      </ul>
      <p>
        Some of these providers store or process information outside Quebec and outside Canada, including in the United States, where it may be accessible to
        authorities under local law. Before communicating information outside Quebec, we assess whether it will be adequately protected and put written agreements in
        place. We may also disclose information when the law requires it.
      </p>
      <p>
        When you click a product in the Shop, you leave our site. The retailer&apos;s own privacy policy then applies.
      </p>

      <h2>How long we keep it</h2>
      <ul>
        <li>Account and contributions: until you delete your account. Deleting it removes your profile, posts, comments, reviews, likes, follows and uploads.</li>
        <li>Newsletter: until you unsubscribe; we then keep a record of the unsubscribe so we don&apos;t email you again. Unconfirmed sign-ups are deleted.</li>
        <li>Contact emails: as long as needed to answer you, then deleted.</li>
        <li>Spam-protection counters: about one hour.</li>
        <li>Shop click counts: kept as statistics, with no personal information.</li>
        <li>Backups made by our database provider are overwritten on their regular schedule.</li>
      </ul>

      <h2>Your rights</h2>
      <p>You can ask to:</p>
      <ul>
        <li>see the personal information we hold about you and get a copy of it, including in a structured, commonly used format;</li>
        <li>correct information that is wrong, incomplete or out of date;</li>
        <li>delete it, or stop us from sharing it, when it is no longer needed or was collected against the law;</li>
        <li>stop a link to your information from being shown in search on our site (de-indexing);</li>
        <li>know how a decision about you was made, if it was made only by automated processing (we don&apos;t make any).</li>
      </ul>
      <p>
        Signed-in members can do most of this themselves in <Link href="/account/privacy">My data</Link>, including downloading a copy and deleting their account. For
        anything else, contact the person in charge above or use the <Link href="/contact?topic=privacy">Contact page</Link>. We may need to confirm your identity.
        We answer within 30 days, free of charge.
      </p>

      <h2>How we protect it</h2>
      <p>
        Access is limited to people who need it, with separate roles for editors, moderators and administrators. Passwords are never stored in readable form. Every
        connection is encrypted. Database rules limit each member to their own private information.
      </p>
      <p>
        If a confidentiality incident creates a risk of serious injury, we will notify you and Quebec&apos;s Commission d&apos;accès à l&apos;information, and keep a
        record of every incident as the law requires.
      </p>

      <h2>Complaints</h2>
      <p>
        If you are not satisfied with our answer, you can complain to the{" "}
        <a href="https://www.cai.gouv.qc.ca/" rel="noopener noreferrer">
          Commission d&apos;accès à l&apos;information du Québec
        </a>{" "}
        or the{" "}
        <a href="https://www.priv.gc.ca/" rel="noopener noreferrer">
          Office of the Privacy Commissioner of Canada
        </a>
        .
      </p>

      <h2>Changes</h2>
      <p>If we make an important change to this policy, we will post the new version here and tell members by email or on the site before it applies.</p>
    </InfoPage>
  );
}
