import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "../init";
import { TRPCError } from "@trpc/server";

export const contentRouter = createTRPCRouter({
  // WORKOUTS
  getWorkouts: protectedProcedure
    .input(
      z.object({
        category: z.string().optional(),
        difficulty: z.string().optional(),
        includeSystem: z.boolean().default(true),
      }).optional()
    )
    .query(async ({ ctx, input }) => {
      const coachId = ctx.session.user.id;

      return ctx.db.workout.findMany({
        where: {
          OR: [
            { coachId },
            ...(input?.includeSystem ? [{ isSystem: true }] : []),
          ],
          ...(input?.category && { category: input.category }),
          ...(input?.difficulty && { difficulty: input.difficulty }),
        },
        include: {
          _count: { select: { assignedClients: true } },
        },
        orderBy: { createdAt: "desc" },
      });
    }),

  getWorkoutById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const coachId = ctx.session.user.id;

      const workout = await ctx.db.workout.findFirst({
        where: {
          id: input.id,
          OR: [{ coachId }, { isSystem: true }],
        },
        include: {
          assignedClients: {
            include: {
              client: { select: { id: true, name: true } },
            },
          },
        },
      });

      if (!workout) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Workout not found" });
      }

      return workout;
    }),

  createWorkout: protectedProcedure
    .input(
      z.object({
        title: z.string().min(1),
        description: z.string().optional(),
        category: z.string().optional(),
        difficulty: z.string().optional(),
        duration: z.number().optional(),
        content: z.any().optional(),
        imageUrl: z.string().optional(),
        videoUrl: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const coachId = ctx.session.user.id;

      return ctx.db.workout.create({
        data: {
          ...input,
          coachId,
        },
      });
    }),

  updateWorkout: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        title: z.string().min(1).optional(),
        description: z.string().optional(),
        category: z.string().optional(),
        difficulty: z.string().optional(),
        duration: z.number().optional(),
        content: z.any().optional(),
        imageUrl: z.string().optional(),
        videoUrl: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const coachId = ctx.session.user.id;
      const { id, ...data } = input;

      const workout = await ctx.db.workout.findFirst({
        where: { id, coachId },
      });

      if (!workout) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Workout not found or not editable" });
      }

      return ctx.db.workout.update({
        where: { id },
        data,
      });
    }),

  deleteWorkout: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const coachId = ctx.session.user.id;

      const workout = await ctx.db.workout.findFirst({
        where: { id: input.id, coachId },
      });

      if (!workout) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Workout not found or not deletable" });
      }

      return ctx.db.workout.delete({ where: { id: input.id } });
    }),

  assignWorkout: protectedProcedure
    .input(
      z.object({
        workoutId: z.string(),
        clientIds: z.array(z.string()),
        scheduledFor: z.date().optional(),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const coachId = ctx.session.user.id;

      // Verify clients belong to coach
      const clients = await ctx.db.client.findMany({
        where: { id: { in: input.clientIds }, coachId },
      });

      if (clients.length !== input.clientIds.length) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Some clients not found" });
      }

      return ctx.db.clientWorkout.createMany({
        data: input.clientIds.map((clientId) => ({
          clientId,
          workoutId: input.workoutId,
          scheduledFor: input.scheduledFor,
          notes: input.notes,
        })),
        skipDuplicates: true,
      });
    }),

  // RECIPES
  getRecipes: protectedProcedure
    .input(
      z.object({
        category: z.string().optional(),
        cuisine: z.string().optional(),
        dietaryTags: z.array(z.string()).optional(),
        calorieRange: z.object({ min: z.number(), max: z.number() }).optional(),
        proteinRange: z.object({ min: z.number(), max: z.number() }).optional(),
        carbsRange: z.object({ min: z.number(), max: z.number() }).optional(),
        fatsRange: z.object({ min: z.number(), max: z.number() }).optional(),
        search: z.string().optional(),
        source: z.enum(["MANUAL", "AI_GENERATED", "IMPORTED"]).optional(),
        sortBy: z.enum(["createdAt", "usageCount", "calories", "protein"]).default("createdAt"),
        sortOrder: z.enum(["asc", "desc"]).default("desc"),
        includeSystem: z.boolean().default(true),
        includeShared: z.boolean().default(true),
        onlyMine: z.boolean().default(false),
      }).optional()
    )
    .query(async ({ ctx, input }) => {
      const coachId = ctx.session.user.id;

      // Build the OR conditions for ownership
      const ownershipConditions: Record<string, unknown>[] = [{ coachId }];
      if (input?.includeSystem && !input?.onlyMine) {
        ownershipConditions.push({ isSystem: true });
      }
      if (input?.includeShared && !input?.onlyMine) {
        ownershipConditions.push({ isPublic: true });
      }

      // Build where clause
      const whereClause: Record<string, unknown> = {
        OR: ownershipConditions,
      };

      // Category filter
      if (input?.category) {
        whereClause.category = input.category;
      }

      // Cuisine filter
      if (input?.cuisine) {
        whereClause.cuisine = input.cuisine;
      }

      // Source filter
      if (input?.source) {
        whereClause.source = input.source;
      }

      // Calorie range
      if (input?.calorieRange) {
        whereClause.calories = {
          gte: input.calorieRange.min,
          lte: input.calorieRange.max,
        };
      }

      // Protein range
      if (input?.proteinRange) {
        whereClause.protein = {
          gte: input.proteinRange.min,
          lte: input.proteinRange.max,
        };
      }

      // Carbs range
      if (input?.carbsRange) {
        whereClause.carbs = {
          gte: input.carbsRange.min,
          lte: input.carbsRange.max,
        };
      }

      // Fats range
      if (input?.fatsRange) {
        whereClause.fats = {
          gte: input.fatsRange.min,
          lte: input.fatsRange.max,
        };
      }

      // Text search (title and description)
      if (input?.search) {
        whereClause.OR = [
          { title: { contains: input.search, mode: "insensitive" } },
          { description: { contains: input.search, mode: "insensitive" } },
        ];
        // Keep ownership conditions
        whereClause.AND = [{ OR: ownershipConditions }];
        delete whereClause.OR;
        whereClause.OR = [
          { title: { contains: input.search, mode: "insensitive" } },
          { description: { contains: input.search, mode: "insensitive" } },
        ];
      }

      // Build orderBy
      const orderBy: Record<string, string> = {};
      orderBy[input?.sortBy || "createdAt"] = input?.sortOrder || "desc";

      const recipes = await ctx.db.recipe.findMany({
        where: input?.search
          ? {
              AND: [
                { OR: ownershipConditions },
                {
                  OR: [
                    { title: { contains: input.search, mode: "insensitive" } },
                    { description: { contains: input.search, mode: "insensitive" } },
                  ],
                },
                ...(input?.category ? [{ category: input.category }] : []),
                ...(input?.cuisine ? [{ cuisine: input.cuisine }] : []),
                ...(input?.source ? [{ source: input.source }] : []),
                ...(input?.calorieRange
                  ? [{ calories: { gte: input.calorieRange.min, lte: input.calorieRange.max } }]
                  : []),
                ...(input?.proteinRange
                  ? [{ protein: { gte: input.proteinRange.min, lte: input.proteinRange.max } }]
                  : []),
                ...(input?.carbsRange
                  ? [{ carbs: { gte: input.carbsRange.min, lte: input.carbsRange.max } }]
                  : []),
                ...(input?.fatsRange
                  ? [{ fats: { gte: input.fatsRange.min, lte: input.fatsRange.max } }]
                  : []),
              ],
            }
          : whereClause,
        include: {
          _count: { select: { assignedClients: true } },
          adaptedFrom: {
            select: { id: true, title: true },
          },
        },
        orderBy,
      });

      // Filter by dietary tags in memory (JSON field)
      if (input?.dietaryTags && input.dietaryTags.length > 0) {
        return recipes.filter((recipe) => {
          if (!recipe.dietaryTags) return false;
          const recipeTags = recipe.dietaryTags as string[];
          return input.dietaryTags!.every((tag) => recipeTags.includes(tag));
        });
      }

      return recipes;
    }),

  getRecipeById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const coachId = ctx.session.user.id;

      const recipe = await ctx.db.recipe.findFirst({
        where: {
          id: input.id,
          OR: [{ coachId }, { isSystem: true }],
        },
        include: {
          assignedClients: {
            include: {
              client: { select: { id: true, name: true } },
            },
          },
        },
      });

      if (!recipe) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Recipe not found" });
      }

      return recipe;
    }),

  createRecipe: protectedProcedure
    .input(
      z.object({
        title: z.string().min(1),
        description: z.string().optional(),
        category: z.string().optional(),
        cuisine: z.string().optional(),
        calories: z.number().optional(),
        protein: z.number().optional(),
        carbs: z.number().optional(),
        fats: z.number().optional(),
        fiber: z.number().optional(),
        saturatedFat: z.number().optional(),
        unsaturatedFat: z.number().optional(),
        sugar: z.number().optional(),
        sodium: z.number().optional(),
        caffeine: z.number().optional(),
        alcohol: z.number().optional(),
        prepTime: z.number().optional(),
        cookTime: z.number().optional(),
        servings: z.number().optional(),
        ingredients: z.any().optional(),
        instructions: z.any().optional(),
        dietaryTags: z.array(z.string()).optional(),
        imageUrl: z.string().optional(),
        isPublic: z.boolean().default(false),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const coachId = ctx.session.user.id;

      return ctx.db.recipe.create({
        data: {
          ...input,
          coachId,
          source: "MANUAL",
        },
      });
    }),

  updateRecipe: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        title: z.string().min(1).optional(),
        description: z.string().optional(),
        category: z.string().optional(),
        cuisine: z.string().optional(),
        calories: z.number().optional(),
        protein: z.number().optional(),
        carbs: z.number().optional(),
        fats: z.number().optional(),
        fiber: z.number().optional(),
        saturatedFat: z.number().optional(),
        unsaturatedFat: z.number().optional(),
        sugar: z.number().optional(),
        sodium: z.number().optional(),
        caffeine: z.number().optional(),
        alcohol: z.number().optional(),
        prepTime: z.number().optional(),
        cookTime: z.number().optional(),
        servings: z.number().optional(),
        ingredients: z.any().optional(),
        instructions: z.any().optional(),
        dietaryTags: z.array(z.string()).optional(),
        imageUrl: z.string().optional(),
        isPublic: z.boolean().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const coachId = ctx.session.user.id;
      const { id, ...data } = input;

      const recipe = await ctx.db.recipe.findFirst({
        where: { id, coachId },
      });

      if (!recipe) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Recipe not found or not editable" });
      }

      return ctx.db.recipe.update({
        where: { id },
        data,
      });
    }),

  deleteRecipe: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const coachId = ctx.session.user.id;

      const recipe = await ctx.db.recipe.findFirst({
        where: { id: input.id, coachId },
      });

      if (!recipe) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Recipe not found or not deletable" });
      }

      return ctx.db.recipe.delete({ where: { id: input.id } });
    }),

  assignRecipe: protectedProcedure
    .input(
      z.object({
        recipeId: z.string(),
        clientIds: z.array(z.string()),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const coachId = ctx.session.user.id;

      const clients = await ctx.db.client.findMany({
        where: { id: { in: input.clientIds }, coachId },
      });

      if (clients.length !== input.clientIds.length) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Some clients not found" });
      }

      // Increment usage count
      await ctx.db.recipe.update({
        where: { id: input.recipeId },
        data: { usageCount: { increment: input.clientIds.length } },
      });

      return ctx.db.clientRecipe.createMany({
        data: input.clientIds.map((clientId) => ({
          clientId,
          recipeId: input.recipeId,
          notes: input.notes,
        })),
        skipDuplicates: true,
      });
    }),

  // Increment recipe usage count
  incrementUsageCount: protectedProcedure
    .input(z.object({ recipeId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.recipe.update({
        where: { id: input.recipeId },
        data: { usageCount: { increment: 1 } },
      });
    }),

  // Add recipe to meal plan
  addRecipeToMealPlan: protectedProcedure
    .input(
      z.object({
        mealPlanId: z.string(),
        recipeId: z.string(),
        day: z.number().min(1),
        mealSlot: z.enum(["breakfast", "lunch", "dinner", "snack"]),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const coachId = ctx.session.user.id;

      // Verify meal plan belongs to coach
      const mealPlan = await ctx.db.mealPlan.findFirst({
        where: {
          id: input.mealPlanId,
          OR: [{ coachId }, { isSystem: false }], // Can only modify own meal plans
        },
      });

      if (!mealPlan || mealPlan.coachId !== coachId) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Meal plan not found or not editable" });
      }

      // Verify recipe exists
      const recipe = await ctx.db.recipe.findFirst({
        where: {
          id: input.recipeId,
          OR: [{ coachId }, { isSystem: true }, { isPublic: true }],
        },
      });

      if (!recipe) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Recipe not found" });
      }

      // Add recipe to meal plan (upsert to handle replacement)
      return ctx.db.mealPlanRecipe.upsert({
        where: {
          mealPlanId_day_mealSlot: {
            mealPlanId: input.mealPlanId,
            day: input.day,
            mealSlot: input.mealSlot,
          },
        },
        update: {
          recipeId: input.recipeId,
        },
        create: {
          mealPlanId: input.mealPlanId,
          recipeId: input.recipeId,
          day: input.day,
          mealSlot: input.mealSlot,
        },
      });
    }),

  // Remove recipe from meal plan
  removeRecipeFromMealPlan: protectedProcedure
    .input(
      z.object({
        mealPlanId: z.string(),
        day: z.number(),
        mealSlot: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const coachId = ctx.session.user.id;

      // Verify meal plan belongs to coach
      const mealPlan = await ctx.db.mealPlan.findFirst({
        where: { id: input.mealPlanId, coachId },
      });

      if (!mealPlan) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Meal plan not found or not editable" });
      }

      return ctx.db.mealPlanRecipe.delete({
        where: {
          mealPlanId_day_mealSlot: {
            mealPlanId: input.mealPlanId,
            day: input.day,
            mealSlot: input.mealSlot,
          },
        },
      });
    }),

  // Get meal plan with recipes
  getMealPlanWithRecipes: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const coachId = ctx.session.user.id;

      const mealPlan = await ctx.db.mealPlan.findFirst({
        where: {
          id: input.id,
          OR: [{ coachId }, { isSystem: true }, { isPublic: true }],
        },
        include: {
          recipes: {
            include: {
              recipe: {
                select: {
                  id: true,
                  title: true,
                  calories: true,
                  protein: true,
                  carbs: true,
                  fats: true,
                  prepTime: true,
                  cookTime: true,
                  category: true,
                },
              },
            },
            orderBy: [{ day: "asc" }, { mealSlot: "asc" }],
          },
          assignedClients: {
            include: {
              client: { select: { id: true, name: true } },
            },
          },
        },
      });

      if (!mealPlan) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Meal plan not found" });
      }

      return mealPlan;
    }),

  // MEAL PLANS
  getMealPlans: protectedProcedure
    .input(
      z.object({
        goalType: z.enum(["WEIGHT_LOSS", "WEIGHT_GAIN", "MAINTAIN_WEIGHT"]).optional(),
        includeSystem: z.boolean().default(true),
      }).optional()
    )
    .query(async ({ ctx, input }) => {
      const coachId = ctx.session.user.id;

      return ctx.db.mealPlan.findMany({
        where: {
          OR: [
            { coachId },
            ...(input?.includeSystem ? [{ isSystem: true }] : []),
          ],
          ...(input?.goalType && { goalType: input.goalType }),
        },
        include: {
          _count: { select: { assignedClients: true } },
        },
        orderBy: { createdAt: "desc" },
      });
    }),

  getMealPlanById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const coachId = ctx.session.user.id;

      const mealPlan = await ctx.db.mealPlan.findFirst({
        where: {
          id: input.id,
          OR: [{ coachId }, { isSystem: true }],
        },
        include: {
          assignedClients: {
            include: {
              client: { select: { id: true, name: true } },
            },
          },
        },
      });

      if (!mealPlan) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Meal plan not found" });
      }

      return mealPlan;
    }),

  createMealPlan: protectedProcedure
    .input(
      z.object({
        title: z.string().min(1),
        description: z.string().optional(),
        duration: z.number().optional(),
        goalType: z.enum(["WEIGHT_LOSS", "WEIGHT_GAIN", "MAINTAIN_WEIGHT"]).optional(),
        targetCalories: z.number().optional(),
        targetProtein: z.number().optional(),
        targetCarbs: z.number().optional(),
        targetFats: z.number().optional(),
        content: z.any().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const coachId = ctx.session.user.id;

      return ctx.db.mealPlan.create({
        data: {
          ...input,
          coachId,
        },
      });
    }),

  updateMealPlan: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        title: z.string().min(1).optional(),
        description: z.string().optional(),
        duration: z.number().optional(),
        goalType: z.enum(["WEIGHT_LOSS", "WEIGHT_GAIN", "MAINTAIN_WEIGHT"]).optional(),
        targetCalories: z.number().optional(),
        targetProtein: z.number().optional(),
        targetCarbs: z.number().optional(),
        targetFats: z.number().optional(),
        content: z.any().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const coachId = ctx.session.user.id;
      const { id, ...data } = input;

      const mealPlan = await ctx.db.mealPlan.findFirst({
        where: { id, coachId },
      });

      if (!mealPlan) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Meal plan not found or not editable" });
      }

      return ctx.db.mealPlan.update({
        where: { id },
        data,
      });
    }),

  deleteMealPlan: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const coachId = ctx.session.user.id;

      const mealPlan = await ctx.db.mealPlan.findFirst({
        where: { id: input.id, coachId },
      });

      if (!mealPlan) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Meal plan not found or not deletable" });
      }

      return ctx.db.mealPlan.delete({ where: { id: input.id } });
    }),

  assignMealPlan: protectedProcedure
    .input(
      z.object({
        mealPlanId: z.string(),
        clientIds: z.array(z.string()),
        startDate: z.date().optional(),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const coachId = ctx.session.user.id;

      const clients = await ctx.db.client.findMany({
        where: { id: { in: input.clientIds }, coachId },
      });

      if (clients.length !== input.clientIds.length) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Some clients not found" });
      }

      const mealPlan = await ctx.db.mealPlan.findUnique({
        where: { id: input.mealPlanId },
      });

      const endDate = input.startDate && mealPlan?.duration
        ? new Date(input.startDate.getTime() + mealPlan.duration * 24 * 60 * 60 * 1000)
        : undefined;

      return ctx.db.clientMealPlan.createMany({
        data: input.clientIds.map((clientId) => ({
          clientId,
          mealPlanId: input.mealPlanId,
          startDate: input.startDate,
          endDate,
          notes: input.notes,
        })),
        skipDuplicates: true,
      });
    }),
});
