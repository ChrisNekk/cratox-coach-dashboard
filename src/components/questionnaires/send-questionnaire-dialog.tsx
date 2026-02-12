"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc/client";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Calendar } from "@/components/ui/calendar";
import { Badge } from "@/components/ui/badge";
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
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Send,
  Loader2,
  CalendarIcon,
  MessageSquare,
  Mail,
  Users,
  Search,
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type Question = {
  id: string;
  type: string;
  question: string;
  required: boolean;
  options?: string[];
  ratingMax?: number;
};

type QuestionnaireFromQuery = {
  id: string;
  title: string;
  description: string | null;
  questions: unknown;
  isSystem: boolean;
};

interface SendQuestionnaireDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  questionnaire: QuestionnaireFromQuery;
  onSuccess?: () => void;
}

export function SendQuestionnaireDialog({
  open,
  onOpenChange,
  questionnaire,
  onSuccess,
}: SendQuestionnaireDialogProps) {
  const [selectedClients, setSelectedClients] = useState<string[]>([]);
  const [viaMessage, setViaMessage] = useState(true);
  const [viaEmail, setViaEmail] = useState(false);
  const [dueDate, setDueDate] = useState<Date | undefined>();
  const [customMessage, setCustomMessage] = useState("");
  const [search, setSearch] = useState("");

  const { data: clients, isLoading: clientsLoading } = trpc.clients.getAll.useQuery({
    search: search || undefined,
  });

  const sendMutation = trpc.questionnaire.send.useMutation({
    onSuccess: (results) => {
      toast.success(`Questionnaire sent to ${results.length} client(s)!`);
      onOpenChange(false);
      resetForm();
      onSuccess?.();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to send questionnaire");
    },
  });

  const resetForm = () => {
    setSelectedClients([]);
    setViaMessage(true);
    setViaEmail(false);
    setDueDate(undefined);
    setCustomMessage("");
    setSearch("");
  };

  const toggleClient = (clientId: string) => {
    setSelectedClients((prev) =>
      prev.includes(clientId)
        ? prev.filter((id) => id !== clientId)
        : [...prev, clientId]
    );
  };

  const selectAll = () => {
    if (clients) {
      setSelectedClients(clients.map((c) => c.id));
    }
  };

  const deselectAll = () => {
    setSelectedClients([]);
  };

  const handleSend = () => {
    if (selectedClients.length === 0) {
      toast.error("Please select at least one client");
      return;
    }

    if (!viaMessage && !viaEmail) {
      toast.error("Please select at least one delivery method");
      return;
    }

    sendMutation.mutate({
      questionnaireId: questionnaire.id,
      clientIds: selectedClients,
      viaMessage,
      viaEmail,
      dueDate,
      messageContent: customMessage || undefined,
    });
  };

  const questions = (questionnaire.questions || []) as Question[];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Send Questionnaire</DialogTitle>
          <DialogDescription>
            Send &quot;{questionnaire.title}&quot; to your clients
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-hidden flex flex-col gap-4">
          {/* Questionnaire Preview */}
          <div className="p-3 border rounded-lg bg-muted/50">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-medium">{questionnaire.title}</h4>
                <p className="text-sm text-muted-foreground">
                  {questions.length} questions
                </p>
              </div>
              {questionnaire.isSystem && (
                <Badge variant="secondary">System Template</Badge>
              )}
            </div>
          </div>

          {/* Client Selection */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Select Clients ({selectedClients.length} selected)</Label>
              <div className="flex gap-2">
                <Button variant="ghost" size="sm" onClick={selectAll}>
                  Select All
                </Button>
                <Button variant="ghost" size="sm" onClick={deselectAll}>
                  Clear
                </Button>
              </div>
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search clients..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <ScrollArea className="h-40 border rounded-lg">
              <div className="p-2 space-y-1">
                {clientsLoading ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    Loading clients...
                  </p>
                ) : clients && clients.length > 0 ? (
                  clients.map((client) => (
                    <label
                      key={client.id}
                      className="flex items-center gap-3 p-2 rounded-md hover:bg-muted cursor-pointer"
                    >
                      <Checkbox
                        checked={selectedClients.includes(client.id)}
                        onCheckedChange={() => toggleClient(client.id)}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{client.name}</p>
                        <p className="text-sm text-muted-foreground truncate">
                          {client.email}
                        </p>
                      </div>
                    </label>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No clients found
                  </p>
                )}
              </div>
            </ScrollArea>
          </div>

          {/* Delivery Options */}
          <div className="space-y-3">
            <Label>Delivery Method</Label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <Checkbox
                  checked={viaMessage}
                  onCheckedChange={(checked) => setViaMessage(!!checked)}
                />
                <MessageSquare className="h-4 w-4" />
                <span>In-App Message</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <Checkbox
                  checked={viaEmail}
                  onCheckedChange={(checked) => setViaEmail(!!checked)}
                />
                <Mail className="h-4 w-4" />
                <span>Email</span>
                <Badge variant="outline" className="ml-1">Coming Soon</Badge>
              </label>
            </div>
          </div>

          {/* Due Date */}
          <div className="space-y-2">
            <Label>Due Date (optional)</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !dueDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {dueDate ? format(dueDate, "PPP") : "No due date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={dueDate}
                  onSelect={setDueDate}
                  disabled={(date) => date < new Date()}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Custom Message */}
          {viaMessage && (
            <div className="space-y-2">
              <Label htmlFor="message">Custom Message (optional)</Label>
              <Textarea
                id="message"
                placeholder="Add a personal message to accompany the questionnaire..."
                value={customMessage}
                onChange={(e) => setCustomMessage(e.target.value)}
                rows={3}
              />
              <p className="text-xs text-muted-foreground">
                If left blank, a default message will be sent with the questionnaire link.
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSend} disabled={sendMutation.isPending}>
            {sendMutation.isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Send className="mr-2 h-4 w-4" />
            )}
            Send to {selectedClients.length} Client{selectedClients.length !== 1 ? "s" : ""}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
