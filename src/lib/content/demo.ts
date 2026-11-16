/**
 * SAMPLE editorial and shop content for design review (used when Supabase isn't connected).
 * Articles are original placeholder text, labelled "Sample". Sample products have no
 * retailer links, so nothing on the site pretends to sell them.
 */
import type { ArticleDetail, ContentSource, Option, Product } from "./types";
import { readingMinutes } from "./types";

const categories: Option[] = [
  { slug: "food-culture", name: "Food culture" },
  { slug: "country-guides", name: "Country food guides" },
  { slug: "cooking-techniques", name: "Cooking techniques" },
  { slug: "ingredient-guides", name: "Ingredient guides" },
  { slug: "kitchen-tips", name: "Kitchen tips" },
  { slug: "seasonal-food", name: "Seasonal food" },
  { slug: "healthy-cooking", name: "Healthy cooking" },
  { slug: "food-history", name: "Food history" },
  { slug: "editors-picks", name: "Editor's picks" },
];
const cat = (slug: string) => categories.find((c) => c.slug === slug)!;

const articles: ArticleDetail[] = [
  {
    slug: "how-to-brew-loose-leaf-tea",
    title: "How to Brew Loose-Leaf Tea",
    excerpt: "Water temperature and steeping time make the biggest difference. Here's a simple guide for the main types of tea.",
    categories: [cat("cooking-techniques")],
    isFeatured: true,
    body: `Good tea doesn't need special equipment. Fresh water, the right temperature and a timer will take you most of the way.

## Start with fresh water

Use freshly drawn cold water and heat it once. Water that has been boiled repeatedly tastes flat.

## Match the temperature to the tea

| Tea | Water | Steep |
| --- | --- | --- |
| Green | 70–80°C (160–175°F) | 2–3 minutes |
| White | 75–85°C (165–185°F) | 3–5 minutes |
| Oolong | 85–95°C (185–205°F) | 3–5 minutes |
| Black | 95–100°C (205–212°F) | 3–5 minutes |
| Herbal | 100°C (212°F) | 5–7 minutes |

If you don't have a thermometer, let boiled water rest for a few minutes before brewing green or white tea.

## Measure, then adjust

A good starting point is about 1 teaspoon of leaves per cup. Large, open leaves take up more room, so you may need a little more. Taste, then adjust next time.

## Don't over-steep

Bitterness usually comes from water that's too hot or leaves left in too long, not from the tea itself. Remove the leaves when the time is up. Many green teas and oolongs can be steeped two or three times.`,
  },
  {
    slug: "a-beginners-spice-pantry",
    title: "A Beginner's Guide to Building a Spice Pantry",
    excerpt: "You don't need fifty jars. A dozen well-chosen spices will take you across many of the world's kitchens.",
    categories: [cat("ingredient-guides")],
    isFeatured: false,
    body: `A small, well-chosen spice collection goes further than a crowded rack of half-used jars.

## A dozen to start with

- **Ground cumin**: earthy and warm
- **Ground coriander**: citrusy and mild
- **Ground turmeric**: golden colour and gentle bitterness
- **Smoked or sweet paprika**: colour and depth
- **Chili flakes or powder**: heat you can control
- **Ground cinnamon**: for both sweet and savoury dishes
- **Black peppercorns**: grind them fresh
- **Dried oregano**
- **Dried thyme**
- **Bay leaves**
- **Cumin seeds**: for sizzling in hot oil
- **Garam masala or another favourite blend**

## Buy small, store well

Ground spices lose flavour over months, not years. Buy small amounts, keep them away from the stove's heat and light, and smell them: if there's little aroma, it's time to replace them.

## Wake them up

Many recipes start by warming whole or ground spices in oil for a few seconds. This releases their flavour into the whole dish. Watch closely, because spices burn quickly.`,
  },
  {
    slug: "five-knife-cuts-every-cook-should-know",
    title: "Five Knife Cuts Every Home Cook Should Know",
    excerpt: "Even pieces cook evenly. These five basic cuts cover most recipes.",
    categories: [cat("cooking-techniques"), cat("kitchen-tips")],
    isFeatured: false,
    body: `Cutting ingredients to a similar size helps them cook at the same rate. These five cuts cover most everyday recipes.

## 1. Slice

Thin, even pieces cut across the ingredient. Keep your guiding hand's fingertips tucked under.

## 2. Dice

Cut into sticks, then across into cubes. Recipes may ask for small, medium or large dice.

## 3. Mince

Chop very finely, rocking the knife back and forth. Common for garlic, ginger and herbs.

## 4. Julienne

Thin matchsticks, great for stir-fries and salads.

## 5. Chiffonade

Stack leafy herbs or greens, roll them up tightly and slice thinly into ribbons.

## Safety first

A sharp knife is safer than a dull one because it needs less force. Use a stable cutting board: a damp cloth underneath stops it sliding.`,
  },
].map((a, i) => ({
  ...a,
  id: `sample-article-${i}`,
  imageUrl: null,
  imageAlt: null,
  byline: "Mònd Recipes",
  publishedAt: new Date(Date.UTC(2026, 9, 20 + i)).toISOString(),
  updatedAt: null,
  isSample: true,
  readingMinutes: readingMinutes(a.body),
  seoTitle: null,
  metaDescription: null,
  recipes: [],
}));

const productCategories: Option[] = [
  ["kitchen-appliances", "Kitchen appliances"], ["cookware", "Cookware"], ["kitchen-utensils", "Kitchen utensils"],
  ["knives-and-cutting-tools", "Knives and cutting tools"], ["baking-equipment", "Baking equipment"], ["coffee-equipment", "Coffee equipment"],
  ["tea-equipment", "Tea equipment"], ["food-storage", "Food storage"], ["kitchen-accessories", "Kitchen accessories"],
  ["cookbooks", "Cookbooks"], ["ebooks", "Ebooks"], ["digital-meal-planners", "Digital meal planners"],
].map(([slug, name]) => ({ slug, name }));
const pc = (slug: string) => productCategories.find((c) => c.slug === slug)!;

const products: Product[] = [
  ["Cast-iron skillet", "cookware", "Holds heat well for searing, frying and baking cornbread."],
  ["Chef's knife (20 cm)", "knives-and-cutting-tools", "One good all-purpose knife handles most kitchen jobs."],
  ["Glass teapot with infuser", "tea-equipment", "Watch loose-leaf tea unfurl as it brews."],
  ["Digital kitchen scale", "baking-equipment", "Weighing ingredients makes baking far more reliable."],
  ["Bamboo matcha whisk", "tea-equipment", "The traditional tool for a smooth, frothy matcha."],
  ["Dutch oven", "cookware", "For braises, stews, soups and no-knead bread."],
].map(([name, category, description], i) => ({
  id: `sample-product-${i}`,
  slug: `sample-${i}`,
  name,
  description,
  imageUrl: null,
  imageAlt: null,
  category: pc(category),
  brand: null,
  retailer: null,
  isFeatured: i < 4,
  isSponsored: false,
  isSample: true,
}));

export const demoContent: ContentSource = {
  mode: "sample",
  async listArticles(q = {}) {
    const size = q.pageSize ?? 12;
    const page = Math.max(1, q.page ?? 1);
    const list = articles.filter((a) => !q.category || a.categories.some((c) => c.slug === q.category));
    return { items: list.slice((page - 1) * size, page * size), total: list.length };
  },
  async getArticle(slug) {
    return articles.find((a) => a.slug === slug) ?? null;
  },
  async listArticleCategories() {
    return categories;
  },
  async listVideos() {
    return [];
  },
  async getVideo() {
    return null;
  },
  async listProducts(category) {
    return products.filter((p) => !category || p.category?.slug === category);
  },
  async listProductCategories() {
    return productCategories.map((c) => ({ ...c, count: products.filter((p) => p.category?.slug === c.slug).length }));
  },
  async getProductLink() {
    return null;
  },
  async listAdPlacements() {
    return {};
  },
  async listIndexable() {
    return [];
  },
};
