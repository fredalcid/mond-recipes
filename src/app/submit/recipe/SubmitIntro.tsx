import Link from "next/link";

export function SubmitIntro() {
  return (
    <div className="mb-8 max-w-3xl">
      <p className="text-lg text-ink-muted">
        Share an original recipe or a family favourite. Our team reviews every recipe before it is published, and may suggest changes. Published
        recipes show your name and link to your profile.
      </p>
      <ul className="mt-4 list-disc space-y-1 pl-6 text-ink-muted">
        <li>Only share recipes you created or that come from your family. If you adapted someone else&apos;s recipe, credit it.</li>
        <li>Never copy text or photos from websites, books or magazines.</li>
        <li>Use your own photo, or leave the photo empty.</li>
      </ul>
      <p className="mt-3 text-sm">
        <Link href="/community-guidelines" className="font-semibold text-forest-900 underline underline-offset-4">
          Community guidelines
        </Link>
      </p>
    </div>
  );
}

