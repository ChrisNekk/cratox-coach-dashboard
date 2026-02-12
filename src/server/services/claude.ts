import Anthropic from "@anthropic-ai/sdk";

// Check if API key is available
const hasApiKey = !!process.env.ANTHROPIC_API_KEY;

// Initialize Anthropic client only if API key is available
const anthropic = hasApiKey
  ? new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  : null;

// Types for recipe generation
export interface RecipeIngredient {
  name: string;
  amount: number;
  unit: string;
  notes?: string;
}

export interface RecipeInstruction {
  step: number;
  instruction: string;
  duration?: number; // minutes
}

export interface RecipeNutrition {
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
  fiber?: number;
  sugar?: number;
  sodium?: number;
}

export interface GeneratedRecipe {
  title: string;
  description: string;
  ingredients: RecipeIngredient[];
  instructions: RecipeInstruction[];
  nutrition: RecipeNutrition;
  prepTime: number;
  cookTime: number;
  servings: number;
  dietaryTags: string[];
  cuisine?: string;
  category?: string;
}

export interface RecipeGenerationInput {
  includeIngredients?: string[];
  excludeIngredients?: string[];
  dietaryTags?: string[];
  targetMacros?: {
    calories?: { min: number; max: number };
    protein?: { min: number; max: number };
    carbs?: { min: number; max: number };
    fats?: { min: number; max: number };
  };
  mealType?: string;
  cuisine?: string;
  servings: number;
}

export interface RecipeAdjustmentInput {
  originalRecipe: {
    title: string;
    description?: string;
    ingredients: RecipeIngredient[];
    instructions: RecipeInstruction[];
    nutrition: RecipeNutrition;
    servings: number;
  };
  targetMacros: {
    calories?: number;
    protein?: number;
    carbs?: number;
    fats?: number;
  };
  servings?: number;
}

export interface ClaudeUsage {
  inputTokens: number;
  outputTokens: number;
}

// ============================================
// MOCK RECIPE TEMPLATES
// ============================================

const MOCK_RECIPES: Record<string, GeneratedRecipe[]> = {
  breakfast: [
    {
      title: "High-Protein Greek Yogurt Bowl",
      description: "A creamy and satisfying breakfast bowl packed with protein from Greek yogurt, topped with fresh berries, crunchy granola, and a drizzle of honey. Perfect for fueling your morning workout.",
      ingredients: [
        { name: "Greek yogurt (2% fat)", amount: 200, unit: "g" },
        { name: "Mixed berries", amount: 100, unit: "g", notes: "fresh or frozen" },
        { name: "Granola", amount: 40, unit: "g", notes: "low-sugar variety" },
        { name: "Honey", amount: 1, unit: "tbsp" },
        { name: "Chia seeds", amount: 1, unit: "tbsp" },
        { name: "Sliced almonds", amount: 15, unit: "g" },
      ],
      instructions: [
        { step: 1, instruction: "Add Greek yogurt to a bowl and spread evenly.", duration: 1 },
        { step: 2, instruction: "Top with mixed berries, arranging them in a colorful pattern.", duration: 1 },
        { step: 3, instruction: "Sprinkle granola and sliced almonds over the yogurt.", duration: 1 },
        { step: 4, instruction: "Add chia seeds for extra nutrition.", duration: 1 },
        { step: 5, instruction: "Drizzle honey over the top and serve immediately.", duration: 1 },
      ],
      nutrition: { calories: 420, protein: 28, carbs: 48, fats: 14, fiber: 6, sugar: 28, sodium: 85 },
      prepTime: 5,
      cookTime: 0,
      servings: 1,
      dietaryTags: ["vegetarian", "high-protein"],
      cuisine: "American",
      category: "breakfast",
    },
    {
      title: "Spinach and Feta Egg White Omelette",
      description: "A light yet protein-packed omelette made with fluffy egg whites, sauteed spinach, and crumbled feta cheese. Low in calories but high in satisfaction.",
      ingredients: [
        { name: "Egg whites", amount: 6, unit: "large" },
        { name: "Fresh spinach", amount: 60, unit: "g" },
        { name: "Feta cheese", amount: 30, unit: "g", notes: "crumbled" },
        { name: "Cherry tomatoes", amount: 50, unit: "g", notes: "halved" },
        { name: "Olive oil", amount: 1, unit: "tsp" },
        { name: "Salt and pepper", amount: 1, unit: "pinch" },
        { name: "Fresh dill", amount: 1, unit: "tbsp", notes: "chopped" },
      ],
      instructions: [
        { step: 1, instruction: "Heat olive oil in a non-stick pan over medium heat.", duration: 1 },
        { step: 2, instruction: "Add spinach and sautee until wilted, about 2 minutes.", duration: 2 },
        { step: 3, instruction: "Pour egg whites over spinach and cook until edges set.", duration: 3 },
        { step: 4, instruction: "Add feta cheese and cherry tomatoes to one half.", duration: 1 },
        { step: 5, instruction: "Fold omelette in half and cook for another minute.", duration: 1 },
        { step: 6, instruction: "Garnish with fresh dill and serve hot.", duration: 1 },
      ],
      nutrition: { calories: 245, protein: 32, carbs: 6, fats: 10, fiber: 2, sugar: 3, sodium: 520 },
      prepTime: 5,
      cookTime: 8,
      servings: 1,
      dietaryTags: ["vegetarian", "high-protein", "low-carb", "gluten-free"],
      cuisine: "Mediterranean",
      category: "breakfast",
    },
  ],
  lunch: [
    {
      title: "Grilled Chicken Caesar Salad",
      description: "A classic Caesar salad elevated with perfectly grilled chicken breast, crisp romaine lettuce, shaved parmesan, and homemade croutons. Dressed with a light Caesar dressing.",
      ingredients: [
        { name: "Chicken breast", amount: 150, unit: "g" },
        { name: "Romaine lettuce", amount: 150, unit: "g", notes: "chopped" },
        { name: "Parmesan cheese", amount: 25, unit: "g", notes: "shaved" },
        { name: "Whole wheat croutons", amount: 30, unit: "g" },
        { name: "Caesar dressing (light)", amount: 2, unit: "tbsp" },
        { name: "Lemon juice", amount: 1, unit: "tbsp" },
        { name: "Olive oil", amount: 1, unit: "tsp" },
        { name: "Black pepper", amount: 1, unit: "pinch" },
      ],
      instructions: [
        { step: 1, instruction: "Season chicken breast with salt, pepper, and a drizzle of olive oil.", duration: 2 },
        { step: 2, instruction: "Grill chicken on medium-high heat for 6-7 minutes per side until cooked through.", duration: 14 },
        { step: 3, instruction: "Let chicken rest for 5 minutes, then slice into strips.", duration: 5 },
        { step: 4, instruction: "Toss romaine lettuce with Caesar dressing and lemon juice.", duration: 2 },
        { step: 5, instruction: "Top with sliced chicken, parmesan shavings, and croutons.", duration: 2 },
        { step: 6, instruction: "Finish with fresh cracked black pepper and serve.", duration: 1 },
      ],
      nutrition: { calories: 485, protein: 45, carbs: 22, fats: 24, fiber: 4, sugar: 3, sodium: 680 },
      prepTime: 10,
      cookTime: 20,
      servings: 1,
      dietaryTags: ["high-protein"],
      cuisine: "American",
      category: "lunch",
    },
    {
      title: "Quinoa Buddha Bowl with Tahini Dressing",
      description: "A nourishing bowl featuring fluffy quinoa, roasted chickpeas, colorful vegetables, and creamy tahini dressing. Packed with plant-based protein and fiber.",
      ingredients: [
        { name: "Quinoa", amount: 80, unit: "g", notes: "dry" },
        { name: "Chickpeas", amount: 100, unit: "g", notes: "canned, drained" },
        { name: "Sweet potato", amount: 100, unit: "g", notes: "cubed" },
        { name: "Kale", amount: 50, unit: "g", notes: "massaged" },
        { name: "Red cabbage", amount: 50, unit: "g", notes: "shredded" },
        { name: "Avocado", amount: 50, unit: "g", notes: "sliced" },
        { name: "Tahini", amount: 2, unit: "tbsp" },
        { name: "Lemon juice", amount: 1, unit: "tbsp" },
        { name: "Olive oil", amount: 1, unit: "tbsp" },
        { name: "Cumin", amount: 0.5, unit: "tsp" },
      ],
      instructions: [
        { step: 1, instruction: "Preheat oven to 400°F (200°C).", duration: 1 },
        { step: 2, instruction: "Cook quinoa according to package instructions.", duration: 15 },
        { step: 3, instruction: "Toss sweet potato and chickpeas with olive oil and cumin, roast for 25 minutes.", duration: 25 },
        { step: 4, instruction: "Massage kale with a pinch of salt until softened.", duration: 2 },
        { step: 5, instruction: "Make dressing by whisking tahini with lemon juice and 2 tbsp water.", duration: 2 },
        { step: 6, instruction: "Assemble bowl with quinoa base, topped with all vegetables and avocado.", duration: 3 },
        { step: 7, instruction: "Drizzle with tahini dressing and serve.", duration: 1 },
      ],
      nutrition: { calories: 520, protein: 18, carbs: 62, fats: 24, fiber: 14, sugar: 8, sodium: 320 },
      prepTime: 15,
      cookTime: 30,
      servings: 1,
      dietaryTags: ["vegan", "gluten-free", "dairy-free", "high-protein"],
      cuisine: "Mediterranean",
      category: "lunch",
    },
  ],
  dinner: [
    {
      title: "Herb-Crusted Salmon with Roasted Vegetables",
      description: "Omega-rich salmon fillet with a fragrant herb crust, served alongside perfectly roasted seasonal vegetables. A balanced, heart-healthy dinner option.",
      ingredients: [
        { name: "Salmon fillet", amount: 180, unit: "g" },
        { name: "Broccoli florets", amount: 100, unit: "g" },
        { name: "Brussels sprouts", amount: 80, unit: "g", notes: "halved" },
        { name: "Asparagus", amount: 80, unit: "g" },
        { name: "Fresh herbs (dill, parsley)", amount: 2, unit: "tbsp", notes: "chopped" },
        { name: "Panko breadcrumbs", amount: 2, unit: "tbsp" },
        { name: "Dijon mustard", amount: 1, unit: "tbsp" },
        { name: "Olive oil", amount: 1.5, unit: "tbsp" },
        { name: "Lemon", amount: 0.5, unit: "whole" },
        { name: "Garlic", amount: 2, unit: "cloves", notes: "minced" },
      ],
      instructions: [
        { step: 1, instruction: "Preheat oven to 425°F (220°C).", duration: 1 },
        { step: 2, instruction: "Toss vegetables with olive oil, garlic, salt and pepper. Spread on baking sheet.", duration: 5 },
        { step: 3, instruction: "Roast vegetables for 15 minutes.", duration: 15 },
        { step: 4, instruction: "Mix herbs with panko and a drizzle of olive oil.", duration: 2 },
        { step: 5, instruction: "Brush salmon with Dijon mustard and press herb mixture on top.", duration: 3 },
        { step: 6, instruction: "Add salmon to baking sheet with vegetables, roast for 12-15 minutes.", duration: 15 },
        { step: 7, instruction: "Squeeze fresh lemon over everything and serve.", duration: 1 },
      ],
      nutrition: { calories: 520, protein: 42, carbs: 24, fats: 28, fiber: 8, sugar: 5, sodium: 380 },
      prepTime: 15,
      cookTime: 30,
      servings: 1,
      dietaryTags: ["high-protein", "dairy-free"],
      cuisine: "American",
      category: "dinner",
    },
    {
      title: "Turkey Meatballs with Zucchini Noodles",
      description: "Lean turkey meatballs in a rich marinara sauce served over spiralized zucchini noodles. A low-carb Italian-inspired dinner that doesn't sacrifice flavor.",
      ingredients: [
        { name: "Ground turkey (93% lean)", amount: 150, unit: "g" },
        { name: "Zucchini", amount: 250, unit: "g", notes: "spiralized" },
        { name: "Marinara sauce", amount: 120, unit: "ml", notes: "no sugar added" },
        { name: "Egg white", amount: 1, unit: "large" },
        { name: "Italian breadcrumbs", amount: 2, unit: "tbsp" },
        { name: "Parmesan cheese", amount: 15, unit: "g", notes: "grated" },
        { name: "Italian seasoning", amount: 1, unit: "tsp" },
        { name: "Garlic powder", amount: 0.5, unit: "tsp" },
        { name: "Olive oil", amount: 1, unit: "tsp" },
        { name: "Fresh basil", amount: 5, unit: "leaves" },
      ],
      instructions: [
        { step: 1, instruction: "Preheat oven to 400°F (200°C).", duration: 1 },
        { step: 2, instruction: "Mix turkey with egg white, breadcrumbs, half the parmesan, Italian seasoning, and garlic powder.", duration: 5 },
        { step: 3, instruction: "Form mixture into 8 meatballs and place on baking sheet.", duration: 3 },
        { step: 4, instruction: "Bake meatballs for 20 minutes until cooked through.", duration: 20 },
        { step: 5, instruction: "Heat marinara sauce in a pan, add cooked meatballs and simmer for 5 minutes.", duration: 5 },
        { step: 6, instruction: "Sautee zucchini noodles in olive oil for 2-3 minutes until just tender.", duration: 3 },
        { step: 7, instruction: "Serve meatballs over zoodles, topped with remaining parmesan and fresh basil.", duration: 2 },
      ],
      nutrition: { calories: 410, protein: 38, carbs: 22, fats: 18, fiber: 6, sugar: 12, sodium: 720 },
      prepTime: 15,
      cookTime: 30,
      servings: 1,
      dietaryTags: ["high-protein", "low-carb"],
      cuisine: "Italian",
      category: "dinner",
    },
  ],
  snack: [
    {
      title: "Protein Energy Bites",
      description: "No-bake energy bites packed with oats, protein powder, and nut butter. Perfect for a pre-workout boost or afternoon pick-me-up.",
      ingredients: [
        { name: "Rolled oats", amount: 100, unit: "g" },
        { name: "Protein powder (vanilla)", amount: 30, unit: "g" },
        { name: "Almond butter", amount: 80, unit: "g" },
        { name: "Honey", amount: 3, unit: "tbsp" },
        { name: "Dark chocolate chips", amount: 30, unit: "g" },
        { name: "Chia seeds", amount: 1, unit: "tbsp" },
        { name: "Vanilla extract", amount: 1, unit: "tsp" },
      ],
      instructions: [
        { step: 1, instruction: "Combine oats, protein powder, and chia seeds in a large bowl.", duration: 2 },
        { step: 2, instruction: "Add almond butter, honey, and vanilla extract. Mix until well combined.", duration: 3 },
        { step: 3, instruction: "Fold in chocolate chips.", duration: 1 },
        { step: 4, instruction: "Refrigerate mixture for 15 minutes to firm up.", duration: 15 },
        { step: 5, instruction: "Roll into 12 equal-sized balls.", duration: 5 },
        { step: 6, instruction: "Store in refrigerator for up to 1 week.", duration: 1 },
      ],
      nutrition: { calories: 145, protein: 6, carbs: 16, fats: 7, fiber: 2, sugar: 8, sodium: 25 },
      prepTime: 15,
      cookTime: 0,
      servings: 12,
      dietaryTags: ["vegetarian", "high-protein"],
      cuisine: "American",
      category: "snack",
    },
    {
      title: "Cottage Cheese with Pineapple",
      description: "Simple yet satisfying snack combining creamy cottage cheese with sweet pineapple chunks. High in protein with a tropical twist.",
      ingredients: [
        { name: "Low-fat cottage cheese", amount: 150, unit: "g" },
        { name: "Pineapple chunks", amount: 80, unit: "g", notes: "fresh or canned in juice" },
        { name: "Cinnamon", amount: 0.25, unit: "tsp" },
        { name: "Sunflower seeds", amount: 1, unit: "tbsp" },
      ],
      instructions: [
        { step: 1, instruction: "Add cottage cheese to a bowl.", duration: 1 },
        { step: 2, instruction: "Top with pineapple chunks.", duration: 1 },
        { step: 3, instruction: "Sprinkle with cinnamon and sunflower seeds.", duration: 1 },
        { step: 4, instruction: "Serve immediately or refrigerate for later.", duration: 1 },
      ],
      nutrition: { calories: 185, protein: 20, carbs: 18, fats: 4, fiber: 1, sugar: 16, sodium: 380 },
      prepTime: 3,
      cookTime: 0,
      servings: 1,
      dietaryTags: ["vegetarian", "high-protein", "gluten-free"],
      cuisine: "American",
      category: "snack",
    },
  ],
};

/**
 * Generate a mock recipe based on input parameters
 */
function generateMockRecipe(params: RecipeGenerationInput): GeneratedRecipe {
  const mealType = params.mealType || "lunch";
  const recipes = MOCK_RECIPES[mealType] || MOCK_RECIPES.lunch;

  // Select a random recipe from the category
  const baseRecipe = recipes[Math.floor(Math.random() * recipes.length)];

  // Clone the recipe
  const recipe = JSON.parse(JSON.stringify(baseRecipe)) as GeneratedRecipe;

  // Adjust servings if different
  if (params.servings && params.servings !== recipe.servings) {
    const multiplier = params.servings / recipe.servings;
    recipe.servings = params.servings;
    recipe.ingredients = recipe.ingredients.map(ing => ({
      ...ing,
      amount: Math.round(ing.amount * multiplier * 10) / 10,
    }));
  }

  // Add dietary tags from input if provided
  if (params.dietaryTags && params.dietaryTags.length > 0) {
    recipe.dietaryTags = [...new Set([...recipe.dietaryTags, ...params.dietaryTags])];
  }

  // Update cuisine if provided
  if (params.cuisine) {
    recipe.cuisine = params.cuisine;
  }

  // Adjust macros if target provided (simple scaling)
  if (params.targetMacros?.calories) {
    const targetCal = (params.targetMacros.calories.min + params.targetMacros.calories.max) / 2;
    const currentCal = recipe.nutrition.calories;
    const ratio = targetCal / currentCal;

    recipe.nutrition.calories = Math.round(targetCal);
    recipe.nutrition.protein = Math.round(recipe.nutrition.protein * ratio);
    recipe.nutrition.carbs = Math.round(recipe.nutrition.carbs * ratio);
    recipe.nutrition.fats = Math.round(recipe.nutrition.fats * ratio);
    if (recipe.nutrition.fiber) recipe.nutrition.fiber = Math.round(recipe.nutrition.fiber * ratio);
  }

  // Add a unique suffix to make it feel newly generated
  const suffixes = ["", " (Customized)", " - Your Way", " Special"];
  recipe.title = recipe.title + suffixes[Math.floor(Math.random() * suffixes.length)];

  return recipe;
}

/**
 * Generate a mock adjusted recipe
 */
function generateMockAdjustedRecipe(params: RecipeAdjustmentInput): GeneratedRecipe {
  const { originalRecipe, targetMacros, servings } = params;

  const targetServings = servings || originalRecipe.servings;

  // Calculate adjustment ratios
  let calorieRatio = 1;
  if (targetMacros.calories && originalRecipe.nutrition.calories > 0) {
    calorieRatio = targetMacros.calories / originalRecipe.nutrition.calories;
  }

  // Create adjusted recipe
  const adjusted: GeneratedRecipe = {
    title: originalRecipe.title,
    description: `Adjusted version of ${originalRecipe.title} to meet your nutritional goals. Portions and ingredients have been modified for optimal macro balance.`,
    ingredients: originalRecipe.ingredients.map(ing => ({
      ...ing,
      amount: Math.round(ing.amount * calorieRatio * (targetServings / originalRecipe.servings) * 10) / 10,
    })),
    instructions: originalRecipe.instructions,
    nutrition: {
      calories: targetMacros.calories || Math.round(originalRecipe.nutrition.calories * calorieRatio),
      protein: targetMacros.protein || Math.round(originalRecipe.nutrition.protein * calorieRatio),
      carbs: targetMacros.carbs || Math.round(originalRecipe.nutrition.carbs * calorieRatio),
      fats: targetMacros.fats || Math.round(originalRecipe.nutrition.fats * calorieRatio),
      fiber: originalRecipe.nutrition.fiber ? Math.round(originalRecipe.nutrition.fiber * calorieRatio) : undefined,
      sugar: originalRecipe.nutrition.sugar ? Math.round(originalRecipe.nutrition.sugar * calorieRatio) : undefined,
      sodium: originalRecipe.nutrition.sodium ? Math.round(originalRecipe.nutrition.sodium * calorieRatio) : undefined,
    },
    prepTime: originalRecipe.instructions.filter(i => i.duration).reduce((sum, i) => sum + (i.duration || 0), 0) || 10,
    cookTime: 15,
    servings: targetServings,
    dietaryTags: [],
    category: "lunch",
  };

  return adjusted;
}

// Build the prompt for recipe generation
function buildRecipePrompt(params: RecipeGenerationInput): string {
  const parts: string[] = [
    `Create a detailed recipe with the following requirements:`,
    ``,
    `Servings: ${params.servings}`,
  ];

  if (params.mealType) {
    parts.push(`Meal type: ${params.mealType}`);
  }

  if (params.cuisine) {
    parts.push(`Cuisine: ${params.cuisine}`);
  }

  if (params.dietaryTags && params.dietaryTags.length > 0) {
    parts.push(`Dietary requirements: ${params.dietaryTags.join(", ")}`);
  }

  if (params.includeIngredients && params.includeIngredients.length > 0) {
    parts.push(`Must include these ingredients: ${params.includeIngredients.join(", ")}`);
  }

  if (params.excludeIngredients && params.excludeIngredients.length > 0) {
    parts.push(`Must NOT include these ingredients: ${params.excludeIngredients.join(", ")}`);
  }

  if (params.targetMacros) {
    parts.push(``);
    parts.push(`Nutritional targets (per serving):`);
    if (params.targetMacros.calories) {
      parts.push(`- Calories: ${params.targetMacros.calories.min}-${params.targetMacros.calories.max} kcal`);
    }
    if (params.targetMacros.protein) {
      parts.push(`- Protein: ${params.targetMacros.protein.min}-${params.targetMacros.protein.max}g`);
    }
    if (params.targetMacros.carbs) {
      parts.push(`- Carbohydrates: ${params.targetMacros.carbs.min}-${params.targetMacros.carbs.max}g`);
    }
    if (params.targetMacros.fats) {
      parts.push(`- Fats: ${params.targetMacros.fats.min}-${params.targetMacros.fats.max}g`);
    }
  }

  parts.push(``);
  parts.push(`Provide accurate nutritional information for the recipe. The nutritional values should be realistic and within the specified targets.`);

  return parts.join("\n");
}

// Schema for structured recipe output
const recipeToolSchema = {
  name: "create_recipe",
  description: "Create a recipe with detailed ingredients, instructions, and nutritional information",
  input_schema: {
    type: "object" as const,
    properties: {
      title: { type: "string", description: "A catchy, descriptive title for the recipe" },
      description: { type: "string", description: "A brief description of the dish (2-3 sentences)" },
      ingredients: {
        type: "array",
        items: {
          type: "object",
          properties: {
            name: { type: "string", description: "Ingredient name" },
            amount: { type: "number", description: "Quantity of the ingredient" },
            unit: { type: "string", description: "Unit of measurement (g, ml, cups, tbsp, etc.)" },
            notes: { type: "string", description: "Optional preparation notes" },
          },
          required: ["name", "amount", "unit"],
        },
      },
      instructions: {
        type: "array",
        items: {
          type: "object",
          properties: {
            step: { type: "number" },
            instruction: { type: "string" },
            duration: { type: "number" },
          },
          required: ["step", "instruction"],
        },
      },
      nutrition: {
        type: "object",
        properties: {
          calories: { type: "number" },
          protein: { type: "number" },
          carbs: { type: "number" },
          fats: { type: "number" },
          fiber: { type: "number" },
          sugar: { type: "number" },
          sodium: { type: "number" },
        },
        required: ["calories", "protein", "carbs", "fats"],
      },
      prepTime: { type: "number" },
      cookTime: { type: "number" },
      servings: { type: "number" },
      dietaryTags: { type: "array", items: { type: "string" } },
      cuisine: { type: "string" },
      category: { type: "string" },
    },
    required: ["title", "description", "ingredients", "instructions", "nutrition", "prepTime", "cookTime", "servings", "dietaryTags"],
  },
};

/**
 * Generate a recipe using Claude AI (or mock if no API key)
 */
export async function generateRecipeWithClaude(
  params: RecipeGenerationInput
): Promise<{ recipe: GeneratedRecipe; usage: ClaudeUsage }> {
  // Use mock mode if no API key
  if (!anthropic) {
    console.log("Using mock recipe generation (no ANTHROPIC_API_KEY set)");
    const recipe = generateMockRecipe(params);
    return {
      recipe,
      usage: { inputTokens: 0, outputTokens: 0 },
    };
  }

  const prompt = buildRecipePrompt(params);

  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 2000,
    messages: [{ role: "user", content: prompt }],
    tools: [recipeToolSchema],
    tool_choice: { type: "tool", name: "create_recipe" },
  });

  const toolUse = response.content.find((block) => block.type === "tool_use");
  if (!toolUse || toolUse.type !== "tool_use") {
    throw new Error("Failed to generate recipe: No tool use response");
  }

  const recipe = toolUse.input as GeneratedRecipe;

  return {
    recipe,
    usage: {
      inputTokens: response.usage.input_tokens,
      outputTokens: response.usage.output_tokens,
    },
  };
}

/**
 * Adjust an existing recipe to meet new macro targets (or mock if no API key)
 */
export async function adjustRecipeWithClaude(
  params: RecipeAdjustmentInput
): Promise<{ recipe: GeneratedRecipe; usage: ClaudeUsage }> {
  // Use mock mode if no API key
  if (!anthropic) {
    console.log("Using mock recipe adjustment (no ANTHROPIC_API_KEY set)");
    const recipe = generateMockAdjustedRecipe(params);
    return {
      recipe,
      usage: { inputTokens: 0, outputTokens: 0 },
    };
  }

  const { originalRecipe, targetMacros, servings } = params;
  const targetServings = servings || originalRecipe.servings;

  const promptParts: string[] = [
    `Adjust the following recipe to meet new nutritional targets.`,
    ``,
    `Original Recipe: ${originalRecipe.title}`,
    `Description: ${originalRecipe.description || "N/A"}`,
    ``,
    `Current nutritional values (per serving):`,
    `- Calories: ${originalRecipe.nutrition.calories} kcal`,
    `- Protein: ${originalRecipe.nutrition.protein}g`,
    `- Carbs: ${originalRecipe.nutrition.carbs}g`,
    `- Fats: ${originalRecipe.nutrition.fats}g`,
    ``,
    `Original Ingredients:`,
    ...originalRecipe.ingredients.map(
      (ing) => `- ${ing.amount} ${ing.unit} ${ing.name}${ing.notes ? ` (${ing.notes})` : ""}`
    ),
    ``,
    `Target nutritional values (per serving):`,
  ];

  if (targetMacros.calories) promptParts.push(`- Calories: ~${targetMacros.calories} kcal`);
  if (targetMacros.protein) promptParts.push(`- Protein: ~${targetMacros.protein}g`);
  if (targetMacros.carbs) promptParts.push(`- Carbs: ~${targetMacros.carbs}g`);
  if (targetMacros.fats) promptParts.push(`- Fats: ~${targetMacros.fats}g`);

  promptParts.push(``, `Target servings: ${targetServings}`);

  const prompt = promptParts.join("\n");

  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 2000,
    messages: [{ role: "user", content: prompt }],
    tools: [recipeToolSchema],
    tool_choice: { type: "tool", name: "create_recipe" },
  });

  const toolUse = response.content.find((block) => block.type === "tool_use");
  if (!toolUse || toolUse.type !== "tool_use") {
    throw new Error("Failed to adjust recipe: No tool use response");
  }

  const recipe = toolUse.input as GeneratedRecipe;

  return {
    recipe,
    usage: {
      inputTokens: response.usage.input_tokens,
      outputTokens: response.usage.output_tokens,
    },
  };
}

// ============================================
// MACRO CALCULATION
// ============================================

export interface CalculatedNutrition {
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
  fiber: number;
  saturatedFat: number;
  unsaturatedFat: number;
  sugar: number;
  sodium: number;
  caffeine: number;
  alcohol: number;
}

export interface MacroCalculationInput {
  title: string;
  description?: string;
  ingredients?: string;
  servings: number;
}

// Schema for structured nutrition output
const nutritionToolSchema = {
  name: "calculate_nutrition",
  description: "Calculate detailed nutritional information for a recipe",
  input_schema: {
    type: "object" as const,
    properties: {
      calories: { type: "number", description: "Total calories per serving (kcal)" },
      protein: { type: "number", description: "Protein per serving (grams)" },
      carbs: { type: "number", description: "Total carbohydrates per serving (grams)" },
      fats: { type: "number", description: "Total fats per serving (grams)" },
      fiber: { type: "number", description: "Dietary fiber per serving (grams)" },
      saturatedFat: { type: "number", description: "Saturated fat per serving (grams)" },
      unsaturatedFat: { type: "number", description: "Unsaturated fat per serving (grams)" },
      sugar: { type: "number", description: "Total sugars per serving (grams)" },
      sodium: { type: "number", description: "Sodium per serving (milligrams)" },
      caffeine: { type: "number", description: "Caffeine per serving (milligrams), 0 if none" },
      alcohol: { type: "number", description: "Alcohol per serving (grams), 0 if none" },
    },
    required: ["calories", "protein", "carbs", "fats", "fiber", "saturatedFat", "unsaturatedFat", "sugar", "sodium", "caffeine", "alcohol"],
  },
};

/**
 * Generate mock nutrition values based on recipe title
 */
function generateMockNutrition(params: MacroCalculationInput): CalculatedNutrition {
  // Generate realistic mock values based on common recipe patterns
  const title = params.title.toLowerCase();
  const description = (params.description || "").toLowerCase();
  const ingredients = (params.ingredients || "").toLowerCase();
  const combinedText = `${title} ${description} ${ingredients}`;

  // Base values
  let calories = 350;
  let protein = 25;
  let carbs = 35;
  let fats = 15;
  let fiber = 4;
  let saturatedFat = 4;
  let unsaturatedFat = 9;
  let sugar = 8;
  let sodium = 450;
  let caffeine = 0;
  let alcohol = 0;

  // Adjust based on keywords
  if (combinedText.includes("high protein") || combinedText.includes("protein")) {
    protein = Math.round(protein * 1.5);
    calories += 50;
  }

  if (combinedText.includes("chicken") || combinedText.includes("turkey")) {
    protein = Math.max(protein, 35);
    fats = 12;
    saturatedFat = 3;
  }

  if (combinedText.includes("salmon") || combinedText.includes("fish")) {
    protein = Math.max(protein, 30);
    fats = 18;
    unsaturatedFat = 14;
    saturatedFat = 3;
  }

  if (combinedText.includes("beef") || combinedText.includes("steak")) {
    protein = Math.max(protein, 35);
    fats = 22;
    saturatedFat = 9;
    calories = 450;
  }

  if (combinedText.includes("salad") || combinedText.includes("vegetable")) {
    calories = Math.min(calories, 280);
    fiber = Math.max(fiber, 6);
    carbs = 20;
  }

  if (combinedText.includes("pasta") || combinedText.includes("rice") || combinedText.includes("bread")) {
    carbs = Math.max(carbs, 50);
    calories = Math.max(calories, 400);
  }

  if (combinedText.includes("breakfast") || combinedText.includes("omelette") || combinedText.includes("egg")) {
    protein = Math.max(protein, 22);
    calories = 320;
  }

  if (combinedText.includes("dessert") || combinedText.includes("cake") || combinedText.includes("cookie") || combinedText.includes("sweet")) {
    sugar = Math.max(sugar, 25);
    carbs = Math.max(carbs, 45);
    calories = 380;
  }

  if (combinedText.includes("smoothie") || combinedText.includes("shake")) {
    sugar = Math.max(sugar, 20);
    fiber = 5;
  }

  if (combinedText.includes("coffee") || combinedText.includes("espresso") || combinedText.includes("caffeine")) {
    caffeine = 95;
  }

  if (combinedText.includes("tea")) {
    caffeine = 40;
  }

  if (combinedText.includes("wine") || combinedText.includes("beer") || combinedText.includes("cocktail") || combinedText.includes("alcohol")) {
    alcohol = 14;
  }

  if (combinedText.includes("low carb") || combinedText.includes("keto")) {
    carbs = Math.min(carbs, 15);
    fats = Math.max(fats, 25);
    sugar = Math.min(sugar, 3);
  }

  if (combinedText.includes("vegan") || combinedText.includes("vegetarian")) {
    protein = Math.min(protein, 20);
    saturatedFat = Math.min(saturatedFat, 3);
  }

  // Add some randomness for variety
  const variation = () => 0.9 + Math.random() * 0.2;

  return {
    calories: Math.round(calories * variation()),
    protein: Math.round(protein * variation()),
    carbs: Math.round(carbs * variation()),
    fats: Math.round(fats * variation()),
    fiber: Math.round(fiber * variation()),
    saturatedFat: Math.round(saturatedFat * variation()),
    unsaturatedFat: Math.round(unsaturatedFat * variation()),
    sugar: Math.round(sugar * variation()),
    sodium: Math.round(sodium * variation()),
    caffeine: Math.round(caffeine),
    alcohol: Math.round(alcohol),
  };
}

/**
 * Calculate nutrition from recipe details using Claude AI
 */
export async function calculateNutritionWithClaude(
  params: MacroCalculationInput
): Promise<{ nutrition: CalculatedNutrition; usage: ClaudeUsage }> {
  // Use mock mode if no API key
  if (!anthropic) {
    console.log("Using mock nutrition calculation (no ANTHROPIC_API_KEY set)");
    const nutrition = generateMockNutrition(params);
    return {
      nutrition,
      usage: { inputTokens: 0, outputTokens: 0 },
    };
  }

  const promptParts: string[] = [
    `Calculate the detailed nutritional information for the following recipe.`,
    ``,
    `Recipe: ${params.title}`,
  ];

  if (params.description) {
    promptParts.push(`Description: ${params.description}`);
  }

  if (params.ingredients) {
    promptParts.push(``, `Ingredients:`, params.ingredients);
  }

  promptParts.push(
    ``,
    `Servings: ${params.servings}`,
    ``,
    `Please provide accurate nutritional values PER SERVING. Use standard nutritional databases for reference.`,
    `All values should be realistic and based on typical portion sizes.`,
    `For caffeine, estimate based on coffee/tea/chocolate content. Set to 0 if not applicable.`,
    `For alcohol, estimate based on alcoholic beverages. Set to 0 if not applicable.`
  );

  const prompt = promptParts.join("\n");

  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 1000,
    messages: [{ role: "user", content: prompt }],
    tools: [nutritionToolSchema],
    tool_choice: { type: "tool", name: "calculate_nutrition" },
  });

  const toolUse = response.content.find((block) => block.type === "tool_use");
  if (!toolUse || toolUse.type !== "tool_use") {
    throw new Error("Failed to calculate nutrition: No tool use response");
  }

  const nutrition = toolUse.input as CalculatedNutrition;

  return {
    nutrition,
    usage: {
      inputTokens: response.usage.input_tokens,
      outputTokens: response.usage.output_tokens,
    },
  };
}

// ============================================
// OUTREACH MESSAGE GENERATION
// ============================================

export type OutreachMessageType = "check_in" | "motivation" | "progress" | "reminder" | "custom";

export interface OutreachClientContext {
  name: string;
  goalType?: string;
  startWeight?: number;
  currentWeight?: number;
  targetWeight?: number;
  recentActivity?: {
    daysLogged: number;
    averageCalories?: number;
    averageProtein?: number;
    lastLogDate?: Date;
  };
  coachName?: string;
}

export interface OutreachMessageInput {
  client: OutreachClientContext;
  messageType: OutreachMessageType;
  customPrompt?: string;
}

// Schema for outreach message output
const outreachMessageToolSchema = {
  name: "create_outreach_message",
  description: "Create a personalized outreach message for a coaching client",
  input_schema: {
    type: "object" as const,
    properties: {
      message: {
        type: "string",
        description: "The personalized message to send to the client. Should be warm, encouraging, and professional. Keep it concise (2-4 sentences).",
      },
    },
    required: ["message"],
  },
};

/**
 * Generate mock outreach message based on type and client context
 */
function generateMockOutreachMessage(params: OutreachMessageInput): string {
  const { client, messageType, customPrompt } = params;
  const firstName = client.name.split(" ")[0];

  const messages: Record<OutreachMessageType, string[]> = {
    check_in: [
      `Hey ${firstName}! Just wanted to check in and see how things are going with your program. How are you feeling about your progress so far? Let me know if you need any adjustments or have questions!`,
      `Hi ${firstName}! Hope you're having a great week. I wanted to touch base and see how everything's going. Are you finding the meal plan manageable? Any challenges I can help with?`,
      `${firstName}, hope all is well! Just checking in to see how you're doing. Remember, I'm here to support you every step of the way. How's everything going?`,
    ],
    motivation: [
      `Hey ${firstName}! Just wanted to send some positive vibes your way. You're doing amazing work, and every small step counts. Keep pushing forward - you've got this!`,
      `${firstName}, I believe in you! Remember why you started this journey. You're capable of incredible things, and I'm so proud of the commitment you're showing. Let's crush it!`,
      `Hi ${firstName}! Quick reminder that progress isn't always linear, but consistency is key. You're building healthy habits that will last a lifetime. Keep going strong!`,
    ],
    progress: [
      `Hey ${firstName}! I've been reviewing your recent activity and I'm impressed with your consistency. ${client.recentActivity?.daysLogged ? `You've logged ${client.recentActivity.daysLogged} days recently - that's dedication!` : "Keep up the great tracking!"} Let's keep this momentum going!`,
      `${firstName}, great job staying on track! Your commitment to logging and following the program is paying off. I can see you're putting in the work. Any feedback on how things are feeling?`,
      `Hi ${firstName}! Wanted to acknowledge your efforts lately. Consistency is the secret sauce, and you're nailing it. How are you feeling about your progress?`,
    ],
    reminder: [
      `Hey ${firstName}! Friendly reminder to log your meals today if you haven't already. Tracking helps us both see what's working and where we can adjust. You've got this!`,
      `Hi ${firstName}! Just a gentle nudge to check in with your app today. Staying consistent with logging helps me support you better. Let me know if you need anything!`,
      `${firstName}, hope you're having a good day! Don't forget to log your meals and activity when you get a chance. Every log helps us fine-tune your program for better results.`,
    ],
    custom: [
      `Hey ${firstName}! ${customPrompt || "Just wanted to reach out and see how you're doing. Let me know if there's anything I can help with!"}`,
    ],
  };

  const typeMessages = messages[messageType];
  return typeMessages[Math.floor(Math.random() * typeMessages.length)];
}

/**
 * Build the prompt for outreach message generation
 */
function buildOutreachPrompt(params: OutreachMessageInput): string {
  const { client, messageType, customPrompt } = params;

  const typeDescriptions: Record<OutreachMessageType, string> = {
    check_in: "a friendly check-in to see how they're doing with their program",
    motivation: "an encouraging, motivational message to keep them going",
    progress: "feedback on their recent progress and activity",
    reminder: "a gentle reminder about logging meals or staying on track",
    custom: customPrompt || "a personalized message",
  };

  const parts: string[] = [
    `You are a professional fitness and nutrition coach. Write a personalized outreach message for your client.`,
    ``,
    `Client Information:`,
    `- Name: ${client.name}`,
  ];

  if (client.goalType) {
    const goalDescriptions: Record<string, string> = {
      WEIGHT_LOSS: "lose weight",
      WEIGHT_GAIN: "gain weight/muscle",
      MAINTAIN_WEIGHT: "maintain their current weight",
    };
    parts.push(`- Goal: ${goalDescriptions[client.goalType] || client.goalType}`);
  }

  if (client.currentWeight && client.targetWeight) {
    const progress = client.startWeight
      ? Math.abs(client.startWeight - client.currentWeight)
      : 0;
    parts.push(`- Current weight: ${client.currentWeight}kg (target: ${client.targetWeight}kg)`);
    if (progress > 0) {
      parts.push(`- Progress: ${progress}kg ${client.goalType === "WEIGHT_LOSS" ? "lost" : "gained"} so far`);
    }
  }

  if (client.recentActivity) {
    parts.push(`- Recent activity: Logged ${client.recentActivity.daysLogged} days in the last week`);
    if (client.recentActivity.averageCalories) {
      parts.push(`- Average daily calories: ${client.recentActivity.averageCalories} kcal`);
    }
  }

  parts.push(
    ``,
    `Message Type: ${typeDescriptions[messageType]}`,
    ``,
    `Guidelines:`,
    `- Keep the message concise (2-4 sentences)`,
    `- Use their first name`,
    `- Be warm, encouraging, and professional`,
    `- Sound natural and human, not robotic`,
    `- Include a question or call to action when appropriate`,
    `- Don't be overly enthusiastic or use too many exclamation marks`,
    `- The message will be sent via in-app messaging`
  );

  if (customPrompt) {
    parts.push(``, `Additional instructions: ${customPrompt}`);
  }

  return parts.join("\n");
}

/**
 * Generate an outreach message using Claude AI (or mock if no API key)
 */
export async function generateOutreachMessageWithClaude(
  params: OutreachMessageInput
): Promise<{ message: string; usage: ClaudeUsage }> {
  // Use mock mode if no API key
  if (!anthropic) {
    console.log("Using mock outreach message generation (no ANTHROPIC_API_KEY set)");
    const message = generateMockOutreachMessage(params);
    return {
      message,
      usage: { inputTokens: 0, outputTokens: 0 },
    };
  }

  const prompt = buildOutreachPrompt(params);

  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 500,
    messages: [{ role: "user", content: prompt }],
    tools: [outreachMessageToolSchema],
    tool_choice: { type: "tool", name: "create_outreach_message" },
  });

  const toolUse = response.content.find((block) => block.type === "tool_use");
  if (!toolUse || toolUse.type !== "tool_use") {
    throw new Error("Failed to generate outreach message: No tool use response");
  }

  const result = toolUse.input as { message: string };

  return {
    message: result.message,
    usage: {
      inputTokens: response.usage.input_tokens,
      outputTokens: response.usage.output_tokens,
    },
  };
}
