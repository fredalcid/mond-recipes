import Link from "next/link";

type Props = {
  id: string;
  eyebrow?: string;
  title: string;
  intro?: string;
  action?: { label: string; href: string };
};

export function SectionHeading({ id, eyebrow, title, intro, action }: Props) {
  return (
    <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
      <div className="max-w-2xl">
        {eyebrow && (
          <p className="mb-2 text-xs font-semibold tracking-[0.18em] text-olive-700 uppercase">{eyebrow}</p>
        )}
        <h2 id={id} className="text-3xl font-semibold text-forest-900 sm:text-4xl">
          {title}
        </h2>
        {intro && <p className="mt-3 text-base leading-relaxed text-ink-muted">{intro}</p>}
      </div>
      {action && (
        <Link
          href={action.href}
          className="group inline-flex min-h-11 items-center gap-1 text-sm font-semibold text-forest-900 underline-offset-4 hover:underline"
        >
          {action.label}
          <span aria-hidden="true" className="transition-transform group-hover:translate-x-0.5">
            →
          </span>
        </Link>
      )}
    </div>
  );
}
