import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "../init";
import { TRPCError } from "@trpc/server";

export const packageRouter = createTRPCRouter({
  getAll: protectedProcedure
    .input(z.object({ isActive: z.boolean().optional() }).optional())
    .query(async ({ ctx, input }) => {
      const coachId = ctx.session.user.id;

      return ctx.db.package.findMany({
        where: {
          coachId,
          ...(input?.isActive !== undefined && { isActive: input.isActive }),
        },
        include: {
          _count: { select: { bookings: true } },
        },
        orderBy: { createdAt: "desc" },
      });
    }),

  getById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const coachId = ctx.session.user.id;

      const pkg = await ctx.db.package.findFirst({
        where: { id: input.id, coachId },
        include: {
          bookings: {
            include: {
              client: { select: { id: true, name: true } },
            },
          },
        },
      });

      if (!pkg) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Package not found" });
      }

      return pkg;
    }),

  create: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1),
        description: z.string().optional(),
        price: z.number().min(0),
        sessions: z.number().optional(),
        validityDays: z.number().optional(),
        features: z.array(z.string()).optional(),
        paymentLink: z.string().url().optional().or(z.literal("")),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const coachId = ctx.session.user.id;

      return ctx.db.package.create({
        data: {
          ...input,
          coachId,
          features: input.features ? input.features : undefined,
          paymentLink: input.paymentLink || null,
        },
      });
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        name: z.string().min(1).optional(),
        description: z.string().optional(),
        price: z.number().min(0).optional(),
        sessions: z.number().optional(),
        validityDays: z.number().optional(),
        features: z.array(z.string()).optional(),
        paymentLink: z.string().url().optional().or(z.literal("")),
        isActive: z.boolean().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const coachId = ctx.session.user.id;
      const { id, paymentLink, ...data } = input;

      const pkg = await ctx.db.package.findFirst({
        where: { id, coachId },
      });

      if (!pkg) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Package not found" });
      }

      return ctx.db.package.update({
        where: { id },
        data: {
          ...data,
          features: data.features ? data.features : undefined,
          ...(paymentLink !== undefined && { paymentLink: paymentLink || null }),
        },
      });
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const coachId = ctx.session.user.id;

      const pkg = await ctx.db.package.findFirst({
        where: { id: input.id, coachId },
      });

      if (!pkg) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Package not found" });
      }

      return ctx.db.package.delete({ where: { id: input.id } });
    }),

  // Client Package Assignment endpoints
  assignToClient: protectedProcedure
    .input(
      z.object({
        packageId: z.string(),
        clientId: z.string(),
        paymentStatus: z.enum(["PENDING", "PAID", "FAILED", "REFUNDED"]).optional(),
        paidAmount: z.number().optional(),
        paymentMethod: z.string().optional(),
        paymentNote: z.string().optional(),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const coachId = ctx.session.user.id;

      // Verify package belongs to coach
      const pkg = await ctx.db.package.findFirst({
        where: { id: input.packageId, coachId },
      });

      if (!pkg) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Package not found" });
      }

      // Verify client belongs to coach
      const client = await ctx.db.client.findFirst({
        where: { id: input.clientId, coachId },
      });

      if (!client) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Client not found" });
      }

      // Calculate expiry date if package has validity days
      const expiresAt = pkg.validityDays
        ? new Date(Date.now() + pkg.validityDays * 24 * 60 * 60 * 1000)
        : null;

      return ctx.db.clientPackage.create({
        data: {
          clientId: input.clientId,
          packageId: input.packageId,
          sessionsTotal: pkg.sessions,
          sessionsUsed: 0,
          expiresAt,
          paymentStatus: input.paymentStatus || "PENDING",
          paidAmount: input.paidAmount,
          paidAt: input.paymentStatus === "PAID" ? new Date() : null,
          paymentMethod: input.paymentMethod,
          paymentNote: input.paymentNote,
          notes: input.notes,
        },
        include: {
          package: true,
          client: { select: { id: true, name: true, email: true } },
        },
      });
    }),

  getClientPackages: protectedProcedure
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

      return ctx.db.clientPackage.findMany({
        where: { clientId: input.clientId },
        include: {
          package: true,
        },
        orderBy: { assignedAt: "desc" },
      });
    }),

  getAllAssignedPackages: protectedProcedure
    .query(async ({ ctx }) => {
      const coachId = ctx.session.user.id;

      return ctx.db.clientPackage.findMany({
        where: {
          client: { coachId },
        },
        include: {
          package: true,
          client: { select: { id: true, name: true, email: true } },
        },
        orderBy: { assignedAt: "desc" },
      });
    }),

  updateClientPackage: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        sessionsUsed: z.number().optional(),
        paymentStatus: z.enum(["PENDING", "PAID", "FAILED", "REFUNDED"]).optional(),
        paidAmount: z.number().optional(),
        paymentMethod: z.string().optional(),
        paymentNote: z.string().optional(),
        status: z.enum(["ACTIVE", "COMPLETED", "EXPIRED", "CANCELLED"]).optional(),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const coachId = ctx.session.user.id;
      const { id, ...data } = input;

      // Verify the client package belongs to a client of this coach
      const clientPackage = await ctx.db.clientPackage.findFirst({
        where: {
          id,
          client: { coachId },
        },
      });

      if (!clientPackage) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Client package not found" });
      }

      // If marking as paid, set paidAt
      const paidAt = data.paymentStatus === "PAID" && clientPackage.paymentStatus !== "PAID"
        ? new Date()
        : undefined;

      return ctx.db.clientPackage.update({
        where: { id },
        data: {
          ...data,
          ...(paidAt && { paidAt }),
        },
        include: {
          package: true,
          client: { select: { id: true, name: true, email: true } },
        },
      });
    }),

  unassignFromClient: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const coachId = ctx.session.user.id;

      // Verify the client package belongs to a client of this coach
      const clientPackage = await ctx.db.clientPackage.findFirst({
        where: {
          id: input.id,
          client: { coachId },
        },
      });

      if (!clientPackage) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Client package not found" });
      }

      return ctx.db.clientPackage.delete({ where: { id: input.id } });
    }),
});
