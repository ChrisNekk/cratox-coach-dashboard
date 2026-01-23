import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "../init";
import { TRPCError } from "@trpc/server";

export const settingsRouter = createTRPCRouter({
  getProfile: protectedProcedure.query(async ({ ctx }) => {
    const coachId = ctx.session.user.id;

    const coach = await ctx.db.coach.findUnique({
      where: { id: coachId },
      select: {
        id: true,
        email: true,
        name: true,
        businessName: true,
        phone: true,
        timezone: true,
        logoUrl: true,
        primaryColor: true,
        accentColor: true,
        createdAt: true,
      },
    });

    if (!coach) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Coach not found" });
    }

    return coach;
  }),

  updateProfile: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1).optional(),
        businessName: z.string().optional(),
        phone: z.string().optional(),
        timezone: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const coachId = ctx.session.user.id;

      return ctx.db.coach.update({
        where: { id: coachId },
        data: input,
      });
    }),

  updateBranding: protectedProcedure
    .input(
      z.object({
        logoUrl: z.string().optional(),
        primaryColor: z.string().optional(),
        accentColor: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const coachId = ctx.session.user.id;

      return ctx.db.coach.update({
        where: { id: coachId },
        data: input,
      });
    }),

  changePassword: protectedProcedure
    .input(
      z.object({
        currentPassword: z.string().min(1),
        newPassword: z.string().min(8),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const coachId = ctx.session.user.id;

      const coach = await ctx.db.coach.findUnique({
        where: { id: coachId },
      });

      if (!coach) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Coach not found" });
      }

      // In production, you would hash and compare passwords properly
      const isValidPassword =
        coach.passwordHash === input.currentPassword ||
        coach.passwordHash === `hashed_${input.currentPassword}`;

      if (!isValidPassword) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Current password is incorrect",
        });
      }

      return ctx.db.coach.update({
        where: { id: coachId },
        data: {
          passwordHash: `hashed_${input.newPassword}`,
        },
      });
    }),

  // Get all timezones for dropdown
  getTimezones: protectedProcedure.query(async () => {
    return [
      { value: "UTC", label: "UTC" },
      { value: "America/New_York", label: "Eastern Time (ET)" },
      { value: "America/Chicago", label: "Central Time (CT)" },
      { value: "America/Denver", label: "Mountain Time (MT)" },
      { value: "America/Los_Angeles", label: "Pacific Time (PT)" },
      { value: "Europe/London", label: "London (GMT)" },
      { value: "Europe/Paris", label: "Central European Time (CET)" },
      { value: "Europe/Berlin", label: "Berlin (CET)" },
      { value: "Asia/Tokyo", label: "Japan (JST)" },
      { value: "Asia/Shanghai", label: "China (CST)" },
      { value: "Asia/Dubai", label: "Dubai (GST)" },
      { value: "Australia/Sydney", label: "Sydney (AEST)" },
    ];
  }),

  // Export all data (for GDPR compliance)
  exportData: protectedProcedure.mutation(async ({ ctx }) => {
    const coachId = ctx.session.user.id;

    const [coach, clients, teams, bookings, packages] = await Promise.all([
      ctx.db.coach.findUnique({ where: { id: coachId } }),
      ctx.db.client.findMany({
        where: { coachId },
        include: {
          dailyLogs: true,
          weightLogs: true,
          exercises: true,
        },
      }),
      ctx.db.team.findMany({ where: { coachId } }),
      ctx.db.booking.findMany({ where: { coachId } }),
      ctx.db.package.findMany({ where: { coachId } }),
    ]);

    return {
      exportedAt: new Date().toISOString(),
      coach: {
        ...coach,
        passwordHash: "[REDACTED]",
      },
      clients,
      teams,
      bookings,
      packages,
    };
  }),

  // Delete account (soft delete for now)
  deleteAccount: protectedProcedure
    .input(z.object({ confirmEmail: z.string().email() }))
    .mutation(async ({ ctx, input }) => {
      const coachId = ctx.session.user.id;

      const coach = await ctx.db.coach.findUnique({
        where: { id: coachId },
      });

      if (!coach || coach.email !== input.confirmEmail) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Email confirmation does not match",
        });
      }

      // Soft delete - mark as inactive
      return ctx.db.coach.update({
        where: { id: coachId },
        data: { isActive: false },
      });
    }),
});
