"use client";

import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { format, formatDistanceToNow } from "date-fns";
import {
  ArrowLeft,
  MessageCircle,
  Plus,
  Search,
  Send,
  Trash2,
  Users,
  X,
} from "lucide-react";

import { trpc } from "@/lib/trpc/client";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

// Event name for opening Quick Chat with a specific client
export const QUICK_CHAT_OPEN_EVENT = "quickchat:open";

// Helper function to open Quick Chat from anywhere
export function openQuickChatWithClient(clientId: string) {
  window.dispatchEvent(new CustomEvent(QUICK_CHAT_OPEN_EVENT, { detail: { clientId } }));
}

type LocalGroup = {
  id: string;
  name: string;
  clientIds: string[];
  createdAt: string;
};

const GROUPS_STORAGE_KEY = "cratox.quickChatGroups.v1";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function loadLocalGroups(): LocalGroup[] {
  try {
    const raw = localStorage.getItem(GROUPS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    const nowIso = new Date().toISOString();
    const cleaned: LocalGroup[] = [];
    for (const item of parsed) {
      if (!isRecord(item)) continue;
      const id = typeof item.id === "string" ? item.id : String(item.id ?? "");
      const name = typeof item.name === "string" ? item.name : String(item.name ?? "");
      const createdAt =
        typeof item.createdAt === "string" ? item.createdAt : String(item.createdAt ?? nowIso);
      const clientIdsRaw = item.clientIds;
      const clientIds = Array.isArray(clientIdsRaw)
        ? clientIdsRaw.map((x) => String(x)).filter(Boolean)
        : [];
      if (!id || !name) continue;
      cleaned.push({ id, name, createdAt, clientIds });
    }
    return cleaned;
  } catch {
    return [];
  }
}

function saveLocalGroups(groups: LocalGroup[]) {
  try {
    localStorage.setItem(GROUPS_STORAGE_KEY, JSON.stringify(groups));
  } catch {
    // ignore
  }
}

function getInitials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((n) => n[0]?.toUpperCase())
    .join("");
}

export function QuickChatWidget() {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<"clients" | "teams" | "groups">("clients");
  const [search, setSearch] = useState("");
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null);
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [newMessage, setNewMessage] = useState("");

  const [groups, setGroups] = useState<LocalGroup[]>([]);
  const [creatingGroup, setCreatingGroup] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");
  const [groupPeopleSearch, setGroupPeopleSearch] = useState("");
  const [groupBroadcastMessage, setGroupBroadcastMessage] = useState("");
  const [teamBroadcastMessage, setTeamBroadcastMessage] = useState("");
  const [broadcasting, setBroadcasting] = useState(false);

  const didLoadGroupsRef = useRef(false);
  const utils = trpc.useUtils();

  const unreadCount = trpc.message.getUnreadCount.useQuery(undefined, {
    refetchInterval: open ? 3000 : 10000, // Faster polling
  });
  const conversationsQuery = trpc.message.getConversations.useQuery(undefined, {
    enabled: open || unreadCount.data !== undefined,
    refetchInterval: open ? 3000 : undefined, // Poll when open
  });
  const clientsQuery = trpc.clients.getAll.useQuery(undefined, {
    enabled: open,
  });
  const teamsQuery = trpc.team.getAll.useQuery(undefined, {
    enabled: open,
  });
  const teamDetailsQuery = trpc.team.getById.useQuery(
    { id: selectedTeamId ?? "" },
    { enabled: open && !!selectedTeamId }
  );

  const messagesQuery = trpc.message.getMessages.useQuery(
    { conversationId: selectedConversationId ?? "" },
    {
      enabled: open && !!selectedConversationId,
      refetchInterval: open && selectedConversationId ? 2000 : undefined, // Fast polling when viewing messages
    }
  );

  const invalidateMessages = useCallback(async () => {
    await Promise.all([
      utils.message.getConversations.invalidate(),
      utils.message.getUnreadCount.invalidate(),
      selectedConversationId && utils.message.getMessages.invalidate({ conversationId: selectedConversationId }),
    ]);
  }, [utils, selectedConversationId]);

  const sendMessage = trpc.message.sendMessage.useMutation();
  const getOrCreateConversation = trpc.message.getOrCreateConversation.useMutation();

  const markAsRead = trpc.message.markAsRead.useMutation({
    onSuccess: async () => {
      await invalidateMessages();
    },
  });

  // Handle external event to open chat with specific client
  const handleExternalOpen = useCallback(async (event: Event) => {
    const customEvent = event as CustomEvent<{ clientId: string }>;
    const clientId = customEvent.detail?.clientId;
    if (!clientId) return;

    setOpen(true);
    setTab("clients");

    // Get or create conversation and select it
    try {
      const data = await getOrCreateConversation.mutateAsync({ clientId });
      setSelectedConversationId(data.id);
      await invalidateMessages();
    } catch {
      // Conversation creation failed, just open the widget
    }
  }, [getOrCreateConversation, invalidateMessages]);
  
  useEffect(() => {
    window.addEventListener(QUICK_CHAT_OPEN_EVENT, handleExternalOpen);
    return () => {
      window.removeEventListener(QUICK_CHAT_OPEN_EVENT, handleExternalOpen);
    };
  }, [handleExternalOpen]);

  useEffect(() => {
    if (!open) {
      setSearch("");
      setNewMessage("");
      setSelectedConversationId(null);
      setSelectedTeamId(null);
      setSelectedGroupId(null);
      setTab("clients");
      setCreatingGroup(false);
      setNewGroupName("");
      setGroupPeopleSearch("");
      setGroupBroadcastMessage("");
      setTeamBroadcastMessage("");
      setBroadcasting(false);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    if (didLoadGroupsRef.current) return;
    didLoadGroupsRef.current = true;
    setGroups(loadLocalGroups());
  }, [open]);

  useEffect(() => {
    if (!didLoadGroupsRef.current) return;
    saveLocalGroups(groups);
  }, [groups]);

  const clientsById = useMemo(() => {
    return new Map((clientsQuery.data ?? []).map((c) => [c.id, c]));
  }, [clientsQuery.data]);

  const filteredConversations = useMemo(() => {
    const conversations = conversationsQuery.data ?? [];
    const q = search.trim().toLowerCase();
    if (!q) return conversations;
    return conversations.filter(
      (c) =>
        c.client.name.toLowerCase().includes(q) ||
        c.client.email.toLowerCase().includes(q)
    );
  }, [conversationsQuery.data, search]);

  const selectedConversation = useMemo(() => {
    return (conversationsQuery.data ?? []).find((c) => c.id === selectedConversationId) ?? null;
  }, [conversationsQuery.data, selectedConversationId]);

  const selectedGroup = useMemo(() => {
    return groups.find((g) => g.id === selectedGroupId) ?? null;
  }, [groups, selectedGroupId]);

  const handleSelectConversation = (id: string) => {
    setSelectedConversationId(id);
    markAsRead.mutate({ conversationId: id });
  };

  const openConversationWithClient = async (clientId: string) => {
    const data = await getOrCreateConversation.mutateAsync({ clientId });
    setSelectedConversationId(data.id);
    setSelectedTeamId(null);
    setSelectedGroupId(null);
    setTab("clients");
    await invalidateMessages();
  };

  const handleSend = async () => {
    if (!selectedConversationId) return;
    const content = newMessage.trim();
    if (!content) return;
    await sendMessage.mutateAsync({ conversationId: selectedConversationId, content });
    setNewMessage("");
    await invalidateMessages();
  };

  const badgeCount = unreadCount.data ?? 0;

  const createGroup = () => {
    const name = newGroupName.trim();
    if (!name) return;
    const id =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `${Date.now()}`;
    setGroups((prev) => [{ id, name, clientIds: [], createdAt: new Date().toISOString() }, ...prev]);
    setNewGroupName("");
    setCreatingGroup(false);
  };

  const deleteGroup = (id: string) => {
    setGroups((prev) => prev.filter((g) => g.id !== id));
    if (selectedGroupId === id) setSelectedGroupId(null);
  };

  const addClientToGroup = (groupId: string, clientId: string) => {
    setGroups((prev) =>
      prev.map((g) =>
        g.id === groupId && !g.clientIds.includes(clientId)
          ? { ...g, clientIds: [...g.clientIds, clientId] }
          : g
      )
    );
  };

  const removeClientFromGroup = (groupId: string, clientId: string) => {
    setGroups((prev) =>
      prev.map((g) =>
        g.id === groupId ? { ...g, clientIds: g.clientIds.filter((id) => id !== clientId) } : g
      )
    );
  };

  const filteredTeams = useMemo(() => {
    const q = search.trim().toLowerCase();
    const teams = teamsQuery.data ?? [];
    if (!q) return teams;
    return teams.filter((t) => t.name.toLowerCase().includes(q));
  }, [teamsQuery.data, search]);

  const filteredGroups = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return groups;
    return groups.filter((g) => {
      if (g.name.toLowerCase().includes(q)) return true;
      // also match member names/emails
      return g.clientIds.some((id) => {
        const c = clientsById.get(id);
        return (
          c?.name.toLowerCase().includes(q) || c?.email.toLowerCase().includes(q) || false
        );
      });
    });
  }, [groups, search, clientsById]);

  const handleBroadcastToClientIds = async (clientIds: string[], message: string, clearFn: () => void) => {
    const content = message.trim();
    if (!content || clientIds.length === 0) return;
    setBroadcasting(true);
    try {
      for (const clientId of clientIds) {
        const conv = await getOrCreateConversation.mutateAsync({ clientId });
        await sendMessage.mutateAsync({ conversationId: conv.id, content });
      }
      clearFn();
      await invalidateMessages();
    } finally {
      setBroadcasting(false);
    }
  };

  const searchPlaceholder = useMemo(() => {
    if (tab === "clients") return "Search conversations...";
    if (tab === "teams") return selectedTeamId ? "Search team members..." : "Search teams...";
    return selectedGroupId ? "Search group members..." : "Search groups...";
  }, [tab, selectedTeamId, selectedGroupId]);

  return (
    <DialogPrimitive.Root open={open} onOpenChange={setOpen}>
      <DialogPrimitive.Trigger asChild>
        <button
          type="button"
          className={cn(
            "fixed bottom-5 right-5 z-40 inline-flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg",
            "hover:brightness-110 active:brightness-95",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          )}
          aria-label="Open Quick Chat"
        >
          <MessageCircle className="h-6 w-6" />
          {badgeCount > 0 && (
            <span className="absolute -top-1 -right-1 inline-flex h-6 min-w-6 items-center justify-center rounded-full bg-destructive px-1 text-[11px] font-semibold text-destructive-foreground">
              {badgeCount > 99 ? "99+" : badgeCount}
            </span>
          )}
        </button>
      </DialogPrimitive.Trigger>

      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-transparent" />
        <DialogPrimitive.Content
          className={cn(
            "fixed bottom-5 right-5 z-50 flex w-[380px] max-w-[calc(100vw-2.5rem)] flex-col overflow-hidden rounded-xl border bg-background shadow-2xl",
            "h-[560px] max-h-[calc(100vh-7rem)]"
          )}
        >
          <div className="flex items-center justify-between border-b px-4 py-3">
            <div className="flex items-center gap-2">
              {selectedConversationId ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => setSelectedConversationId(null)}
                  aria-label="Back to conversations"
                >
                  <ArrowLeft className="h-4 w-4" />
                </Button>
              ) : (
                <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-muted">
                  <MessageCircle className="h-5 w-5 text-foreground" />
                </span>
              )}
              <div className="min-w-0">
                <DialogPrimitive.Title className="text-sm font-semibold leading-none">
                  {selectedConversation?.client.name ?? "Quick Chat"}
                </DialogPrimitive.Title>
                <DialogPrimitive.Description className="text-xs text-muted-foreground">
                  {selectedConversation?.client.email ?? "Message clients anytime"}
                </DialogPrimitive.Description>
              </div>
            </div>

            <DialogPrimitive.Close asChild>
              <Button type="button" variant="ghost" size="icon" aria-label="Close Quick Chat">
                <X className="h-4 w-4" />
              </Button>
            </DialogPrimitive.Close>
          </div>

          {!selectedConversationId ? (
            <div className="flex min-h-0 flex-1 flex-col">
              <div className="px-4 pt-3">
                <Tabs
                  value={tab}
                  onValueChange={(v) => {
                    const next = v as "clients" | "teams" | "groups";
                    setTab(next);
                    if (next !== "teams") setSelectedTeamId(null);
                    if (next !== "groups") setSelectedGroupId(null);
                  }}
                >
                  <TabsList className="w-full">
                    <TabsTrigger value="clients" className="flex-1">
                      Chats
                      {badgeCount > 0 && (
                        <Badge variant="secondary" className="ml-2">
                          {badgeCount}
                        </Badge>
                      )}
                    </TabsTrigger>
                    <TabsTrigger value="teams" className="flex-1">
                      Teams
                    </TabsTrigger>
                    <TabsTrigger value="groups" className="flex-1">
                      Groups
                    </TabsTrigger>
                  </TabsList>

                  <div className="relative mt-3">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder={searchPlaceholder}
                      className="pl-9"
                    />
                  </div>

                  <TabsContent value="clients" className="mt-3 min-h-0 flex-1">
                    <ScrollArea className="h-full">
                      <div className="px-4 pb-4">
                        <div className="mb-3">
                          <div className="text-xs font-medium text-muted-foreground">Start new chat</div>
                          <div className="mt-2 flex flex-wrap gap-2">
                            {(clientsQuery.data ?? []).slice(0, 6).map((c) => (
                              <Button
                                key={c.id}
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => openConversationWithClient(c.id)}
                                disabled={getOrCreateConversation.isPending}
                              >
                                {c.name}
                              </Button>
                            ))}
                            {(clientsQuery.data ?? []).length === 0 && (
                              <div className="text-xs text-muted-foreground">
                                No clients yet. Invite clients first.
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="text-xs font-medium text-muted-foreground">Conversations</div>
                      </div>

                      {conversationsQuery.isLoading ? (
                        <div className="px-4 pb-6 text-sm text-muted-foreground">Loading…</div>
                      ) : filteredConversations.length > 0 ? (
                        <div className="divide-y">
                          {filteredConversations.map((conversation) => (
                            <button
                              key={conversation.id}
                              type="button"
                              className={cn(
                                "w-full px-4 py-3 text-left transition-colors hover:bg-muted/50",
                                "flex items-center gap-3"
                              )}
                              onClick={() => handleSelectConversation(conversation.id)}
                            >
                              <div className="relative shrink-0">
                                <Avatar className="h-9 w-9">
                                  <AvatarFallback>{getInitials(conversation.client.name)}</AvatarFallback>
                                </Avatar>
                                {conversation.unreadByCoach > 0 && (
                                  <span className="absolute -top-1 -right-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-semibold text-primary-foreground">
                                    {conversation.unreadByCoach > 99 ? "99+" : conversation.unreadByCoach}
                                  </span>
                                )}
                              </div>

                              <div className="min-w-0 flex-1">
                                <div className="flex items-center justify-between gap-2">
                                  <div className="truncate text-sm font-medium">
                                    {conversation.client.name}
                                  </div>
                                  {conversation.lastMessageAt && (
                                    <div className="shrink-0 text-[11px] text-muted-foreground">
                                      {formatDistanceToNow(new Date(conversation.lastMessageAt), {
                                        addSuffix: true,
                                      })}
                                    </div>
                                  )}
                                </div>
                                <div className="truncate text-xs text-muted-foreground">
                                  {conversation.messages[0]?.content || "No messages yet"}
                                </div>
                              </div>
                            </button>
                          ))}
                        </div>
                      ) : (
                        <div className="px-4 pb-6 text-sm text-muted-foreground">
                          No conversations yet.
                        </div>
                      )}
                    </ScrollArea>
                  </TabsContent>

                  <TabsContent value="teams" className="mt-3 min-h-0 flex-1">
                    <ScrollArea className="h-full">
                      {!selectedTeamId ? (
                        <>
                          <div className="px-4 pb-3 text-xs text-muted-foreground">
                            Click a team to message all members at once.
                          </div>
                          {filteredTeams.map((team) => (
                            <button
                              key={team.id}
                              type="button"
                              className="flex w-full items-center gap-3 border-b px-4 py-3 text-left transition-colors hover:bg-muted/50"
                              onClick={() => setSelectedTeamId(team.id)}
                            >
                              <span
                                className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg"
                                style={{ backgroundColor: `${team.color}20` }}
                              >
                                <Users className="h-4 w-4" style={{ color: team.color }} />
                              </span>
                              <div className="min-w-0 flex-1">
                                <div className="truncate text-sm font-medium">{team.name}</div>
                                <div className="text-xs text-muted-foreground">
                                  {team._count.clients} {team._count.clients === 1 ? "client" : "clients"}
                                </div>
                              </div>
                              <Send className="h-4 w-4 shrink-0 text-muted-foreground" />
                            </button>
                          ))}
                          {(teamsQuery.data ?? []).length === 0 && (
                            <div className="px-4 pb-6 text-sm text-muted-foreground">No teams yet.</div>
                          )}
                        </>
                      ) : teamDetailsQuery.isLoading ? (
                        <div className="px-4 pb-6 text-sm text-muted-foreground">Loading team…</div>
                      ) : teamDetailsQuery.data ? (
                        <div className="px-4 pb-4">
                          <div className="mb-3 flex items-center justify-between gap-2">
                            <div className="flex min-w-0 items-center gap-2">
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                onClick={() => {
                                  setSelectedTeamId(null);
                                  setTeamBroadcastMessage("");
                                }}
                                aria-label="Back to teams"
                              >
                                <ArrowLeft className="h-4 w-4" />
                              </Button>
                              <div className="min-w-0">
                                <div className="truncate text-sm font-semibold">
                                  {teamDetailsQuery.data.name}
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  {teamDetailsQuery.data.clients.length}{" "}
                                  {teamDetailsQuery.data.clients.length === 1 ? "client" : "clients"}
                                </div>
                              </div>
                            </div>
                          </div>

                          <div className="mb-4 rounded-lg border bg-muted/30 p-3">
                            <div className="text-xs font-medium text-muted-foreground mb-2">
                              Message everyone in {teamDetailsQuery.data.name}
                            </div>
                            <div className="flex items-center gap-2">
                              <Input
                                value={teamBroadcastMessage}
                                onChange={(e) => setTeamBroadcastMessage(e.target.value)}
                                placeholder="Type a message to all members…"
                                onKeyDown={(e) => {
                                  if (e.key === "Enter" && !e.shiftKey && teamBroadcastMessage.trim()) {
                                    e.preventDefault();
                                    void handleBroadcastToClientIds(
                                      teamDetailsQuery.data!.clients.map((c) => c.id),
                                      teamBroadcastMessage,
                                      () => setTeamBroadcastMessage("")
                                    );
                                  }
                                }}
                              />
                              <Button
                                type="button"
                                onClick={() =>
                                  handleBroadcastToClientIds(
                                    teamDetailsQuery.data!.clients.map((c) => c.id),
                                    teamBroadcastMessage,
                                    () => setTeamBroadcastMessage("")
                                  )
                                }
                                disabled={
                                  broadcasting ||
                                  !teamBroadcastMessage.trim() ||
                                  teamDetailsQuery.data.clients.length === 0
                                }
                                className="shrink-0"
                              >
                                {broadcasting ? "…" : <Send className="h-4 w-4" />}
                              </Button>
                            </div>
                            <div className="mt-1 text-[11px] text-muted-foreground">
                              Sends the same message as individual chats to each member.
                            </div>
                          </div>

                          <div className="text-xs font-medium text-muted-foreground mb-2">Members</div>
                          <div className="space-y-2">
                            {teamDetailsQuery.data.clients
                              .filter((c) => {
                                const q = search.trim().toLowerCase();
                                if (!q) return true;
                                return (
                                  c.name.toLowerCase().includes(q) || c.email.toLowerCase().includes(q)
                                );
                              })
                              .map((c) => (
                                <div
                                  key={c.id}
                                  className="flex items-center justify-between gap-3 rounded-lg border px-3 py-2"
                                >
                                  <div className="flex min-w-0 items-center gap-3">
                                    <Avatar className="h-9 w-9">
                                      <AvatarFallback>{getInitials(c.name)}</AvatarFallback>
                                    </Avatar>
                                    <div className="min-w-0">
                                      <div className="truncate text-sm font-medium">{c.name}</div>
                                      <div className="truncate text-xs text-muted-foreground">{c.email}</div>
                                    </div>
                                  </div>
                                  <Button
                                    type="button"
                                    size="sm"
                                    variant="outline"
                                    onClick={() => openConversationWithClient(c.id)}
                                    disabled={getOrCreateConversation.isPending}
                                  >
                                    Chat
                                  </Button>
                                </div>
                              ))}
                            {teamDetailsQuery.data.clients.length === 0 && (
                              <div className="text-sm text-muted-foreground">No clients in this team.</div>
                            )}
                          </div>
                        </div>
                      ) : (
                        <div className="px-4 pb-6 text-sm text-muted-foreground">Team not found.</div>
                      )}
                    </ScrollArea>
                  </TabsContent>

                  <TabsContent value="groups" className="mt-3 min-h-0 flex-1">
                    <ScrollArea className="h-full">
                      {!selectedGroupId ? (
                        <div className="px-4 pb-4">
                          <div className="mb-3 flex items-center justify-between gap-2">
                            <div className="text-xs text-muted-foreground">
                              Create groups to organize people across teams, then message them quickly.
                            </div>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => setCreatingGroup((v) => !v)}
                            >
                              <Plus className="mr-2 h-4 w-4" />
                              New group
                            </Button>
                          </div>

                          {creatingGroup && (
                            <div className="mb-4 flex items-center gap-2">
                              <Input
                                value={newGroupName}
                                onChange={(e) => setNewGroupName(e.target.value)}
                                placeholder="Group name…"
                              />
                              <Button type="button" onClick={createGroup} disabled={!newGroupName.trim()}>
                                Create
                              </Button>
                            </div>
                          )}

                          <div className="divide-y rounded-lg border">
                            {filteredGroups.map((g) => (
                              <div key={g.id} className="flex items-center justify-between gap-3 px-3 py-3">
                                <div className="min-w-0">
                                  <div className="truncate text-sm font-medium">{g.name}</div>
                                  <div className="text-xs text-muted-foreground">
                                    {g.clientIds.length} {g.clientIds.length === 1 ? "person" : "people"}
                                  </div>
                                </div>
                                <div className="flex items-center gap-2">
                                  <Button type="button" size="sm" onClick={() => setSelectedGroupId(g.id)}>
                                    Open
                                  </Button>
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => deleteGroup(g.id)}
                                    aria-label="Delete group"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              </div>
                            ))}
                            {filteredGroups.length === 0 && (
                              <div className="px-3 py-6 text-sm text-muted-foreground">
                                No groups yet.
                              </div>
                            )}
                          </div>
                        </div>
                      ) : selectedGroup ? (
                        <div className="px-4 pb-4">
                          <div className="mb-3 flex items-center justify-between gap-2">
                            <div className="flex min-w-0 items-center gap-2">
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                onClick={() => setSelectedGroupId(null)}
                                aria-label="Back to groups"
                              >
                                <ArrowLeft className="h-4 w-4" />
                              </Button>
                              <div className="min-w-0">
                                <div className="truncate text-sm font-semibold">{selectedGroup.name}</div>
                                <div className="text-xs text-muted-foreground">
                                  {selectedGroup.clientIds.length}{" "}
                                  {selectedGroup.clientIds.length === 1 ? "person" : "people"}
                                </div>
                              </div>
                            </div>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() =>
                                handleBroadcastToClientIds(
                                  selectedGroup.clientIds,
                                  groupBroadcastMessage,
                                  () => setGroupBroadcastMessage("")
                                )
                              }
                              disabled={
                                broadcasting ||
                                !groupBroadcastMessage.trim() ||
                                selectedGroup.clientIds.length === 0
                              }
                            >
                              {broadcasting ? "Sending…" : "Send to all"}
                            </Button>
                          </div>

                          <div className="mb-4">
                            <Input
                              value={groupBroadcastMessage}
                              onChange={(e) => setGroupBroadcastMessage(e.target.value)}
                              placeholder="Announcement message to everyone in this group…"
                            />
                            <div className="mt-1 text-[11px] text-muted-foreground">
                              This will send the same message as 1:1 chats to each person.
                            </div>
                          </div>

                          <div className="mb-4 rounded-lg border p-3">
                            <div className="text-xs font-medium text-muted-foreground">Add people</div>
                            <div className="relative mt-2">
                              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                              <Input
                                value={groupPeopleSearch}
                                onChange={(e) => setGroupPeopleSearch(e.target.value)}
                                placeholder="Search clients…"
                                className="pl-9"
                              />
                            </div>
                            <div className="mt-2 flex flex-wrap gap-2">
                              {(clientsQuery.data ?? [])
                                .filter((c) => {
                                  if (selectedGroup.clientIds.includes(c.id)) return false;
                                  const q = groupPeopleSearch.trim().toLowerCase();
                                  if (!q) return true;
                                  return (
                                    c.name.toLowerCase().includes(q) || c.email.toLowerCase().includes(q)
                                  );
                                })
                                .slice(0, 8)
                                .map((c) => (
                                  <Button
                                    key={c.id}
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => addClientToGroup(selectedGroup.id, c.id)}
                                  >
                                    + {c.name}
                                  </Button>
                                ))}
                              {(clientsQuery.data ?? []).length === 0 && (
                                <div className="text-xs text-muted-foreground">No clients yet.</div>
                              )}
                            </div>
                          </div>

                          <div className="text-xs font-medium text-muted-foreground">People</div>
                          <div className="mt-2 space-y-2">
                            {selectedGroup.clientIds
                              .map((id) => clientsById.get(id))
                              .filter(Boolean)
                              .filter((c) => {
                                const q = search.trim().toLowerCase();
                                if (!q) return true;
                                return (
                                  c!.name.toLowerCase().includes(q) || c!.email.toLowerCase().includes(q)
                                );
                              })
                              .map((c) => (
                                <div
                                  key={c!.id}
                                  className="flex items-center justify-between gap-3 rounded-lg border px-3 py-2"
                                >
                                  <div className="flex min-w-0 items-center gap-3">
                                    <Avatar className="h-9 w-9">
                                      <AvatarFallback>{getInitials(c!.name)}</AvatarFallback>
                                    </Avatar>
                                    <div className="min-w-0">
                                      <div className="truncate text-sm font-medium">{c!.name}</div>
                                      <div className="truncate text-xs text-muted-foreground">{c!.email}</div>
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <Button
                                      type="button"
                                      size="sm"
                                      onClick={() => openConversationWithClient(c!.id)}
                                      disabled={getOrCreateConversation.isPending}
                                    >
                                      Message
                                    </Button>
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => removeClientFromGroup(selectedGroup.id, c!.id)}
                                    >
                                      Remove
                                    </Button>
                                  </div>
                                </div>
                              ))}
                            {selectedGroup.clientIds.length === 0 && (
                              <div className="text-sm text-muted-foreground">
                                No one in this group yet. Add people above.
                              </div>
                            )}
                          </div>
                        </div>
                      ) : (
                        <div className="px-4 pb-6 text-sm text-muted-foreground">Group not found.</div>
                      )}
                    </ScrollArea>
                  </TabsContent>
                </Tabs>
              </div>
            </div>
          ) : (
            <div className="flex min-h-0 flex-1 flex-col">
              <ScrollArea className="flex-1 px-4 py-3">
                {messagesQuery.data?.messages?.length ? (
                  <div className="space-y-3">
                    {messagesQuery.data.messages.map((m) => {
                      const isCoach = m.senderType === "COACH";
                      return (
                        <div key={m.id} className={cn("flex", isCoach ? "justify-end" : "justify-start")}>
                          <div
                            className={cn(
                              "max-w-[85%] rounded-2xl px-3 py-2 text-sm",
                              isCoach ? "bg-primary text-primary-foreground" : "bg-muted"
                            )}
                          >
                            <div className="whitespace-pre-wrap">{m.content}</div>
                            <div
                              className={cn(
                                "mt-1 text-[11px]",
                                isCoach ? "text-primary-foreground/70" : "text-muted-foreground"
                              )}
                            >
                              {format(new Date(m.createdAt), "h:mm a")}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : messagesQuery.isLoading ? (
                  <div className="text-sm text-muted-foreground">Loading…</div>
                ) : (
                  <div className="py-8 text-center text-sm text-muted-foreground">
                    No messages yet. Say hi.
                  </div>
                )}
              </ScrollArea>

              <div className="border-t p-3">
                <div className="flex items-center gap-2">
                  <Input
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Type a message…"
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        void handleSend();
                      }
                    }}
                  />
                  <Button
                    type="button"
                    onClick={() => void handleSend()}
                    disabled={!newMessage.trim() || sendMessage.isPending}
                    className="shrink-0"
                    aria-label="Send message"
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          )}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

