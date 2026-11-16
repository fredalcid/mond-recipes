/** The lists editors manage in Admin → Categories, and how each is stored. */
export type TaxonomyField = { name: string; label: string; type: "text" | "textarea" | "number" | "checkbox"; hint?: string };
export type TaxonomyTab = {
  key: string;
  label: string;
  table: string;
  /** Link table used to count how many recipes, articles or products use an item. */
  usage?: { table: string; column: string; noun: string };
  fields: TaxonomyField[];
  order: string;
  note?: string;
};

const DESCRIPTION: TaxonomyField = { name: "description", label: "Description", type: "textarea" };
const ORDER: TaxonomyField = { name: "display_order", label: "Order", type: "number" };

export const TABS: TaxonomyTab[] = [
  { key: "categories", label: "Recipe categories", table: "categories", usage: { table: "recipe_categories", column: "category_id", noun: "recipes" }, fields: [DESCRIPTION, ORDER], order: "display_order" },
  {
    key: "cuisines",
    label: "Cuisines",
    table: "cuisines",
    usage: { table: "recipe_cuisines", column: "cuisine_id", noun: "recipes" },
    fields: [DESCRIPTION],
    order: "name",
    note: "Link cuisines to countries on each country's page.",
  },
  {
    key: "drink-categories",
    label: "Drink & tea categories",
    table: "drink_categories",
    usage: { table: "recipes", column: "drink_category_id", noun: "drinks" },
    fields: [{ name: "is_alcoholic", label: "Alcoholic drinks", type: "checkbox", hint: "Pages show a responsible-drinking note." }, ORDER],
    order: "display_order",
  },
  { key: "diets", label: "Diets", table: "dietary_tags", usage: { table: "recipe_dietary_tags", column: "dietary_tag_id", noun: "recipes" }, fields: [], order: "name" },
  { key: "allergens", label: "Allergens", table: "allergens", usage: { table: "recipe_allergens", column: "allergen_id", noun: "recipes" }, fields: [], order: "name" },
  { key: "article-topics", label: "Article topics", table: "article_categories", usage: { table: "article_category_links", column: "category_id", noun: "articles" }, fields: [ORDER], order: "display_order" },
  { key: "product-categories", label: "Shop categories", table: "product_categories", usage: { table: "products", column: "category_id", noun: "products" }, fields: [ORDER], order: "display_order" },
  {
    key: "ingredients",
    label: "Ingredients",
    table: "ingredients",
    usage: { table: "recipe_ingredients", column: "ingredient_id", noun: "recipes" },
    fields: [{ name: "grams_per_cup", label: "Grams per cup", type: "number", hint: "For cup ↔ gram conversion, e.g. 125 for flour. Leave empty if unknown." }],
    order: "name",
    note: "Members can add ingredients when they share recipes, so duplicates appear. Merge them instead of deleting: recipes move to the kept ingredient and the old name stays searchable.",
  },
];

export const tabByKey = (key: string | undefined) => TABS.find((t) => t.key === key) ?? TABS[0];
export const tabByTable = (table: string) => TABS.find((t) => t.table === table);
