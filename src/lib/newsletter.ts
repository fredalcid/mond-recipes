/** Exact wording shown next to the consent checkbox; stored with each sign-up as proof of consent. */
export const CONSENT_TEXT =
  "Yes, send me the Mònd Recipes newsletter by email. I can unsubscribe at any time.";

export type NewsletterState = {
  status: "idle" | "success" | "error";
  message?: string;
  errors?: Partial<Record<string, string>>;
};
