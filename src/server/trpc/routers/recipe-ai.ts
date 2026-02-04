import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "../init";
import { TRPCError } from "@trpc/server";
import {
  generateRecipeWithClaude,
  adjustRecipeWithClaude,
  type RecipeIngredient,
  type RecipeInstruction,
  type RecipeNutrition,
} from "@/server/services/claude";

// Dietary tags enum
const dietaryTagSchema = z.enum([
  "vegan",
  "vegetarian",
  "keto",
  "paleo",
  "gluten-free",
  "dairy-free",
  "halal",
  "kosher",
  "low-carb",
  "high-protein",
]);

// Macro range schema
const macroRangeSchema = z.object({
  min: z.number().min(0),
  max: z.number().min(0),
});

export const recipeAiRouter = createTRPCRouter({
  /**
   * Generate a new recipe using AI
   */
  generateRecipe: protectedProcedure
    .input(
      z.object({
        includeIngredients: z.array(z.string()).optional(),
        excludeIngredients: z.array(z.string()).optional(),
        dietaryTags: z.array(dietaryTagSchema).optional(),
        targetMacros: z
          .object({
            calories: macroRangeSchema.optional(),
            protein: macroRangeSchema.optional(),
            carbs: macroRangeSchema.optional(),
            fats: macroRangeSchema.optional(),
          })
          .optional(),
        mealType: z.enum(["breakfast", "lunch", "dinner", "snack"]).optional(),
        cuisine: z.string().optional(),
        servings: z.number().min(1).max(20).default(2),
        autoSave: z.boolean().default(true),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const coachId = ctx.session.user.id;

      try {
        // Generate recipe using Claude
        const { recipe, usage } = await generateRecipeWithClaude({
          includeIngredients: input.includeIngredients,
          excludeIngredients: input.excludeIngredients,
          dietaryTags: input.dietaryTags,
          targetMacros: input.targetMacros,
          mealType: input.mealType,
          cuisine: input.cuisine,
          servings: input.servings,
        });

        // Save to database if autoSave is enabled
        let savedRecipe = null;
        if (input.autoSave) {
          savedRecipe = await ctx.db.recipe.create({
            data: {
              coachId,
              title: recipe.title,
              description: recipe.description,
              category: recipe.category || input.mealType,
              cuisine: recipe.cuisine || input.cuisine,
              calories: recipe.nutrition.calories,
              protein: recipe.nutrition.protein,
              carbs: recipe.nutrition.carbs,
              fats: recipe.nutrition.fats,
              fiber: recipe.nutrition.fiber,
              sugar: recipe.nutrition.sugar,
              sodium: recipe.nutrition.sodium,
              prepTime: recipe.prepTime,
              cookTime: recipe.cookTime,
              servings: recipe.servings,
              ingredients: JSON.parse(JSON.stringify(recipe.ingredients)),
              instructions: JSON.parse(JSON.stringify(recipe.instructions)),
              dietaryTags: recipe.dietaryTags,
              source: "AI_GENERATED",
              isPublic: true, // Default to shared library
            },
          });
        }

        return {
          recipe,
          savedRecipe,
          usage,
        };
      } catch (error) {
        console.error("Recipe generation error:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to generate recipe. Please try again.",
        });
      }
    }),

  /**
   * Find similar recipes for deduplication check
   */
  findSimilarRecipes: protectedProcedure
    .input(
      z.object({
        targetCalories: z.number(),
        targetProtein: z.number().optional(),
        targetCarbs: z.number().optional(),
        targetFats: z.number().optional(),
        dietaryTags: z.array(z.string()).optional(),
        mealType: z.string().optional(),
        tolerance: z.number().default(0.15), // 15% by default
      })
    )
    .query(async ({ ctx, input }) => {
      const coachId = ctx.session.user.id;
      const { targetCalories, targetProtein, targetCarbs, targetFats, dietaryTags, mealType, tolerance } = input;

      // Calculate ranges
      const calMin = Math.floor(targetCalories * (1 - tolerance));
      const calMax = Math.ceil(targetCalories * (1 + tolerance));

      // Build the where clause
      const whereClause: Record<string, unknown> = {
        OR: [{ coachId }, { isSystem: true }, { isPublic: true }],
        calories: {
          gte: calMin,
          lte: calMax,
        },
      };

      if (mealType) {
        whereClause.category = mealType;
      }

      // Get recipes within calorie range
      const recipes = await ctx.db.recipe.findMany({
        where: whereClause,
        include: {
          _count: { select: { assignedClients: true } },
        },
        orderBy: { usageCount: "desc" },
        take: 10,
      });

      // Further filter by other macros if specified
      const filtered = recipes.filter((recipe) => {
        if (targetProtein && recipe.protein) {
          const proteinMin = targetProtein * (1 - tolerance);
          const proteinMax = targetProtein * (1 + tolerance);
          if (recipe.protein < proteinMin || recipe.protein > proteinMax) {
            return false;
          }
        }

        if (targetCarbs && recipe.carbs) {
          const carbsMin = targetCarbs * (1 - tolerance);
          const carbsMax = targetCarbs * (1 + tolerance);
          if (recipe.carbs < carbsMin || recipe.carbs > carbsMax) {
            return false;
          }
        }

        if (targetFats && recipe.fats) {
          const fatsMin = targetFats * (1 - tolerance);
          const fatsMax = targetFats * (1 + tolerance);
          if (recipe.fats < fatsMin || recipe.fats > fatsMax) {
            return false;
          }
        }

        // Check dietary tags if specified
        if (dietaryTags && dietaryTags.length > 0 && recipe.dietaryTags) {
          const recipeTags = recipe.dietaryTags as string[];
          const hasAllTags = dietaryTags.every((tag) => recipeTags.includes(tag));
          if (!hasAllTags) {
            return false;
          }
        }

        return true;
      });

      // Calculate match score for ranking
      const withScores = filtered.map((recipe) => {
        let score = 0;
        const totalFactors = 4;

        // Calorie match (closer to target = higher score)
        if (recipe.calories) {
          const calDiff = Math.abs(recipe.calories - targetCalories) / targetCalories;
          score += (1 - calDiff) * 25;
        }

        // Protein match
        if (targetProtein && recipe.protein) {
          const protDiff = Math.abs(recipe.protein - targetProtein) / targetProtein;
          score += (1 - protDiff) * 25;
        }

        // Carbs match
        if (targetCarbs && recipe.carbs) {
          const carbDiff = Math.abs(recipe.carbs - targetCarbs) / targetCarbs;
          score += (1 - carbDiff) * 25;
        }

        // Fats match
        if (targetFats && recipe.fats) {
          const fatDiff = Math.abs(recipe.fats - targetFats) / targetFats;
          score += (1 - fatDiff) * 25;
        }

        return {
          ...recipe,
          matchScore: Math.round(score),
        };
      });

      // Sort by match score
      withScores.sort((a, b) => b.matchScore - a.matchScore);

      return withScores;
    }),

  /**
   * Adjust an existing recipe to meet new macro targets
   */
  adjustRecipe: protectedProcedure
    .input(
      z.object({
        recipeId: z.string(),
        targetMacros: z.object({
          calories: z.number().optional(),
          protein: z.number().optional(),
          carbs: z.number().optional(),
          fats: z.number().optional(),
        }),
        servings: z.number().optional(),
        saveAsNew: z.boolean().default(true),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const coachId = ctx.session.user.id;

      // Fetch the original recipe
      const originalRecipe = await ctx.db.recipe.findFirst({
        where: {
          id: input.recipeId,
          OR: [{ coachId }, { isSystem: true }, { isPublic: true }],
        },
      });

      if (!originalRecipe) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Recipe not found",
        });
      }

      try {
        // Adjust recipe using Claude
        const { recipe, usage } = await adjustRecipeWithClaude({
          originalRecipe: {
            title: originalRecipe.title,
            description: originalRecipe.description || undefined,
            ingredients: (originalRecipe.ingredients as unknown as RecipeIngredient[]) || [],
            instructions: (originalRecipe.instructions as unknown as RecipeInstruction[]) || [],
            nutrition: {
              calories: originalRecipe.calories || 0,
              protein: originalRecipe.protein || 0,
              carbs: originalRecipe.carbs || 0,
              fats: originalRecipe.fats || 0,
              fiber: originalRecipe.fiber || undefined,
              sugar: originalRecipe.sugar || undefined,
              sodium: originalRecipe.sodium || undefined,
            },
            servings: originalRecipe.servings || 2,
          },
          targetMacros: input.targetMacros,
          servings: input.servings,
        });

        // Save as new recipe if requested
        let savedRecipe = null;
        if (input.saveAsNew) {
          savedRecipe = await ctx.db.recipe.create({
            data: {
              coachId,
              title: `${recipe.title} (Adjusted)`,
              description: recipe.description,
              category: originalRecipe.category,
              cuisine: recipe.cuisine || originalRecipe.cuisine,
              calories: recipe.nutrition.calories,
              protein: recipe.nutrition.protein,
              carbs: recipe.nutrition.carbs,
              fats: recipe.nutrition.fats,
              fiber: recipe.nutrition.fiber,
              sugar: recipe.nutrition.sugar,
              sodium: recipe.nutrition.sodium,
              prepTime: recipe.prepTime,
              cookTime: recipe.cookTime,
              servings: recipe.servings,
              ingredients: JSON.parse(JSON.stringify(recipe.ingredients)),
              instructions: JSON.parse(JSON.stringify(recipe.instructions)),
              dietaryTags: recipe.dietaryTags,
              source: "AI_GENERATED",
              adaptedFromId: originalRecipe.id,
              isPublic: true,
            },
          });
        }

        return {
          recipe,
          savedRecipe,
          originalRecipeId: originalRecipe.id,
          usage,
        };
      } catch (error) {
        console.error("Recipe adjustment error:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to adjust recipe. Please try again.",
        });
      }
    }),

  /**
   * Get recipe recommendations for a client based on their macro targets
   */
  getClientRecommendations: protectedProcedure
    .input(
      z.object({
        clientId: z.string(),
        mealType: z.string().optional(),
        limit: z.number().default(10),
        tolerance: z.number().default(0.1), // 10% by default
      })
    )
    .query(async ({ ctx, input }) => {
      const coachId = ctx.session.user.id;

      // Fetch client with their macro targets
      const client = await ctx.db.client.findFirst({
        where: {
          id: input.clientId,
          coachId,
        },
      });

      if (!client) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Client not found",
        });
      }

      // Check if client has macro targets set
      if (!client.targetCalories) {
        return {
          client: {
            id: client.id,
            name: client.name,
            targetCalories: null,
            proteinTarget: null,
            carbsTarget: null,
            fatsTarget: null,
          },
          recommendations: [],
          message: "Client does not have calorie targets set",
        };
      }

      // Calculate per-meal targets (divide daily by 3 for main meals, or by 4 including snacks)
      const mealsPerDay = input.mealType === "snack" ? 4 : 3;
      const mealCalories = Math.round(client.targetCalories / mealsPerDay);
      const mealProtein = client.proteinTarget ? Math.round(client.proteinTarget / mealsPerDay) : undefined;
      const mealCarbs = client.carbsTarget ? Math.round(client.carbsTarget / mealsPerDay) : undefined;
      const mealFats = client.fatsTarget ? Math.round(client.fatsTarget / mealsPerDay) : undefined;

      // Build where clause
      const calMin = Math.floor(mealCalories * (1 - input.tolerance));
      const calMax = Math.ceil(mealCalories * (1 + input.tolerance));

      const whereClause: Record<string, unknown> = {
        OR: [{ coachId }, { isSystem: true }, { isPublic: true }],
        calories: {
          gte: calMin,
          lte: calMax,
        },
      };

      if (input.mealType) {
        whereClause.category = input.mealType;
      }

      // Fetch matching recipes
      const recipes = await ctx.db.recipe.findMany({
        where: whereClause,
        include: {
          _count: { select: { assignedClients: true } },
        },
        orderBy: { usageCount: "desc" },
        take: 50, // Get more, then filter and rank
      });

      // Calculate match scores
      const withScores = recipes
        .map((recipe) => {
          let score = 0;
          let matchedFactors = 0;

          // Calorie match
          if (recipe.calories) {
            const calDiff = Math.abs(recipe.calories - mealCalories) / mealCalories;
            if (calDiff <= input.tolerance) {
              score += (1 - calDiff) * 30;
              matchedFactors++;
            }
          }

          // Protein match
          if (mealProtein && recipe.protein) {
            const protDiff = Math.abs(recipe.protein - mealProtein) / mealProtein;
            if (protDiff <= input.tolerance) {
              score += (1 - protDiff) * 25;
              matchedFactors++;
            }
          }

          // Carbs match
          if (mealCarbs && recipe.carbs) {
            const carbDiff = Math.abs(recipe.carbs - mealCarbs) / mealCarbs;
            if (carbDiff <= input.tolerance) {
              score += (1 - carbDiff) * 20;
              matchedFactors++;
            }
          }

          // Fats match
          if (mealFats && recipe.fats) {
            const fatDiff = Math.abs(recipe.fats - mealFats) / mealFats;
            if (fatDiff <= input.tolerance) {
              score += (1 - fatDiff) * 15;
              matchedFactors++;
            }
          }

          // Popularity bonus
          score += Math.min(recipe.usageCount * 0.5, 10);

          return {
            ...recipe,
            matchScore: Math.round(score),
            matchedFactors,
          };
        })
        .filter((r) => r.matchedFactors > 0)
        .sort((a, b) => b.matchScore - a.matchScore)
        .slice(0, input.limit);

      return {
        client: {
          id: client.id,
          name: client.name,
          targetCalories: client.targetCalories,
          proteinTarget: client.proteinTarget,
          carbsTarget: client.carbsTarget,
          fatsTarget: client.fatsTarget,
          // Per-meal targets used for matching
          mealTargets: {
            calories: mealCalories,
            protein: mealProtein,
            carbs: mealCarbs,
            fats: mealFats,
          },
        },
        recommendations: withScores,
        hasMore: recipes.length >= 50,
      };
    }),
});
