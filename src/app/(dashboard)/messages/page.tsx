"use client";

import { useState } from "react";
import Link from "next/link";
import { trpc } from "@/lib/trpc/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  MessageSquare,
  Search,
  Plus,
  Send,
  Paperclip,
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";

export default function MessagesPage() {
  const [search, setSearch] = useState("");
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [newMessage, setNewMessage] = useState("");

  const { data: conversations, isLoading, refetch } = trpc.message.getConversations.useQuery();
  const { data: clients } = trpc.clients.getAll.useQuery();

  const { data: messages, refetch: refetchMessages } = trpc.message.getMessages.useQuery(
    { conversationId: selectedConversationId! },
    { enabled: !!selectedConversationId }
  );

  const sendMessage = trpc.message.sendMessage.useMutation({
    onSuccess: () => {
      setNewMessage("");
      refetchMessages();
      refetch();
    },
  });

  const getOrCreateConversation = trpc.message.getOrCreateConversation.useMutation({
    onSuccess: (data) => {
      setSelectedConversationId(data.id);
      refetch();
    },
  });

  const markAsRead = trpc.message.markAsRead.useMutation({
    onSuccess: () => {
      refetch();
    },
  });

  const handleSelectConversation = (id: string) => {
    setSelectedConversationId(id);
    markAsRead.mutate({ conversationId: id });
  };

  const handleSendMessage = () => {
    if (!newMessage.trim() || !selectedConversationId) return;
    sendMessage.mutate({
      conversationId: selectedConversationId,
      content: newMessage.trim(),
    });
  };

  const handleStartNewConversation = (clientId: string) => {
    getOrCreateConversation.mutate({ clientId });
  };

  const filteredConversations = conversations?.filter(
    (c) =>
      c.client.name.toLowerCase().includes(search.toLowerCase()) ||
      c.client.email.toLowerCase().includes(search.toLowerCase())
  );

  const selectedConversation = conversations?.find((c) => c.id === selectedConversationId);

  return (
    <div className="h-[calc(100vh-8rem)]">
      <div className="grid h-full gap-6 lg:grid-cols-3">
        {/* Conversations List */}
        <Card className="lg:col-span-1 flex flex-col">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Messages</CardTitle>
              <Badge variant="secondary">
                {conversations?.reduce((acc, c) => acc + c.unreadByCoach, 0) || 0} unread
              </Badge>
            </div>
            <div className="relative mt-2">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search conversations..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
          </CardHeader>
          <CardContent className="flex-1 overflow-hidden p-0">
            <ScrollArea className="h-full">
              {isLoading ? (
                <div className="space-y-2 p-4">
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="flex items-center gap-3 p-3">
                      <Skeleton className="h-10 w-10 rounded-full" />
                      <div className="flex-1 space-y-2">
                        <Skeleton className="h-4 w-24" />
                        <Skeleton className="h-3 w-32" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : filteredConversations && filteredConversations.length > 0 ? (
                <div className="divide-y">
                  {filteredConversations.map((conversation) => (
                    <button
                      key={conversation.id}
                      className={`w-full flex items-center gap-3 p-4 text-left hover:bg-muted/50 transition-colors ${
                        selectedConversationId === conversation.id ? "bg-muted" : ""
                      }`}
                      onClick={() => handleSelectConversation(conversation.id)}
                    >
                      <div className="relative">
                        <Avatar className="h-10 w-10">
                          <AvatarFallback>
                            {conversation.client.name
                              .split(" ")
                              .map((n) => n[0])
                              .join("")}
                          </AvatarFallback>
                        </Avatar>
                        {conversation.unreadByCoach > 0 && (
                          <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-primary text-[10px] font-medium text-primary-foreground flex items-center justify-center">
                            {conversation.unreadByCoach}
                          </span>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <p className="font-medium truncate">{conversation.client.name}</p>
                          {conversation.lastMessageAt && (
                            <span className="text-xs text-muted-foreground">
                              {formatDistanceToNow(new Date(conversation.lastMessageAt), { addSuffix: true })}
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground truncate">
                          {conversation.messages[0]?.content || "No messages yet"}
                        </p>
                      </div>
                    </button>
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

        {/* Chat Area */}
        <Card className="lg:col-span-2 flex flex-col">
          {selectedConversation ? (
            <>
              <CardHeader className="pb-3 border-b">
                <div className="flex items-center gap-3">
                  <Avatar className="h-10 w-10">
                    <AvatarFallback>
                      {selectedConversation.client.name
                        .split(" ")
                        .map((n) => n[0])
                        .join("")}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <CardTitle className="text-base">{selectedConversation.client.name}</CardTitle>
                    <CardDescription>{selectedConversation.client.email}</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="flex-1 overflow-hidden p-0">
                <ScrollArea className="h-[calc(100vh-22rem)] p-4">
                  {messages?.messages && messages.messages.length > 0 ? (
                    <div className="space-y-4">
                      {messages.messages.map((message) => (
                        <div
                          key={message.id}
                          className={`flex ${
                            message.senderType === "COACH" ? "justify-end" : "justify-start"
                          }`}
                        >
                          <div
                            className={`max-w-[70%] rounded-lg p-3 ${
                              message.senderType === "COACH"
                                ? "bg-primary text-primary-foreground"
                                : "bg-muted"
                            }`}
                          >
                            <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                            <p
                              className={`text-xs mt-1 ${
                                message.senderType === "COACH"
                                  ? "text-primary-foreground/70"
                                  : "text-muted-foreground"
                              }`}
                            >
                              {format(new Date(message.createdAt), "h:mm a")}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="h-full flex items-center justify-center text-muted-foreground">
                      <div className="text-center">
                        <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <p>No messages yet</p>
                        <p className="text-sm">Start the conversation!</p>
                      </div>
                    </div>
                  )}
                </ScrollArea>
              </CardContent>
              <div className="p-4 border-t">
                <div className="flex gap-2">
                  <Button variant="outline" size="icon">
                    <Paperclip className="h-4 w-4" />
                  </Button>
                  <Input
                    placeholder="Type a message..."
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSendMessage()}
                    className="flex-1"
                  />
                  <Button onClick={handleSendMessage} disabled={!newMessage.trim() || sendMessage.isPending}>
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <MessageSquare className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
                <h3 className="text-lg font-medium mb-2">Select a conversation</h3>
                <p className="text-muted-foreground mb-4">
                  Choose a client to start messaging
                </p>
                {clients && clients.length > 0 && (
                  <div className="flex flex-wrap gap-2 justify-center">
                    {clients.slice(0, 3).map((client) => (
                      <Button
                        key={client.id}
                        variant="outline"
                        size="sm"
                        onClick={() => handleStartNewConversation(client.id)}
                      >
                        <Plus className="mr-2 h-3 w-3" />
                        {client.name}
                      </Button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
