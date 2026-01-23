import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "../init";
import { TRPCError } from "@trpc/server";

export const bookingRouter = createTRPCRouter({
  getAll: protectedProcedure
    .input(
      z.object({
        status: z.enum(["SCHEDULED", "COMPLETED", "CANCELLED", "NO_SHOW"]).optional(),
        clientId: z.string().optional(),
        startDate: z.date().optional(),
        endDate: z.date().optional(),
      }).optional()
    )
    .query(async ({ ctx, input }) => {
      const coachId = ctx.session.user.id;

      return ctx.db.booking.findMany({
        where: {
          coachId,
          ...(input?.status && { status: input.status }),
          ...(input?.clientId && { clientId: input.clientId }),
          ...(input?.startDate && input?.endDate && {
            dateTime: {
              gte: input.startDate,
              lte: input.endDate,
            },
          }),
        },
        include: {
          client: { select: { id: true, name: true, email: true } },
          package: { select: { id: true, name: true } },
        },
        orderBy: { dateTime: "asc" },
      });
    }),

  getById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const coachId = ctx.session.user.id;

      const booking = await ctx.db.booking.findFirst({
        where: { id: input.id, coachId },
        include: {
          client: true,
          package: true,
        },
      });

      if (!booking) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Booking not found" });
      }

      return booking;
    }),

  create: protectedProcedure
    .input(
      z.object({
        clientId: z.string(),
        type: z.enum(["ONE_ON_ONE", "ONLINE"]),
        dateTime: z.date(),
        duration: z.number().default(60),
        title: z.string().optional(),
        description: z.string().optional(),
        meetingLink: z.string().optional(),
        location: z.string().optional(),
        price: z.number().optional(),
        packageId: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const coachId = ctx.session.user.id;

      // Verify client belongs to coach
      const client = await ctx.db.client.findFirst({
        where: { id: input.clientId, coachId },
      });

      if (!client) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Client not found" });
      }

      // Generate mock payment link if price is set
      const paymentLink = input.price
        ? `https://checkout.stripe.com/pay/${Math.random().toString(36).substring(7)}`
        : null;

      return ctx.db.booking.create({
        data: {
          ...input,
          coachId,
          paymentLink,
        },
        include: {
          client: { select: { id: true, name: true, email: true } },
        },
      });
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        dateTime: z.date().optional(),
        duration: z.number().optional(),
        status: z.enum(["SCHEDULED", "COMPLETED", "CANCELLED", "NO_SHOW"]).optional(),
        title: z.string().optional(),
        description: z.string().optional(),
        meetingLink: z.string().optional(),
        location: z.string().optional(),
        price: z.number().optional(),
        paymentStatus: z.enum(["PENDING", "PAID", "REFUNDED", "FAILED"]).optional(),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const coachId = ctx.session.user.id;
      const { id, ...data } = input;

      const booking = await ctx.db.booking.findFirst({
        where: { id, coachId },
      });

      if (!booking) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Booking not found" });
      }

      return ctx.db.booking.update({
        where: { id },
        data,
        include: {
          client: { select: { id: true, name: true, email: true } },
        },
      });
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const coachId = ctx.session.user.id;

      const booking = await ctx.db.booking.findFirst({
        where: { id: input.id, coachId },
      });

      if (!booking) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Booking not found" });
      }

      return ctx.db.booking.delete({ where: { id: input.id } });
    }),

  getUpcoming: protectedProcedure
    .input(z.object({ limit: z.number().default(10) }))
    .query(async ({ ctx, input }) => {
      const coachId = ctx.session.user.id;

      return ctx.db.booking.findMany({
        where: {
          coachId,
          dateTime: { gte: new Date() },
          status: "SCHEDULED",
        },
        include: {
          client: { select: { id: true, name: true, email: true } },
        },
        orderBy: { dateTime: "asc" },
        take: input.limit,
      });
    }),

  getStats: protectedProcedure
    .input(
      z.object({
        startDate: z.date().optional(),
        endDate: z.date().optional(),
      }).optional()
    )
    .query(async ({ ctx, input }) => {
      const coachId = ctx.session.user.id;

      const dateFilter = input?.startDate && input?.endDate
        ? { dateTime: { gte: input.startDate, lte: input.endDate } }
        : {};

      const [total, completed, cancelled, revenue] = await Promise.all([
        ctx.db.booking.count({
          where: { coachId, ...dateFilter },
        }),
        ctx.db.booking.count({
          where: { coachId, status: "COMPLETED", ...dateFilter },
        }),
        ctx.db.booking.count({
          where: { coachId, status: "CANCELLED", ...dateFilter },
        }),
        ctx.db.booking.aggregate({
          where: { coachId, paymentStatus: "PAID", ...dateFilter },
          _sum: { price: true },
        }),
      ]);

      return {
        total,
        completed,
        cancelled,
        revenue: revenue._sum.price || 0,
      };
    }),
});
