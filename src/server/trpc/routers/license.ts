import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "../init";
import { TRPCError } from "@trpc/server";
import { addMonths } from "date-fns";

export const licenseRouter = createTRPCRouter({
  getAll: protectedProcedure
    .input(
      z.object({
        status: z.enum(["PENDING", "ACTIVE", "EXPIRED", "REVOKED"]).optional(),
      }).optional()
    )
    .query(async ({ ctx, input }) => {
      const coachId = ctx.session.user.id;

      return ctx.db.clientLicense.findMany({
        where: {
          coachId,
          ...(input?.status && { status: input.status }),
        },
        include: {
          client: { select: { id: true, name: true, email: true } },
        },
        orderBy: { createdAt: "desc" },
      });
    }),

  getById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const coachId = ctx.session.user.id;

      const license = await ctx.db.clientLicense.findFirst({
        where: { id: input.id, coachId },
        include: {
          client: true,
        },
      });

      if (!license) {
        throw new TRPCError({ code: "NOT_FOUND", message: "License not found" });
      }

      return license;
    }),

  create: protectedProcedure
    .input(
      z.object({
        invitedEmail: z.string().email(),
        invitedName: z.string().min(1),
        sendEmail: z.boolean().default(true),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const coachId = ctx.session.user.id;

      // Check if there's already a pending license for this email
      const existing = await ctx.db.clientLicense.findFirst({
        where: {
          coachId,
          invitedEmail: input.invitedEmail,
          status: { in: ["PENDING", "ACTIVE"] },
        },
      });

      if (existing) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "A license for this email already exists",
        });
      }

      const license = await ctx.db.clientLicense.create({
        data: {
          coachId,
          invitedEmail: input.invitedEmail,
          invitedName: input.invitedName,
          status: "PENDING",
          inviteLink: `https://app.cratox.ai/invite/${Math.random().toString(36).substring(7)}`,
          inviteSentAt: input.sendEmail ? new Date() : null,
        },
      });

      // In production, you would send an email here
      // For now, we just mark it as sent

      return license;
    }),

  activate: protectedProcedure
    .input(z.object({ id: z.string(), clientId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const coachId = ctx.session.user.id;

      const license = await ctx.db.clientLicense.findFirst({
        where: { id: input.id, coachId, status: "PENDING" },
      });

      if (!license) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "License not found or already activated",
        });
      }

      const now = new Date();
      return ctx.db.clientLicense.update({
        where: { id: input.id },
        data: {
          status: "ACTIVE",
          clientId: input.clientId,
          activatedAt: now,
          expiresAt: addMonths(now, 12), // 12 months access
        },
      });
    }),

  revoke: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const coachId = ctx.session.user.id;

      const license = await ctx.db.clientLicense.findFirst({
        where: { id: input.id, coachId },
      });

      if (!license) {
        throw new TRPCError({ code: "NOT_FOUND", message: "License not found" });
      }

      return ctx.db.clientLicense.update({
        where: { id: input.id },
        data: {
          status: "REVOKED",
          revokedAt: new Date(),
        },
      });
    }),

  resendInvite: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const coachId = ctx.session.user.id;

      const license = await ctx.db.clientLicense.findFirst({
        where: { id: input.id, coachId, status: "PENDING" },
      });

      if (!license) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "License not found or already activated",
        });
      }

      // In production, you would resend the email here
      return ctx.db.clientLicense.update({
        where: { id: input.id },
        data: {
          inviteSentAt: new Date(),
        },
      });
    }),

  getStats: protectedProcedure.query(async ({ ctx }) => {
    const coachId = ctx.session.user.id;

    const [total, pending, active, expired, revoked] = await Promise.all([
      ctx.db.clientLicense.count({ where: { coachId } }),
      ctx.db.clientLicense.count({ where: { coachId, status: "PENDING" } }),
      ctx.db.clientLicense.count({ where: { coachId, status: "ACTIVE" } }),
      ctx.db.clientLicense.count({ where: { coachId, status: "EXPIRED" } }),
      ctx.db.clientLicense.count({ where: { coachId, status: "REVOKED" } }),
    ]);

    return { total, pending, active, expired, revoked };
  }),
});
