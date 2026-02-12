import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "../init";
import { TRPCError } from "@trpc/server";
import {
  generateOutreachMessageWithClaude,
  type OutreachMessageType,
} from "@/server/services/claude";

export const messageAiRouter = createTRPCRouter({
  /**
   * Generate a personalized outreach message for a client
   */
  generateOutreach: protectedProcedure
    .input(
      z.object({
        clientId: z.string(),
        messageType: z.enum(["check_in", "motivation", "progress", "reminder", "custom"]),
        customPrompt: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const coachId = ctx.session.user.id;

      // Fetch client with recent activity data
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const client = await ctx.db.client.findFirst({
        where: { id: input.clientId, coachId },
        include: {
          dailyLogs: {
            where: { date: { gte: sevenDaysAgo } },
            select: {
              date: true,
              totalCalories: true,
              totalProtein: true,
            },
            orderBy: { date: "desc" },
          },
        },
      });

      if (!client) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Client not found" });
      }

      // Get coach name for personalization
      const coach = await ctx.db.coach.findUnique({
        where: { id: coachId },
        select: { name: true },
      });

      // Calculate recent activity stats
      const recentActivity = client.dailyLogs.length > 0
        ? {
            daysLogged: client.dailyLogs.length,
            averageCalories: Math.round(
              client.dailyLogs.reduce((sum, log) => sum + (log.totalCalories || 0), 0) /
                client.dailyLogs.length
            ),
            averageProtein: Math.round(
              client.dailyLogs.reduce((sum, log) => sum + (log.totalProtein || 0), 0) /
                client.dailyLogs.length
            ),
            lastLogDate: client.dailyLogs[0]?.date,
          }
        : undefined;

      try {
        const { message, usage } = await generateOutreachMessageWithClaude({
          client: {
            name: client.name,
            goalType: client.goalType || undefined,
            startWeight: client.startWeight || undefined,
            currentWeight: client.currentWeight || undefined,
            targetWeight: client.targetWeight || undefined,
            recentActivity,
            coachName: coach?.name || undefined,
          },
          messageType: input.messageType as OutreachMessageType,
          customPrompt: input.customPrompt,
        });

        return {
          message,
          usage,
        };
      } catch (error) {
        console.error("Outreach message generation error:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to generate outreach message. Please try again.",
        });
      }
    }),

  /**
   * Get suggested outreach prompts based on client data
   */
  getSuggestions: protectedProcedure
    .input(z.object({ clientId: z.string() }))
    .query(async ({ ctx, input }) => {
      const coachId = ctx.session.user.id;

      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const client = await ctx.db.client.findFirst({
        where: { id: input.clientId, coachId },
        include: {
          dailyLogs: {
            where: { date: { gte: sevenDaysAgo } },
            select: { date: true },
            orderBy: { date: "desc" },
          },
        },
      });

      if (!client) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Client not found" });
      }

      const suggestions: Array<{
        type: OutreachMessageType;
        reason: string;
        priority: "high" | "medium" | "low";
      }> = [];

      const daysLogged = client.dailyLogs.length;
      const lastLogDate = client.dailyLogs[0]?.date;
      const daysSinceLastLog = lastLogDate
        ? Math.floor((Date.now() - new Date(lastLogDate).getTime()) / (1000 * 60 * 60 * 24))
        : 7;

      // Check for inactivity
      if (daysSinceLastLog >= 3) {
        suggestions.push({
          type: "check_in",
          reason: `${client.name} hasn't logged in ${daysSinceLastLog} days`,
          priority: "high",
        });
      }

      // Check for consistent logging
      if (daysLogged >= 5) {
        suggestions.push({
          type: "progress",
          reason: `Great logging consistency (${daysLogged}/7 days)`,
          priority: "medium",
        });
      }

      // General motivation
      if (daysLogged < 3) {
        suggestions.push({
          type: "motivation",
          reason: "Could use some encouragement",
          priority: "medium",
        });
      }

      // Reminder for moderate logging
      if (daysLogged >= 2 && daysLogged <= 4 && daysSinceLastLog >= 1) {
        suggestions.push({
          type: "reminder",
          reason: "Gentle reminder to keep logging",
          priority: "low",
        });
      }

      return suggestions;
    }),
});
