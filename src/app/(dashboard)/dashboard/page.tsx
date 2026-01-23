"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Users,
  Key,
  Calendar,
  MessageSquare,
  TrendingUp,
  TrendingDown,
  Target,
  Activity,
  ArrowRight,
  Plus,
} from "lucide-react";
import Link from "next/link";
import { trpc } from "@/lib/trpc/client";
import { format } from "date-fns";

export default function DashboardPage() {
  const { data: stats, isLoading: statsLoading } = trpc.dashboard.getStats.useQuery();
  const { data: activity, isLoading: activityLoading } = trpc.dashboard.getRecentActivity.useQuery();
  const { data: clientProgress, isLoading: progressLoading } = trpc.dashboard.getClientProgressOverview.useQuery();

  return (
    <div className="space-y-6">
      {/* Quick Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Clients</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
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
            <Key className="h-4 w-4 text-muted-foreground" />
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
            <Calendar className="h-4 w-4 text-muted-foreground" />
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
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
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
        <Button asChild>
          <Link href="/licenses">
            <Plus className="mr-2 h-4 w-4" />
            Invite Client
          </Link>
        </Button>
        <Button variant="outline" asChild>
          <Link href="/bookings/new">
            <Calendar className="mr-2 h-4 w-4" />
            New Booking
          </Link>
        </Button>
        <Button variant="outline" asChild>
          <Link href="/ai-assistant">
            <Activity className="mr-2 h-4 w-4" />
            AI Insights
          </Link>
        </Button>
      </div>

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
                <Button variant="link" asChild className="mt-2">
                  <Link href="/licenses">Invite your first client</Link>
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Recent Activity</CardTitle>
                <CardDescription>Latest updates from your practice</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {activityLoading ? (
              <div className="space-y-4">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="flex items-center gap-4">
                    <Skeleton className="h-8 w-8 rounded" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-3 w-24" />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-4">
                {/* Recent Clients */}
                {activity?.recentClients.slice(0, 2).map((client) => (
                  <div key={client.id} className="flex items-center gap-4">
                    <div className="h-8 w-8 rounded bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
                      <Users className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium">New client: {client.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(client.createdAt), "MMM d, yyyy")}
                      </p>
                    </div>
                  </div>
                ))}

                {/* Recent Bookings */}
                {activity?.recentBookings.slice(0, 2).map((booking) => (
                  <div key={booking.id} className="flex items-center gap-4">
                    <div className="h-8 w-8 rounded bg-green-100 dark:bg-green-900 flex items-center justify-center">
                      <Calendar className="h-4 w-4 text-green-600 dark:text-green-400" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium">
                        Session with {booking.client.name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(booking.dateTime), "MMM d 'at' h:mm a")}
                      </p>
                    </div>
                    <Badge variant={booking.status === "SCHEDULED" ? "default" : "secondary"}>
                      {booking.status.toLowerCase()}
                    </Badge>
                  </div>
                ))}

                {/* If no activity */}
                {!activity?.recentClients.length && !activity?.recentBookings.length && (
                  <div className="text-center py-8 text-muted-foreground">
                    <Activity className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No recent activity</p>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Upcoming Bookings */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Upcoming Sessions</CardTitle>
              <CardDescription>Your next scheduled bookings</CardDescription>
            </div>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/bookings">
                View calendar
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {activityLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center gap-4 p-4 border rounded-lg">
                  <Skeleton className="h-12 w-12 rounded" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-48" />
                  </div>
                  <Skeleton className="h-8 w-20" />
                </div>
              ))}
            </div>
          ) : activity?.recentBookings && activity.recentBookings.length > 0 ? (
            <div className="space-y-3">
              {activity.recentBookings
                .filter((b) => new Date(b.dateTime) > new Date())
                .slice(0, 5)
                .map((booking) => (
                  <div
                    key={booking.id}
                    className="flex items-center gap-4 p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className="text-center min-w-[60px]">
                      <p className="text-2xl font-bold">
                        {format(new Date(booking.dateTime), "d")}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(booking.dateTime), "MMM")}
                      </p>
                    </div>
                    <div className="flex-1">
                      <p className="font-medium">{booking.client.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {format(new Date(booking.dateTime), "EEEE 'at' h:mm a")} •{" "}
                        {booking.type === "ONE_ON_ONE" ? "In-person" : "Online"}
                      </p>
                    </div>
                    <Button variant="outline" size="sm" asChild>
                      <Link href={`/bookings`}>View</Link>
                    </Button>
                  </div>
                ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No upcoming sessions</p>
              <Button variant="link" asChild className="mt-2">
                <Link href="/bookings/new">Schedule a session</Link>
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
