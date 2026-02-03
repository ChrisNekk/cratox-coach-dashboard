import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "../init";
import { TRPCError } from "@trpc/server";

export const reportRouter = createTRPCRouter({
  getAll: protectedProcedure.query(async ({ ctx }) => {
    const coachId = ctx.session.user.id;

    return ctx.db.report.findMany({
      where: { coachId },
      orderBy: { updatedAt: "desc" },
    });
  }),

  getById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const coachId = ctx.session.user.id;

      const report = await ctx.db.report.findFirst({
        where: { id: input.id, coachId },
      });

      if (!report) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Report not found" });
      }

      return report;
    }),

  create: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1),
        type: z.enum(["CLIENT_PROGRESS", "LICENSE_UTILIZATION", "REVENUE", "TEAM_PERFORMANCE", "CUSTOM"]),
        filters: z.any().optional(),
        columns: z.array(z.string()).optional(),
        scheduleFrequency: z.enum(["DAILY", "WEEKLY", "MONTHLY", "NONE"]).default("NONE"),
        scheduleDay: z.number().optional().nullable(),
        scheduleTime: z.string().optional().nullable(),
        emailDelivery: z.boolean().default(false),
        deliveryEmail: z.string().email().optional().nullable(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const coachId = ctx.session.user.id;

      return ctx.db.report.create({
        data: {
          ...input,
          coachId,
          columns: input.columns ? input.columns : undefined,
        },
      });
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        name: z.string().min(1).optional(),
        filters: z.any().optional(),
        columns: z.array(z.string()).optional(),
        scheduleFrequency: z.enum(["DAILY", "WEEKLY", "MONTHLY", "NONE"]).optional(),
        scheduleDay: z.number().optional().nullable(),
        scheduleTime: z.string().optional().nullable(),
        emailDelivery: z.boolean().optional(),
        deliveryEmail: z.string().email().optional().nullable(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const coachId = ctx.session.user.id;
      const { id, ...data } = input;

      const report = await ctx.db.report.findFirst({
        where: { id, coachId },
      });

      if (!report) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Report not found" });
      }

      return ctx.db.report.update({
        where: { id },
        data: {
          ...data,
          columns: data.columns ? data.columns : undefined,
        },
      });
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const coachId = ctx.session.user.id;

      const report = await ctx.db.report.findFirst({
        where: { id: input.id, coachId },
      });

      if (!report) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Report not found" });
      }

      return ctx.db.report.delete({ where: { id: input.id } });
    }),

  generate: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const coachId = ctx.session.user.id;

      const report = await ctx.db.report.findFirst({
        where: { id: input.id, coachId },
      });

      if (!report) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Report not found" });
      }

      // Generate report data based on type
      let data;
      const filters = report.filters as { startDate?: string; endDate?: string; clientIds?: string[]; teamIds?: string[] } | null;

      switch (report.type) {
        case "CLIENT_PROGRESS":
          data = await generateClientProgressReport(ctx, coachId, filters);
          break;
        case "LICENSE_UTILIZATION":
          data = await generateLicenseReport(ctx, coachId);
          break;
        case "REVENUE":
          data = await generateRevenueReport(ctx, coachId, filters);
          break;
        case "TEAM_PERFORMANCE":
          data = await generateTeamReport(ctx, coachId);
          break;
        default:
          data = await generateCustomReport(ctx, coachId, filters);
      }

      // Update last generated time
      await ctx.db.report.update({
        where: { id: input.id },
        data: { lastGeneratedAt: new Date() },
      });

      return data;
    }),

  // Get available report templates
  getTemplates: protectedProcedure.query(async () => {
    return [
      {
        id: "client-progress",
        name: "Client Progress Summary",
        type: "CLIENT_PROGRESS",
        description: "Overview of client weight loss/gain progress, goal completion rates",
        defaultColumns: ["name", "startWeight", "currentWeight", "targetWeight", "progress", "lastActivity"],
      },
      {
        id: "license-utilization",
        name: "License Utilization",
        type: "LICENSE_UTILIZATION",
        description: "Status of all licenses, active vs pending, expiring soon",
        defaultColumns: ["clientName", "status", "activatedAt", "expiresAt", "daysRemaining"],
      },
      {
        id: "revenue",
        name: "Revenue Report",
        type: "REVENUE",
        description: "Booking revenue, package sales, payment status",
        defaultColumns: ["date", "client", "type", "amount", "status"],
      },
      {
        id: "team-performance",
        name: "Team Performance",
        type: "TEAM_PERFORMANCE",
        description: "Compare progress across teams",
        defaultColumns: ["team", "members", "avgProgress", "activeRate", "goalCompletion"],
      },
    ];
  }),

  // Generate a custom report with filters and save to history
  generateCustom: protectedProcedure
    .input(
      z.object({
        type: z.enum(["CLIENT_PROGRESS", "LICENSE_UTILIZATION", "REVENUE", "TEAM_PERFORMANCE", "CUSTOM"]),
        name: z.string().optional(),
        filters: z.object({
          startDate: z.string().optional(),
          endDate: z.string().optional(),
          clientIds: z.array(z.string()).optional(),
          teamIds: z.array(z.string()).optional(),
        }).optional(),
        saveToHistory: z.boolean().default(true),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const coachId = ctx.session.user.id;
      const filters = input.filters || null;

      let data;
      switch (input.type) {
        case "CLIENT_PROGRESS":
          data = await generateClientProgressReport(ctx, coachId, filters);
          break;
        case "LICENSE_UTILIZATION":
          data = await generateLicenseReport(ctx, coachId);
          break;
        case "REVENUE":
          data = await generateRevenueReport(ctx, coachId, filters);
          break;
        case "TEAM_PERFORMANCE":
          data = await generateTeamReport(ctx, coachId);
          break;
        default:
          data = await generateCustomReport(ctx, coachId, filters);
      }

      // Calculate record count
      let recordCount = 0;
      if (Array.isArray(data)) {
        recordCount = data.length;
      } else if (data && typeof data === "object" && "bookings" in data) {
        recordCount = (data as { bookings: unknown[] }).bookings.length;
      }

      // Generate default name based on type and date
      const typeLabels: Record<string, string> = {
        CLIENT_PROGRESS: "Client Progress",
        LICENSE_UTILIZATION: "License Utilization",
        REVENUE: "Revenue",
        TEAM_PERFORMANCE: "Team Performance",
        CUSTOM: "Custom Report",
      };
      const defaultName = input.name || `${typeLabels[input.type]} - ${new Date().toLocaleDateString()}`;

      // Save to history if requested
      let savedReport = null;
      if (input.saveToHistory) {
        savedReport = await ctx.db.generatedReport.create({
          data: {
            coachId,
            name: defaultName,
            type: input.type,
            filters: input.filters || undefined,
            data: data as object,
            recordCount,
          },
        });
      }

      return {
        id: savedReport?.id,
        type: input.type,
        name: defaultName,
        generatedAt: new Date().toISOString(),
        filters: input.filters,
        recordCount,
        data,
      };
    }),

  // Get report history
  getHistory: protectedProcedure
    .input(
      z.object({
        type: z.enum(["CLIENT_PROGRESS", "LICENSE_UTILIZATION", "REVENUE", "TEAM_PERFORMANCE", "CUSTOM"]).optional(),
        limit: z.number().min(1).max(100).default(50),
        cursor: z.string().optional(),
      }).optional()
    )
    .query(async ({ ctx, input }) => {
      const coachId = ctx.session.user.id;

      const reports = await ctx.db.generatedReport.findMany({
        where: {
          coachId,
          ...(input?.type && { type: input.type }),
        },
        orderBy: { generatedAt: "desc" },
        take: (input?.limit || 50) + 1,
        ...(input?.cursor && { cursor: { id: input.cursor }, skip: 1 }),
        select: {
          id: true,
          name: true,
          type: true,
          filters: true,
          recordCount: true,
          generatedAt: true,
        },
      });

      let nextCursor: string | undefined = undefined;
      if (reports.length > (input?.limit || 50)) {
        const nextItem = reports.pop();
        nextCursor = nextItem?.id;
      }

      return {
        reports,
        nextCursor,
      };
    }),

  // Get a specific generated report by ID
  getGeneratedReport: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const coachId = ctx.session.user.id;

      const report = await ctx.db.generatedReport.findFirst({
        where: { id: input.id, coachId },
      });

      if (!report) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Report not found" });
      }

      return report;
    }),

  // Delete a generated report from history
  deleteGeneratedReport: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const coachId = ctx.session.user.id;

      const report = await ctx.db.generatedReport.findFirst({
        where: { id: input.id, coachId },
      });

      if (!report) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Report not found" });
      }

      await ctx.db.generatedReport.delete({ where: { id: input.id } });

      return { success: true };
    }),

  // Get clients for filter dropdown
  getFilterOptions: protectedProcedure.query(async ({ ctx }) => {
    const coachId = ctx.session.user.id;

    const [clients, teams] = await Promise.all([
      ctx.db.client.findMany({
        where: { coachId },
        select: { id: true, name: true, email: true },
        orderBy: { name: "asc" },
      }),
      ctx.db.team.findMany({
        where: { coachId },
        select: { id: true, name: true, color: true },
        orderBy: { name: "asc" },
      }),
    ]);

    return { clients, teams };
  }),
});

// Helper functions for report generation
async function generateClientProgressReport(
  ctx: { db: typeof import("@/server/db").db },
  coachId: string,
  filters: { startDate?: string; endDate?: string; clientIds?: string[] } | null
) {
  const clients = await ctx.db.client.findMany({
    where: {
      coachId,
      ...(filters?.clientIds && { id: { in: filters.clientIds } }),
    },
    include: {
      weightLogs: {
        orderBy: { date: "desc" },
        take: 1,
      },
      team: { select: { name: true } },
    },
  });

  return clients.map((client) => ({
    id: client.id,
    name: client.name,
    email: client.email,
    team: client.team?.name || "Unassigned",
    goalType: client.goalType,
    startWeight: client.startWeight,
    currentWeight: client.currentWeight,
    targetWeight: client.targetWeight,
    progress: client.startWeight && client.currentWeight && client.targetWeight
      ? Math.round(
          ((client.startWeight - client.currentWeight) /
            (client.startWeight - client.targetWeight)) *
            100
        )
      : null,
    lastActivity: client.lastActivityAt,
    lastWeighIn: client.weightLogs[0]?.date || null,
  }));
}

async function generateLicenseReport(
  ctx: { db: typeof import("@/server/db").db },
  coachId: string
) {
  const licenses = await ctx.db.clientLicense.findMany({
    where: { coachId },
    include: {
      client: { select: { name: true, email: true } },
    },
  });

  return licenses.map((license) => ({
    id: license.id,
    clientName: license.client?.name || license.invitedName || "Pending",
    clientEmail: license.client?.email || license.invitedEmail,
    status: license.status,
    activatedAt: license.activatedAt,
    expiresAt: license.expiresAt,
    daysRemaining: license.expiresAt
      ? Math.ceil((license.expiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
      : null,
  }));
}

async function generateRevenueReport(
  ctx: { db: typeof import("@/server/db").db },
  coachId: string,
  filters: { startDate?: string; endDate?: string } | null
) {
  const bookings = await ctx.db.booking.findMany({
    where: {
      coachId,
      price: { not: null },
      ...(filters?.startDate && filters?.endDate && {
        dateTime: {
          gte: new Date(filters.startDate),
          lte: new Date(filters.endDate),
        },
      }),
    },
    include: {
      client: { select: { name: true } },
      package: { select: { name: true } },
    },
    orderBy: { dateTime: "desc" },
  });

  const totalRevenue = bookings
    .filter((b) => b.paymentStatus === "PAID")
    .reduce((sum, b) => sum + (b.price || 0), 0);

  return {
    bookings: bookings.map((booking) => ({
      id: booking.id,
      date: booking.dateTime,
      client: booking.client.name,
      type: booking.type,
      package: booking.package?.name,
      amount: booking.price,
      status: booking.paymentStatus,
    })),
    summary: {
      totalRevenue,
      totalBookings: bookings.length,
      paidBookings: bookings.filter((b) => b.paymentStatus === "PAID").length,
      pendingPayments: bookings.filter((b) => b.paymentStatus === "PENDING").length,
    },
  };
}

async function generateTeamReport(
  ctx: { db: typeof import("@/server/db").db },
  coachId: string
) {
  const teams = await ctx.db.team.findMany({
    where: { coachId },
    include: {
      clients: {
        select: {
          id: true,
          startWeight: true,
          currentWeight: true,
          targetWeight: true,
          lastActivityAt: true,
        },
      },
    },
  });

  return teams.map((team) => {
    const members = team.clients.length;
    const activeMembers = team.clients.filter(
      (c) => c.lastActivityAt && c.lastActivityAt > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    ).length;
    
    const progressValues = team.clients
      .filter((c) => c.startWeight && c.currentWeight && c.targetWeight)
      .map((c) =>
        ((c.startWeight! - c.currentWeight!) / (c.startWeight! - c.targetWeight!)) * 100
      );
    
    const avgProgress = progressValues.length
      ? Math.round(progressValues.reduce((a, b) => a + b, 0) / progressValues.length)
      : null;

    return {
      id: team.id,
      name: team.name,
      color: team.color,
      members,
      activeMembers,
      activeRate: members ? Math.round((activeMembers / members) * 100) : 0,
      avgProgress,
    };
  });
}

async function generateCustomReport(
  ctx: { db: typeof import("@/server/db").db },
  coachId: string,
  filters: { startDate?: string; endDate?: string; clientIds?: string[]; teamIds?: string[] } | null
) {
  // Generic report that can be customized
  const clients = await ctx.db.client.findMany({
    where: {
      coachId,
      ...(filters?.clientIds && { id: { in: filters.clientIds } }),
      ...(filters?.teamIds && { teamId: { in: filters.teamIds } }),
    },
    include: {
      team: { select: { name: true } },
      dailyLogs: {
        orderBy: { date: "desc" },
        take: 7,
      },
    },
  });

  return clients.map((client) => ({
    id: client.id,
    name: client.name,
    email: client.email,
    team: client.team?.name,
    goalType: client.goalType,
    currentWeight: client.currentWeight,
    targetCalories: client.targetCalories,
    recentLogs: client.dailyLogs.length,
    avgCalories: client.dailyLogs.length
      ? Math.round(
          client.dailyLogs.reduce((sum, log) => sum + (log.totalCalories || 0), 0) /
            client.dailyLogs.length
        )
      : null,
  }));
}
