import { createTRPCRouter, protectedProcedure } from "../init";
import { startOfDay, endOfDay, subDays, addDays } from "date-fns";

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

  // Get notifications for the coach's notification bell
  getCoachNotifications: protectedProcedure.query(async ({ ctx }) => {
    const coachId = ctx.session.user.id;
    const now = new Date();
    const today = startOfDay(now);
    const tomorrow = endOfDay(now);
    const sevenDaysFromNow = addDays(now, 7);
    const threeDaysAgo = subDays(now, 3);

    type NotificationItem = {
      id: string;
      type: "message" | "booking" | "license" | "new_client";
      title: string;
      description: string;
      link: string;
      createdAt: Date;
      read: boolean;
    };

    const notifications: NotificationItem[] = [];

    // 1. Unread messages
    const conversationsWithUnread = await ctx.db.conversation.findMany({
      where: { coachId, unreadByCoach: { gt: 0 } },
      include: {
        client: { select: { id: true, name: true } },
        messages: {
          where: { senderType: "CLIENT", readAt: null },
          orderBy: { createdAt: "desc" },
          take: 1,
        },
      },
      orderBy: { lastMessageAt: "desc" },
      take: 5,
    });

    for (const conv of conversationsWithUnread) {
      notifications.push({
        id: `msg-${conv.id}`,
        type: "message",
        title: `New message from ${conv.client.name}`,
        description: conv.messages[0]?.content?.slice(0, 50) + (conv.messages[0]?.content && conv.messages[0].content.length > 50 ? "..." : "") || "New message",
        link: `/messages`,
        createdAt: conv.lastMessageAt || conv.updatedAt,
        read: false,
      });
    }

    // 2. Today's bookings
    const todaysBookings = await ctx.db.booking.findMany({
      where: {
        coachId,
        dateTime: { gte: today, lte: tomorrow },
        status: "SCHEDULED",
      },
      include: {
        client: { select: { id: true, name: true } },
      },
      orderBy: { dateTime: "asc" },
      take: 3,
    });

    for (const booking of todaysBookings) {
      notifications.push({
        id: `booking-${booking.id}`,
        type: "booking",
        title: `Session with ${booking.client.name}`,
        description: `Today at ${booking.dateTime.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`,
        link: `/bookings`,
        createdAt: booking.createdAt,
        read: true, // Bookings are informational
      });
    }

    // 3. Licenses expiring soon (within 7 days)
    const expiringLicenses = await ctx.db.clientLicense.findMany({
      where: {
        coachId,
        status: "ACTIVE",
        expiresAt: { gte: now, lte: sevenDaysFromNow },
      },
      include: {
        client: { select: { id: true, name: true } },
      },
      orderBy: { expiresAt: "asc" },
      take: 3,
    });

    for (const license of expiringLicenses) {
      if (!license.client) continue;
      const daysLeft = Math.ceil((license.expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      notifications.push({
        id: `license-${license.id}`,
        type: "license",
        title: `License expiring soon`,
        description: `${license.client.name}'s license expires in ${daysLeft} day${daysLeft === 1 ? "" : "s"}`,
        link: `/clients`,
        createdAt: license.expiresAt,
        read: false,
      });
    }

    // 4. New clients (joined in last 3 days)
    const newClients = await ctx.db.client.findMany({
      where: {
        coachId,
        createdAt: { gte: threeDaysAgo },
      },
      orderBy: { createdAt: "desc" },
      take: 3,
    });

    for (const client of newClients) {
      notifications.push({
        id: `client-${client.id}`,
        type: "new_client",
        title: `New client joined`,
        description: `${client.name} is now your client`,
        link: `/clients/${client.id}`,
        createdAt: client.createdAt,
        read: true, // Informational
      });
    }

    // Sort by createdAt descending and limit
    notifications.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    const unreadCount = notifications.filter((n) => !n.read).length;

    return {
      notifications: notifications.slice(0, 10),
      unreadCount,
    };
  }),
});
