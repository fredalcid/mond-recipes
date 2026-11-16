/**
 * Site-wide configuration. The primary navigation is fixed by the product
 * specification: do not add items (e.g. "AI Kitchen" or "Meal Planner") here.
 */
export const site = {
  name: "Mònd Recipes",
  slug: "mond-recipes",
  tagline: "Discover • Cook • Share",
  description:
    "Discover recipes from around the world, explore drinks and tea, and share your cooking with a community of food lovers.",
  url: process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
} as const;

export type NavItem = { label: string; href: string };

export const primaryNav: readonly NavItem[] = [
  { label: "Home", href: "/" },
  { label: "Recipes", href: "/recipes" },
  { label: "Explore by Country", href: "/countries" },
  { label: "Drinks & Tea", href: "/drinks-tea" },
  { label: "Community", href: "/community" },
  { label: "Articles & Videos", href: "/articles" },
  { label: "Shop", href: "/shop" },
] as const;

export const footerNav: readonly { heading: string; links: NavItem[] }[] = [
  {
    heading: "Mònd Recipes",
    links: [
      { label: "About Mònd Recipes", href: "/about" },
      { label: "Contact", href: "/contact" },
      { label: "Advertise With Us", href: "/advertise" },
      { label: "Submit a Recipe", href: "/submit/recipe" },
    ],
  },
  {
    heading: "Policies",
    links: [
      { label: "Privacy Policy", href: "/privacy" },
      { label: "Terms of Service", href: "/terms" },
      { label: "Cookie Policy", href: "/cookies" },
      { label: "Affiliate Disclosure", href: "/affiliate-disclosure" },
      { label: "Community Guidelines", href: "/community-guidelines" },
    ],
  },
];

/**
 * Pages that exist in the sitemap but are built in a later phase.
 * They render an honest "coming in Phase N" page instead of a broken link.
 */
export const plannedPages: Record<string, { title: string; phase: number; summary: string }> = {
  community: {
    title: "Community",
    phase: 4,
    summary: "Member recipes, cooking photos, comments, follows and community challenges.",
  },
  privacy: { title: "Privacy Policy", phase: 6, summary: "Drafted before launch and reviewed by a lawyer." },
  terms: { title: "Terms of Service", phase: 6, summary: "Drafted before launch and reviewed by a lawyer." },
  cookies: { title: "Cookie Policy", phase: 6, summary: "Drafted with the consent tool before launch." },
  "community-guidelines": {
    title: "Community Guidelines",
    phase: 4,
    summary: "Rules for sharing recipes, photos and comments. Published together with the community.",
  },
};
