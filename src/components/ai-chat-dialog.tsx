"use client";

import { useState, useRef, useEffect } from "react";
import { trpc } from "@/lib/trpc/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Bot,
  Send,
  Loader2,
  Sparkles,
  TrendingUp,
  AlertTriangle,
  Target,
  Users,
  Calendar,
  MessageSquare,
} from "lucide-react";
import { format } from "date-fns";
import ReactMarkdown from "react-markdown";

interface AIMessage {
  role: "user" | "assistant";
  content: string;
  timestamp: string;
}

interface SuggestedPrompt {
  id: string;
  title: string;
  prompt: string;
  icon: string;
}

interface AIChatDialogProps {
  trigger: React.ReactNode;
  context?: "dashboard" | "clients" | "client-detail";
  clientId?: string;
  clientName?: string;
}

// Context-specific suggested prompts
const dashboardPrompts: SuggestedPrompt[] = [
  {
    id: "at-risk",
    title: "Clients at risk",
    prompt: "Which clients are at risk of not meeting their goals this week? What should I focus on?",
    icon: "alert-triangle",
  },
  {
    id: "top-performers",
    title: "Top performers",
    prompt: "Who are my top performing clients this week? What are they doing right?",
    icon: "trending-up",
  },
  {
    id: "weekly-summary",
    title: "Weekly summary",
    prompt: "Give me a summary of how all my clients performed this week.",
    icon: "target",
  },
  {
    id: "action-items",
    title: "Action items",
    prompt: "What are the most important things I should do today as a coach?",
    icon: "calendar",
  },
];

const clientsPrompts: SuggestedPrompt[] = [
  {
    id: "needs-attention",
    title: "Needs attention",
    prompt: "Which clients haven't logged their meals in the past 3 days?",
    icon: "alert-triangle",
  },
  {
    id: "goal-progress",
    title: "Goal progress",
    prompt: "Show me clients who are closest to reaching their weight goals.",
    icon: "target",
  },
  {
    id: "engagement",
    title: "Low engagement",
    prompt: "Which clients have the lowest engagement this month?",
    icon: "users",
  },
  {
    id: "check-ins",
    title: "Pending check-ins",
    prompt: "Who should I check in with this week based on their progress?",
    icon: "message-square",
  },
];

const getClientDetailPrompts = (clientName: string): SuggestedPrompt[] => [
  {
    id: "progress",
    title: "Progress analysis",
    prompt: `Analyze ${clientName}'s overall progress. How are they doing with their goals?`,
    icon: "trending-up",
  },
  {
    id: "nutrition",
    title: "Nutrition review",
    prompt: `Review ${clientName}'s nutrition patterns this week. Are they hitting their macros?`,
    icon: "target",
  },
  {
    id: "suggestions",
    title: "Coaching tips",
    prompt: `What coaching suggestions do you have for ${clientName} based on their recent data?`,
    icon: "sparkles",
  },
  {
    id: "concerns",
    title: "Areas of concern",
    prompt: `Are there any red flags or concerns I should address with ${clientName}?`,
    icon: "alert-triangle",
  },
];

export function AIChatDialog({ trigger, context = "dashboard", clientId, clientName }: AIChatDialogProps) {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [localMessages, setLocalMessages] = useState<AIMessage[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  const sendMessage = trpc.ai.sendMessage.useMutation({
    onSuccess: (data) => {
      // Add the assistant's response to local messages
      const assistantMessage: AIMessage = {
        role: "assistant",
        content: data.message.content,
        timestamp: new Date().toISOString(),
      };
      setLocalMessages((prev) => [...prev, assistantMessage]);
    },
  });

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [localMessages]);

  // Reset messages when dialog closes
  useEffect(() => {
    if (!open) {
      setLocalMessages([]);
      setInput("");
    }
  }, [open]);

  const handleSend = (message?: string) => {
    const messageToSend = message || input.trim();
    if (!messageToSend) return;

    // Add user message to local state immediately
    const userMessage: AIMessage = {
      role: "user",
      content: messageToSend,
      timestamp: new Date().toISOString(),
    };
    setLocalMessages((prev) => [...prev, userMessage]);

    // Send to API
    sendMessage.mutate({
      message: messageToSend,
      clientId: clientId || undefined,
    });

    setInput("");
  };

  const handlePromptClick = (prompt: string) => {
    handleSend(prompt);
  };

  const getPromptIcon = (icon: string) => {
    switch (icon) {
      case "alert-triangle":
        return <AlertTriangle className="h-4 w-4" />;
      case "trending-up":
        return <TrendingUp className="h-4 w-4" />;
      case "target":
        return <Target className="h-4 w-4" />;
      case "users":
        return <Users className="h-4 w-4" />;
      case "calendar":
        return <Calendar className="h-4 w-4" />;
      case "message-square":
        return <MessageSquare className="h-4 w-4" />;
      case "sparkles":
        return <Sparkles className="h-4 w-4" />;
      default:
        return <Sparkles className="h-4 w-4" />;
    }
  };

  // Get prompts based on context
  const suggestedPrompts =
    context === "client-detail" && clientName
      ? getClientDetailPrompts(clientName)
      : context === "clients"
      ? clientsPrompts
      : dashboardPrompts;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="sm:max-w-[700px] h-[80vh] max-h-[700px] p-0 flex flex-col">
        {/* Header */}
        <DialogHeader className="px-6 py-4 border-b flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
                <Bot className="h-5 w-5 text-white" />
              </div>
              <div>
                <DialogTitle className="text-base">AI Coach Assistant</DialogTitle>
                <DialogDescription>
                  {clientName
                    ? `Insights about ${clientName}`
                    : context === "clients"
                    ? "Ask about your clients"
                    : "Get coaching insights"
                  }
                </DialogDescription>
              </div>
            </div>
          </div>
        </DialogHeader>

        {/* Chat Area */}
        <ScrollArea className="flex-1 p-4" ref={scrollRef}>
          {localMessages.length > 0 ? (
            <div className="space-y-4">
              {localMessages.map((message, index) => (
                <div
                  key={index}
                  className={`flex ${
                    message.role === "user" ? "justify-end" : "justify-start"
                  }`}
                >
                  <div
                    className={`max-w-[85%] rounded-lg p-3 ${
                      message.role === "user"
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted"
                    }`}
                  >
                    {message.role === "assistant" ? (
                      <div className="prose prose-sm dark:prose-invert max-w-none">
                        <ReactMarkdown
                          components={{
                            p: ({ children }) => <p className="mb-2 last:mb-0 text-sm">{children}</p>,
                            strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
                            ul: ({ children }) => <ul className="list-disc pl-4 mb-2 text-sm">{children}</ul>,
                            ol: ({ children }) => <ol className="list-decimal pl-4 mb-2 text-sm">{children}</ol>,
                            li: ({ children }) => <li className="mb-1">{children}</li>,
                          }}
                        >
                          {message.content}
                        </ReactMarkdown>
                      </div>
                    ) : (
                      <p className="text-sm">{message.content}</p>
                    )}
                    <p
                      className={`text-[10px] mt-1 ${
                        message.role === "user"
                          ? "text-primary-foreground/70"
                          : "text-muted-foreground"
                      }`}
                    >
                      {format(new Date(message.timestamp), "h:mm a")}
                    </p>
                  </div>
                </div>
              ))}
              {sendMessage.isPending && (
                <div className="flex justify-start">
                  <div className="bg-muted rounded-lg p-3">
                    <div className="flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span className="text-sm text-muted-foreground">Thinking...</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center py-8">
              <div className="h-16 w-16 rounded-full bg-gradient-to-br from-violet-500/20 to-purple-600/20 flex items-center justify-center mb-4">
                <Sparkles className="h-8 w-8 text-violet-600" />
              </div>
              <h3 className="text-base font-medium mb-1">How can I help?</h3>
              <p className="text-sm text-muted-foreground text-center mb-6 max-w-sm">
                {clientName
                  ? `Ask me anything about ${clientName}'s progress, nutrition, or get coaching suggestions.`
                  : "Ask me questions about your clients or get coaching insights."
                }
              </p>

              {/* Suggested Prompts */}
              <div className="grid gap-2 w-full max-w-md">
                {suggestedPrompts.map((prompt) => (
                  <Button
                    key={prompt.id}
                    variant="outline"
                    className="h-auto py-2.5 px-3 justify-start text-left"
                    onClick={() => handlePromptClick(prompt.prompt)}
                  >
                    <div className="flex items-center gap-3">
                      <div className="h-7 w-7 rounded-md bg-violet-500/10 flex items-center justify-center text-violet-600 flex-shrink-0">
                        {getPromptIcon(prompt.icon)}
                      </div>
                      <span className="text-sm">{prompt.title}</span>
                    </div>
                  </Button>
                ))}
              </div>
            </div>
          )}
        </ScrollArea>

        {/* Input Area */}
        <div className="p-4 border-t flex-shrink-0">
          <div className="flex gap-2">
            <Input
              placeholder={clientName ? `Ask about ${clientName}...` : "Ask me anything..."}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
              className="flex-1"
              disabled={sendMessage.isPending}
            />
            <Button onClick={() => handleSend()} disabled={!input.trim() || sendMessage.isPending}>
              {sendMessage.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
