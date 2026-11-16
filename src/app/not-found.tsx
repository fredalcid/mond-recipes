import { Container } from "@/components/ui/Container";
import { LinkButton } from "@/components/ui/Button";

export default function NotFound() {
  return (
    <Container className="py-24 text-center">
      <p className="text-xs font-semibold tracking-[0.2em] text-olive-700 uppercase">Page not found</p>
      <h1 className="mt-3 text-4xl font-semibold text-forest-900 sm:text-5xl">This dish isn’t on the menu.</h1>
      <p className="mx-auto mt-4 max-w-md text-ink-muted">The page may have moved, or the link may be wrong.</p>
      <div className="mt-8 flex justify-center gap-3">
        <LinkButton href="/">Go to the homepage</LinkButton>
      </div>
    </Container>
  );
}
