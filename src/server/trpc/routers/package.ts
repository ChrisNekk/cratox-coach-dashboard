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
});
