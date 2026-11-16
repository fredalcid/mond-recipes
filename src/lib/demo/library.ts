/**
 * SAMPLE LIBRARY — demonstration content for design review and local testing.
 *
 * - Used as the data source when Supabase is not connected.
 * - Also exported to supabase/sample_content.sql (npm run sample:sql) for a staging database.
 * - Every recipe is flagged is_sample, shown with a "Sample" badge, kept out of
 *   search engines, and never carries ratings or a verified badge.
 * - Replace with tested, original recipes before launch.
 *
 * This file must not import anything with the "@/" alias (the SQL generator runs it directly).
 */

export type Unit =
  | "g" | "kg" | "ml" | "l" | "tsp" | "tbsp" | "cup" | "fl_oz" | "oz" | "lb"
  | "piece" | "clove" | "can" | "pinch" | "sprig" | "bunch" | "stick" | "pod" | "leaf";

export type LibIngredient = { slug: string; name: string; gramsPerCup?: number; aliases?: string[] };

export type LibCountry = {
  iso2: string;
  slug: string;
  name: string;
  intro: string;
  foodCulture?: string;
  isFeatured?: boolean;
  aliases?: string[];
  regions?: { slug: string; name: string; description: string }[];
};

export type LibRecipe = {
  slug: string;
  title: string;
  summary: string;
  kind: "food" | "drink";
  prep: number;
  cook: number;
  servings: number;
  servingUnit?: string;
  difficulty: "easy" | "medium" | "hard";
  tips?: string;
  substitutions?: string;
  countries: string[];
  regions?: string[];
  cuisines: string[];
  categories?: string[];
  diets?: string[];
  allergens?: string[];
  drinkCategory?: string;
  /** [quantity, unit, ingredient slug, note?, group?] */
  ingredients: [number | null, Unit | null, string, string?, string?][];
  /** [instruction, timer seconds?] */
  steps: [string, number?][];
  tone: "sand" | "olive" | "gold" | "cream";
};

export const cuisines = [
  { slug: "italian", name: "Italian" },
  { slug: "moroccan", name: "Moroccan" },
  { slug: "mexican", name: "Mexican" },
  { slug: "chinese", name: "Chinese" },
  { slug: "west-african", name: "West African" },
  { slug: "indian", name: "Indian" },
  { slug: "japanese", name: "Japanese" },
];

export const countries: LibCountry[] = [
  {
    iso2: "IT", slug: "italy", name: "Italy", isFeatured: true,
    intro: "Regional cooking built on pasta, olive oil, tomatoes and seasonal produce.",
    foodCulture:
      "Italian cooking is intensely regional. Northern kitchens lean on butter, rice and polenta, while the south is known for olive oil, tomatoes, dried pasta and seafood. Meals are often built around a few good ingredients prepared simply.",
    aliases: ["Italia"],
    regions: [
      { slug: "sicily", name: "Sicily", description: "Island cooking shaped by citrus, almonds, seafood and many centuries of trade." },
      { slug: "tuscany", name: "Tuscany", description: "Simple country cooking with beans, bread, olive oil and grilled meats." },
      { slug: "naples", name: "Naples", description: "Home of Neapolitan pizza and tomato-based southern dishes." },
      { slug: "emilia-romagna", name: "Emilia-Romagna", description: "Fresh egg pasta, cured meats, Parmigiano Reggiano and balsamic vinegar." },
    ],
  },
  {
    iso2: "NG", slug: "nigeria", name: "Nigeria", isFeatured: true,
    intro: "Soups, stews and rice dishes from Yoruba, Igbo, Hausa and many other traditions.",
    foodCulture:
      "Nigeria is home to hundreds of ethnic groups, and its food reflects that variety: pepper-rich stews, hearty soups eaten with swallows such as pounded yam or eba, grilled suya, and rice dishes shared at celebrations.",
    regions: [
      { slug: "yoruba", name: "Yoruba culinary traditions", description: "South-western traditions including pepper stews, amala and ewedu." },
      { slug: "igbo", name: "Igbo culinary traditions", description: "South-eastern traditions with soups such as ofe onugbu and oha." },
      { slug: "hausa", name: "Hausa culinary traditions", description: "Northern traditions including suya, tuwo and kilishi." },
    ],
  },
  {
    iso2: "MX", slug: "mexico", name: "Mexico", isFeatured: true,
    intro: "Corn, chiles and beans at the heart of tamales, moles and salsas.",
    foodCulture:
      "Mexican cooking rests on corn, beans and chiles, with strong regional identities from the moles of Oaxaca to the citrus-marinated dishes of Yucatán. Fresh salsas and agua frescas accompany everyday meals.",
    aliases: ["México"],
    regions: [
      { slug: "oaxaca", name: "Oaxaca", description: "Known for its many moles, tlayudas and quesillo cheese." },
      { slug: "yucatan", name: "Yucatán", description: "Citrus, achiote and slow-roasted dishes from the peninsula." },
    ],
  },
  {
    iso2: "IN", slug: "india", name: "India", isFeatured: true,
    intro: "Regional spice blends, dals, breads and sweets from across the subcontinent.",
    foodCulture:
      "India's cuisines vary widely by region, climate and community. Lentils, rice, wheat breads, vegetables and carefully balanced spice blends appear across the country, alongside a strong tradition of vegetarian cooking.",
    regions: [
      { slug: "punjab", name: "Punjab", description: "Wheat breads, dairy-rich curries and tandoor cooking." },
      { slug: "kerala", name: "Kerala", description: "Coconut, curry leaves, seafood and rice from the south-west coast." },
    ],
  },
  {
    iso2: "JP", slug: "japan", name: "Japan", isFeatured: true,
    intro: "Rice, dashi and seasonal ingredients, from home cooking to street food.",
    foodCulture:
      "Japanese home cooking often pairs rice and miso soup with a few small dishes. Dashi broth, soy sauce and seasonal produce are central, and presentation is treated with care.",
    regions: [{ slug: "kansai", name: "Kansai", description: "Lighter broths and street foods such as takoyaki and okonomiyaki." }],
  },
  {
    iso2: "MA", slug: "morocco", name: "Morocco", isFeatured: true,
    intro: "Tagines, couscous and mint tea, layered with warm spices.",
    foodCulture:
      "Moroccan cooking blends Amazigh, Arab, Andalusian and other influences. Slow-cooked tagines, couscous, preserved lemons and warm spices such as cumin, ginger and cinnamon are typical, and mint tea is a daily ritual of hospitality.",
    regions: [{ slug: "fez", name: "Fez", description: "A historic city known for refined, sweet-and-savoury dishes." }],
  },
  { iso2: "GH", slug: "ghana", name: "Ghana", intro: "Stews, soups and rice dishes shared across West Africa." },
  { iso2: "CN", slug: "china", name: "China", intro: "Many regional cuisines, from Cantonese stir-fries to Sichuan spice." },
];

export const ingredients: LibIngredient[] = [
  { slug: "spaghetti", name: "Spaghetti" },
  { slug: "olive-oil", name: "Olive oil", gramsPerCup: 216 },
  { slug: "garlic", name: "Garlic" },
  { slug: "canned-whole-tomatoes", name: "Canned whole tomatoes" },
  { slug: "salt", name: "Salt", gramsPerCup: 288 },
  { slug: "fresh-basil", name: "Fresh basil" },
  { slug: "parmesan", name: "Parmesan", aliases: ["Parmigiano Reggiano"] },
  { slug: "chicken-thighs", name: "Chicken thighs" },
  { slug: "onion", name: "Onion" },
  { slug: "ground-ginger", name: "Ground ginger" },
  { slug: "ground-turmeric", name: "Ground turmeric" },
  { slug: "ground-cumin", name: "Ground cumin" },
  { slug: "chicken-stock", name: "Chicken stock", gramsPerCup: 240, aliases: ["Chicken broth"] },
  { slug: "green-olives", name: "Green olives" },
  { slug: "preserved-lemon", name: "Preserved lemon" },
  { slug: "fresh-cilantro", name: "Fresh cilantro", aliases: ["Coriander leaves", "Fresh coriander"] },
  { slug: "cooked-black-beans", name: "Cooked black beans" },
  { slug: "corn-tortillas", name: "Corn tortillas" },
  { slug: "chili-powder", name: "Chili powder" },
  { slug: "red-onion", name: "Red onion" },
  { slug: "avocado", name: "Avocado" },
  { slug: "lime", name: "Lime" },
  { slug: "cooked-rice", name: "Cooked rice", gramsPerCup: 160 },
  { slug: "eggs", name: "Eggs", aliases: ["Egg"] },
  { slug: "vegetable-oil", name: "Vegetable oil", gramsPerCup: 218 },
  { slug: "frozen-peas-and-carrots", name: "Frozen peas and carrots", gramsPerCup: 135 },
  { slug: "green-onions", name: "Green onions", aliases: ["Scallions", "Spring onions"] },
  { slug: "soy-sauce", name: "Soy sauce", gramsPerCup: 255 },
  { slug: "sesame-oil", name: "Sesame oil", gramsPerCup: 218 },
  { slug: "long-grain-rice", name: "Long-grain rice", gramsPerCup: 185, aliases: ["Parboiled rice"] },
  { slug: "red-bell-pepper", name: "Red bell pepper", aliases: ["Red pepper"] },
  { slug: "scotch-bonnet-pepper", name: "Scotch bonnet pepper", aliases: ["Habanero"] },
  { slug: "tomato-paste", name: "Tomato paste" },
  { slug: "curry-powder", name: "Curry powder" },
  { slug: "dried-thyme", name: "Dried thyme" },
  { slug: "bay-leaves", name: "Bay leaves" },
  { slug: "yellow-lentils", name: "Yellow lentils", gramsPerCup: 200, aliases: ["Toor dal", "Split pigeon peas"] },
  { slug: "water", name: "Water", gramsPerCup: 237 },
  { slug: "cumin-seeds", name: "Cumin seeds" },
  { slug: "tomato", name: "Tomato" },
  { slug: "green-chili", name: "Green chili" },
  { slug: "garam-masala", name: "Garam masala" },
  { slug: "dashi-granules", name: "Dashi granules" },
  { slug: "white-miso", name: "White miso" },
  { slug: "silken-tofu", name: "Silken tofu" },
  { slug: "dried-wakame", name: "Dried wakame seaweed" },
  { slug: "green-tea-leaves", name: "Gunpowder green tea", aliases: ["Green tea"] },
  { slug: "fresh-mint", name: "Fresh mint" },
  { slug: "sugar", name: "Sugar", gramsPerCup: 200, aliases: ["White sugar"] },
  { slug: "milk", name: "Milk", gramsPerCup: 245 },
  { slug: "black-tea", name: "Loose black tea", aliases: ["Assam tea"] },
  { slug: "fresh-ginger", name: "Fresh ginger" },
  { slug: "green-cardamom", name: "Green cardamom" },
  { slug: "cinnamon-stick", name: "Cinnamon stick" },
  { slug: "whole-cloves", name: "Whole cloves" },
  { slug: "vanilla-extract", name: "Vanilla extract" },
  { slug: "mango", name: "Ripe mango", gramsPerCup: 165 },
  { slug: "plain-yogurt", name: "Plain yogurt", gramsPerCup: 245 },
  { slug: "ground-cardamom", name: "Ground cardamom" },
  { slug: "matcha", name: "Matcha powder" },
  { slug: "honey", name: "Honey", gramsPerCup: 340 },
  { slug: "dried-hibiscus", name: "Dried hibiscus flowers", aliases: ["Flor de jamaica"] },
];

export const recipes: LibRecipe[] = [
  {
    slug: "tomato-and-basil-spaghetti", title: "Tomato and Basil Spaghetti", kind: "food",
    summary: "A quick weeknight pasta with garlicky tomato sauce, fresh basil and Parmesan.",
    prep: 10, cook: 20, servings: 4, difficulty: "easy",
    countries: ["italy"], cuisines: ["italian"], categories: ["dinner", "main-courses", "vegetarian"],
    diets: ["vegetarian"], allergens: ["wheat-and-triticale", "milk"], tone: "gold",
    tips: "Save a cup of the pasta water before draining. A splash helps the sauce cling to the spaghetti.",
    substitutions: "Leave out the Parmesan to make it vegan. Any long pasta works in place of spaghetti.",
    ingredients: [
      [400, "g", "spaghetti"], [3, "tbsp", "olive-oil"], [3, "clove", "garlic", "thinly sliced"],
      [800, "g", "canned-whole-tomatoes", "about two cans"], [1, "tsp", "salt", "plus more for the pasta water"],
      [0.5, "cup", "fresh-basil", "leaves, torn"], [50, "g", "parmesan", "finely grated"],
    ],
    steps: [
      ["Bring a large pot of generously salted water to a boil."],
      ["Warm the olive oil in a wide pan over medium heat. Add the garlic and cook until fragrant but not browned, about 1 minute.", 60],
      ["Add the tomatoes and salt. Crush the tomatoes with a spoon and simmer until slightly thickened.", 900],
      ["Meanwhile, cook the spaghetti until just tender, following the package time.", 600],
      ["Drain the pasta, reserving a little water. Toss the spaghetti with the sauce and basil, loosening with pasta water if needed. Serve with Parmesan."],
    ],
  },
  {
    slug: "chicken-tagine-with-olives", title: "Chicken Tagine with Olives", kind: "food",
    summary: "Chicken braised with warm spices, preserved lemon and green olives until tender.",
    prep: 20, cook: 75, servings: 4, difficulty: "medium",
    countries: ["morocco"], regions: ["fez"], cuisines: ["moroccan"], categories: ["dinner", "main-courses", "meat-and-poultry"],
    diets: ["dairy-free", "gluten-free"], allergens: [], tone: "olive",
    tips: "A heavy pot with a tight lid works well if you don't have a tagine.",
    ingredients: [
      [1, "kg", "chicken-thighs", "bone-in, skin removed"], [2, "piece", "onion", "finely chopped"], [3, "clove", "garlic", "minced"],
      [1, "tsp", "ground-ginger"], [1, "tsp", "ground-turmeric"], [1, "tsp", "ground-cumin"], [2, "tbsp", "olive-oil"],
      [1, "cup", "chicken-stock"], [0.75, "cup", "green-olives"], [1, "piece", "preserved-lemon", "rind only, sliced"],
      [0.25, "cup", "fresh-cilantro", "chopped"], [1, "tsp", "salt"],
    ],
    steps: [
      ["Toss the chicken with the ginger, turmeric, cumin and salt."],
      ["Heat the oil in a heavy pot over medium heat. Cook the onions until soft and golden, about 10 minutes.", 600],
      ["Add the garlic and chicken. Turn to coat in the onions and spices, then pour in the stock."],
      ["Cover and simmer gently until the chicken is very tender, about 50 minutes.", 3000],
      ["Add the olives and preserved lemon and cook uncovered for 10 minutes to reduce the sauce. Scatter with cilantro.", 600],
    ],
  },
  {
    slug: "black-bean-tacos", title: "Black Bean Tacos", kind: "food",
    summary: "Spiced black beans in warm corn tortillas with avocado, red onion and lime.",
    prep: 15, cook: 10, servings: 4, difficulty: "easy",
    countries: ["mexico"], cuisines: ["mexican"], categories: ["dinner", "lunch", "vegetarian", "vegan"],
    diets: ["vegan", "vegetarian", "dairy-free"], allergens: [], tone: "sand",
    ingredients: [
      [3, "cup", "cooked-black-beans", "drained"], [8, "piece", "corn-tortillas"], [1, "tsp", "ground-cumin"],
      [1, "tsp", "chili-powder"], [1, "tbsp", "olive-oil"], [0.5, "piece", "red-onion", "finely diced"],
      [1, "piece", "avocado", "sliced"], [1, "piece", "lime", "cut into wedges"], [0.25, "cup", "fresh-cilantro", "chopped"],
      [0.5, "tsp", "salt"],
    ],
    steps: [
      ["Warm the oil in a pan over medium heat. Add the beans, cumin, chili powder and salt."],
      ["Cook, lightly mashing some of the beans, until hot and thick.", 300],
      ["Warm the tortillas in a dry pan for about 30 seconds per side.", 60],
      ["Fill the tortillas with beans and top with avocado, red onion and cilantro. Serve with lime wedges."],
    ],
  },
  {
    slug: "vegetable-fried-rice", title: "Vegetable Fried Rice", kind: "food",
    summary: "Day-old rice stir-fried with egg, peas, carrots and green onions.",
    prep: 10, cook: 15, servings: 4, difficulty: "easy",
    countries: ["china"], cuisines: ["chinese"], categories: ["lunch", "dinner", "vegetarian"],
    diets: ["vegetarian", "dairy-free"], allergens: ["eggs", "soy", "wheat-and-triticale", "sesame"], tone: "cream",
    tips: "Cold, day-old rice fries best. Freshly cooked rice turns mushy.",
    substitutions: "Use tamari instead of soy sauce for a wheat-free version.",
    ingredients: [
      [4, "cup", "cooked-rice", "cold"], [2, "piece", "eggs", "beaten"], [2, "tbsp", "vegetable-oil"], [2, "clove", "garlic", "minced"],
      [1, "cup", "frozen-peas-and-carrots"], [3, "piece", "green-onions", "sliced"], [3, "tbsp", "soy-sauce"], [1, "tsp", "sesame-oil"],
    ],
    steps: [
      ["Heat 1 tablespoon of oil in a wok or large pan over high heat. Scramble the eggs, then set aside."],
      ["Add the remaining oil, the garlic and the peas and carrots. Stir-fry for 2 minutes.", 120],
      ["Add the rice and stir-fry, pressing it against the pan, until hot and lightly toasted.", 300],
      ["Stir in the soy sauce, sesame oil, eggs and green onions. Serve right away."],
    ],
  },
  {
    slug: "jollof-rice", title: "Jollof Rice", kind: "food",
    summary: "Rice cooked in a rich tomato and pepper base. Loved across West Africa, with friendly rivalry over whose is best.",
    prep: 15, cook: 45, servings: 6, difficulty: "medium",
    countries: ["nigeria", "ghana"], regions: ["yoruba"], cuisines: ["west-african"], categories: ["dinner", "main-courses"],
    diets: ["dairy-free", "gluten-free"], allergens: [], tone: "gold",
    tips: "Keep the heat low once the rice goes in, and resist stirring. A little smoky crust at the bottom is prized.",
    substitutions: "Use vegetable stock for a vegan version.",
    ingredients: [
      [2, "cup", "long-grain-rice", "rinsed"], [400, "g", "canned-whole-tomatoes"], [2, "piece", "red-bell-pepper"],
      [1, "piece", "scotch-bonnet-pepper", "or to taste"], [1, "piece", "onion"], [0.25, "cup", "vegetable-oil"],
      [2, "tbsp", "tomato-paste"], [2.5, "cup", "chicken-stock"], [1, "tsp", "curry-powder"], [1, "tsp", "dried-thyme"],
      [2, "leaf", "bay-leaves"], [1, "tsp", "salt"],
    ],
    steps: [
      ["Blend the tomatoes, bell peppers, scotch bonnet and half the onion until smooth."],
      ["Heat the oil in a heavy pot. Fry the remaining onion, sliced, until soft, then stir in the tomato paste for 2 minutes.", 120],
      ["Add the blended mixture and cook, stirring now and then, until thick and reduced.", 900],
      ["Add the stock, curry powder, thyme, bay leaves and salt, and bring to a boil."],
      ["Stir in the rice, cover tightly and cook on low heat until the rice is tender and the liquid absorbed.", 1800],
    ],
  },
  {
    slug: "dal-tadka", title: "Dal Tadka", kind: "food",
    summary: "Comforting yellow lentils finished with a sizzling tempering of cumin, garlic and chili.",
    prep: 10, cook: 35, servings: 4, difficulty: "easy",
    countries: ["india"], regions: ["punjab"], cuisines: ["indian"], categories: ["dinner", "main-courses", "vegetarian", "vegan", "healthy-meals"],
    diets: ["vegan", "vegetarian", "gluten-free", "dairy-free"], allergens: [], tone: "sand",
    ingredients: [
      [1, "cup", "yellow-lentils", "rinsed"], [3, "cup", "water"], [0.5, "tsp", "ground-turmeric"], [1, "tsp", "salt"],
      [2, "tbsp", "vegetable-oil"], [1, "tsp", "cumin-seeds"], [3, "clove", "garlic", "sliced"], [1, "piece", "onion", "finely chopped"],
      [1, "piece", "tomato", "chopped"], [1, "piece", "green-chili", "slit"], [0.5, "tsp", "garam-masala"],
      [2, "tbsp", "fresh-cilantro", "chopped"],
    ],
    steps: [
      ["Simmer the lentils with the water, turmeric and salt until soft and creamy, stirring now and then.", 1500],
      ["In a small pan, heat the oil and add the cumin seeds until they sizzle. Add the garlic, onion and chili and cook until golden.", 300],
      ["Add the tomato and cook until soft, then stir in the garam masala.", 240],
      ["Pour the tempering over the lentils, stir and garnish with cilantro."],
    ],
  },
  {
    slug: "miso-soup", title: "Miso Soup with Tofu and Wakame", kind: "food",
    summary: "A simple everyday soup of dashi, miso, silken tofu and seaweed.",
    prep: 5, cook: 10, servings: 4, difficulty: "easy",
    countries: ["japan"], cuisines: ["japanese"], categories: ["soups", "appetizers", "healthy-meals"],
    diets: ["dairy-free"], allergens: ["soy", "fish"], tone: "cream",
    tips: "Don't let the soup boil after adding the miso. It dulls the flavour.",
    ingredients: [
      [4, "cup", "water"], [2, "tsp", "dashi-granules"], [3, "tbsp", "white-miso"], [200, "g", "silken-tofu", "cubed"],
      [1, "tbsp", "dried-wakame"], [2, "piece", "green-onions", "thinly sliced"],
    ],
    steps: [
      ["Soak the wakame in cold water until softened, then drain.", 300],
      ["Bring the water and dashi granules to a simmer."],
      ["Dissolve the miso in a ladle of the broth, then stir it back into the pot. Do not boil."],
      ["Add the tofu and wakame and warm through. Serve topped with green onions.", 120],
    ],
  },
  // ---------------------------------------------------------------- drinks
  {
    slug: "moroccan-mint-tea", title: "Moroccan Mint Tea", kind: "drink",
    summary: "Green tea brewed with fresh mint and sugar, poured from a height for a frothy top.",
    prep: 5, cook: 10, servings: 4, servingUnit: "glasses", difficulty: "easy",
    countries: ["morocco"], cuisines: ["moroccan"], drinkCategory: "traditional-tea",
    diets: ["vegan", "vegetarian", "gluten-free", "dairy-free"], allergens: [], tone: "olive",
    ingredients: [
      [4, "cup", "water"], [1, "tbsp", "green-tea-leaves"], [1, "bunch", "fresh-mint"], [3, "tbsp", "sugar", "or to taste"],
    ],
    steps: [
      ["Bring the water to a boil."],
      ["Rinse the tea leaves in the teapot with a splash of hot water and pour it off to remove bitterness."],
      ["Add the mint, sugar and remaining hot water. Steep for 4 minutes.", 240],
      ["Pour into glasses from a height to create a light foam."],
    ],
  },
  {
    slug: "masala-chai", title: "Masala Chai", kind: "drink",
    summary: "Black tea simmered with milk, ginger and warm spices.",
    prep: 5, cook: 10, servings: 2, servingUnit: "cups", difficulty: "easy",
    countries: ["india"], cuisines: ["indian"], drinkCategory: "traditional-tea",
    diets: ["vegetarian", "gluten-free"], allergens: ["milk"], tone: "gold",
    ingredients: [
      [1.5, "cup", "water"], [1, "cup", "milk"], [2, "tsp", "black-tea"], [2, "tbsp", "sugar"],
      [1, "tbsp", "fresh-ginger", "grated"], [4, "pod", "green-cardamom", "lightly crushed"], [1, "stick", "cinnamon-stick"],
      [2, "piece", "whole-cloves"],
    ],
    steps: [
      ["Simmer the water with the ginger, cardamom, cinnamon and cloves.", 180],
      ["Add the tea and simmer for 2 minutes.", 120],
      ["Add the milk and sugar and bring just to a boil, then lower the heat and simmer for 2 minutes.", 120],
      ["Strain into cups and serve hot."],
    ],
  },
  {
    slug: "horchata", title: "Horchata", kind: "drink",
    summary: "A creamy, cinnamon-scented rice drink served over ice. Plan ahead: the rice soaks for at least 4 hours.",
    prep: 15, cook: 0, servings: 6, servingUnit: "glasses", difficulty: "easy",
    countries: ["mexico"], cuisines: ["mexican"], drinkCategory: "traditional-beverages",
    diets: ["vegan", "vegetarian", "gluten-free", "dairy-free"], allergens: [], tone: "cream",
    ingredients: [
      [1, "cup", "long-grain-rice"], [4, "cup", "water", "divided"], [1, "stick", "cinnamon-stick", "broken"],
      [0.5, "cup", "sugar"], [1, "tsp", "vanilla-extract"],
    ],
    steps: [
      ["Soak the rice and cinnamon in 2 cups of the water for at least 4 hours or overnight."],
      ["Blend the rice, cinnamon and soaking water until as smooth as possible."],
      ["Strain through a fine sieve or cheesecloth, then stir in the remaining water, sugar and vanilla."],
      ["Chill and serve over ice."],
    ],
  },
  {
    slug: "mango-lassi", title: "Mango Lassi", kind: "drink",
    summary: "A cool blend of ripe mango, yogurt and a pinch of cardamom.",
    prep: 5, cook: 0, servings: 2, servingUnit: "glasses", difficulty: "easy",
    countries: ["india"], cuisines: ["indian"], drinkCategory: "smoothies",
    diets: ["vegetarian", "gluten-free"], allergens: ["milk"], tone: "gold",
    ingredients: [
      [2, "cup", "mango", "chopped"], [1, "cup", "plain-yogurt"], [0.5, "cup", "milk"], [1, "tbsp", "sugar", "optional"],
      [1, "pinch", "ground-cardamom"],
    ],
    steps: [["Blend everything until smooth."], ["Taste and add more sugar if needed. Serve cold."]],
  },
  {
    slug: "matcha-latte", title: "Matcha Latte", kind: "drink",
    summary: "Whisked matcha topped with steamed milk and a touch of honey.",
    prep: 5, cook: 0, servings: 1, servingUnit: "cup", difficulty: "easy",
    countries: ["japan"], cuisines: ["japanese"], drinkCategory: "tea",
    diets: ["vegetarian", "gluten-free"], allergens: ["milk"], tone: "olive",
    tips: "Use water around 80°C (175°F). Boiling water makes matcha bitter.",
    ingredients: [[1.5, "tsp", "matcha"], [2, "tbsp", "water", "hot, not boiling"], [1, "cup", "milk"], [1, "tsp", "honey"]],
    steps: [
      ["Sift the matcha into a bowl. Add the hot water and whisk until smooth and frothy."],
      ["Heat and froth the milk, then pour over the matcha. Sweeten with honey."],
    ],
  },
  {
    slug: "agua-de-jamaica", title: "Agua de Jamaica", kind: "drink",
    summary: "A tart, ruby-red hibiscus drink, chilled and lightly sweetened.",
    prep: 5, cook: 10, servings: 8, servingUnit: "glasses", difficulty: "easy",
    countries: ["mexico"], cuisines: ["mexican"], drinkCategory: "traditional-beverages",
    diets: ["vegan", "vegetarian", "gluten-free", "dairy-free"], allergens: [], tone: "sand",
    ingredients: [[1, "cup", "dried-hibiscus"], [8, "cup", "water", "divided"], [0.5, "cup", "sugar"], [1, "piece", "lime", "juiced"]],
    steps: [
      ["Bring 2 cups of the water to a boil with the hibiscus, then simmer for 5 minutes.", 300],
      ["Remove from the heat and steep for 10 minutes.", 600],
      ["Strain, stir in the sugar until dissolved, then add the remaining cold water and lime juice."],
      ["Chill and serve over ice."],
    ],
  },
];
