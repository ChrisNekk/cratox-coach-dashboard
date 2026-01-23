"use client";

import { useState, useRef, useEffect } from "react";
import { trpc } from "@/lib/trpc/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Bot,
  Send,
  Plus,
  Trash2,
  Sparkles,
  TrendingUp,
  AlertTriangle,
  UserX,
  Bell,
  Target,
  Calendar,
  Loader2,
  MessageSquare,
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import ReactMarkdown from "react-markdown";

interface AIMessage {
  role: "user" | "assistant";
  content: string;
  timestamp: string;
}

export default function AIAssistantPage() {
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  const { data: conversations, isLoading: conversationsLoading, refetch } = trpc.ai.getConversations.useQuery();
  const { data: quickPrompts } = trpc.ai.getQuickPrompts.useQuery();
  const { data: selectedConversation, refetch: refetchConversation } = trpc.ai.getConversation.useQuery(
    { id: selectedConversationId! },
    { enabled: !!selectedConversationId }
  );

  const sendMessage = trpc.ai.sendMessage.useMutation({
    onSuccess: (data) => {
      if (!selectedConversationId) {
        setSelectedConversationId(data.conversation.id);
      }
      refetch();
      refetchConversation();
    },
  });

  const createConversation = trpc.ai.createConversation.useMutation({
    onSuccess: (data) => {
      setSelectedConversationId(data.id);
      refetch();
    },
  });

  const deleteConversation = trpc.ai.deleteConversation.useMutation({
    onSuccess: () => {
      setSelectedConversationId(null);
      refetch();
    },
  });

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [selectedConversation?.messages]);

  const handleSend = () => {
    if (!input.trim()) return;
    sendMessage.mutate({
      conversationId: selectedConversationId || undefined,
      message: input.trim(),
    });
    setInput("");
  };

  const handleQuickPrompt = (prompt: string) => {
    setInput(prompt);
  };

  const handleNewChat = () => {
    setSelectedConversationId(null);
    createConversation.mutate({ title: "New Conversation" });
  };

  const messages = (selectedConversation?.messages as AIMessage[]) || [];

  const getPromptIcon = (icon: string) => {
    switch (icon) {
      case "alert-triangle":
        return <AlertTriangle className="h-4 w-4" />;
      case "trending-up":
        return <TrendingUp className="h-4 w-4" />;
      case "user-x":
        return <UserX className="h-4 w-4" />;
      case "bell":
        return <Bell className="h-4 w-4" />;
      case "target":
        return <Target className="h-4 w-4" />;
      case "calendar":
        return <Calendar className="h-4 w-4" />;
      default:
        return <Sparkles className="h-4 w-4" />;
    }
  };

  return (
    <div className="h-[calc(100vh-8rem)]">
      <div className="grid h-full gap-6 lg:grid-cols-4">
        {/* Sidebar - Conversations */}
        <Card className="lg:col-span-1 flex flex-col">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                <Bot className="h-5 w-5" />
                AI Assistant
              </CardTitle>
              <Button variant="ghost" size="icon" onClick={handleNewChat}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            <CardDescription>
              Your intelligent coaching assistant
            </CardDescription>
          </CardHeader>
          <CardContent className="flex-1 overflow-hidden p-0">
            <ScrollArea className="h-full">
              {conversationsLoading ? (
                <div className="space-y-2 p-4">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-14 w-full" />
                  ))}
                </div>
              ) : conversations && conversations.length > 0 ? (
                <div className="divide-y">
                  {conversations.map((conv) => (
                    <div
                      key={conv.id}
                      className={`p-3 cursor-pointer hover:bg-muted/50 transition-colors ${
                        selectedConversationId === conv.id ? "bg-muted" : ""
                      }`}
                      onClick={() => setSelectedConversationId(conv.id)}
                    >
                      <div className="flex items-center justify-between">
                        <p className="font-medium text-sm truncate">{conv.title}</p>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 opacity-0 hover:opacity-100"
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteConversation.mutate({ id: conv.id });
                          }}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(conv.updatedAt), { addSuffix: true })}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-4 text-center text-muted-foreground">
                  <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No conversations yet</p>
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Main Chat Area */}
        <Card className="lg:col-span-3 flex flex-col">
          <CardHeader className="pb-3 border-b">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                <Bot className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle className="text-base">Cratox AI Coach Assistant</CardTitle>
                <CardDescription>
                  Analyze client data, get insights, and automate tasks
                </CardDescription>
              </div>
            </div>
          </CardHeader>

          <CardContent className="flex-1 overflow-hidden p-0 flex flex-col">
            {/* Messages */}
            <ScrollArea className="flex-1 p-4" ref={scrollRef}>
              {messages.length > 0 ? (
                <div className="space-y-4">
                  {messages.map((message, index) => (
                    <div
                      key={index}
                      className={`flex ${
                        message.role === "user" ? "justify-end" : "justify-start"
                      }`}
                    >
                      <div
                        className={`max-w-[80%] rounded-lg p-4 ${
                          message.role === "user"
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted"
                        }`}
                      >
                        {message.role === "assistant" ? (
                          <div className="prose prose-sm dark:prose-invert max-w-none">
                            <ReactMarkdown
                              components={{
                                p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
                                strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
                                ul: ({ children }) => <ul className="list-disc pl-4 mb-2">{children}</ul>,
                                ol: ({ children }) => <ol className="list-decimal pl-4 mb-2">{children}</ol>,
                                li: ({ children }) => <li className="mb-1">{children}</li>,
                              }}
                            >
                              {message.content}
                            </ReactMarkdown>
                          </div>
                        ) : (
                          <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                        )}
                        <p
                          className={`text-xs mt-2 ${
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
                      <div className="bg-muted rounded-lg p-4">
                        <div className="flex items-center gap-2">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          <span className="text-sm text-muted-foreground">Thinking...</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="h-full flex flex-col items-center justify-center">
                  <div className="h-20 w-20 rounded-full bg-primary/10 flex items-center justify-center mb-6">
                    <Bot className="h-10 w-10 text-primary" />
                  </div>
                  <h3 className="text-lg font-medium mb-2">How can I help you today?</h3>
                  <p className="text-muted-foreground text-center mb-6 max-w-md">
                    I can analyze your clients&apos; data, identify patterns, suggest notifications,
                    and help you manage your coaching practice more effectively.
                  </p>

                  {/* Quick Prompts */}
                  <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3 max-w-2xl">
                    {quickPrompts?.map((prompt) => (
                      <Button
                        key={prompt.id}
                        variant="outline"
                        className="h-auto py-3 px-4 justify-start"
                        onClick={() => handleQuickPrompt(prompt.prompt)}
                      >
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                            {getPromptIcon(prompt.icon)}
                          </div>
                          <span className="text-sm font-medium">{prompt.title}</span>
                        </div>
                      </Button>
                    ))}
                  </div>
                </div>
              )}
            </ScrollArea>

            {/* Input Area */}
            <div className="p-4 border-t">
              <div className="flex gap-2">
                <Input
                  placeholder="Ask me anything about your clients..."
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
                  className="flex-1"
                  disabled={sendMessage.isPending}
                />
                <Button onClick={handleSend} disabled={!input.trim() || sendMessage.isPending}>
                  {sendMessage.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mt-2 text-center">
                AI responses are for guidance only. Always verify important decisions.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
