import type { Metadata } from "next";
import { PlannedPage } from "@/components/layout/PlannedPage";

export const metadata: Metadata = { title: "Submit a Recipe", robots: { index: false } };

export default function SubmitRecipePage() {
  return (
    <PlannedPage
      title="Submit a Recipe"
      phase={4}
      summary="Verified members will be able to share their original recipes here. Every submission is reviewed before it is published."
    />
  );
}
