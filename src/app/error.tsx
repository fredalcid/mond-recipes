"use client";

import { Container } from "@/components/ui/Container";
import { Button } from "@/components/ui/Button";

export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <Container className="py-24 text-center">
      <h1 className="text-4xl font-semibold text-forest-900">Something went wrong.</h1>
      <p className="mx-auto mt-4 max-w-md text-ink-muted">Please try again. If the problem continues, contact us.</p>
      <div className="mt-8 flex justify-center">
        <Button onClick={reset}>Try again</Button>
      </div>
    </Container>
  );
}
