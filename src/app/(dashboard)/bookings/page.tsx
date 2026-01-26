"use client";

import { useState } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { trpc } from "@/lib/trpc/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Calendar as CalendarIcon,
  Plus,
  MoreHorizontal,
  Video,
  MapPin,
  Clock,
  DollarSign,
  CheckCircle,
  XCircle,
  AlertCircle,
  Copy,
  List,
  CalendarDays,
  Settings,
} from "lucide-react";
import { format, startOfMonth, endOfMonth } from "date-fns";
import { toast } from "sonner";

// Dynamic imports to avoid SSR issues
const BookingCalendar = dynamic(
  () => import("@/components/calendar/booking-calendar").then((mod) => mod.BookingCalendar),
  { 
    ssr: false,
    loading: () => (
      <div className="h-[700px] flex items-center justify-center">
        <div className="text-muted-foreground">Loading calendar...</div>
      </div>
    )
  }
);

const CalendarSync = dynamic(
  () => import("@/components/calendar/calendar-sync").then((mod) => mod.CalendarSync),
  { 
    ssr: false,
    loading: () => <Skeleton className="h-[200px] w-full" />
  }
);

export default function BookingsPage() {
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [activeTab, setActiveTab] = useState("calendar");

  const startDate = startOfMonth(new Date());
  const endDate = endOfMonth(new Date());

  const { data: bookings, isLoading, refetch } = trpc.booking.getAll.useQuery({
    status: statusFilter !== "all" ? (statusFilter as "SCHEDULED" | "COMPLETED" | "CANCELLED" | "NO_SHOW") : undefined,
    startDate,
    endDate,
  });

  const { data: stats } = trpc.booking.getStats.useQuery({ startDate, endDate });

  const updateBooking = trpc.booking.update.useMutation({
    onSuccess: () => {
      toast.success("Booking updated");
      refetch();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to update booking");
    },
  });

  const deleteBooking = trpc.booking.delete.useMutation({
    onSuccess: () => {
      toast.success("Booking deleted");
      refetch();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to delete booking");
    },
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "SCHEDULED":
        return <Badge variant="default">Scheduled</Badge>;
      case "COMPLETED":
        return <Badge variant="secondary" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">Completed</Badge>;
      case "CANCELLED":
        return <Badge variant="destructive">Cancelled</Badge>;
      case "NO_SHOW":
        return <Badge variant="outline" className="border-amber-500 text-amber-500">No Show</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getPaymentBadge = (status: string) => {
    switch (status) {
      case "PAID":
        return <Badge variant="default" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">Paid</Badge>;
      case "PENDING":
        return <Badge variant="secondary">Pending</Badge>;
      case "REFUNDED":
        return <Badge variant="outline">Refunded</Badge>;
      case "FAILED":
        return <Badge variant="destructive">Failed</Badge>;
      default:
        return null;
    }
  };

  const copyPaymentLink = (link: string) => {
    navigator.clipboard.writeText(link);
    toast.success("Payment link copied!");
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Bookings & Calendar</h2>
          <p className="text-muted-foreground">
            Manage your coaching sessions and sync with your calendars
          </p>
        </div>
        <Button asChild>
          <Link href="/bookings/new">
            <Plus className="mr-2 h-4 w-4" />
            New Booking
          </Link>
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Sessions</p>
                <p className="text-2xl font-bold">{stats?.total || 0}</p>
              </div>
              <CalendarIcon className="h-8 w-8 text-muted-foreground/50" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Completed</p>
                <p className="text-2xl font-bold text-green-600">{stats?.completed || 0}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-500/50" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Cancelled</p>
                <p className="text-2xl font-bold text-red-600">{stats?.cancelled || 0}</p>
              </div>
              <XCircle className="h-8 w-8 text-red-500/50" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Revenue</p>
                <p className="text-2xl font-bold">${stats?.revenue || 0}</p>
              </div>
              <DollarSign className="h-8 w-8 text-muted-foreground/50" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Calendar Sync */}
      <CalendarSync />

      {/* Main Content with Tabs */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Your Schedule</CardTitle>
              <CardDescription>
                View and manage all your coaching sessions
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <div className="flex items-center justify-between mb-4">
              <TabsList>
                <TabsTrigger value="calendar" className="flex items-center gap-2">
                  <CalendarDays className="h-4 w-4" />
                  Calendar View
                </TabsTrigger>
                <TabsTrigger value="list" className="flex items-center gap-2">
                  <List className="h-4 w-4" />
                  List View
                </TabsTrigger>
              </TabsList>
              
              {activeTab === "list" && (
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-[150px]">
                    <SelectValue placeholder="All Statuses" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="SCHEDULED">Scheduled</SelectItem>
                    <SelectItem value="COMPLETED">Completed</SelectItem>
                    <SelectItem value="CANCELLED">Cancelled</SelectItem>
                    <SelectItem value="NO_SHOW">No Show</SelectItem>
                  </SelectContent>
                </Select>
              )}
            </div>
            
            <TabsContent value="calendar" className="mt-0">
              <BookingCalendar onBookingCreated={refetch} onBookingUpdated={refetch} />
            </TabsContent>
            
            <TabsContent value="list" className="mt-0">
              {isLoading ? (
                <div className="space-y-4">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <Skeleton key={i} className="h-20 w-full" />
                  ))}
                </div>
              ) : bookings && bookings.length > 0 ? (
                <div className="space-y-3">
                  {bookings.map((booking) => (
                    <div
                      key={booking.id}
                      className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-center gap-4">
                        <div className="text-center min-w-[50px]">
                          <p className="text-2xl font-bold">
                            {format(new Date(booking.dateTime), "d")}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {format(new Date(booking.dateTime), "MMM")}
                          </p>
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-medium">{booking.client.name}</p>
                            {getStatusBadge(booking.status)}
                          </div>
                          <div className="flex items-center gap-3 text-sm text-muted-foreground mt-1">
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {format(new Date(booking.dateTime), "h:mm a")}
                            </span>
                            <span className="flex items-center gap-1">
                              {booking.type === "ONLINE" ? (
                                <Video className="h-3 w-3" />
                              ) : (
                                <MapPin className="h-3 w-3" />
                              )}
                              {booking.type === "ONLINE" ? "Online" : "In-person"}
                            </span>
                            <span>{booking.duration} min</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        {booking.price && (
                          <div className="text-right">
                            <p className="font-medium">${booking.price}</p>
                            {getPaymentBadge(booking.paymentStatus)}
                          </div>
                        )}
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {booking.status === "SCHEDULED" && (
                              <>
                                <DropdownMenuItem
                                  onClick={() => updateBooking.mutate({ id: booking.id, status: "COMPLETED" })}
                                >
                                  <CheckCircle className="mr-2 h-4 w-4" />
                                  Mark Completed
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => updateBooking.mutate({ id: booking.id, status: "NO_SHOW" })}
                                >
                                  <AlertCircle className="mr-2 h-4 w-4" />
                                  Mark No Show
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                              </>
                            )}
                            {booking.paymentLink && (
                              <DropdownMenuItem onClick={() => copyPaymentLink(booking.paymentLink!)}>
                                <Copy className="mr-2 h-4 w-4" />
                                Copy Payment Link
                              </DropdownMenuItem>
                            )}
                            {booking.paymentStatus === "PENDING" && (
                              <DropdownMenuItem
                                onClick={() => updateBooking.mutate({ id: booking.id, paymentStatus: "PAID" })}
                              >
                                <DollarSign className="mr-2 h-4 w-4" />
                                Mark as Paid
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuSeparator />
                            {booking.status === "SCHEDULED" && (
                              <DropdownMenuItem
                                className="text-destructive"
                                onClick={() => updateBooking.mutate({ id: booking.id, status: "CANCELLED" })}
                              >
                                <XCircle className="mr-2 h-4 w-4" />
                                Cancel Booking
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem
                              className="text-destructive"
                              onClick={() => {
                                if (confirm("Are you sure you want to delete this booking?")) {
                                  deleteBooking.mutate({ id: booking.id });
                                }
                              }}
                            >
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <CalendarIcon className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                  <h3 className="text-lg font-medium mb-2">No bookings found</h3>
                  <p className="text-muted-foreground mb-4">
                    Schedule your first session with a client
                  </p>
                  <Button asChild>
                    <Link href="/bookings/new">
                      <Plus className="mr-2 h-4 w-4" />
                      New Booking
                    </Link>
                  </Button>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Tips */}
      <Card className="bg-muted/30">
        <CardContent className="pt-6">
          <div className="flex items-start gap-4">
            <div className="p-2 rounded-full bg-primary/10">
              <CalendarIcon className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h3 className="font-medium mb-1">Calendar Tips</h3>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Click and drag on the calendar to create a new booking</li>
                <li>• Click on any event to view details or update its status</li>
                <li>• Connect your Google Calendar to automatically sync appointments</li>
                <li>• Use keyboard shortcuts: press "T" to go to today</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
