import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "../init";
import { TRPCError } from "@trpc/server";

export const messageRouter = createTRPCRouter({
  getConversations: protectedProcedure.query(async ({ ctx }) => {
    const coachId = ctx.session.user.id;

    return ctx.db.conversation.findMany({
      where: { coachId },
      include: {
        client: { select: { id: true, name: true, email: true } },
        messages: {
          orderBy: { createdAt: "desc" },
          take: 1,
        },
      },
      orderBy: { lastMessageAt: "desc" },
    });
  }),

  getConversation: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const coachId = ctx.session.user.id;

      const conversation = await ctx.db.conversation.findFirst({
        where: { id: input.id, coachId },
        include: {
          client: { select: { id: true, name: true, email: true } },
        },
      });

      if (!conversation) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Conversation not found" });
      }

      // Mark messages as read
      await ctx.db.conversation.update({
        where: { id: input.id },
        data: { unreadByCoach: 0 },
      });

      return conversation;
    }),

  getMessages: protectedProcedure
    .input(
      z.object({
        conversationId: z.string(),
        cursor: z.string().optional(),
        limit: z.number().default(50),
      })
    )
    .query(async ({ ctx, input }) => {
      const coachId = ctx.session.user.id;

      const conversation = await ctx.db.conversation.findFirst({
        where: { id: input.conversationId, coachId },
      });

      if (!conversation) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Conversation not found" });
      }

      const messages = await ctx.db.message.findMany({
        where: { conversationId: input.conversationId },
        orderBy: { createdAt: "desc" },
        take: input.limit + 1,
        ...(input.cursor && { cursor: { id: input.cursor }, skip: 1 }),
      });

      let nextCursor: string | undefined;
      if (messages.length > input.limit) {
        const nextItem = messages.pop();
        nextCursor = nextItem?.id;
      }

      return {
        messages: messages.reverse(),
        nextCursor,
      };
    }),

  getOrCreateConversation: protectedProcedure
    .input(z.object({ clientId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const coachId = ctx.session.user.id;

      // Verify client belongs to coach
      const client = await ctx.db.client.findFirst({
        where: { id: input.clientId, coachId },
      });

      if (!client) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Client not found" });
      }

      // Check for existing conversation
      const existing = await ctx.db.conversation.findFirst({
        where: { coachId, clientId: input.clientId },
      });

      if (existing) {
        return existing;
      }

      return ctx.db.conversation.create({
        data: {
          coachId,
          clientId: input.clientId,
        },
      });
    }),

  sendMessage: protectedProcedure
    .input(
      z.object({
        conversationId: z.string(),
        content: z.string().min(1),
        attachments: z.array(
          z.object({
            name: z.string(),
            url: z.string(),
            type: z.string(),
            size: z.number(),
          })
        ).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const coachId = ctx.session.user.id;

      const conversation = await ctx.db.conversation.findFirst({
        where: { id: input.conversationId, coachId },
      });

      if (!conversation) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Conversation not found" });
      }

      const message = await ctx.db.message.create({
        data: {
          conversationId: input.conversationId,
          senderId: coachId,
          senderType: "COACH",
          content: input.content,
          attachments: input.attachments ? input.attachments : undefined,
        },
      });

      // Update conversation
      await ctx.db.conversation.update({
        where: { id: input.conversationId },
        data: {
          lastMessageAt: new Date(),
          unreadByClient: { increment: 1 },
        },
      });

      return message;
    }),

  markAsRead: protectedProcedure
    .input(z.object({ conversationId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const coachId = ctx.session.user.id;

      const conversation = await ctx.db.conversation.findFirst({
        where: { id: input.conversationId, coachId },
      });

      if (!conversation) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Conversation not found" });
      }

      // Mark all client messages as read
      await ctx.db.message.updateMany({
        where: {
          conversationId: input.conversationId,
          senderType: "CLIENT",
          readAt: null,
        },
        data: { readAt: new Date() },
      });

      return ctx.db.conversation.update({
        where: { id: input.conversationId },
        data: { unreadByCoach: 0 },
      });
    }),

  getUnreadCount: protectedProcedure.query(async ({ ctx }) => {
    const coachId = ctx.session.user.id;

    const result = await ctx.db.conversation.aggregate({
      where: { coachId },
      _sum: { unreadByCoach: true },
    });

    return result._sum.unreadByCoach || 0;
  }),
});
