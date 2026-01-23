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
        includeSystem: z.boolean().default(true),
      }).optional()
    )
    .query(async ({ ctx, input }) => {
      const coachId = ctx.session.user.id;

      return ctx.db.recipe.findMany({
        where: {
          OR: [
            { coachId },
            ...(input?.includeSystem ? [{ isSystem: true }] : []),
          ],
          ...(input?.category && { category: input.category }),
        },
        include: {
          _count: { select: { assignedClients: true } },
        },
        orderBy: { createdAt: "desc" },
      });
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
        prepTime: z.number().optional(),
        cookTime: z.number().optional(),
        servings: z.number().optional(),
        ingredients: z.any().optional(),
        instructions: z.any().optional(),
        imageUrl: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const coachId = ctx.session.user.id;

      return ctx.db.recipe.create({
        data: {
          ...input,
          coachId,
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
        prepTime: z.number().optional(),
        cookTime: z.number().optional(),
        servings: z.number().optional(),
        ingredients: z.any().optional(),
        instructions: z.any().optional(),
        imageUrl: z.string().optional(),
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

      return ctx.db.clientRecipe.createMany({
        data: input.clientIds.map((clientId) => ({
          clientId,
          recipeId: input.recipeId,
          notes: input.notes,
        })),
        skipDuplicates: true,
      });
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
