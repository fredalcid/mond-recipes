/**
 * SAMPLE CONTENT for design review only.
 * Everything here is shown with a "Sample" badge and is replaced by real,
 * tested recipes from the database in Phase 2. Ratings are deliberately
 * left empty: the site never shows invented ratings, reviews or popularity.
 */
import type { PhotoTone } from "@/components/ui/PhotoPlaceholder";


export const sampleArticles = [
  { title: "A Beginner's Guide to Building a Spice Pantry", kind: "Ingredient guide", tone: "gold" as PhotoTone },
  { title: "How to Brew Loose-Leaf Tea Properly", kind: "Technique", tone: "olive" as PhotoTone },
  { title: "Knife Skills: Five Cuts Every Home Cook Should Know", kind: "Video tutorial", tone: "sand" as PhotoTone },
];

export const sampleProducts = [
  { name: "Cast-iron skillet", category: "Cookware", tone: "sand" as PhotoTone },
  { name: "Chef's knife", category: "Knives and cutting tools", tone: "cream" as PhotoTone },
  { name: "Glass teapot with infuser", category: "Tea equipment", tone: "olive" as PhotoTone },
  { name: "Digital kitchen scale", category: "Baking equipment", tone: "gold" as PhotoTone },
];

/** Category list from the specification (real taxonomy, seeded in the database too). */
export const categories = [
  "Breakfast",
  "Lunch",
  "Dinner",
  "Appetizers",
  "Main Courses",
  "Desserts",
  "Baking",
  "Snacks",
  "Vegetarian",
  "Vegan",
  "Healthy Meals",
  "Soups",
  "Salads",
  "Seafood",
  "Meat and Poultry",
] as const;
