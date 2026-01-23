import { createTRPCRouter, protectedProcedure } from "../init";
import { startOfDay, subDays } from "date-fns";

export const dashboardRouter = createTRPCRouter({
  getStats: protectedProcedure.query(async ({ ctx }) => {
    const coachId = ctx.session.user.id;
    
    const [
      totalClients,
      activeClients,
      activeLicenses,
      pendingLicenses,
      upcomingBookings,
      unreadMessages,
    ] = await Promise.all([
      ctx.db.client.count({ where: { coachId } }),
      ctx.db.client.count({ 
        where: { 
          coachId,
          lastActivityAt: { gte: subDays(new Date(), 7) }
        } 
      }),
      ctx.db.clientLicense.count({ 
        where: { coachId, status: "ACTIVE" } 
      }),
      ctx.db.clientLicense.count({ 
        where: { coachId, status: "PENDING" } 
      }),
      ctx.db.booking.count({
        where: {
          coachId,
          dateTime: { gte: new Date() },
          status: "SCHEDULED",
        },
      }),
      ctx.db.conversation.aggregate({
        where: { coachId },
        _sum: { unreadByCoach: true },
      }),
    ]);

    return {
      totalClients,
      activeClients,
      activeLicenses,
      pendingLicenses,
      upcomingBookings,
      unreadMessages: unreadMessages._sum.unreadByCoach || 0,
    };
  }),

  getRecentActivity: protectedProcedure.query(async ({ ctx }) => {
    const coachId = ctx.session.user.id;

    const [recentClients, recentBookings, recentNotifications] = await Promise.all([
      ctx.db.client.findMany({
        where: { coachId },
        orderBy: { createdAt: "desc" },
        take: 5,
        select: {
          id: true,
          name: true,
          email: true,
          createdAt: true,
          goalType: true,
        },
      }),
      ctx.db.booking.findMany({
        where: { coachId },
        orderBy: { dateTime: "asc" },
        take: 5,
        include: {
          client: { select: { id: true, name: true } },
        },
      }),
      ctx.db.notification.findMany({
        where: { coachId },
        orderBy: { createdAt: "desc" },
        take: 5,
        include: {
          client: { select: { id: true, name: true } },
        },
      }),
    ]);

    return {
      recentClients,
      recentBookings,
      recentNotifications,
    };
  }),

  getClientProgressOverview: protectedProcedure.query(async ({ ctx }) => {
    const coachId = ctx.session.user.id;
    const thirtyDaysAgo = subDays(new Date(), 30);

    const clientsWithProgress = await ctx.db.client.findMany({
      where: { coachId },
      select: {
        id: true,
        name: true,
        goalType: true,
        startWeight: true,
        currentWeight: true,
        targetWeight: true,
        lastActivityAt: true,
        dailyLogs: {
          where: { date: { gte: thirtyDaysAgo } },
          orderBy: { date: "desc" },
          take: 7,
          select: {
            date: true,
            totalCalories: true,
            totalProtein: true,
          },
        },
      },
      take: 10,
    });

    return clientsWithProgress.map((client) => ({
      ...client,
      progressPercentage: client.startWeight && client.targetWeight && client.currentWeight
        ? Math.round(
            ((client.startWeight - client.currentWeight) /
              (client.startWeight - client.targetWeight)) *
              100
          )
        : null,
    }));
  }),
});
