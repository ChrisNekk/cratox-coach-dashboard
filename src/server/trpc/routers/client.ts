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

      // Get today's date (start of day)
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

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
              date: true,
              totalCalories: true,
              totalProtein: true,
              totalCarbs: true,
              totalFats: true,
              exerciseMinutes: true,
              waterIntake: true,
              steps: true,
            },
          },
          assignedMealPlans: {
            include: {
              mealPlan: { select: { id: true, title: true } },
            },
            take: 3, // Limit for card preview
            orderBy: { assignedAt: "desc" },
          },
        },
        orderBy: { name: "asc" },
      });

      // Calculate goal achievement percentage for each client
      return clients.map((client) => {
        const { dailyLogs, targetCalories, proteinTarget, carbsTarget, fatsTarget, exerciseMinutesGoal, waterIntakeGoal, stepsGoal, assignedMealPlans, ...rest } = client;
        
        // Find today's log
        const todayLog = dailyLogs.find(log => {
          const logDate = new Date(log.date);
          logDate.setHours(0, 0, 0, 0);
          return logDate.getTime() === today.getTime();
        });

        // Today's progress data
        const todayProgress = todayLog ? {
          calories: { current: todayLog.totalCalories, target: targetCalories },
          protein: { current: todayLog.totalProtein, target: proteinTarget },
          carbs: { current: todayLog.totalCarbs, target: carbsTarget },
          fats: { current: todayLog.totalFats, target: fatsTarget },
          exercise: { current: todayLog.exerciseMinutes, target: exerciseMinutesGoal },
          water: { current: todayLog.waterIntake, target: waterIntakeGoal },
          steps: { current: todayLog.steps, target: stepsGoal },
        } : null;

        if (dailyLogs.length === 0) {
          return { ...rest, goalAchievementPercent: null, todayProgress, weeklyGoalsBreakdown: null, assignedMealPlans };
        }

        // Calculate how many days each goal was met (within 10% tolerance)
        let daysWithGoalsMet = 0;
        const tolerance = 0.1; // 10% tolerance

        // Build weekly breakdown with day-by-day details
        const weeklyGoalsBreakdown: Array<{
          date: Date;
          dayName: string;
          isHit: boolean;
          goals: {
            calories: { hit: boolean; percent: number | null } | null;
            protein: { hit: boolean; percent: number | null } | null;
            carbs: { hit: boolean; percent: number | null } | null;
            fats: { hit: boolean; percent: number | null } | null;
            exercise: { hit: boolean; percent: number | null } | null;
            steps: { hit: boolean; percent: number | null } | null;
          };
        }> = [];

        // Create a map of dates to logs for easier lookup
        const logsByDate = new Map(dailyLogs.map(log => {
          const dateKey = new Date(log.date).toISOString().split('T')[0];
          return [dateKey, log];
        }));

        // Generate entries for the last 7 days
        for (let i = 6; i >= 0; i--) {
          const date = new Date();
          date.setDate(date.getDate() - i);
          date.setHours(0, 0, 0, 0);
          const dateKey = date.toISOString().split('T')[0];
          const log = logsByDate.get(dateKey);
          
          const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
          const dayName = dayNames[date.getDay()];

          if (!log) {
            weeklyGoalsBreakdown.push({
              date,
              dayName,
              isHit: false,
              goals: {
                calories: null,
                protein: null,
                carbs: null,
                fats: null,
                exercise: null,
                steps: null,
              }
            });
            continue;
          }

          let goalsChecked = 0;
          let goalsMet = 0;

          const dayGoals: {
            calories: { hit: boolean; percent: number | null } | null;
            protein: { hit: boolean; percent: number | null } | null;
            carbs: { hit: boolean; percent: number | null } | null;
            fats: { hit: boolean; percent: number | null } | null;
            exercise: { hit: boolean; percent: number | null } | null;
            steps: { hit: boolean; percent: number | null } | null;
          } = {
            calories: null,
            protein: null,
            carbs: null,
            fats: null,
            exercise: null,
            steps: null,
          };

          // Check calories (within +/- 10%)
          if (targetCalories && log.totalCalories) {
            goalsChecked++;
            const percent = Math.round((log.totalCalories / targetCalories) * 100);
            const lowerBound = targetCalories * (1 - tolerance);
            const upperBound = targetCalories * (1 + tolerance);
            const hit = log.totalCalories >= lowerBound && log.totalCalories <= upperBound;
            if (hit) goalsMet++;
            dayGoals.calories = { hit, percent };
          }

          // Check protein (at least 90% of target)
          if (proteinTarget && log.totalProtein) {
            goalsChecked++;
            const percent = Math.round((log.totalProtein / proteinTarget) * 100);
            const hit = log.totalProtein >= proteinTarget * (1 - tolerance);
            if (hit) goalsMet++;
            dayGoals.protein = { hit, percent };
          }

          // Check carbs (within +/- 10%)
          if (carbsTarget && log.totalCarbs) {
            goalsChecked++;
            const percent = Math.round((log.totalCarbs / carbsTarget) * 100);
            const lowerBound = carbsTarget * (1 - tolerance);
            const upperBound = carbsTarget * (1 + tolerance);
            const hit = log.totalCarbs >= lowerBound && log.totalCarbs <= upperBound;
            if (hit) goalsMet++;
            dayGoals.carbs = { hit, percent };
          }

          // Check fats (within +/- 10%)
          if (fatsTarget && log.totalFats) {
            goalsChecked++;
            const percent = Math.round((log.totalFats / fatsTarget) * 100);
            const lowerBound = fatsTarget * (1 - tolerance);
            const upperBound = fatsTarget * (1 + tolerance);
            const hit = log.totalFats >= lowerBound && log.totalFats <= upperBound;
            if (hit) goalsMet++;
            dayGoals.fats = { hit, percent };
          }

          // Check exercise minutes (at least 90% of goal)
          if (exerciseMinutesGoal && log.exerciseMinutes) {
            goalsChecked++;
            const percent = Math.round((log.exerciseMinutes / exerciseMinutesGoal) * 100);
            const hit = log.exerciseMinutes >= exerciseMinutesGoal * (1 - tolerance);
            if (hit) goalsMet++;
            dayGoals.exercise = { hit, percent };
          }

          // Check steps (at least 90% of goal)
          if (stepsGoal && log.steps) {
            goalsChecked++;
            const percent = Math.round((log.steps / stepsGoal) * 100);
            const hit = log.steps >= stepsGoal * (1 - tolerance);
            if (hit) goalsMet++;
            dayGoals.steps = { hit, percent };
          }

          // Consider the day "met" if they achieved at least 80% of their checked goals
          const isHit = goalsChecked > 0 && goalsMet / goalsChecked >= 0.8;
          if (isHit) {
            daysWithGoalsMet++;
          }

          weeklyGoalsBreakdown.push({
            date,
            dayName,
            isHit,
            goals: dayGoals,
          });
        }

        const goalAchievementPercent = dailyLogs.length > 0
          ? Math.round((daysWithGoalsMet / 7) * 100)
          : null;

        return { ...rest, goalAchievementPercent, todayProgress, weeklyGoalsBreakdown, assignedMealPlans };
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
          totalProtein: true,
          totalCarbs: true,
          totalFats: true,
          waterIntake: true,
          steps: true,
          exerciseMinutes: true,
        },
      });

      return {
        logs,
        targetCalories: client.targetCalories,
        proteinTarget: client.proteinTarget,
        carbsTarget: client.carbsTarget,
        fatsTarget: client.fatsTarget,
      };
    }),

  // ============================================
  // SAVED NOTES (AI Analytics)
  // ============================================

  getSavedNotes: protectedProcedure
    .input(z.object({ clientId: z.string() }))
    .query(async ({ ctx, input }) => {
      const coachId = ctx.session.user.id;

      // Verify the client belongs to this coach
      const client = await ctx.db.client.findFirst({
        where: { id: input.clientId, coachId },
      });

      if (!client) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Client not found" });
      }

      return ctx.db.savedNote.findMany({
        where: { clientId: input.clientId, coachId },
        orderBy: { createdAt: "desc" },
      });
    }),

  createSavedNote: protectedProcedure
    .input(z.object({
      clientId: z.string(),
      question: z.string(),
      answer: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      const coachId = ctx.session.user.id;

      // Verify the client belongs to this coach
      const client = await ctx.db.client.findFirst({
        where: { id: input.clientId, coachId },
      });

      if (!client) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Client not found" });
      }

      return ctx.db.savedNote.create({
        data: {
          coachId,
          clientId: input.clientId,
          question: input.question,
          answer: input.answer,
        },
      });
    }),

  deleteSavedNote: protectedProcedure
    .input(z.object({ noteId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const coachId = ctx.session.user.id;

      // Verify the note belongs to this coach
      const note = await ctx.db.savedNote.findFirst({
        where: { id: input.noteId, coachId },
      });

      if (!note) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Note not found" });
      }

      return ctx.db.savedNote.delete({
        where: { id: input.noteId },
      });
    }),
});
