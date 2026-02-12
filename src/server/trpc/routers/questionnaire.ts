import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "../init";
import { TRPCError } from "@trpc/server";

const questionSchema = z.object({
  id: z.string(),
  type: z.enum(["TEXT_SHORT", "TEXT_LONG", "SINGLE_SELECT", "MULTI_SELECT", "RATING_SCALE", "YES_NO"]),
  question: z.string(),
  required: z.boolean().default(true),
  options: z.array(z.string()).optional(), // For SINGLE_SELECT, MULTI_SELECT
  ratingMax: z.number().optional(), // For RATING_SCALE (5 or 10)
});

export const questionnaireRouter = createTRPCRouter({
  // Get all questionnaires (own + system templates)
  getAll: protectedProcedure
    .input(
      z.object({
        includeSystem: z.boolean().default(true),
      }).optional()
    )
    .query(async ({ ctx, input }) => {
      const coachId = ctx.session.user.id;

      return ctx.db.questionnaire.findMany({
        where: {
          OR: [
            { coachId },
            ...(input?.includeSystem !== false ? [{ isSystem: true }] : []),
          ],
        },
        include: {
          _count: { select: { clientQuestionnaires: true } },
        },
        orderBy: [{ isSystem: "desc" }, { createdAt: "desc" }],
      });
    }),

  // Get single questionnaire with stats
  getById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const coachId = ctx.session.user.id;

      const questionnaire = await ctx.db.questionnaire.findFirst({
        where: {
          id: input.id,
          OR: [{ coachId }, { isSystem: true }],
        },
        include: {
          clientQuestionnaires: {
            include: {
              client: { select: { id: true, name: true, email: true } },
            },
            orderBy: { createdAt: "desc" },
          },
        },
      });

      if (!questionnaire) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Questionnaire not found" });
      }

      return questionnaire;
    }),

  // Create new questionnaire
  create: protectedProcedure
    .input(
      z.object({
        title: z.string().min(1),
        description: z.string().optional(),
        questions: z.array(questionSchema).min(1),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const coachId = ctx.session.user.id;

      return ctx.db.questionnaire.create({
        data: {
          coachId,
          title: input.title,
          description: input.description,
          questions: input.questions,
        },
      });
    }),

  // Update questionnaire
  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        title: z.string().min(1).optional(),
        description: z.string().optional(),
        questions: z.array(questionSchema).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const coachId = ctx.session.user.id;
      const { id, ...data } = input;

      const questionnaire = await ctx.db.questionnaire.findFirst({
        where: { id, coachId },
      });

      if (!questionnaire) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Questionnaire not found or not editable" });
      }

      return ctx.db.questionnaire.update({
        where: { id },
        data,
      });
    }),

  // Delete questionnaire
  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const coachId = ctx.session.user.id;

      const questionnaire = await ctx.db.questionnaire.findFirst({
        where: { id: input.id, coachId },
      });

      if (!questionnaire) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Questionnaire not found or not deletable" });
      }

      return ctx.db.questionnaire.delete({ where: { id: input.id } });
    }),

  // Copy system template to own collection
  copyTemplate: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const coachId = ctx.session.user.id;

      const template = await ctx.db.questionnaire.findFirst({
        where: { id: input.id, isSystem: true },
      });

      if (!template) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Template not found" });
      }

      return ctx.db.questionnaire.create({
        data: {
          coachId,
          title: `${template.title} (Copy)`,
          description: template.description,
          questions: template.questions as object[],
        },
      });
    }),

  // Duplicate any questionnaire (own or system)
  duplicate: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const coachId = ctx.session.user.id;

      const questionnaire = await ctx.db.questionnaire.findFirst({
        where: {
          id: input.id,
          OR: [{ coachId }, { isSystem: true }],
        },
      });

      if (!questionnaire) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Questionnaire not found" });
      }

      return ctx.db.questionnaire.create({
        data: {
          coachId,
          title: `${questionnaire.title} (Copy)`,
          description: questionnaire.description,
          questions: questionnaire.questions as object[],
        },
      });
    }),

  // Send questionnaire to clients
  send: protectedProcedure
    .input(
      z.object({
        questionnaireId: z.string(),
        clientIds: z.array(z.string()).min(1),
        viaEmail: z.boolean().default(false),
        viaMessage: z.boolean().default(true),
        dueDate: z.date().optional(),
        messageContent: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const coachId = ctx.session.user.id;

      // Verify questionnaire access
      const questionnaire = await ctx.db.questionnaire.findFirst({
        where: {
          id: input.questionnaireId,
          OR: [{ coachId }, { isSystem: true }],
        },
      });

      if (!questionnaire) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Questionnaire not found" });
      }

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
        // Create or update client questionnaire
        const clientQuestionnaire = await ctx.db.clientQuestionnaire.upsert({
          where: {
            clientId_questionnaireId: {
              clientId: client.id,
              questionnaireId: input.questionnaireId,
            },
          },
          create: {
            clientId: client.id,
            questionnaireId: input.questionnaireId,
            status: "SENT",
            sentAt: new Date(),
            sentViaEmail: input.viaEmail,
            sentViaMessage: input.viaMessage,
            dueDate: input.dueDate,
          },
          update: {
            status: "SENT",
            sentAt: new Date(),
            sentViaEmail: input.viaEmail,
            sentViaMessage: input.viaMessage,
            dueDate: input.dueDate,
          },
        });

        // If sending via message, create a message in the conversation
        if (input.viaMessage) {
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

          // Create message with questionnaire link
          const messageContent = input.messageContent ||
            `Hi ${client.name}! I've sent you a questionnaire: "${questionnaire.title}". Please take a moment to fill it out${input.dueDate ? ` by ${input.dueDate.toLocaleDateString()}` : ""}.`;

          await ctx.db.message.create({
            data: {
              conversationId: conversation.id,
              senderId: coachId,
              senderType: "COACH",
              content: messageContent,
              attachments: [{
                type: "questionnaire",
                id: input.questionnaireId,
                title: questionnaire.title,
                clientQuestionnaireId: clientQuestionnaire.id,
              }],
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
        }

        results.push(clientQuestionnaire);
      }

      return results;
    }),

  // Get sent questionnaires (for tracking)
  getSentQuestionnaires: protectedProcedure
    .input(
      z.object({
        questionnaireId: z.string().optional(),
        status: z.enum(["DRAFT", "SENT", "IN_PROGRESS", "COMPLETED"]).optional(),
      }).optional()
    )
    .query(async ({ ctx, input }) => {
      const coachId = ctx.session.user.id;

      return ctx.db.clientQuestionnaire.findMany({
        where: {
          questionnaire: {
            OR: [{ coachId }, { isSystem: true }],
          },
          client: { coachId },
          ...(input?.questionnaireId && { questionnaireId: input.questionnaireId }),
          ...(input?.status && { status: input.status }),
        },
        include: {
          client: { select: { id: true, name: true, email: true } },
          questionnaire: { select: { id: true, title: true } },
        },
        orderBy: { sentAt: "desc" },
      });
    }),

  // Get client's response to a questionnaire
  getClientResponse: protectedProcedure
    .input(z.object({ clientQuestionnaireId: z.string() }))
    .query(async ({ ctx, input }) => {
      const coachId = ctx.session.user.id;

      const clientQuestionnaire = await ctx.db.clientQuestionnaire.findFirst({
        where: {
          id: input.clientQuestionnaireId,
          client: { coachId },
        },
        include: {
          client: { select: { id: true, name: true, email: true } },
          questionnaire: true,
        },
      });

      if (!clientQuestionnaire) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Response not found" });
      }

      return clientQuestionnaire;
    }),

  // Get questionnaire statistics
  getStats: protectedProcedure.query(async ({ ctx }) => {
    const coachId = ctx.session.user.id;

    const [total, sent, inProgress, completed] = await Promise.all([
      ctx.db.questionnaire.count({
        where: { coachId },
      }),
      ctx.db.clientQuestionnaire.count({
        where: {
          client: { coachId },
          status: "SENT",
        },
      }),
      ctx.db.clientQuestionnaire.count({
        where: {
          client: { coachId },
          status: "IN_PROGRESS",
        },
      }),
      ctx.db.clientQuestionnaire.count({
        where: {
          client: { coachId },
          status: "COMPLETED",
        },
      }),
    ]);

    return { total, sent, inProgress, completed };
  }),

  // Get questionnaires for a specific client
  getClientQuestionnaires: protectedProcedure
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

      return ctx.db.clientQuestionnaire.findMany({
        where: {
          clientId: input.clientId,
        },
        include: {
          questionnaire: {
            select: {
              id: true,
              title: true,
              description: true,
              questions: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
      });
    }),

  // Get aggregate analytics for a questionnaire
  getAggregateAnalytics: protectedProcedure
    .input(z.object({ questionnaireId: z.string() }))
    .query(async ({ ctx, input }) => {
      const coachId = ctx.session.user.id;

      // Get questionnaire with all completed responses
      const questionnaire = await ctx.db.questionnaire.findFirst({
        where: {
          id: input.questionnaireId,
          OR: [{ coachId }, { isSystem: true }],
        },
      });

      if (!questionnaire) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Questionnaire not found" });
      }

      const clientQuestionnaires = await ctx.db.clientQuestionnaire.findMany({
        where: {
          questionnaireId: input.questionnaireId,
          client: { coachId },
          status: "COMPLETED",
        },
        select: {
          responses: true,
          completedAt: true,
        },
      });

      const questions = questionnaire.questions as Array<{
        id: string;
        type: string;
        question: string;
        options?: string[];
        ratingMax?: number;
      }>;

      // Aggregate responses per question
      const questionAnalytics = questions.map((question) => {
        const responses = clientQuestionnaires
          .map((cq) => (cq.responses as Record<string, unknown>)?.[question.id])
          .filter((r) => r !== undefined && r !== null && r !== "");

        const responseCount = responses.length;
        const totalResponses = clientQuestionnaires.length;

        let analytics: Record<string, unknown> = {
          questionId: question.id,
          question: question.question,
          type: question.type,
          responseCount,
          totalResponses,
          responseRate: totalResponses > 0 ? (responseCount / totalResponses) * 100 : 0,
        };

        if (question.type === "RATING_SCALE") {
          const numericResponses = responses.map((r) => Number(r)).filter((n) => !isNaN(n));
          const sum = numericResponses.reduce((a, b) => a + b, 0);
          const avg = numericResponses.length > 0 ? sum / numericResponses.length : 0;
          const distribution: Record<number, number> = {};
          for (let i = 1; i <= (question.ratingMax || 5); i++) {
            distribution[i] = numericResponses.filter((r) => r === i).length;
          }
          analytics = {
            ...analytics,
            average: Math.round(avg * 10) / 10,
            max: question.ratingMax || 5,
            distribution,
          };
        } else if (question.type === "YES_NO") {
          const yesCount = responses.filter(
            (r) => r === true || r === "yes" || r === "Yes" || r === "true"
          ).length;
          const noCount = responseCount - yesCount;
          analytics = {
            ...analytics,
            yesCount,
            noCount,
            yesPercentage: responseCount > 0 ? (yesCount / responseCount) * 100 : 0,
          };
        } else if (question.type === "SINGLE_SELECT" || question.type === "MULTI_SELECT") {
          const optionCounts: Record<string, number> = {};
          question.options?.forEach((opt) => {
            optionCounts[opt] = 0;
          });

          responses.forEach((r) => {
            if (question.type === "MULTI_SELECT" && Array.isArray(r)) {
              (r as string[]).forEach((val) => {
                optionCounts[val] = (optionCounts[val] || 0) + 1;
              });
            } else if (typeof r === "string") {
              optionCounts[r] = (optionCounts[r] || 0) + 1;
            }
          });

          analytics = {
            ...analytics,
            optionCounts,
            options: question.options,
          };
        } else if (question.type === "TEXT_SHORT" || question.type === "TEXT_LONG") {
          analytics = {
            ...analytics,
            sampleResponses: responses.slice(0, 5).map((r) => String(r)),
          };
        }

        return analytics;
      });

      return {
        questionnaireId: questionnaire.id,
        title: questionnaire.title,
        totalResponses: clientQuestionnaires.length,
        questionAnalytics,
      };
    }),
});
