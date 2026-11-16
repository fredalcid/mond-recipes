/** Shown while the site runs on the sample library instead of the live database. */
export function SampleNotice() {
  return (
    <div role="note" className="flex items-start gap-3 rounded-xl border border-gold-500/60 bg-[#fdf3dc] px-4 py-3 text-sm text-ink">
      <span aria-hidden="true" className="mt-0.5 rounded-full bg-gold-500 px-2 text-[11px] font-bold text-forest-950 uppercase">
        Sample
      </span>
      <p>
        You&apos;re viewing sample recipes used to review the design. They are replaced by tested recipes from the database before launch,
        and have no ratings yet.
      </p>
    </div>
  );
}
