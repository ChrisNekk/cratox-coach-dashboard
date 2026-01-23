import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "../init";
import { TRPCError } from "@trpc/server";

export const teamRouter = createTRPCRouter({
  getAll: protectedProcedure.query(async ({ ctx }) => {
    const coachId = ctx.session.user.id;

    return ctx.db.team.findMany({
      where: { coachId },
      include: {
        _count: { select: { clients: true } },
      },
      orderBy: { name: "asc" },
    });
  }),

  getById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const coachId = ctx.session.user.id;

      const team = await ctx.db.team.findFirst({
        where: { id: input.id, coachId },
        include: {
          clients: {
            select: {
              id: true,
              name: true,
              email: true,
              goalType: true,
              lastActivityAt: true,
            },
          },
        },
      });

      if (!team) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Team not found" });
      }

      return team;
    }),

  create: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1),
        description: z.string().optional(),
        color: z.string().default("#6366f1"),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const coachId = ctx.session.user.id;

      const existing = await ctx.db.team.findFirst({
        where: { coachId, name: input.name },
      });

      if (existing) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "A team with this name already exists",
        });
      }

      return ctx.db.team.create({
        data: {
          ...input,
          coachId,
        },
      });
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        name: z.string().min(1).optional(),
        description: z.string().optional(),
        color: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const coachId = ctx.session.user.id;
      const { id, ...data } = input;

      const team = await ctx.db.team.findFirst({
        where: { id, coachId },
      });

      if (!team) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Team not found" });
      }

      return ctx.db.team.update({
        where: { id },
        data,
      });
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const coachId = ctx.session.user.id;

      const team = await ctx.db.team.findFirst({
        where: { id: input.id, coachId },
      });

      if (!team) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Team not found" });
      }

      // Remove clients from team first
      await ctx.db.client.updateMany({
        where: { teamId: input.id },
        data: { teamId: null },
      });

      return ctx.db.team.delete({ where: { id: input.id } });
    }),

  addClients: protectedProcedure
    .input(
      z.object({
        teamId: z.string(),
        clientIds: z.array(z.string()),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const coachId = ctx.session.user.id;

      const team = await ctx.db.team.findFirst({
        where: { id: input.teamId, coachId },
      });

      if (!team) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Team not found" });
      }

      return ctx.db.client.updateMany({
        where: {
          id: { in: input.clientIds },
          coachId,
        },
        data: { teamId: input.teamId },
      });
    }),

  removeClients: protectedProcedure
    .input(
      z.object({
        teamId: z.string(),
        clientIds: z.array(z.string()),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const coachId = ctx.session.user.id;

      const team = await ctx.db.team.findFirst({
        where: { id: input.teamId, coachId },
      });

      if (!team) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Team not found" });
      }

      return ctx.db.client.updateMany({
        where: {
          id: { in: input.clientIds },
          coachId,
          teamId: input.teamId,
        },
        data: { teamId: null },
      });
    }),
});
