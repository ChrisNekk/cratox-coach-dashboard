import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "../init";
import { TRPCError } from "@trpc/server";

export const notificationRouter = createTRPCRouter({
  getAll: protectedProcedure
    .input(
      z.object({
        clientId: z.string().optional(),
        type: z.enum([
          "INACTIVITY",
          "LICENSE_EXPIRING",
          "GOAL_ACHIEVED",
          "MISSED_TARGET",
          "CUSTOM",
          "WELCOME",
          "BOOKING_REMINDER",
          "KUDOS",
        ]).optional(),
        limit: z.number().default(50),
      }).optional()
    )
    .query(async ({ ctx, input }) => {
      const coachId = ctx.session.user.id;

      return ctx.db.notification.findMany({
        where: {
          coachId,
          ...(input?.clientId && { clientId: input.clientId }),
          ...(input?.type && { type: input.type }),
        },
        include: {
          client: { select: { id: true, name: true, email: true } },
        },
        orderBy: { createdAt: "desc" },
        take: input?.limit || 50,
      });
    }),

  send: protectedProcedure
    .input(
      z.object({
        clientIds: z.array(z.string()),
        type: z.enum([
          "INACTIVITY",
          "LICENSE_EXPIRING",
          "GOAL_ACHIEVED",
          "MISSED_TARGET",
          "CUSTOM",
          "WELCOME",
          "BOOKING_REMINDER",
          "KUDOS",
        ]).default("CUSTOM"),
        channel: z.enum(["EMAIL", "IN_APP", "BOTH"]).default("BOTH"),
        title: z.string().min(1),
        message: z.string().min(1),
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

      // Create notifications
      const notifications = await ctx.db.notification.createMany({
        data: input.clientIds.map((clientId) => ({
          coachId,
          clientId,
          type: input.type,
          channel: input.channel,
          title: input.title,
          message: input.message,
          sentAt: new Date(),
          emailSentAt: input.channel !== "IN_APP" ? new Date() : null,
        })),
      });

      // In production, you would send actual emails here

      return { count: notifications.count };
    }),

  // NOTIFICATION RULES
  getRules: protectedProcedure.query(async ({ ctx }) => {
    const coachId = ctx.session.user.id;

    return ctx.db.notificationRule.findMany({
      where: { coachId },
      orderBy: { createdAt: "desc" },
    });
  }),

  getRuleById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const coachId = ctx.session.user.id;

      const rule = await ctx.db.notificationRule.findFirst({
        where: { id: input.id, coachId },
      });

      if (!rule) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Rule not found" });
      }

      return rule;
    }),

  createRule: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1),
        triggerType: z.enum([
          "INACTIVITY_DAYS",
          "LICENSE_EXPIRING_DAYS",
          "GOAL_ACHIEVED",
          "MISSED_TARGET_STREAK",
          "WEIGHT_MILESTONE",
          "CUSTOM_SCHEDULE",
        ]),
        conditions: z.any().optional(),
        channel: z.enum(["EMAIL", "IN_APP", "BOTH"]).default("BOTH"),
        titleTemplate: z.string().min(1),
        messageTemplate: z.string().min(1),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const coachId = ctx.session.user.id;

      return ctx.db.notificationRule.create({
        data: {
          ...input,
          coachId,
        },
      });
    }),

  updateRule: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        name: z.string().min(1).optional(),
        triggerType: z.enum([
          "INACTIVITY_DAYS",
          "LICENSE_EXPIRING_DAYS",
          "GOAL_ACHIEVED",
          "MISSED_TARGET_STREAK",
          "WEIGHT_MILESTONE",
          "CUSTOM_SCHEDULE",
        ]).optional(),
        conditions: z.any().optional(),
        channel: z.enum(["EMAIL", "IN_APP", "BOTH"]).optional(),
        titleTemplate: z.string().min(1).optional(),
        messageTemplate: z.string().min(1).optional(),
        isActive: z.boolean().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const coachId = ctx.session.user.id;
      const { id, ...data } = input;

      const rule = await ctx.db.notificationRule.findFirst({
        where: { id, coachId },
      });

      if (!rule) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Rule not found" });
      }

      return ctx.db.notificationRule.update({
        where: { id },
        data,
      });
    }),

  deleteRule: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const coachId = ctx.session.user.id;

      const rule = await ctx.db.notificationRule.findFirst({
        where: { id: input.id, coachId },
      });

      if (!rule) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Rule not found" });
      }

      return ctx.db.notificationRule.delete({ where: { id: input.id } });
    }),

  toggleRule: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const coachId = ctx.session.user.id;

      const rule = await ctx.db.notificationRule.findFirst({
        where: { id: input.id, coachId },
      });

      if (!rule) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Rule not found" });
      }

      return ctx.db.notificationRule.update({
        where: { id: input.id },
        data: { isActive: !rule.isActive },
      });
    }),
});
