/** Mirrors supabase/seed.sql so the offline sample source uses the same slugs and names. */
type Opt = { slug: string; name: string };

export const categoryList: Opt[] = [
  ["breakfast", "Breakfast"], ["lunch", "Lunch"], ["dinner", "Dinner"], ["appetizers", "Appetizers"],
  ["main-courses", "Main Courses"], ["desserts", "Desserts"], ["baking", "Baking"], ["snacks", "Snacks"],
  ["vegetarian", "Vegetarian"], ["vegan", "Vegan"], ["healthy-meals", "Healthy Meals"], ["soups", "Soups"],
  ["salads", "Salads"], ["seafood", "Seafood"], ["meat-and-poultry", "Meat and Poultry"],
].map(([slug, name]) => ({ slug, name }));

export const dietList: Opt[] = [
  ["vegetarian", "Vegetarian"], ["vegan", "Vegan"], ["gluten-free", "Gluten-free"], ["dairy-free", "Dairy-free"],
  ["nut-free", "Nut-free"], ["egg-free", "Egg-free"], ["halal", "Halal"], ["kosher", "Kosher"],
  ["pescatarian", "Pescatarian"], ["low-sodium", "Low-sodium"],
].map(([slug, name]) => ({ slug, name }));

export const allergenList: Opt[] = [
  ["peanuts", "Peanuts"], ["tree-nuts", "Tree nuts"], ["sesame", "Sesame"], ["milk", "Milk"], ["eggs", "Eggs"],
  ["fish", "Fish"], ["crustaceans-and-shellfish", "Crustaceans and shellfish"], ["soy", "Soy"],
  ["wheat-and-triticale", "Wheat and triticale"], ["mustard", "Mustard"], ["sulphites", "Sulphites"],
].map(([slug, name]) => ({ slug, name }));

export const drinkCategoryList: (Opt & { isAlcoholic: boolean })[] = [
  ["tea", "Tea"], ["traditional-tea", "Traditional tea"], ["herbal-tea", "Herbal tea"], ["coffee", "Coffee"],
  ["traditional-coffee", "Traditional coffee"], ["juices", "Juices"], ["smoothies", "Smoothies"], ["milkshakes", "Milkshakes"],
  ["mocktails", "Mocktails"], ["cocktails", "Cocktails"], ["traditional-beverages", "Traditional beverages"],
  ["seasonal-drinks", "Seasonal drinks"], ["hot-beverages", "Hot beverages"], ["cold-beverages", "Cold beverages"],
].map(([slug, name]) => ({ slug, name, isAlcoholic: slug === "cocktails" }));
