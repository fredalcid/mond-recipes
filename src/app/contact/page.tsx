import type { Metadata } from "next";
import { Container } from "@/components/ui/Container";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { ContactForm } from "./ContactForm";
import { getSiteSettings } from "@/lib/settings";

export const metadata: Metadata = { title: "Contact", alternates: { canonical: "/contact" } };

type Props = { searchParams: Promise<{ topic?: string }> };

export default async function ContactPage({ searchParams }: Props) {
  const [{ topic }, settings] = await Promise.all([searchParams, getSiteSettings()]);
  return (
    <Container className="py-10 sm:py-14">
      <Breadcrumbs items={[{ label: "Contact" }]} />
      <div className="mx-auto max-w-xl">
        <h1 className="text-4xl font-semibold text-forest-900 sm:text-5xl">Contact us</h1>
        <p className="mt-4 text-lg text-ink-muted">Questions, corrections, partnership ideas or privacy requests: we read every message.</p>
        {settings.contactEmail && (
          <p className="mt-3 text-ink-muted">
            You can also email us at{" "}
            <a href={`mailto:${settings.contactEmail}`} className="font-semibold text-forest-900 underline underline-offset-4">
              {settings.contactEmail}
            </a>
            .
          </p>
        )}
        <div className="mt-8 rounded-[1.5rem] border border-sand-strong bg-white p-6 shadow-card sm:p-8">
          <ContactForm topic={topic} />
        </div>
      </div>
    </Container>
  );
}
