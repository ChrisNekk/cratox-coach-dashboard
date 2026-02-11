"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { trpc } from "@/lib/trpc/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Bell,
  Plus,
  Send,
  Mail,
  Smartphone,
  Trophy,
  AlertTriangle,
  Clock,
  Heart,
  Loader2,
  Settings,
  Calendar,
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { toast } from "sonner";

type NotificationType =
  | "INACTIVITY"
  | "LICENSE_EXPIRING"
  | "GOAL_ACHIEVED"
  | "MISSED_TARGET"
  | "CUSTOM"
  | "WELCOME"
  | "BOOKING_REMINDER"
  | "KUDOS";

type NotificationChannel = "EMAIL" | "IN_APP" | "BOTH";

type NotificationTemplate = {
  id: string;
  name: string;
  type: NotificationType;
  channel: NotificationChannel;
  title: string;
  message: string;
  isDefault?: boolean;
  isBuiltIn?: boolean;
};

const TEMPLATE_STORAGE_KEY = "cratox.notificationTemplates.v1";

const BUILT_IN_TEMPLATES: NotificationTemplate[] = [
  {
    id: "builtin-kudos-1",
    name: "Kudos: Great progress",
    type: "KUDOS",
    channel: "BOTH",
    title: "Great progress!",
    message: "Keep it up, {{clientName}}! You're making excellent progress toward your goals.\n\n— {{coachName}}",
    isBuiltIn: true,
  },
  {
    id: "builtin-kudos-2",
    name: "Kudos: Consistency win",
    type: "KUDOS",
    channel: "BOTH",
    title: "Consistency pays off",
    message: "Awesome consistency this week, {{clientName}}. Small steps add up—let’s keep the momentum going!\n\n— {{coachName}}",
    isBuiltIn: true,
  },
  {
    id: "builtin-inactivity-1",
    name: "Inactivity: Quick check-in",
    type: "INACTIVITY",
    channel: "BOTH",
    title: "Quick check-in 👋",
    message: "Hey {{clientName}} — just checking in. How are things going this week? If you need help getting back on track, I’m here.\n\n— {{coachName}}",
    isBuiltIn: true,
  },
  {
    id: "builtin-booking-1",
    name: "Booking: Reminder",
    type: "BOOKING_REMINDER",
    channel: "BOTH",
    title: "Session reminder",
    message: "Reminder: you have a coaching session coming up soon. If anything changes, let me know.\n\n— {{coachName}}",
    isBuiltIn: true,
  },
  {
    id: "builtin-license-1",
    name: "License: Expiring soon",
    type: "LICENSE_EXPIRING",
    channel: "EMAIL",
    title: "Your Cratox AI access is expiring soon",
    message: "Hi {{clientName}},\n\nJust a heads-up that your Cratox AI access will expire soon. Reply to this email and I can help you renew.\n\n— {{coachName}}",
    isBuiltIn: true,
  },
  {
    id: "builtin-goal-1",
    name: "Goal: Congrats!",
    type: "GOAL_ACHIEVED",
    channel: "BOTH",
    title: "Goal achieved! 🏆",
    message: "Amazing work, {{clientName}}! You just hit a milestone. Let’s build on this and set the next goal.\n\n— {{coachName}}",
    isBuiltIn: true,
  },
  {
    id: "builtin-custom-1",
    name: "Custom: Weekly focus",
    type: "CUSTOM",
    channel: "BOTH",
    title: "This week’s focus",
    message: "Hi {{clientName}},\n\nThis week, let’s focus on:\n- Protein with each meal\n- 2L water daily\n- 3 short workouts\n\nReply with any blockers and we’ll adjust.\n\n— {{coachName}}",
    isBuiltIn: true,
  },
  {
    id: "builtin-custom-2",
    name: "Custom: Gentle nudge",
    type: "CUSTOM",
    channel: "BOTH",
    title: "Quick nudge 💪",
    message: "Hey {{clientName}} — quick nudge: aim for one small win today (walk, hydration, or a balanced meal). You’ve got this.\n\n— {{coachName}}",
    isBuiltIn: true,
  },
];

function safeParseTemplates(raw: string | null): NotificationTemplate[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as NotificationTemplate[]) : [];
  } catch {
    return [];
  }
}

function genId(prefix = "tpl") {
  const uuid = globalThis.crypto?.randomUUID?.();
  return uuid ? `${prefix}_${uuid}` : `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2)}`;
}

export default function NotificationsPage() {
  const [isSendOpen, setIsSendOpen] = useState(false);
  const [selectedClientIds, setSelectedClientIds] = useState<string[]>([]);
  const [formData, setFormData] = useState({
    type: "CUSTOM" as NotificationType,
    channel: "BOTH" as NotificationChannel,
    title: "",
    message: "",
  });
  const [customTemplates, setCustomTemplates] = useState<NotificationTemplate[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("__none__");
  const [saveTemplateOpen, setSaveTemplateOpen] = useState(false);
  const [manageTemplatesOpen, setManageTemplatesOpen] = useState(false);
  const [templateName, setTemplateName] = useState("");
  const [templateDefault, setTemplateDefault] = useState(true);

  const { data: notifications, isLoading, refetch } = trpc.notification.getAll.useQuery();
  const { data: clients } = trpc.clients.getAll.useQuery();

  const sendNotification = trpc.notification.send.useMutation({
    onSuccess: (data) => {
      toast.success(`Notification sent to ${data.count} clients!`);
      setIsSendOpen(false);
      resetForm();
      refetch();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to send notification");
    },
  });

  const resetForm = () => {
    setFormData({
      type: "CUSTOM",
      channel: "BOTH",
      title: "",
      message: "",
    });
    setSelectedClientIds([]);
    setSelectedTemplateId("__none__");
  };

  const handleSend = () => {
    if (selectedClientIds.length === 0) {
      toast.error("Please select at least one client");
      return;
    }
    if (!formData.title || !formData.message) {
      toast.error("Please fill in title and message");
      return;
    }
    sendNotification.mutate({
      clientIds: selectedClientIds,
      type: formData.type,
      channel: formData.channel,
      title: formData.title,
      message: formData.message,
    });
  };

  useEffect(() => {
    const stored = safeParseTemplates(localStorage.getItem(TEMPLATE_STORAGE_KEY));
    setCustomTemplates(stored);
  }, []);

  useEffect(() => {
    localStorage.setItem(TEMPLATE_STORAGE_KEY, JSON.stringify(customTemplates));
  }, [customTemplates]);

  const coachName = "Your coach";

  const applyTemplate = (tpl: string, clientName: string) => {
    return tpl
      .replaceAll("{{clientName}}", clientName)
      .replaceAll("{{coachName}}", coachName);
  };

  const templatesForCurrent = useMemo(() => {
    const all = [...BUILT_IN_TEMPLATES, ...customTemplates];
    return all.filter((t) => {
      if (t.type !== formData.type) return false;
      if (formData.channel === "BOTH") return true;
      return t.channel === "BOTH" || t.channel === formData.channel;
    });
  }, [customTemplates, formData.channel, formData.type]);

  const getDefaultTemplate = (type: NotificationType, channel: NotificationChannel) => {
    const exact = customTemplates.find((t) => t.isDefault && t.type === type && t.channel === channel);
    if (exact) return exact;
    if (channel !== "BOTH") {
      const both = customTemplates.find((t) => t.isDefault && t.type === type && t.channel === "BOTH");
      if (both) return both;
    }
    return null;
  };

  const defaultTemplate = getDefaultTemplate(formData.type, formData.channel);

  const loadTemplateIntoForm = (t: NotificationTemplate) => {
    setFormData({
      type: t.type,
      channel: t.channel,
      title: t.title,
      message: t.message,
    });
    setSelectedTemplateId(t.id);
  };

  const saveCurrentAsTemplate = () => {
    if (!templateName.trim()) {
      toast.error("Please give the template a name");
      return;
    }
    if (!formData.title.trim() || !formData.message.trim()) {
      toast.error("Please fill in title and message first");
      return;
    }

    setCustomTemplates((prev) => {
      const cleared = templateDefault
        ? prev.map((t) =>
            t.type === formData.type && t.channel === formData.channel ? { ...t, isDefault: false } : t
          )
        : prev;

      return [
        {
          id: genId("tpl"),
          name: templateName.trim(),
          type: formData.type,
          channel: formData.channel,
          title: formData.title,
          message: formData.message,
          isDefault: templateDefault,
        },
        ...cleared,
      ];
    });

    toast.success("Template saved");
    setSaveTemplateOpen(false);
    setTemplateName("");
    setTemplateDefault(true);
  };

  const setDefaultTemplateFor = (id: string) => {
    setCustomTemplates((prev) => {
      const target = prev.find((t) => t.id === id);
      if (!target) return prev;
      return prev.map((t) => {
        if (t.type === target.type && t.channel === target.channel) {
          return { ...t, isDefault: t.id === id };
        }
        return t;
      });
    });
  };

  const deleteTemplate = (id: string) => {
    setCustomTemplates((prev) => prev.filter((t) => t.id !== id));
  };

  const openSendWithType = (type: NotificationType) => {
    const def =
      customTemplates.find((t) => t.isDefault && t.type === type && t.channel === "BOTH") ??
      customTemplates.find((t) => t.isDefault && t.type === type);
    const built =
      BUILT_IN_TEMPLATES.find((t) => t.type === type && t.channel === "BOTH") ??
      BUILT_IN_TEMPLATES.find((t) => t.type === type);
    const tpl = def ?? built;

    setFormData({
      type,
      channel: tpl?.channel ?? "BOTH",
      title: tpl?.title ?? "",
      message: tpl?.message ?? "",
    });
    setSelectedTemplateId(tpl?.id ?? "__none__");
    setIsSendOpen(true);
  };

  const toggleClientSelection = (clientId: string) => {
    setSelectedClientIds((prev) =>
      prev.includes(clientId)
        ? prev.filter((id) => id !== clientId)
        : [...prev, clientId]
    );
  };

  const selectAllClients = () => {
    if (clients) {
      setSelectedClientIds(clients.map((c) => c.id));
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "INACTIVITY":
        return <Clock className="h-4 w-4 text-amber-500" />;
      case "LICENSE_EXPIRING":
        return <AlertTriangle className="h-4 w-4 text-orange-500" />;
      case "GOAL_ACHIEVED":
        return <Trophy className="h-4 w-4 text-green-500" />;
      case "KUDOS":
        return <Heart className="h-4 w-4 text-pink-500" />;
      default:
        return <Bell className="h-4 w-4 text-blue-500" />;
    }
  };

  const getChannelBadge = (channel: string) => {
    switch (channel) {
      case "EMAIL":
        return <Badge variant="outline"><Mail className="mr-1 h-3 w-3" />Email</Badge>;
      case "IN_APP":
        return <Badge variant="outline"><Smartphone className="mr-1 h-3 w-3" />In-App</Badge>;
      default:
        return <Badge variant="outline">Both</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Notifications</h2>
          <p className="text-muted-foreground">
            Send and manage notifications to your clients
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link href="/notifications/rules">
              <Settings className="mr-2 h-4 w-4" />
              Automation Rules
            </Link>
          </Button>
          <Dialog open={isSendOpen} onOpenChange={setIsSendOpen}>
            <DialogContent className="sm:max-w-[700px] p-0 gap-0 overflow-hidden">
              {/* Header */}
              <div className="px-6 py-5 border-b">
                <DialogTitle className="flex items-center gap-2.5 text-lg font-semibold">
                  <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-violet-100 dark:bg-violet-900/30">
                    <Send className="h-4 w-4 text-violet-600 dark:text-violet-400" />
                  </div>
                  Send Notification
                </DialogTitle>
                <DialogDescription className="text-sm text-muted-foreground mt-1">
                  Send a personalized notification to your clients
                </DialogDescription>
              </div>

              {/* Scrollable Content */}
              <div className="px-6 py-6 space-y-5 max-h-[calc(90vh-180px)] overflow-y-auto">
                {/* Template Selection */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-medium text-foreground">Template</Label>
                    <div className="flex items-center gap-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-8 px-3 text-sm text-muted-foreground hover:text-foreground"
                        onClick={() => setManageTemplatesOpen(true)}
                      >
                        Manage
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-8 px-3 text-sm text-muted-foreground hover:text-foreground"
                        onClick={() => setSaveTemplateOpen(true)}
                      >
                        Save as Template
                      </Button>
                    </div>
                  </div>
                  <Select
                    value={selectedTemplateId}
                    onValueChange={(value) => {
                      setSelectedTemplateId(value);
                      if (value === "__none__") return;
                      const t = [...BUILT_IN_TEMPLATES, ...customTemplates].find((x) => x.id === value);
                      if (t) loadTemplateIntoForm(t);
                    }}
                  >
                    <SelectTrigger className="h-11 bg-background">
                      <SelectValue placeholder="Select a template or write custom..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">No template (write custom)</SelectItem>
                      {defaultTemplate && (
                        <SelectItem value={defaultTemplate.id}>
                          Default: {defaultTemplate.name}
                        </SelectItem>
                      )}
                      {templatesForCurrent
                        .filter((t) => !t.isDefault)
                        .map((t) => (
                          <SelectItem key={t.id} value={t.id}>
                            {t.isBuiltIn ? "Built-in: " : ""}{t.name}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Notification Type */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-foreground">Notification Type</Label>
                  <Select
                    value={formData.type}
                    onValueChange={(value) => setFormData({ ...formData, type: value as typeof formData.type })}
                  >
                    <SelectTrigger className="h-11 bg-background">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="CUSTOM">Custom Notification</SelectItem>
                      <SelectItem value="KUDOS">Kudos / Encouragement</SelectItem>
                      <SelectItem value="INACTIVITY">Inactivity Reminder</SelectItem>
                      <SelectItem value="LICENSE_EXPIRING">License Expiring</SelectItem>
                      <SelectItem value="BOOKING_REMINDER">Booking Reminder</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Channel */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-foreground">Channel</Label>
                  <Select
                    value={formData.channel}
                    onValueChange={(value) => setFormData({ ...formData, channel: value as typeof formData.channel })}
                  >
                    <SelectTrigger className="h-11 bg-background">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="BOTH">Email & In-App</SelectItem>
                      <SelectItem value="EMAIL">Email Only</SelectItem>
                      <SelectItem value="IN_APP">In-App Only</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Title */}
                <div className="space-y-2">
                  <Label htmlFor="title" className="text-sm font-medium text-foreground">
                    Title <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="title"
                    placeholder="e.g., Great progress this week!"
                    className="h-11 bg-background"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  />
                </div>

                {/* Message */}
                <div className="space-y-2">
                  <Label htmlFor="message" className="text-sm font-medium text-foreground">
                    Message <span className="text-red-500">*</span>
                  </Label>
                  <Textarea
                    id="message"
                    placeholder={`Hi {{clientName}},\n\n[Your message here]\n\nBest regards,\n{{coachName}}`}
                    className="min-h-[200px] resize-y text-sm leading-relaxed bg-background"
                    value={formData.message}
                    onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                  />
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm text-muted-foreground">Insert variable:</span>
                    {["{{clientName}}", "{{coachName}}"].map((variable) => (
                      <button
                        key={variable}
                        type="button"
                        className="inline-flex items-center h-7 px-2.5 text-xs font-mono rounded-md border bg-muted/50 hover:bg-muted text-foreground transition-colors"
                        onClick={() => {
                          setFormData({ ...formData, message: formData.message + variable });
                        }}
                      >
                        {variable}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Tip Box */}
                <div className="rounded-xl bg-cyan-50 dark:bg-cyan-950/30 border border-cyan-200 dark:border-cyan-800 px-4 py-3.5">
                  <p className="text-sm text-cyan-700 dark:text-cyan-300 leading-relaxed">
                    <span className="font-semibold text-cyan-800 dark:text-cyan-200">Tip:</span> Use variables like{" "}
                    <code className="rounded-md bg-cyan-100 dark:bg-cyan-900/50 px-1.5 py-0.5 font-mono text-xs text-cyan-800 dark:text-cyan-200">
                      {"{{clientName}}"}
                    </code>{" "}
                    to personalize your messages. They will be replaced with actual client data when sent.
                  </p>
                </div>

                {/* Client Selection */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-medium text-foreground">
                      Select Recipients <span className="text-red-500">*</span>
                    </Label>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-8 px-3 text-sm text-muted-foreground hover:text-foreground"
                      onClick={selectAllClients}
                    >
                      Select All
                    </Button>
                  </div>
                  <div className="border rounded-xl max-h-[240px] overflow-y-auto bg-background">
                    {clients?.map((client: (typeof clients)[number]) => (
                      <div
                        key={client.id}
                        className={`flex items-center gap-3 px-4 py-3.5 cursor-pointer transition-colors border-b last:border-b-0 ${
                          selectedClientIds.includes(client.id)
                            ? "bg-violet-50 dark:bg-violet-950/20"
                            : "hover:bg-muted/50"
                        }`}
                        onClick={() => toggleClientSelection(client.id)}
                      >
                        <div className={`flex-shrink-0 h-5 w-5 rounded-md border-2 flex items-center justify-center transition-all ${
                          selectedClientIds.includes(client.id)
                            ? "bg-violet-600 border-violet-600"
                            : "border-gray-300 dark:border-gray-600"
                        }`}>
                          {selectedClientIds.includes(client.id) && (
                            <svg className="h-3 w-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                            </svg>
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium text-sm text-foreground">{client.name}</p>
                          <p className="text-sm text-muted-foreground truncate">{client.email}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {selectedClientIds.length} client(s) selected
                  </p>
                </div>
              </div>

              {/* Footer */}
              <div className="px-6 py-4 border-t bg-muted/30 flex items-center justify-end gap-3">
                <Button 
                  variant="outline" 
                  onClick={() => setIsSendOpen(false)}
                  className="h-10 px-5"
                >
                  Cancel
                </Button>
                <Button 
                  onClick={handleSend} 
                  disabled={sendNotification.isPending} 
                  className="h-10 px-5 bg-violet-600 hover:bg-violet-700 text-white gap-2"
                >
                  {sendNotification.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                  Send Notification
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Save Template Dialog */}
      <Dialog open={saveTemplateOpen} onOpenChange={setSaveTemplateOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Save Template</DialogTitle>
            <DialogDescription>
              Save the current title and message as a reusable template.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4">
            <div className="grid gap-2">
              <Label>Name</Label>
              <Input
                value={templateName}
                onChange={(e) => setTemplateName(e.target.value)}
                placeholder="e.g. My default kudos"
              />
            </div>
            <div className="flex items-center justify-between rounded-lg border p-3">
              <div>
                <p className="text-sm font-medium">Set as default</p>
                <p className="text-xs text-muted-foreground">
                  Use this template for one-click sending in this type/channel.
                </p>
              </div>
              <Switch checked={templateDefault} onCheckedChange={setTemplateDefault} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSaveTemplateOpen(false)}>
              Cancel
            </Button>
            <Button onClick={saveCurrentAsTemplate}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Manage Templates Dialog */}
      <Dialog open={manageTemplatesOpen} onOpenChange={setManageTemplatesOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Manage Templates</DialogTitle>
            <DialogDescription>
              Your saved templates (built-in templates can’t be edited here).
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            {customTemplates.length === 0 ? (
              <p className="text-sm text-muted-foreground">No saved templates yet.</p>
            ) : (
              <div className="space-y-2">
                {customTemplates.map((t) => (
                  <div key={t.id} className="flex items-center justify-between rounded-lg border p-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-medium text-sm truncate">{t.name}</p>
                        {t.isDefault && (
                          <Badge variant="secondary" className="text-xs">
                            Default
                          </Badge>
                        )}
                        <Badge variant="outline" className="text-xs">
                          {t.type}
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          {t.channel}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground truncate">{t.title}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-8"
                        onClick={() => setDefaultTemplateFor(t.id)}
                      >
                        Set default
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-8"
                        onClick={() => {
                          loadTemplateIntoForm(t);
                          setManageTemplatesOpen(false);
                          setIsSendOpen(true);
                        }}
                      >
                        Use
                      </Button>
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        className="h-8"
                        onClick={() => deleteTemplate(t.id)}
                      >
                        Delete
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Quick Templates */}
      <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-6">
        <Card
          className="cursor-pointer hover:border-primary transition-colors"
          onClick={() => {
            openSendWithType("KUDOS");
          }}
        >
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-pink-100 dark:bg-pink-900 flex items-center justify-center">
                <Heart className="h-5 w-5 text-pink-600 dark:text-pink-400" />
              </div>
              <div>
                <p className="font-medium text-sm">Send Kudos</p>
                <p className="text-xs text-muted-foreground">Encourage clients</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card
          className="cursor-pointer hover:border-primary transition-colors"
          onClick={() => {
            openSendWithType("INACTIVITY");
          }}
        >
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-amber-100 dark:bg-amber-900 flex items-center justify-center">
                <Clock className="h-5 w-5 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <p className="font-medium text-sm">Inactivity Alert</p>
                <p className="text-xs text-muted-foreground">Re-engage clients</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card
          className="cursor-pointer hover:border-primary transition-colors"
          onClick={() => {
            openSendWithType("GOAL_ACHIEVED");
          }}
        >
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-green-100 dark:bg-green-900 flex items-center justify-center">
                <Trophy className="h-5 w-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="font-medium text-sm">Goal Achieved</p>
                <p className="text-xs text-muted-foreground">Celebrate wins</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card
          className="cursor-pointer hover:border-primary transition-colors"
          onClick={() => {
            openSendWithType("LICENSE_EXPIRING");
          }}
        >
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-orange-100 dark:bg-orange-900 flex items-center justify-center">
                <AlertTriangle className="h-5 w-5 text-orange-600 dark:text-orange-400" />
              </div>
              <div>
                <p className="font-medium text-sm">License Expiring</p>
                <p className="text-xs text-muted-foreground">Renewal reminders</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card
          className="cursor-pointer hover:border-primary transition-colors"
          onClick={() => {
            openSendWithType("BOOKING_REMINDER");
          }}
        >
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-purple-100 dark:bg-purple-900 flex items-center justify-center">
                <Calendar className="h-5 w-5 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <p className="font-medium text-sm">Booking Reminder</p>
                <p className="text-xs text-muted-foreground">Session reminders</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card
          className="cursor-pointer hover:border-primary transition-colors"
          onClick={() => {
            openSendWithType("CUSTOM");
          }}
        >
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
                <Plus className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="font-medium text-sm">Custom</p>
                <p className="text-xs text-muted-foreground">Write your own</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Saved Templates */}
      {customTemplates.length > 0 && (
        <Card>
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg">Saved Templates</CardTitle>
                <CardDescription>
                  Your custom notification templates
                </CardDescription>
              </div>
              <Button variant="outline" size="sm" onClick={() => setManageTemplatesOpen(true)}>
                <Settings className="mr-2 h-4 w-4" />
                Manage
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {customTemplates.map((template) => (
                <div
                  key={template.id}
                  className="group relative flex items-center gap-3 p-4 rounded-xl border cursor-pointer hover:border-primary hover:bg-muted/50 transition-all"
                  onClick={() => {
                    loadTemplateIntoForm(template);
                    setIsSendOpen(true);
                  }}
                >
                  <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Bell className="h-5 w-5 text-primary" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-sm truncate">{template.name}</p>
                      {template.isDefault && (
                        <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                          Default
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground truncate">{template.title}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Notification History */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Notification History</CardTitle>
          <CardDescription>
            Recent notifications sent to your clients
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center gap-4 p-4 border rounded-lg">
                  <Skeleton className="h-10 w-10 rounded" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-48" />
                  </div>
                </div>
              ))}
            </div>
          ) : notifications && notifications.length > 0 ? (
            <div className="space-y-3">
              {notifications.map((notification) => (
                <div
                  key={notification.id}
                  className="flex items-start gap-4 p-4 border rounded-lg"
                >
                  <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center">
                    {getTypeIcon(notification.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-medium">{notification.title}</p>
                      {getChannelBadge(notification.channel)}
                    </div>
                    <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                      {notification.message}
                    </p>
                    <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                      <span>To: {notification.client.name}</span>
                      <span>•</span>
                      <span>
                        {notification.sentAt
                          ? formatDistanceToNow(new Date(notification.sentAt), { addSuffix: true })
                          : "Pending"}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <Bell className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
              <h3 className="text-lg font-medium mb-2">No notifications sent yet</h3>
              <p className="text-muted-foreground mb-4">
                Start engaging with your clients by sending notifications
              </p>
              <Button onClick={() => setIsSendOpen(true)}>
                <Send className="mr-2 h-4 w-4" />
                Send Your First Notification
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
