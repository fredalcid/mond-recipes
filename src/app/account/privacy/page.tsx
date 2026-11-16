import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "My data", robots: { index: false } };

export default function MyDataPage() {
  return (
    <div className="max-w-2xl">
      <h1 className="text-4xl font-semibold text-forest-900">My data</h1>
      <p className="mt-4 text-lg">You can see, correct, download and delete the personal information we hold about you.</p>
      <ul className="mt-6 flex flex-col gap-4">
        <li className="rounded-card border border-sand-strong bg-white p-5">
          <h2 className="text-xl font-semibold text-forest-900">Download a copy</h2>
          <p className="mt-1 text-ink-muted">Your profile, recipes, posts, comments, reviews, likes, follows, saved recipes and settings, in one JSON file.</p>
          <a href="/account/export" download className="mt-3 inline-flex min-h-11 items-center rounded-full bg-forest-900 px-5 font-semibold text-cream hover:bg-forest-800">
            Download my data
          </a>
        </li>
        <li className="rounded-card border border-sand-strong bg-white p-5">
          <h2 className="text-xl font-semibold text-forest-900">Correct it</h2>
          <p className="mt-1 text-ink-muted">
            Change your name, username, picture, bio and country in <Link href="/account/profile" className="font-semibold underline">Profile</Link>. Edit or delete your
            posts, comments and reviews where they appear.
          </p>
        </li>
        <li className="rounded-card border border-sand-strong bg-white p-5">
          <h2 className="text-xl font-semibold text-forest-900">Delete it</h2>
          <p className="mt-1 text-ink-muted">
            <Link href="/account/delete" className="font-semibold underline">Delete your account</Link> and everything you shared.
          </p>
        </li>
        <li className="rounded-card border border-sand-strong bg-white p-5">
          <h2 className="text-xl font-semibold text-forest-900">Ask us</h2>
          <p className="mt-1 text-ink-muted">
            For anything else, or to make a request about information not shown here, <Link href="/contact?topic=privacy" className="font-semibold underline">contact us</Link>{" "}
            and choose “Privacy or my data”. We answer within 30 days. See the <Link href="/privacy" className="font-semibold underline">Privacy Policy</Link>.
          </p>
        </li>
      </ul>
    </div>
  );
}
