"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { InviteClientDialog } from "@/components/invite-client-dialog";
import { AIChatDialog } from "@/components/ai-chat-dialog";
import {
  Users,
  Key,
  Calendar,
  MessageSquare,
  ArrowRight,
  Plus,
  Sparkles,
  Bot,
  Zap,
  TrendingUp,
  TrendingDown,
  Target,
} from "lucide-react";
import Link from "next/link";
import { trpc } from "@/lib/trpc/client";
import dynamic from "next/dynamic";
import { WeeklyGoalsGrid } from "@/components/dashboard/weekly-goals-grid";

// Dynamic import to avoid SSR issues with FullCalendar
const BookingCalendar = dynamic(
  () => import("@/components/calendar/booking-calendar").then((mod) => mod.BookingCalendar),
  { 
    ssr: false,
    loading: () => (
      <div className="h-[400px] flex items-center justify-center">
        <div className="text-muted-foreground">Loading calendar...</div>
      </div>
    )
  }
);

export default function DashboardPage() {
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const { data: stats, isLoading: statsLoading } = trpc.dashboard.getStats.useQuery();
  const { data: clientProgress, isLoading: progressLoading } = trpc.dashboard.getClientProgressOverview.useQuery();

  return (
    <div className="space-y-6">
      {/* Quick Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Clients</CardTitle>
            <Link
              href="/clients"
              className="rounded-md p-1 transition-colors hover:bg-muted"
              title="Go to Clients"
            >
              <Users className="h-4 w-4 text-muted-foreground" />
            </Link>
          </CardHeader>
          <CardContent>
            {statsLoading ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <>
                <div className="text-2xl font-bold">{stats?.totalClients || 0}</div>
                <p className="text-xs text-muted-foreground">
                  {stats?.activeClients || 0} active this week
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Active Licenses</CardTitle>
            <Link
              href="/clients"
              className="rounded-md p-1 transition-colors hover:bg-muted"
              title="Go to Clients"
            >
              <Key className="h-4 w-4 text-muted-foreground" />
            </Link>
          </CardHeader>
          <CardContent>
            {statsLoading ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <>
                <div className="text-2xl font-bold">{stats?.activeLicenses || 0}</div>
                <p className="text-xs text-muted-foreground">
                  {stats?.pendingLicenses || 0} pending invitations
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Upcoming Sessions</CardTitle>
            <Link
              href="/bookings"
              className="rounded-md p-1 transition-colors hover:bg-muted"
              title="Go to Bookings"
            >
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </Link>
          </CardHeader>
          <CardContent>
            {statsLoading ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <>
                <div className="text-2xl font-bold">{stats?.upcomingBookings || 0}</div>
                <p className="text-xs text-muted-foreground">
                  Scheduled this week
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Unread Messages</CardTitle>
            <Link
              href="/messages"
              className="rounded-md p-1 transition-colors hover:bg-muted"
              title="Go to Messages"
            >
              <MessageSquare className="h-4 w-4 text-muted-foreground" />
            </Link>
          </CardHeader>
          <CardContent>
            {statsLoading ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <>
                <div className="text-2xl font-bold">{stats?.unreadMessages || 0}</div>
                <p className="text-xs text-muted-foreground">
                  From your clients
                </p>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="flex flex-wrap gap-2">
        <InviteClientDialog
          open={isInviteOpen}
          onOpenChange={setIsInviteOpen}
          trigger={
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Invite Client
            </Button>
          }
        />
        <Button variant="outline" asChild>
          <Link href="/bookings/new">
            <Calendar className="mr-2 h-4 w-4" />
            New Booking
          </Link>
        </Button>
      </div>

      {/* AI Insights Card */}
      <Card className="bg-gradient-to-r from-violet-500/10 via-purple-500/10 to-fuchsia-500/10 border-violet-500/20">
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-lg">
                <Sparkles className="h-6 w-6 text-white" />
              </div>
              <div>
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  AI Coach Assistant
                  <Badge variant="secondary" className="bg-violet-500/20 text-violet-700 dark:text-violet-300 border-0">
                    <Zap className="h-3 w-3 mr-1" />
                    Powered by AI
                  </Badge>
                </h3>
                <p className="text-muted-foreground mt-1 max-w-lg">
                  Get instant insights about your clients. Analyze nutrition patterns, identify concerns,
                  and receive personalized coaching suggestions.
                </p>
              </div>
            </div>
            <div className="flex gap-2 md:flex-shrink-0">
              <AIChatDialog
                context="dashboard"
                trigger={
                  <Button className="bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700">
                    <Bot className="mr-2 h-4 w-4" />
                    Ask AI Assistant
                  </Button>
                }
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Client Progress Overview */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Client Progress</CardTitle>
                <CardDescription>Overview of client goal progress</CardDescription>
              </div>
              <Button variant="ghost" size="sm" asChild>
                <Link href="/clients">
                  View all
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {progressLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex items-center gap-4">
                    <Skeleton className="h-10 w-10 rounded-full" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-24" />
                      <Skeleton className="h-2 w-full" />
                    </div>
                  </div>
                ))}
              </div>
            ) : clientProgress && clientProgress.length > 0 ? (
              <div className="space-y-4">
                {clientProgress.slice(0, 5).map((client) => (
                  <Link
                    key={client.id}
                    href={`/clients/${client.id}`}
                    className="flex items-center gap-4 rounded-lg p-2 hover:bg-muted transition-colors"
                  >
                    <Avatar className="h-10 w-10">
                      <AvatarFallback>
                        {client.name.split(" ").map((n) => n[0]).join("")}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <p className="text-sm font-medium truncate">{client.name}</p>
                        <Badge variant={
                          client.goalType === "WEIGHT_LOSS" ? "default" :
                          client.goalType === "WEIGHT_GAIN" ? "secondary" : "outline"
                        } className="text-xs">
                          {client.goalType.replace("_", " ")}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2">
                        <Progress
                          value={Math.max(0, Math.min(100, client.progressPercentage || 0))}
                          className="h-2 flex-1"
                        />
                        <span className="text-xs text-muted-foreground w-12 text-right">
                          {client.progressPercentage !== null ? `${client.progressPercentage}%` : "N/A"}
                        </span>
                      </div>
                    </div>
                    {client.progressPercentage !== null && (
                      client.progressPercentage >= 50 ? (
                        <TrendingUp className="h-4 w-4 text-green-500" />
                      ) : (
                        <TrendingDown className="h-4 w-4 text-amber-500" />
                      )
                    )}
                  </Link>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Target className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No clients yet</p>
                <Button variant="link" className="mt-2" onClick={() => setIsInviteOpen(true)}>
                  Invite your first client
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Calendar Preview */}
        <Card className="overflow-hidden">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Schedule</CardTitle>
                <CardDescription>Your upcoming sessions</CardDescription>
              </div>
              <Button variant="outline" size="sm" asChild>
                <Link href="/bookings">
                  Full Calendar
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-0 pt-2">
            <div className="dashboard-calendar-wrapper">
              <BookingCalendar compact />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Weekly Goals Summary */}
      <div className="grid gap-6 lg:grid-cols-2">
        <WeeklyGoalsGrid />
      </div>
    </div>
  );
}
