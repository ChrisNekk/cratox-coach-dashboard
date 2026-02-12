"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sparkles,
  Send,
  Users,
  User,
  Loader2,
  RefreshCw,
  Check,
  AlertCircle,
  Pencil,
  ChevronRight,
  Bot,
  MessageSquare,
  Zap,
  Heart,
  TrendingUp,
  Calendar,
  Target,
} from "lucide-react";
import { toast } from "sonner";

interface AIOutreachDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onMessagesSent?: () => void;
}

type MessageType = "check_in" | "motivation" | "progress" | "reminder" | "custom";

const MESSAGE_TYPES: { value: MessageType; label: string; description: string; icon: React.ElementType }[] = [
  {
    value: "check_in",
    label: "Check-in",
    description: "Ask how they're doing with their program",
    icon: MessageSquare,
  },
  {
    value: "motivation",
    label: "Motivation",
    description: "Send encouraging words to keep them going",
    icon: Heart,
  },
  {
    value: "progress",
    label: "Progress Feedback",
    description: "Comment on their recent activity or achievements",
    icon: TrendingUp,
  },
  {
    value: "reminder",
    label: "Gentle Reminder",
    description: "Remind them about logging or upcoming sessions",
    icon: Calendar,
  },
  {
    value: "custom",
    label: "Custom",
    description: "Write your own prompt for the AI",
    icon: Pencil,
  },
];

interface GeneratedMessage {
  clientId: string;
  clientName: string;
  message: string;
  isEditing: boolean;
  isSending: boolean;
  isSent: boolean;
  error?: string;
}

export function AIOutreachDialog({ open, onOpenChange, onMessagesSent }: AIOutreachDialogProps) {
  const [step, setStep] = useState<"select" | "generate" | "review">("select");
  const [messageType, setMessageType] = useState<MessageType>("check_in");
  const [customPrompt, setCustomPrompt] = useState("");
  const [selectedClientIds, setSelectedClientIds] = useState<string[]>([]);
  const [generatedMessages, setGeneratedMessages] = useState<GeneratedMessage[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectAll, setSelectAll] = useState(false);

  const { data: clients, isLoading: clientsLoading } = trpc.clients.getAll.useQuery();

  const generateMessage = trpc.messageAi.generateOutreach.useMutation();
  const getOrCreateConversation = trpc.message.getOrCreateConversation.useMutation();
  const sendMessage = trpc.message.sendMessage.useMutation();

  const resetDialog = () => {
    setStep("select");
    setMessageType("check_in");
    setCustomPrompt("");
    setSelectedClientIds([]);
    setGeneratedMessages([]);
    setIsGenerating(false);
    setSelectAll(false);
  };

  const handleClose = () => {
    resetDialog();
    onOpenChange(false);
  };

  const toggleClientSelection = (clientId: string) => {
    setSelectedClientIds((prev) =>
      prev.includes(clientId)
        ? prev.filter((id) => id !== clientId)
        : [...prev, clientId]
    );
  };

  const handleSelectAll = (checked: boolean) => {
    setSelectAll(checked);
    if (checked && clients) {
      setSelectedClientIds(clients.map((c) => c.id));
    } else {
      setSelectedClientIds([]);
    }
  };

  const handleGenerate = async () => {
    if (selectedClientIds.length === 0) {
      toast.error("Please select at least one client");
      return;
    }

    if (messageType === "custom" && !customPrompt.trim()) {
      toast.error("Please enter a custom prompt");
      return;
    }

    setIsGenerating(true);
    setStep("review");

    const selectedClients = clients?.filter((c) => selectedClientIds.includes(c.id)) || [];
    const messages: GeneratedMessage[] = [];

    for (const client of selectedClients) {
      try {
        const result = await generateMessage.mutateAsync({
          clientId: client.id,
          messageType,
          customPrompt: messageType === "custom" ? customPrompt : undefined,
        });

        messages.push({
          clientId: client.id,
          clientName: client.name,
          message: result.message,
          isEditing: false,
          isSending: false,
          isSent: false,
        });
      } catch (error) {
        messages.push({
          clientId: client.id,
          clientName: client.name,
          message: "",
          isEditing: false,
          isSending: false,
          isSent: false,
          error: "Failed to generate message",
        });
      }
    }

    setGeneratedMessages(messages);
    setIsGenerating(false);
  };

  const handleRegenerateMessage = async (clientId: string) => {
    setGeneratedMessages((prev) =>
      prev.map((m) =>
        m.clientId === clientId ? { ...m, isSending: true, error: undefined } : m
      )
    );

    try {
      const result = await generateMessage.mutateAsync({
        clientId,
        messageType,
        customPrompt: messageType === "custom" ? customPrompt : undefined,
      });

      setGeneratedMessages((prev) =>
        prev.map((m) =>
          m.clientId === clientId
            ? { ...m, message: result.message, isSending: false }
            : m
        )
      );
    } catch {
      setGeneratedMessages((prev) =>
        prev.map((m) =>
          m.clientId === clientId
            ? { ...m, isSending: false, error: "Failed to regenerate" }
            : m
        )
      );
    }
  };

  const handleEditMessage = (clientId: string, newMessage: string) => {
    setGeneratedMessages((prev) =>
      prev.map((m) =>
        m.clientId === clientId ? { ...m, message: newMessage } : m
      )
    );
  };

  const toggleEditing = (clientId: string) => {
    setGeneratedMessages((prev) =>
      prev.map((m) =>
        m.clientId === clientId ? { ...m, isEditing: !m.isEditing } : m
      )
    );
  };

  const handleSendMessage = async (clientId: string) => {
    const msg = generatedMessages.find((m) => m.clientId === clientId);
    if (!msg || !msg.message.trim()) return;

    setGeneratedMessages((prev) =>
      prev.map((m) =>
        m.clientId === clientId ? { ...m, isSending: true } : m
      )
    );

    try {
      // Get or create conversation
      const conversation = await getOrCreateConversation.mutateAsync({ clientId });

      // Send the message
      await sendMessage.mutateAsync({
        conversationId: conversation.id,
        content: msg.message,
      });

      setGeneratedMessages((prev) =>
        prev.map((m) =>
          m.clientId === clientId ? { ...m, isSending: false, isSent: true } : m
        )
      );

      toast.success(`Message sent to ${msg.clientName}`);
    } catch {
      setGeneratedMessages((prev) =>
        prev.map((m) =>
          m.clientId === clientId
            ? { ...m, isSending: false, error: "Failed to send" }
            : m
        )
      );
      toast.error(`Failed to send message to ${msg.clientName}`);
    }
  };

  const handleSendAll = async () => {
    const pendingMessages = generatedMessages.filter(
      (m) => !m.isSent && !m.error && m.message.trim()
    );

    for (const msg of pendingMessages) {
      await handleSendMessage(msg.clientId);
    }

    onMessagesSent?.();
  };

  const sentCount = generatedMessages.filter((m) => m.isSent).length;
  const pendingCount = generatedMessages.filter(
    (m) => !m.isSent && !m.error && m.message.trim()
  ).length;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className="p-2 bg-gradient-to-br from-violet-500 to-purple-600 rounded-lg">
              <Sparkles className="h-5 w-5 text-white" />
            </div>
            AI Smart Outreach
          </DialogTitle>
          <DialogDescription>
            {step === "select" && "Select clients and message type to generate personalized outreach"}
            {step === "generate" && "Generating personalized messages..."}
            {step === "review" && "Review and send your AI-generated messages"}
          </DialogDescription>
        </DialogHeader>

        {step === "select" && (
          <>
            <div className="space-y-4 flex-1 overflow-hidden flex flex-col">
              {/* Message Type Selection */}
              <div className="space-y-2">
                <Label>Message Type</Label>
                <div className="grid grid-cols-2 gap-2">
                  {MESSAGE_TYPES.map((type) => (
                    <button
                      key={type.value}
                      type="button"
                      onClick={() => setMessageType(type.value)}
                      className={`p-3 rounded-lg border text-left transition-all ${
                        messageType === type.value
                          ? "border-primary bg-primary/5 ring-1 ring-primary"
                          : "border-border hover:border-primary/50"
                      }`}
                    >
                      <div className="flex items-start gap-2">
                        <type.icon className={`h-4 w-4 mt-0.5 ${
                          messageType === type.value ? "text-primary" : "text-muted-foreground"
                        }`} />
                        <div>
                          <p className="font-medium text-sm">{type.label}</p>
                          <p className="text-xs text-muted-foreground">{type.description}</p>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Custom Prompt */}
              {messageType === "custom" && (
                <div className="space-y-2">
                  <Label htmlFor="customPrompt">Your Instructions</Label>
                  <Textarea
                    id="customPrompt"
                    placeholder="E.g., Ask about their weekend workout and encourage them to stay consistent..."
                    value={customPrompt}
                    onChange={(e) => setCustomPrompt(e.target.value)}
                    rows={3}
                  />
                </div>
              )}

              {/* Client Selection */}
              <div className="space-y-2 flex-1 overflow-hidden flex flex-col">
                <div className="flex items-center justify-between">
                  <Label>Select Clients</Label>
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="selectAll"
                      checked={selectAll}
                      onCheckedChange={(checked) => handleSelectAll(checked as boolean)}
                    />
                    <Label htmlFor="selectAll" className="text-sm font-normal cursor-pointer">
                      Select all
                    </Label>
                  </div>
                </div>

                <ScrollArea className="flex-1 border rounded-lg">
                  {clientsLoading ? (
                    <div className="p-4 text-center text-muted-foreground">
                      <Loader2 className="h-5 w-5 animate-spin mx-auto mb-2" />
                      Loading clients...
                    </div>
                  ) : clients && clients.length > 0 ? (
                    <div className="divide-y">
                      {clients.map((client) => (
                        <label
                          key={client.id}
                          className="flex items-center gap-3 p-3 hover:bg-muted/50 cursor-pointer"
                        >
                          <Checkbox
                            checked={selectedClientIds.includes(client.id)}
                            onCheckedChange={() => toggleClientSelection(client.id)}
                          />
                          <Avatar className="h-8 w-8">
                            <AvatarFallback className="text-xs">
                              {client.name.split(" ").map((n) => n[0]).join("")}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm truncate">{client.name}</p>
                            <p className="text-xs text-muted-foreground truncate">{client.email}</p>
                          </div>
                          {client.goalType && (
                            <Badge variant="secondary" className="text-xs">
                              {client.goalType.replace("_", " ")}
                            </Badge>
                          )}
                        </label>
                      ))}
                    </div>
                  ) : (
                    <div className="p-4 text-center text-muted-foreground">
                      <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p>No clients found</p>
                    </div>
                  )}
                </ScrollArea>

                {selectedClientIds.length > 0 && (
                  <p className="text-sm text-muted-foreground">
                    {selectedClientIds.length} client{selectedClientIds.length !== 1 ? "s" : ""} selected
                  </p>
                )}
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button
                onClick={handleGenerate}
                disabled={selectedClientIds.length === 0 || (messageType === "custom" && !customPrompt.trim())}
              >
                <Sparkles className="mr-2 h-4 w-4" />
                Generate Messages
              </Button>
            </DialogFooter>
          </>
        )}

        {step === "review" && (
          <>
            {isGenerating ? (
              <div className="flex-1 flex items-center justify-center py-12">
                <div className="text-center">
                  <div className="relative">
                    <div className="h-16 w-16 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 mx-auto flex items-center justify-center">
                      <Bot className="h-8 w-8 text-white animate-pulse" />
                    </div>
                    <div className="absolute inset-0 h-16 w-16 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 mx-auto animate-ping opacity-25" />
                  </div>
                  <p className="mt-4 font-medium">Generating personalized messages...</p>
                  <p className="text-sm text-muted-foreground">
                    Analyzing client data and crafting messages
                  </p>
                </div>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    {sentCount > 0 && (
                      <Badge variant="secondary" className="bg-green-500/10 text-green-600">
                        <Check className="h-3 w-3 mr-1" />
                        {sentCount} sent
                      </Badge>
                    )}
                    {pendingCount > 0 && (
                      <Badge variant="secondary">
                        {pendingCount} pending
                      </Badge>
                    )}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setStep("select")}
                  >
                    Back to Selection
                  </Button>
                </div>

                <ScrollArea className="flex-1 -mx-6 px-6">
                  <div className="space-y-4">
                    {generatedMessages.map((msg) => (
                      <div
                        key={msg.clientId}
                        className={`border rounded-lg p-4 ${
                          msg.isSent ? "bg-green-500/5 border-green-500/20" : ""
                        }`}
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <Avatar className="h-8 w-8">
                              <AvatarFallback className="text-xs">
                                {msg.clientName.split(" ").map((n) => n[0]).join("")}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-medium text-sm">{msg.clientName}</p>
                              {msg.isSent && (
                                <p className="text-xs text-green-600 flex items-center gap-1">
                                  <Check className="h-3 w-3" />
                                  Sent
                                </p>
                              )}
                            </div>
                          </div>
                          {!msg.isSent && !msg.error && (
                            <div className="flex items-center gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleRegenerateMessage(msg.clientId)}
                                disabled={msg.isSending}
                              >
                                <RefreshCw className={`h-4 w-4 ${msg.isSending ? "animate-spin" : ""}`} />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => toggleEditing(msg.clientId)}
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                            </div>
                          )}
                        </div>

                        {msg.error ? (
                          <div className="flex items-center gap-2 text-destructive">
                            <AlertCircle className="h-4 w-4" />
                            <p className="text-sm">{msg.error}</p>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleRegenerateMessage(msg.clientId)}
                            >
                              Retry
                            </Button>
                          </div>
                        ) : msg.isEditing ? (
                          <div className="space-y-2">
                            <Textarea
                              value={msg.message}
                              onChange={(e) => handleEditMessage(msg.clientId, e.target.value)}
                              rows={4}
                              className="text-sm"
                            />
                            <Button
                              size="sm"
                              onClick={() => toggleEditing(msg.clientId)}
                            >
                              Done Editing
                            </Button>
                          </div>
                        ) : (
                          <div className="bg-muted/50 rounded-lg p-3">
                            <p className="text-sm whitespace-pre-wrap">{msg.message}</p>
                          </div>
                        )}

                        {!msg.isSent && !msg.error && !msg.isEditing && (
                          <div className="mt-3 flex justify-end">
                            <Button
                              size="sm"
                              onClick={() => handleSendMessage(msg.clientId)}
                              disabled={msg.isSending || !msg.message.trim()}
                            >
                              {msg.isSending ? (
                                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                              ) : (
                                <Send className="h-4 w-4 mr-2" />
                              )}
                              Send
                            </Button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </ScrollArea>

                <DialogFooter className="mt-4">
                  <Button variant="outline" onClick={handleClose}>
                    {sentCount === generatedMessages.length ? "Done" : "Cancel"}
                  </Button>
                  {pendingCount > 0 && (
                    <Button onClick={handleSendAll}>
                      <Send className="mr-2 h-4 w-4" />
                      Send All ({pendingCount})
                    </Button>
                  )}
                </DialogFooter>
              </>
            )}
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
