/**
 * SAMPLE CONTENT for design review only.
 * Everything here is shown with a "Sample" badge and is replaced by real,
 * tested recipes from the database in Phase 2. Ratings are deliberately
 * left empty: the site never shows invented ratings, reviews or popularity.
 */
import type { PhotoTone } from "@/components/ui/PhotoPlaceholder";

export type SampleCountry = { iso2: string; name: string; slug: string; intro: string; tone: PhotoTone };
export type SampleRecipe = {
  title: string;
  cuisine: string;
  prepMinutes: number;
  cookMinutes: number;
  difficulty: "Easy" | "Medium" | "Hard";
  tone: PhotoTone;
};
export type SampleDrink = { title: string; origin: string; category: string; minutes: number; tone: PhotoTone };

export const sampleCountries: SampleCountry[] = [
  { iso2: "IT", name: "Italy", slug: "italy", intro: "Regional cooking built on pasta, olive oil, tomatoes and seasonal produce.", tone: "gold" },
  { iso2: "NG", name: "Nigeria", slug: "nigeria", intro: "Soups, stews and rice dishes from Yoruba, Igbo, Hausa and many other traditions.", tone: "olive" },
  { iso2: "MX", name: "Mexico", slug: "mexico", intro: "Corn, chiles and beans at the heart of tamales, moles and salsas.", tone: "sand" },
  { iso2: "JP", name: "Japan", slug: "japan", intro: "Rice, dashi and seasonal ingredients, from home cooking to street food.", tone: "cream" },
  { iso2: "IN", name: "India", slug: "india", intro: "Regional spice blends, dals, breads and sweets from across the subcontinent.", tone: "gold" },
  { iso2: "MA", name: "Morocco", slug: "morocco", intro: "Tagines, couscous and mint tea, layered with warm spices.", tone: "olive" },
];

export const sampleRecipes: SampleRecipe[] = [
  { title: "Tomato and Basil Spaghetti", cuisine: "Italian", prepMinutes: 10, cookMinutes: 20, difficulty: "Easy", tone: "gold" },
  { title: "Chicken Tagine with Olives", cuisine: "Moroccan", prepMinutes: 20, cookMinutes: 75, difficulty: "Medium", tone: "olive" },
  { title: "Black Bean Tacos", cuisine: "Mexican", prepMinutes: 15, cookMinutes: 10, difficulty: "Easy", tone: "sand" },
  { title: "Vegetable Fried Rice", cuisine: "Chinese", prepMinutes: 10, cookMinutes: 15, difficulty: "Easy", tone: "cream" },
];

export const sampleDrinks: SampleDrink[] = [
  { title: "Moroccan Mint Tea", origin: "Morocco", category: "Traditional tea", minutes: 10, tone: "olive" },
  { title: "Masala Chai", origin: "India", category: "Traditional tea", minutes: 15, tone: "gold" },
  { title: "Horchata", origin: "Mexico", category: "Traditional beverage", minutes: 20, tone: "cream" },
  { title: "Mango Lassi", origin: "India", category: "Cold beverage", minutes: 5, tone: "sand" },
];

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
