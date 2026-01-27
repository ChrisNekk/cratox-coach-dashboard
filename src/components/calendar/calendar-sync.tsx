"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Calendar, Check, Link2, RefreshCw, Settings, Unlink } from "lucide-react";

interface CalendarConnection {
  id: string;
  provider: "google" | "outlook" | "apple";
  email: string;
  connected: boolean;
  lastSync?: Date;
  syncEnabled: boolean;
}

// Mock connected calendars - in production, this would come from the database
const mockConnections: CalendarConnection[] = [
  {
    id: "1",
    provider: "google",
    email: "coach@gmail.com",
    connected: true,
    lastSync: new Date(Date.now() - 3600000), // 1 hour ago
    syncEnabled: true,
  },
];

const calendarProviders = [
  {
    id: "google",
    name: "Google Calendar",
    icon: "/icons/google-calendar.svg",
    color: "#4285F4",
    description: "Sync with your Google Calendar",
  },
  {
    id: "outlook",
    name: "Outlook Calendar",
    icon: "/icons/outlook.svg",
    color: "#0078D4",
    description: "Sync with Microsoft Outlook",
  },
  {
    id: "apple",
    name: "Apple Calendar",
    icon: "/icons/apple.svg",
    color: "#000000",
    description: "Sync with Apple Calendar",
  },
];

interface CalendarSyncProps {
  /** If true, renders without the outer Card wrapper (for use in dialogs) */
  compact?: boolean;
}

export function CalendarSync({ compact = false }: CalendarSyncProps) {
  const [connections, setConnections] = useState<CalendarConnection[]>(mockConnections);
  const [showConnectDialog, setShowConnectDialog] = useState(false);
  const [connecting, setConnecting] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);

  const handleConnect = async (provider: string) => {
    setConnecting(provider);
    
    // Mock OAuth flow - in production, this would redirect to the provider's OAuth page
    await new Promise((resolve) => setTimeout(resolve, 2000));
    
    const newConnection: CalendarConnection = {
      id: Date.now().toString(),
      provider: provider as "google" | "outlook" | "apple",
      email: `user@${provider}.com`,
      connected: true,
      lastSync: new Date(),
      syncEnabled: true,
    };
    
    setConnections([...connections, newConnection]);
    setConnecting(null);
    setShowConnectDialog(false);
    toast.success(`Connected to ${provider.charAt(0).toUpperCase() + provider.slice(1)} Calendar`);
  };

  const handleDisconnect = (connectionId: string) => {
    setConnections(connections.filter((c) => c.id !== connectionId));
    toast.success("Calendar disconnected");
  };

  const handleToggleSync = (connectionId: string) => {
    setConnections(
      connections.map((c) =>
        c.id === connectionId ? { ...c, syncEnabled: !c.syncEnabled } : c
      )
    );
  };

  const handleManualSync = async () => {
    setSyncing(true);
    await new Promise((resolve) => setTimeout(resolve, 2000));
    setConnections(
      connections.map((c) => ({ ...c, lastSync: new Date() }))
    );
    setSyncing(false);
    toast.success("Calendars synced successfully");
  };

  const getProviderIcon = (provider: string) => {
    switch (provider) {
      case "google":
        return (
          <div className="h-8 w-8 rounded-full bg-white flex items-center justify-center border">
            <svg viewBox="0 0 24 24" className="h-5 w-5">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
          </div>
        );
      case "outlook":
        return (
          <div className="h-8 w-8 rounded-full bg-[#0078D4] flex items-center justify-center">
            <Calendar className="h-4 w-4 text-white" />
          </div>
        );
      case "apple":
        return (
          <div className="h-8 w-8 rounded-full bg-black flex items-center justify-center">
            <Calendar className="h-4 w-4 text-white" />
          </div>
        );
      default:
        return null;
    }
  };

  const formatLastSync = (date?: Date) => {
    if (!date) return "Never";
    const diff = Date.now() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return "Just now";
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    return date.toLocaleDateString();
  };

  const content = (
    <>
      {connections.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>No calendars connected</p>
          <p className="text-sm">Connect a calendar to sync your bookings</p>
        </div>
      ) : (
        <div className="space-y-4">
          {connections.map((connection) => (
            <div
              key={connection.id}
              className="flex items-center justify-between p-4 rounded-lg border"
            >
              <div className="flex items-center gap-3">
                {getProviderIcon(connection.provider)}
                <div>
                  <p className="font-medium">
                    {connection.provider.charAt(0).toUpperCase() +
                      connection.provider.slice(1)}{" "}
                    Calendar
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {connection.email}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Last synced: {formatLastSync(connection.lastSync)}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <Label htmlFor={`sync-${connection.id}`} className="text-sm">
                    Auto-sync
                  </Label>
                  <Switch
                    id={`sync-${connection.id}`}
                    checked={connection.syncEnabled}
                    onCheckedChange={() => handleToggleSync(connection.id)}
                  />
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDisconnect(connection.id)}
                >
                  <Unlink className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );

  const actionButtons = (
    <div className="flex items-center gap-2">
      {connections.length > 0 && (
        <Button
          variant="outline"
          size="sm"
          onClick={handleManualSync}
          disabled={syncing}
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${syncing ? "animate-spin" : ""}`} />
          {syncing ? "Syncing..." : "Sync Now"}
        </Button>
      )}
      <Dialog open={showConnectDialog} onOpenChange={setShowConnectDialog}>
        <DialogTrigger asChild>
          <Button size="sm">
            <Calendar className="h-4 w-4 mr-2" />
            Connect Calendar
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Connect a Calendar</DialogTitle>
            <DialogDescription>
              Choose a calendar provider to sync your bookings
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            {calendarProviders.map((provider) => {
              const isConnected = connections.some(
                (c) => c.provider === provider.id
              );
              return (
                <button
                  key={provider.id}
                  className="w-full flex items-center justify-between p-4 rounded-lg border hover:bg-muted/50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  onClick={() => handleConnect(provider.id)}
                  disabled={isConnected || connecting === provider.id}
                >
                  <div className="flex items-center gap-3">
                    {getProviderIcon(provider.id)}
                    <div className="text-left">
                      <p className="font-medium">{provider.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {provider.description}
                      </p>
                    </div>
                  </div>
                  {isConnected ? (
                    <Badge variant="secondary">
                      <Check className="h-3 w-3 mr-1" />
                      Connected
                    </Badge>
                  ) : connecting === provider.id ? (
                    <Badge variant="outline">Connecting...</Badge>
                  ) : null}
                </button>
              );
            })}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowConnectDialog(false)}>
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );

  // Compact mode for use inside dialogs
  if (compact) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Connect your calendars to sync bookings automatically
          </p>
          {actionButtons}
        </div>
        {content}
      </div>
    );
  }

  // Full card mode
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Link2 className="h-5 w-5" />
              Calendar Sync
            </CardTitle>
            <CardDescription>
              Connect your calendars to sync bookings automatically
            </CardDescription>
          </div>
          {actionButtons}
        </div>
      </CardHeader>
      <CardContent>{content}</CardContent>
    </Card>
  );
}
