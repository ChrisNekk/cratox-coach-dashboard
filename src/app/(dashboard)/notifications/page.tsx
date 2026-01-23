"use client";

import { useState } from "react";
import Link from "next/link";
import { trpc } from "@/lib/trpc/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
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
  DialogTrigger,
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
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { toast } from "sonner";

export default function NotificationsPage() {
  const [isSendOpen, setIsSendOpen] = useState(false);
  const [selectedClientIds, setSelectedClientIds] = useState<string[]>([]);
  const [formData, setFormData] = useState({
    type: "CUSTOM" as const,
    channel: "BOTH" as "EMAIL" | "IN_APP" | "BOTH",
    title: "",
    message: "",
  });

  const { data: notifications, isLoading, refetch } = trpc.notification.getAll.useQuery();
  const { data: clients } = trpc.client.getAll.useQuery();

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
            <DialogTrigger asChild>
              <Button onClick={() => resetForm()}>
                <Send className="mr-2 h-4 w-4" />
                Send Notification
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Send Notification</DialogTitle>
                <DialogDescription>
                  Send a notification to one or more clients
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4 md:grid-cols-2">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Notification Type</Label>
                    <Select
                      value={formData.type}
                      onValueChange={(value) => setFormData({ ...formData, type: value as typeof formData.type })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="CUSTOM">Custom Message</SelectItem>
                        <SelectItem value="KUDOS">Kudos / Encouragement</SelectItem>
                        <SelectItem value="INACTIVITY">Inactivity Reminder</SelectItem>
                        <SelectItem value="LICENSE_EXPIRING">License Expiring</SelectItem>
                        <SelectItem value="BOOKING_REMINDER">Booking Reminder</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Channel</Label>
                    <Select
                      value={formData.channel}
                      onValueChange={(value) => setFormData({ ...formData, channel: value as typeof formData.channel })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="BOTH">Email & In-App</SelectItem>
                        <SelectItem value="EMAIL">Email Only</SelectItem>
                        <SelectItem value="IN_APP">In-App Only</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="title">Title</Label>
                    <Input
                      id="title"
                      placeholder="Great progress!"
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="message">Message</Label>
                    <Textarea
                      id="message"
                      placeholder="Keep up the amazing work..."
                      rows={4}
                      value={formData.message}
                      onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>Select Clients</Label>
                    <Button variant="ghost" size="sm" onClick={selectAllClients}>
                      Select All
                    </Button>
                  </div>
                  <div className="border rounded-lg h-[280px] overflow-y-auto">
                    {clients?.map((client) => (
                      <div
                        key={client.id}
                        className={`flex items-center justify-between p-3 cursor-pointer transition-colors border-b last:border-b-0 ${
                          selectedClientIds.includes(client.id)
                            ? "bg-primary/10"
                            : "hover:bg-muted"
                        }`}
                        onClick={() => toggleClientSelection(client.id)}
                      >
                        <div>
                          <p className="font-medium text-sm">{client.name}</p>
                          <p className="text-xs text-muted-foreground">{client.email}</p>
                        </div>
                        {selectedClientIds.includes(client.id) && (
                          <Badge variant="default" className="text-xs">Selected</Badge>
                        )}
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {selectedClientIds.length} client(s) selected
                  </p>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsSendOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleSend} disabled={sendNotification.isPending}>
                  {sendNotification.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Send ({selectedClientIds.length})
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Quick Templates */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card
          className="cursor-pointer hover:border-primary transition-colors"
          onClick={() => {
            setFormData({
              type: "KUDOS",
              channel: "BOTH",
              title: "Amazing progress!",
              message: "Keep up the incredible work! You're making great strides toward your goals.",
            });
            setIsSendOpen(true);
          }}
        >
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-pink-100 dark:bg-pink-900 flex items-center justify-center">
                <Heart className="h-5 w-5 text-pink-600 dark:text-pink-400" />
              </div>
              <div>
                <p className="font-medium">Send Kudos</p>
                <p className="text-xs text-muted-foreground">Encourage your clients</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card
          className="cursor-pointer hover:border-primary transition-colors"
          onClick={() => {
            setFormData({
              type: "INACTIVITY",
              channel: "BOTH",
              title: "We miss you!",
              message: "It's been a few days since we've seen you. Remember, consistency is key to reaching your goals!",
            });
            setIsSendOpen(true);
          }}
        >
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-amber-100 dark:bg-amber-900 flex items-center justify-center">
                <Clock className="h-5 w-5 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <p className="font-medium">Inactivity Alert</p>
                <p className="text-xs text-muted-foreground">Re-engage inactive clients</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card
          className="cursor-pointer hover:border-primary transition-colors"
          onClick={() => {
            setFormData({
              type: "GOAL_ACHIEVED",
              channel: "BOTH",
              title: "Congratulations!",
              message: "You've hit your weekly goal! This is a huge milestone. Let's keep the momentum going!",
            });
            setIsSendOpen(true);
          }}
        >
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-green-100 dark:bg-green-900 flex items-center justify-center">
                <Trophy className="h-5 w-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="font-medium">Goal Achieved</p>
                <p className="text-xs text-muted-foreground">Celebrate milestones</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card
          className="cursor-pointer hover:border-primary transition-colors"
          onClick={() => {
            setFormData({
              type: "CUSTOM",
              channel: "BOTH",
              title: "",
              message: "",
            });
            setIsSendOpen(true);
          }}
        >
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
                <Plus className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="font-medium">Custom Message</p>
                <p className="text-xs text-muted-foreground">Write your own</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

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
