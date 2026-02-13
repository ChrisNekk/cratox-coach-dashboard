import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "../init";
import { TRPCError } from "@trpc/server";

// Default feedback settings
export const DEFAULT_FEEDBACK_SETTINGS = {
  ratingQuestions: [
    { id: "coachingQuality", label: "Coaching Quality", description: "How effective is the coaching?", enabled: true },
    { id: "communication", label: "Communication", description: "How well does the coach communicate?", enabled: true },
    { id: "progressSupport", label: "Progress Support", description: "How well does the coach support your progress?", enabled: true },
    { id: "overallRating", label: "Overall Experience", description: "Overall coaching experience", enabled: true },
  ],
  textQuestions: [
    { id: "whatWentWell", label: "What went well?", placeholder: "Share what you enjoyed about your coaching experience...", enabled: true },
    { id: "whatCouldImprove", label: "What could improve?", placeholder: "Share any suggestions for improvement...", enabled: true },
    { id: "additionalComments", label: "Additional comments", placeholder: "Any other feedback you'd like to share...", enabled: true },
  ],
};

const ratingQuestionSchema = z.object({
  id: z.string(),
  label: z.string(),
  description: z.string(),
  enabled: z.boolean(),
});

const textQuestionSchema = z.object({
  id: z.string(),
  label: z.string(),
  placeholder: z.string(),
  enabled: z.boolean(),
});

const feedbackSettingsSchema = z.object({
  ratingQuestions: z.array(ratingQuestionSchema),
  textQuestions: z.array(textQuestionSchema),
});

export type FeedbackSettings = z.infer<typeof feedbackSettingsSchema>;

export const feedbackRouter = createTRPCRouter({
  // Get all feedback requests for the coach
  getAll: protectedProcedure
    .input(
      z.object({
        status: z.enum(["PENDING", "IN_PROGRESS", "COMPLETED"]).optional(),
        clientId: z.string().optional(),
      }).optional()
    )
    .query(async ({ ctx, input }) => {
      const coachId = ctx.session.user.id;

      return ctx.db.feedbackRequest.findMany({
        where: {
          coachId,
          ...(input?.status && { status: input.status }),
          ...(input?.clientId && { clientId: input.clientId }),
        },
        include: {
          client: { select: { id: true, name: true, email: true } },
          feedback: true,
        },
        orderBy: { createdAt: "desc" },
      });
    }),

  // Get feedback stats summary
  getStats: protectedProcedure.query(async ({ ctx }) => {
    const coachId = ctx.session.user.id;

    const [total, pending, inProgress, completed, feedbackWithRatings] = await Promise.all([
      ctx.db.feedbackRequest.count({ where: { coachId } }),
      ctx.db.feedbackRequest.count({ where: { coachId, status: "PENDING" } }),
      ctx.db.feedbackRequest.count({ where: { coachId, status: "IN_PROGRESS" } }),
      ctx.db.feedbackRequest.count({ where: { coachId, status: "COMPLETED" } }),
      ctx.db.clientFeedback.findMany({
        where: {
          feedbackRequest: { coachId },
        },
        select: {
          coachingQuality: true,
          communication: true,
          progressSupport: true,
          overallRating: true,
        },
      }),
    ]);

    // Calculate average ratings
    let avgOverall = 0;
    let avgCoachingQuality = 0;
    let avgCommunication = 0;
    let avgProgressSupport = 0;

    if (feedbackWithRatings.length > 0) {
      const sum = feedbackWithRatings.reduce(
        (acc, f) => ({
          overall: acc.overall + f.overallRating,
          coachingQuality: acc.coachingQuality + f.coachingQuality,
          communication: acc.communication + f.communication,
          progressSupport: acc.progressSupport + f.progressSupport,
        }),
        { overall: 0, coachingQuality: 0, communication: 0, progressSupport: 0 }
      );

      avgOverall = sum.overall / feedbackWithRatings.length;
      avgCoachingQuality = sum.coachingQuality / feedbackWithRatings.length;
      avgCommunication = sum.communication / feedbackWithRatings.length;
      avgProgressSupport = sum.progressSupport / feedbackWithRatings.length;
    }

    return {
      total,
      pending,
      inProgress,
      completed,
      averageRatings: {
        overall: Math.round(avgOverall * 10) / 10,
        coachingQuality: Math.round(avgCoachingQuality * 10) / 10,
        communication: Math.round(avgCommunication * 10) / 10,
        progressSupport: Math.round(avgProgressSupport * 10) / 10,
      },
      totalResponses: feedbackWithRatings.length,
    };
  }),

  // Get detailed analytics
  getAnalytics: protectedProcedure.query(async ({ ctx }) => {
    const coachId = ctx.session.user.id;

    const allFeedback = await ctx.db.clientFeedback.findMany({
      where: {
        feedbackRequest: { coachId },
      },
      include: {
        feedbackRequest: {
          include: {
            client: { select: { id: true, name: true } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    if (allFeedback.length === 0) {
      return {
        totalResponses: 0,
        ratingDistributions: {
          overall: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
          coachingQuality: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
          communication: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
          progressSupport: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
        },
        averages: {
          overall: 0,
          coachingQuality: 0,
          communication: 0,
          progressSupport: 0,
        },
        recentFeedback: [],
        textFeedback: {
          whatWentWell: [],
          whatCouldImprove: [],
        },
      };
    }

    // Calculate rating distributions
    const distributions = {
      overall: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 } as Record<number, number>,
      coachingQuality: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 } as Record<number, number>,
      communication: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 } as Record<number, number>,
      progressSupport: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 } as Record<number, number>,
    };

    const sums = { overall: 0, coachingQuality: 0, communication: 0, progressSupport: 0 };

    for (const f of allFeedback) {
      distributions.overall[f.overallRating] = (distributions.overall[f.overallRating] || 0) + 1;
      distributions.coachingQuality[f.coachingQuality] = (distributions.coachingQuality[f.coachingQuality] || 0) + 1;
      distributions.communication[f.communication] = (distributions.communication[f.communication] || 0) + 1;
      distributions.progressSupport[f.progressSupport] = (distributions.progressSupport[f.progressSupport] || 0) + 1;

      sums.overall += f.overallRating;
      sums.coachingQuality += f.coachingQuality;
      sums.communication += f.communication;
      sums.progressSupport += f.progressSupport;
    }

    const count = allFeedback.length;

    // Get recent text feedback
    const textFeedback = {
      whatWentWell: allFeedback
        .filter((f) => f.whatWentWell)
        .slice(0, 5)
        .map((f) => ({
          text: f.whatWentWell!,
          clientName: f.feedbackRequest.client.name,
          date: f.createdAt,
        })),
      whatCouldImprove: allFeedback
        .filter((f) => f.whatCouldImprove)
        .slice(0, 5)
        .map((f) => ({
          text: f.whatCouldImprove!,
          clientName: f.feedbackRequest.client.name,
          date: f.createdAt,
        })),
    };

    return {
      totalResponses: count,
      ratingDistributions: distributions,
      averages: {
        overall: Math.round((sums.overall / count) * 10) / 10,
        coachingQuality: Math.round((sums.coachingQuality / count) * 10) / 10,
        communication: Math.round((sums.communication / count) * 10) / 10,
        progressSupport: Math.round((sums.progressSupport / count) * 10) / 10,
      },
      recentFeedback: allFeedback.slice(0, 10).map((f) => ({
        id: f.id,
        clientName: f.feedbackRequest.client.name,
        clientId: f.feedbackRequest.client.id,
        overallRating: f.overallRating,
        createdAt: f.createdAt,
      })),
      textFeedback,
    };
  }),

  // Request feedback from clients
  requestFeedback: protectedProcedure
    .input(
      z.object({
        clientIds: z.array(z.string()).min(1),
        dueDate: z.date().optional(),
        customMessage: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const coachId = ctx.session.user.id;

      // Verify clients belong to coach
      const clients = await ctx.db.client.findMany({
        where: {
          id: { in: input.clientIds },
          coachId,
        },
      });

      if (clients.length !== input.clientIds.length) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Some clients not found" });
      }

      const results = [];

      for (const client of clients) {
        // Create feedback request
        const feedbackRequest = await ctx.db.feedbackRequest.create({
          data: {
            coachId,
            clientId: client.id,
            status: "PENDING",
            sentAt: new Date(),
            dueDate: input.dueDate,
          },
        });

        // Get or create conversation
        let conversation = await ctx.db.conversation.findFirst({
          where: { coachId, clientId: client.id },
        });

        if (!conversation) {
          conversation = await ctx.db.conversation.create({
            data: {
              coachId,
              clientId: client.id,
            },
          });
        }

        // Create message with feedback request link
        const messageContent =
          input.customMessage ||
          `Hi ${client.name}! I'd love to hear your feedback on our coaching sessions. Please take a moment to share your thoughts${input.dueDate ? ` by ${input.dueDate.toLocaleDateString()}` : ""}.`;

        await ctx.db.message.create({
          data: {
            conversationId: conversation.id,
            senderId: coachId,
            senderType: "COACH",
            content: messageContent,
            attachments: [
              {
                type: "feedback_request",
                id: feedbackRequest.id,
              },
            ],
          },
        });

        // Update conversation
        await ctx.db.conversation.update({
          where: { id: conversation.id },
          data: {
            lastMessageAt: new Date(),
            unreadByClient: { increment: 1 },
          },
        });

        results.push(feedbackRequest);
      }

      return results;
    }),

  // Get single feedback request with details
  getFeedbackById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const coachId = ctx.session.user.id;

      const feedbackRequest = await ctx.db.feedbackRequest.findFirst({
        where: {
          id: input.id,
          coachId,
        },
        include: {
          client: { select: { id: true, name: true, email: true } },
          feedback: true,
        },
      });

      if (!feedbackRequest) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Feedback request not found" });
      }

      return feedbackRequest;
    }),

  // Get all feedback for a specific client
  getClientFeedback: protectedProcedure
    .input(z.object({ clientId: z.string() }))
    .query(async ({ ctx, input }) => {
      const coachId = ctx.session.user.id;

      // Verify client belongs to coach
      const client = await ctx.db.client.findFirst({
        where: { id: input.clientId, coachId },
      });

      if (!client) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Client not found" });
      }

      return ctx.db.feedbackRequest.findMany({
        where: {
          clientId: input.clientId,
          coachId,
        },
        include: {
          feedback: true,
        },
        orderBy: { createdAt: "desc" },
      });
    }),

  // Get AI insights for feedback
  getAIInsights: protectedProcedure.query(async ({ ctx }) => {
    const coachId = ctx.session.user.id;

    const allFeedback = await ctx.db.clientFeedback.findMany({
      where: {
        feedbackRequest: { coachId },
      },
      include: {
        feedbackRequest: {
          include: {
            client: { select: { id: true, name: true } },
          },
        },
      },
    });

    if (allFeedback.length === 0) {
      return {
        analysis: null,
        message: "No completed feedback to analyze",
      };
    }

    // Build analytics for AI
    const avgRatings = {
      overall: allFeedback.reduce((sum, f) => sum + f.overallRating, 0) / allFeedback.length,
      coachingQuality: allFeedback.reduce((sum, f) => sum + f.coachingQuality, 0) / allFeedback.length,
      communication: allFeedback.reduce((sum, f) => sum + f.communication, 0) / allFeedback.length,
      progressSupport: allFeedback.reduce((sum, f) => sum + f.progressSupport, 0) / allFeedback.length,
    };

    const textFeedback = {
      whatWentWell: allFeedback.filter((f) => f.whatWentWell).map((f) => f.whatWentWell!),
      whatCouldImprove: allFeedback.filter((f) => f.whatCouldImprove).map((f) => f.whatCouldImprove!),
    };

    // Find low ratings
    const lowRatingClients = allFeedback
      .filter((f) => f.overallRating <= 3)
      .map((f) => ({
        clientId: f.feedbackRequest.client.id,
        clientName: f.feedbackRequest.client.name,
        rating: f.overallRating,
      }));

    // Import and call Claude analysis
    const { analyzeFeedbackWithClaude } = await import("@/server/services/claude");

    const { analysis } = await analyzeFeedbackWithClaude({
      totalResponses: allFeedback.length,
      averageRatings: avgRatings,
      textFeedback,
      lowRatingClients,
    });

    return { analysis };
  }),

  // Delete a feedback request
  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const coachId = ctx.session.user.id;

      const feedbackRequest = await ctx.db.feedbackRequest.findFirst({
        where: {
          id: input.id,
          coachId,
        },
      });

      if (!feedbackRequest) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Feedback request not found" });
      }

      return ctx.db.feedbackRequest.delete({ where: { id: input.id } });
    }),

  // Get feedback settings for the coach
  getSettings: protectedProcedure.query(async ({ ctx }) => {
    const coachId = ctx.session.user.id;

    const coach = await ctx.db.coach.findUnique({
      where: { id: coachId },
      select: { feedbackSettings: true },
    });

    if (!coach) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Coach not found" });
    }

    // Return saved settings or defaults
    if (coach.feedbackSettings) {
      return feedbackSettingsSchema.parse(coach.feedbackSettings);
    }

    return DEFAULT_FEEDBACK_SETTINGS;
  }),

  // Update feedback settings for the coach
  updateSettings: protectedProcedure
    .input(feedbackSettingsSchema)
    .mutation(async ({ ctx, input }) => {
      const coachId = ctx.session.user.id;

      const coach = await ctx.db.coach.update({
        where: { id: coachId },
        data: { feedbackSettings: input },
        select: { feedbackSettings: true },
      });

      return feedbackSettingsSchema.parse(coach.feedbackSettings);
    }),
});
