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
        // Payment options
        paymentLink: z.string().optional(), // Custom payment link from coach
        paidInCash: z.boolean().default(false), // Mark as already paid (cash)
        // Notification options
        sendCalendarInvite: z.boolean().default(true),
        sendEmailConfirmation: z.boolean().default(true),
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

      // Extract options before creating booking
      const { sendCalendarInvite, sendEmailConfirmation, paidInCash, paymentLink, ...bookingData } = input;

      // Determine payment status
      const paymentStatus = paidInCash ? "PAID" : "PENDING";

      const booking = await ctx.db.booking.create({
        data: {
          ...bookingData,
          coachId,
          paymentLink: paymentLink || null,
          paymentStatus,
        },
        include: {
          client: { select: { id: true, name: true, email: true } },
        },
      });

      // In production, these would be real API calls
      // For now, we simulate the notifications being sent
      const notificationsSent: string[] = [];

      if (sendEmailConfirmation) {
        // Mock sending email confirmation
        // In production: await sendEmail({ to: client.email, template: 'booking-confirmation', ... })
        console.log(`[Mock] Sending email confirmation to ${client.email}`);
        notificationsSent.push("email");
      }

      if (sendCalendarInvite) {
        // Mock sending calendar invite
        // In production: await sendCalendarInvite({ to: client.email, event: { ... } })
        console.log(`[Mock] Sending calendar invite to ${client.email} for ${input.dateTime}`);
        notificationsSent.push("calendar");
      }

      if (paymentLink && sendEmailConfirmation) {
        // Payment link is included in the email
        console.log(`[Mock] Payment link ${paymentLink} included in email to ${client.email}`);
        notificationsSent.push("payment_link");
      }

      if (paidInCash) {
        console.log(`[Mock] Booking marked as paid (cash) for ${client.email}`);
        notificationsSent.push("paid_cash");
      }

      return {
        ...booking,
        notificationsSent,
      };
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

  // Get all payments (bookings with price set)
  getPayments: protectedProcedure
    .input(
      z.object({
        paymentStatus: z.enum(["PENDING", "PAID", "REFUNDED", "FAILED"]).optional(),
        limit: z.number().optional(),
      }).optional()
    )
    .query(async ({ ctx, input }) => {
      const coachId = ctx.session.user.id;

      const payments = await ctx.db.booking.findMany({
        where: {
          coachId,
          price: { not: null },
          ...(input?.paymentStatus && { paymentStatus: input.paymentStatus }),
        },
        include: {
          client: { select: { id: true, name: true, email: true } },
          package: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: "desc" },
        take: input?.limit,
      });

      // Calculate stats
      const stats = await ctx.db.booking.aggregate({
        where: { coachId, price: { not: null } },
        _sum: { price: true },
        _count: true,
      });

      const paidStats = await ctx.db.booking.aggregate({
        where: { coachId, price: { not: null }, paymentStatus: "PAID" },
        _sum: { price: true },
        _count: true,
      });

      const pendingStats = await ctx.db.booking.aggregate({
        where: { coachId, price: { not: null }, paymentStatus: "PENDING" },
        _sum: { price: true },
        _count: true,
      });

      return {
        payments,
        stats: {
          totalAmount: stats._sum.price || 0,
          totalCount: stats._count,
          paidAmount: paidStats._sum.price || 0,
          paidCount: paidStats._count,
          pendingAmount: pendingStats._sum.price || 0,
          pendingCount: pendingStats._count,
        },
      };
    }),

  // Record a manual payment (creates a booking record for payment tracking)
  recordManualPayment: protectedProcedure
    .input(
      z.object({
        clientId: z.string(),
        amount: z.number().positive(),
        description: z.string(),
        paymentMethod: z.enum(["CASH", "BANK_TRANSFER", "CHECK", "OTHER"]),
        paidAt: z.date().optional(),
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

      // Create a booking record for the manual payment
      // Using the current date as the "session" date since it's just a payment record
      return ctx.db.booking.create({
        data: {
          coachId,
          clientId: input.clientId,
          type: "ONE_ON_ONE", // Default type for manual payments
          dateTime: input.paidAt || new Date(),
          duration: 0, // No actual session
          title: `Manual Payment: ${input.description}`,
          notes: `Payment Method: ${input.paymentMethod}`,
          price: input.amount,
          paymentStatus: "PAID", // Manual payments are already paid
          status: "COMPLETED", // Mark as completed since it's just a payment record
          packageId: input.packageId || null,
        },
        include: {
          client: { select: { id: true, name: true, email: true } },
        },
      });
    }),

  // Update payment status
  updatePaymentStatus: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        paymentStatus: z.enum(["PENDING", "PAID", "REFUNDED", "FAILED"]),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const coachId = ctx.session.user.id;

      const booking = await ctx.db.booking.findFirst({
        where: { id: input.id, coachId },
      });

      if (!booking) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Payment not found" });
      }

      return ctx.db.booking.update({
        where: { id: input.id },
        data: { paymentStatus: input.paymentStatus },
        include: {
          client: { select: { id: true, name: true, email: true } },
        },
      });
    }),
});
