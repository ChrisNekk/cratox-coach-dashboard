import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "../init";
import { TRPCError } from "@trpc/server";

// Mock AI responses for now (will be replaced with OpenAI integration)
function generateMockAIResponse(prompt: string, context?: string): string {
  const lowercasePrompt = prompt.toLowerCase();
  
  if (lowercasePrompt.includes("struggling") || lowercasePrompt.includes("issues")) {
    return `Based on my analysis of your clients' data, here are some observations:

**Clients needing attention:**
1. **Sarah Johnson** - Has missed protein targets 4 out of the last 7 days. Average intake is 45g below her goal.
2. **Mike Chen** - Hasn't logged any activity in 5 days. Last login was on Monday.
3. **Emma Williams** - Weight has plateaued for 2 weeks despite being in a caloric deficit.

**Recommendations:**
- Send Sarah a personalized meal plan with high-protein recipes
- Reach out to Mike with a motivation check-in message
- Review Emma's targets - she might need a refeed day or adjustment to her macros

Would you like me to draft notifications for any of these clients?`;
  }
  
  if (lowercasePrompt.includes("pattern") || lowercasePrompt.includes("trend")) {
    return `I've identified several patterns across your client base:

**Positive Trends:**
- 73% of clients are consistently hitting their water intake goals
- Weekend compliance has improved by 15% over the last month
- Morning workout completion rate is 40% higher than evening sessions

**Areas for Improvement:**
- Dinner logging is the most frequently skipped meal (35% miss rate)
- Sunday is the day with lowest activity logging
- Protein targets are commonly missed after cardio-heavy days

**Actionable Insights:**
- Consider sending reminder notifications for dinner logging around 6 PM
- Create a "Sunday Success" challenge to improve weekend engagement
- Suggest protein-rich post-workout snacks to clients doing cardio

Would you like me to create automated notifications for any of these insights?`;
  }
  
  if (lowercasePrompt.includes("inactive") || lowercasePrompt.includes("not logging")) {
    return `Here's a summary of inactive clients:

**No activity in 7+ days:**
- Mike Chen (last active: 8 days ago)
- David Park (last active: 10 days ago)

**No activity in 3-6 days:**
- Lisa Wang (last active: 4 days ago)
- Tom Brown (last active: 5 days ago)

**Suggested notification template:**

Subject: "We miss you! 💪"

"Hi {name}, I noticed you haven't logged in recently. Remember, consistency is key to reaching your goals! Even a quick food log helps. Is there anything I can help with? Let's chat!"

Would you like me to send this notification to the inactive clients?`;
  }
  
  if (lowercasePrompt.includes("notification") || lowercasePrompt.includes("message")) {
    return `I can help you craft personalized messages. Here are some templates:

**For hitting goals:**
"Amazing work, {name}! 🎉 You've hit your {goal} target {streak} days in a row. Keep up the incredible momentum!"

**For near misses:**
"Hey {name}, you were so close to your {goal} target yesterday - just {amount} away! Today's a new day to crush it!"

**For re-engagement:**
"Hi {name}, I hope everything is going well. I'm here to support you on your journey. Would you like to schedule a quick check-in call?"

Which type of notification would you like to customize?`;
  }
  
  return `I'm here to help you manage your coaching practice more effectively. I can:

- **Analyze client patterns** - Identify who's struggling or succeeding
- **Suggest notifications** - Help you stay connected with clients
- **Review progress** - Summarize client achievements and areas for improvement
- **Automate outreach** - Set up smart notifications based on client behavior

What would you like to explore? Try asking:
- "Which clients are struggling this week?"
- "What patterns do you see in my clients' data?"
- "Help me write a notification for inactive clients"`;
}

export const aiRouter = createTRPCRouter({
  getConversations: protectedProcedure.query(async ({ ctx }) => {
    const coachId = ctx.session.user.id;

    return ctx.db.aIConversation.findMany({
      where: { coachId },
      orderBy: { updatedAt: "desc" },
      take: 20,
    });
  }),

  getConversation: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const coachId = ctx.session.user.id;

      const conversation = await ctx.db.aIConversation.findFirst({
        where: { id: input.id, coachId },
      });

      if (!conversation) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Conversation not found" });
      }

      return conversation;
    }),

  createConversation: protectedProcedure
    .input(z.object({ title: z.string().optional() }))
    .mutation(async ({ ctx, input }) => {
      const coachId = ctx.session.user.id;

      return ctx.db.aIConversation.create({
        data: {
          coachId,
          title: input.title || "New Conversation",
          messages: [],
        },
      });
    }),

  sendMessage: protectedProcedure
    .input(
      z.object({
        conversationId: z.string().optional(),
        message: z.string().min(1),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const coachId = ctx.session.user.id;

      let conversation;

      if (input.conversationId) {
        conversation = await ctx.db.aIConversation.findFirst({
          where: { id: input.conversationId, coachId },
        });

        if (!conversation) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Conversation not found" });
        }
      } else {
        // Create new conversation
        conversation = await ctx.db.aIConversation.create({
          data: {
            coachId,
            title: input.message.substring(0, 50) + (input.message.length > 50 ? "..." : ""),
            messages: [],
          },
        });
      }

      const currentMessages = (conversation.messages as Array<{
        role: string;
        content: string;
        timestamp: string;
      }>) || [];

      // Add user message
      const userMessage = {
        role: "user",
        content: input.message,
        timestamp: new Date().toISOString(),
      };

      // Generate AI response (mock for now, will use OpenAI later)
      const aiResponse = generateMockAIResponse(input.message);

      const assistantMessage = {
        role: "assistant",
        content: aiResponse,
        timestamp: new Date().toISOString(),
      };

      const updatedMessages = [...currentMessages, userMessage, assistantMessage];

      const updated = await ctx.db.aIConversation.update({
        where: { id: conversation.id },
        data: {
          messages: updatedMessages,
          updatedAt: new Date(),
        },
      });

      return {
        conversation: updated,
        response: aiResponse,
      };
    }),

  deleteConversation: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const coachId = ctx.session.user.id;

      const conversation = await ctx.db.aIConversation.findFirst({
        where: { id: input.id, coachId },
      });

      if (!conversation) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Conversation not found" });
      }

      return ctx.db.aIConversation.delete({ where: { id: input.id } });
    }),

  // Quick prompts for common queries
  getQuickPrompts: protectedProcedure.query(async () => {
    return [
      {
        id: "struggling",
        title: "Clients Struggling",
        prompt: "Which clients are struggling this week?",
        icon: "alert-triangle",
      },
      {
        id: "patterns",
        title: "Pattern Analysis",
        prompt: "What patterns do you see in my clients' data?",
        icon: "trending-up",
      },
      {
        id: "inactive",
        title: "Inactive Clients",
        prompt: "Show me clients who haven't been logging lately",
        icon: "user-x",
      },
      {
        id: "notifications",
        title: "Notification Ideas",
        prompt: "Suggest notifications I should send to my clients",
        icon: "bell",
      },
      {
        id: "goals",
        title: "Goal Progress",
        prompt: "Which clients are close to reaching their goals?",
        icon: "target",
      },
      {
        id: "weekly",
        title: "Weekly Summary",
        prompt: "Give me a weekly summary of my clients' progress",
        icon: "calendar",
      },
    ];
  }),
});
