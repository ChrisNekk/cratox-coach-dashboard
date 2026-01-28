import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "../init";
import { TRPCError } from "@trpc/server";

export const clientRouter = createTRPCRouter({
  getAll: protectedProcedure
    .input(
      z.object({
        search: z.string().optional(),
        teamId: z.string().optional(),
        goalType: z.enum(["WEIGHT_LOSS", "WEIGHT_GAIN", "MAINTAIN_WEIGHT"]).optional(),
        isActive: z.boolean().optional(),
      }).optional()
    )
    .query(async ({ ctx, input }) => {
      const coachId = ctx.session.user.id;

      // Get date 7 days ago for goal achievement calculation
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const clients = await ctx.db.client.findMany({
        where: {
          coachId,
          ...(input?.search && {
            OR: [
              { name: { contains: input.search, mode: "insensitive" } },
              { email: { contains: input.search, mode: "insensitive" } },
            ],
          }),
          ...(input?.teamId && { teamId: input.teamId }),
          ...(input?.goalType && { goalType: input.goalType }),
          ...(input?.isActive !== undefined && { isActive: input.isActive }),
        },
        include: {
          team: { select: { id: true, name: true, color: true } },
          license: { select: { id: true, status: true, activatedAt: true, expiresAt: true } },
          dailyLogs: {
            where: { date: { gte: sevenDaysAgo } },
            select: {
              totalCalories: true,
              totalProtein: true,
              totalCarbs: true,
              totalFats: true,
              exerciseMinutes: true,
            },
          },
        },
        orderBy: { name: "asc" },
      });

      // Calculate goal achievement percentage for each client
      return clients.map((client) => {
        const { dailyLogs, targetCalories, proteinTarget, carbsTarget, fatsTarget, exerciseMinutesGoal, ...rest } = client;
        
        if (dailyLogs.length === 0) {
          return { ...rest, goalAchievementPercent: null };
        }

        // Calculate how many days each goal was met (within 10% tolerance)
        let daysWithGoalsMet = 0;
        const tolerance = 0.1; // 10% tolerance

        for (const log of dailyLogs) {
          let goalsChecked = 0;
          let goalsMet = 0;

          // Check calories (within +/- 10%)
          if (targetCalories && log.totalCalories) {
            goalsChecked++;
            const lowerBound = targetCalories * (1 - tolerance);
            const upperBound = targetCalories * (1 + tolerance);
            if (log.totalCalories >= lowerBound && log.totalCalories <= upperBound) {
              goalsMet++;
            }
          }

          // Check protein (at least 90% of target)
          if (proteinTarget && log.totalProtein) {
            goalsChecked++;
            if (log.totalProtein >= proteinTarget * (1 - tolerance)) {
              goalsMet++;
            }
          }

          // Check carbs (within +/- 10%)
          if (carbsTarget && log.totalCarbs) {
            goalsChecked++;
            const lowerBound = carbsTarget * (1 - tolerance);
            const upperBound = carbsTarget * (1 + tolerance);
            if (log.totalCarbs >= lowerBound && log.totalCarbs <= upperBound) {
              goalsMet++;
            }
          }

          // Check fats (within +/- 10%)
          if (fatsTarget && log.totalFats) {
            goalsChecked++;
            const lowerBound = fatsTarget * (1 - tolerance);
            const upperBound = fatsTarget * (1 + tolerance);
            if (log.totalFats >= lowerBound && log.totalFats <= upperBound) {
              goalsMet++;
            }
          }

          // Check exercise minutes (at least 90% of goal)
          if (exerciseMinutesGoal && log.exerciseMinutes) {
            goalsChecked++;
            if (log.exerciseMinutes >= exerciseMinutesGoal * (1 - tolerance)) {
              goalsMet++;
            }
          }

          // Consider the day "met" if they achieved at least 80% of their checked goals
          if (goalsChecked > 0 && goalsMet / goalsChecked >= 0.8) {
            daysWithGoalsMet++;
          }
        }

        const goalAchievementPercent = Math.round((daysWithGoalsMet / dailyLogs.length) * 100);

        return { ...rest, goalAchievementPercent };
      });
    }),

  getById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const coachId = ctx.session.user.id;

      const client = await ctx.db.client.findFirst({
        where: { id: input.id, coachId },
        include: {
          team: true,
          license: true,
          weightLogs: {
            orderBy: { date: "desc" },
            take: 30,
          },
          dailyLogs: {
            orderBy: { date: "desc" },
            take: 30,
          },
          exercises: {
            orderBy: { date: "desc" },
            take: 20,
          },
          assignedWorkouts: {
            include: { workout: true },
          },
          assignedRecipes: {
            include: { recipe: true },
          },
          assignedMealPlans: {
            include: { mealPlan: true },
          },
        },
      });

      if (!client) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Client not found" });
      }

      return client;
    }),

  create: protectedProcedure
    .input(
      z.object({
        email: z.string().email(),
        name: z.string().min(1),
        age: z.number().optional(),
        gender: z.enum(["MALE", "FEMALE"]).optional(),
        heightCm: z.number().optional(),
        goalType: z.enum(["WEIGHT_LOSS", "WEIGHT_GAIN", "MAINTAIN_WEIGHT"]).default("WEIGHT_LOSS"),
        startWeight: z.number().optional(),
        targetWeight: z.number().optional(),
        teamId: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const coachId = ctx.session.user.id;

      const existing = await ctx.db.client.findFirst({
        where: { coachId, email: input.email },
      });

      if (existing) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "A client with this email already exists",
        });
      }

      return ctx.db.client.create({
        data: {
          ...input,
          coachId,
          currentWeight: input.startWeight,
        },
      });
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        name: z.string().min(1).optional(),
        age: z.number().optional(),
        gender: z.enum(["MALE", "FEMALE"]).optional(),
        heightCm: z.number().optional(),
        goalType: z.enum(["WEIGHT_LOSS", "WEIGHT_GAIN", "MAINTAIN_WEIGHT"]).optional(),
        startWeight: z.number().optional(),
        targetWeight: z.number().optional(),
        currentWeight: z.number().optional(),
        targetCalories: z.number().optional(),
        proteinTarget: z.number().optional(),
        proteinPercentage: z.number().optional(),
        carbsTarget: z.number().optional(),
        carbsPercentage: z.number().optional(),
        fatsTarget: z.number().optional(),
        fatsPercentage: z.number().optional(),
        exerciseFrequency: z.enum(["NONE", "ONE", "TWO", "THREE", "FOUR_PLUS"]).optional(),
        exerciseIntensity: z.enum(["EASY", "MODERATE", "INTENSE"]).optional(),
        exerciseDuration: z.enum(["FIFTEEN_TO_THIRTY", "THIRTY_TO_FORTYFIVE", "FORTYFIVE_TO_SIXTY", "SIXTY_PLUS"]).optional(),
        stepsGoal: z.number().optional(),
        waterIntakeGoal: z.number().optional(),
        exerciseMinutesGoal: z.number().optional(),
        teamId: z.string().nullable().optional(),
        isActive: z.boolean().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const coachId = ctx.session.user.id;
      const { id, ...data } = input;

      const client = await ctx.db.client.findFirst({
        where: { id, coachId },
      });

      if (!client) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Client not found" });
      }

      return ctx.db.client.update({
        where: { id },
        data,
      });
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const coachId = ctx.session.user.id;

      const client = await ctx.db.client.findFirst({
        where: { id: input.id, coachId },
      });

      if (!client) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Client not found" });
      }

      return ctx.db.client.delete({ where: { id: input.id } });
    }),

  getDailyLog: protectedProcedure
    .input(z.object({ clientId: z.string(), date: z.date() }))
    .query(async ({ ctx, input }) => {
      const coachId = ctx.session.user.id;

      const client = await ctx.db.client.findFirst({
        where: { id: input.clientId, coachId },
      });

      if (!client) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Client not found" });
      }

      return ctx.db.dailyLog.findUnique({
        where: {
          clientId_date: {
            clientId: input.clientId,
            date: input.date,
          },
        },
      });
    }),

  getWeightHistory: protectedProcedure
    .input(z.object({ clientId: z.string(), days: z.number().default(90) }))
    .query(async ({ ctx, input }) => {
      const coachId = ctx.session.user.id;

      const client = await ctx.db.client.findFirst({
        where: { id: input.clientId, coachId },
      });

      if (!client) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Client not found" });
      }

      return ctx.db.weightLog.findMany({
        where: { clientId: input.clientId },
        orderBy: { date: "asc" },
        take: input.days,
      });
    }),

  getWeekLogs: protectedProcedure
    .input(z.object({ 
      clientId: z.string(), 
      weekStart: z.date() // Monday of the week
    }))
    .query(async ({ ctx, input }) => {
      const coachId = ctx.session.user.id;

      const client = await ctx.db.client.findFirst({
        where: { id: input.clientId, coachId },
      });

      if (!client) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Client not found" });
      }

      // Get logs for the week (7 days from weekStart)
      const weekEnd = new Date(input.weekStart);
      weekEnd.setDate(weekEnd.getDate() + 7);

      const logs = await ctx.db.dailyLog.findMany({
        where: {
          clientId: input.clientId,
          date: {
            gte: input.weekStart,
            lt: weekEnd,
          },
        },
        select: {
          date: true,
          totalCalories: true,
        },
      });

      return {
        logs,
        targetCalories: client.targetCalories,
      };
    }),
});
