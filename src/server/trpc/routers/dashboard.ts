import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "../init";
import { startOfDay, endOfDay, subDays, addDays, format } from "date-fns";

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
      if (!license.expiresAt) continue;
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

  // Get weekly goals summary for all clients (for dashboard grid)
  getWeeklyGoalsSummary: protectedProcedure
    .input(
      z.object({
        weekOffset: z.number().default(0), // 0 = current week, -1 = last week, etc.
      }).optional()
    )
    .query(async ({ ctx, input }) => {
    const coachId = ctx.session.user.id;
    const weekOffset = input?.weekOffset ?? 0;

    // Calculate the start of the week based on offset
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const weekStart = subDays(today, 6 + (weekOffset * -7)); // Go back based on offset

    const clients = await ctx.db.client.findMany({
      where: { coachId, isActive: true },
      select: {
        id: true,
        name: true,
        targetCalories: true,
        proteinTarget: true,
        carbsTarget: true,
        fatsTarget: true,
        exerciseMinutesGoal: true,
        waterIntakeGoal: true,
        stepsGoal: true,
        dailyLogs: {
          where: { date: { gte: weekStart } },
          select: {
            date: true,
            totalCalories: true,
            totalProtein: true,
            totalCarbs: true,
            totalFats: true,
            exerciseMinutes: true,
            waterIntake: true,
            steps: true,
          },
        },
      },
      orderBy: { name: "asc" },
    });

    // Generate 7 days starting from weekStart
    const days: { date: Date; dayName: string; dateStr: string }[] = [];
    for (let i = 0; i < 7; i++) {
      const date = addDays(weekStart, i);
      days.push({
        date,
        dayName: format(date, "EEE"),
        dateStr: format(date, "yyyy-MM-dd"),
      });
    }

    // Calculate week range for display
    const weekRangeStart = format(weekStart, "MMM d");
    const weekRangeEnd = format(addDays(weekStart, 6), "MMM d, yyyy");

    // Process each client
    const clientsWithGoals = clients.map((client) => {
      const { dailyLogs, targetCalories, proteinTarget, carbsTarget, fatsTarget, exerciseMinutesGoal, ...rest } = client;

      // Map logs by date
      const logsByDate = new Map(
        dailyLogs.map((log) => [format(new Date(log.date), "yyyy-MM-dd"), log])
      );

      // Calculate goals for each day
      const weeklyGoals = days.map((day) => {
        const log = logsByDate.get(day.dateStr);

        if (!log) {
          return {
            date: day.dateStr,
            dayName: day.dayName,
            hasData: false,
            isHit: false,
            goals: null,
          };
        }

        // Calculate goal hits
        const goals: {
          calories?: { current: number; target: number; hit: boolean; percent: number };
          protein?: { current: number; target: number; hit: boolean; percent: number };
          carbs?: { current: number; target: number; hit: boolean; percent: number };
          fats?: { current: number; target: number; hit: boolean; percent: number };
          exercise?: { current: number; target: number; hit: boolean; percent: number };
        } = {};

        let goalsTracked = 0;
        let goalsMet = 0;

        // Calories (within ±10%)
        if (targetCalories && log.totalCalories !== null) {
          const percent = Math.round((log.totalCalories / targetCalories) * 100);
          const hit = percent >= 90 && percent <= 110;
          goals.calories = { current: log.totalCalories, target: targetCalories, hit, percent };
          goalsTracked++;
          if (hit) goalsMet++;
        }

        // Protein (at least 90%)
        if (proteinTarget && log.totalProtein !== null) {
          const percent = Math.round((log.totalProtein / proteinTarget) * 100);
          const hit = percent >= 90;
          goals.protein = { current: log.totalProtein, target: proteinTarget, hit, percent };
          goalsTracked++;
          if (hit) goalsMet++;
        }

        // Carbs (within ±10%)
        if (carbsTarget && log.totalCarbs !== null) {
          const percent = Math.round((log.totalCarbs / carbsTarget) * 100);
          const hit = percent >= 90 && percent <= 110;
          goals.carbs = { current: log.totalCarbs, target: carbsTarget, hit, percent };
          goalsTracked++;
          if (hit) goalsMet++;
        }

        // Fats (within ±10%)
        if (fatsTarget && log.totalFats !== null) {
          const percent = Math.round((log.totalFats / fatsTarget) * 100);
          const hit = percent >= 90 && percent <= 110;
          goals.fats = { current: log.totalFats, target: fatsTarget, hit, percent };
          goalsTracked++;
          if (hit) goalsMet++;
        }

        // Exercise (at least 90%)
        if (exerciseMinutesGoal && log.exerciseMinutes !== null) {
          const percent = Math.round((log.exerciseMinutes / exerciseMinutesGoal) * 100);
          const hit = percent >= 90;
          goals.exercise = { current: log.exerciseMinutes, target: exerciseMinutesGoal, hit, percent };
          goalsTracked++;
          if (hit) goalsMet++;
        }

        // Day is "hit" if 80%+ of tracked goals are met
        const isHit = goalsTracked > 0 && goalsMet / goalsTracked >= 0.8;

        return {
          date: day.dateStr,
          dayName: day.dayName,
          hasData: true,
          isHit,
          goals,
        };
      });

      const daysHit = weeklyGoals.filter((d) => d.isHit).length;
      const daysWithData = weeklyGoals.filter((d) => d.hasData).length;

      return {
        ...rest,
        weeklyGoals,
        daysHit,
        daysWithData,
      };
    });

    return {
      clients: clientsWithGoals,
      days: days.map((d) => ({ dayName: d.dayName, dateStr: d.dateStr })),
      weekRange: `${weekRangeStart} - ${weekRangeEnd}`,
      weekOffset: weekOffset,
    };
  }),
});
