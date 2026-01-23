"use client";

import { useState } from "react";
import Link from "next/link";
import { trpc } from "@/lib/trpc/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Calendar } from "@/components/ui/calendar";
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
  Loader2,
  Copy,
} from "lucide-react";
import { format, startOfMonth, endOfMonth, isSameDay, addHours } from "date-fns";
import { toast } from "sonner";

export default function BookingsPage() {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedBooking, setSelectedBooking] = useState<string | null>(null);

  const startDate = selectedDate ? startOfMonth(selectedDate) : undefined;
  const endDate = selectedDate ? endOfMonth(selectedDate) : undefined;

  const { data: bookings, isLoading, refetch } = trpc.booking.getAll.useQuery({
    status: statusFilter !== "all" ? (statusFilter as "SCHEDULED" | "COMPLETED" | "CANCELLED" | "NO_SHOW") : undefined,
    startDate,
    endDate,
  });

  const { data: stats } = trpc.booking.getStats.useQuery({ startDate, endDate });
  const { data: upcomingBookings } = trpc.booking.getUpcoming.useQuery({ limit: 5 });

  const updateBooking = trpc.booking.update.useMutation({
    onSuccess: () => {
      toast.success("Booking updated");
      refetch();
      setSelectedBooking(null);
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

  // Get dates with bookings for calendar highlighting
  const datesWithBookings = bookings?.map((b) => new Date(b.dateTime)) || [];

  const copyPaymentLink = (link: string) => {
    navigator.clipboard.writeText(link);
    toast.success("Payment link copied!");
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Bookings</h2>
          <p className="text-muted-foreground">
            Manage your coaching sessions and appointments
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

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Calendar */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-lg">Calendar</CardTitle>
          </CardHeader>
          <CardContent>
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={setSelectedDate}
              className="rounded-md border"
              modifiers={{
                booked: datesWithBookings,
              }}
              modifiersStyles={{
                booked: {
                  fontWeight: "bold",
                  backgroundColor: "hsl(var(--primary) / 0.1)",
                },
              }}
            />
          </CardContent>
        </Card>

        {/* Bookings List */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg">
                  {selectedDate ? format(selectedDate, "MMMM yyyy") : "All"} Bookings
                </CardTitle>
                <CardDescription>
                  {bookings?.length || 0} sessions this month
                </CardDescription>
              </div>
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
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
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
          </CardContent>
        </Card>
      </div>

      {/* Upcoming Sessions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Upcoming Sessions</CardTitle>
          <CardDescription>Your next scheduled appointments</CardDescription>
        </CardHeader>
        <CardContent>
          {upcomingBookings && upcomingBookings.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
              {upcomingBookings.map((booking) => (
                <div
                  key={booking.id}
                  className="p-4 border rounded-lg bg-muted/30"
                >
                  <div className="flex items-center justify-between mb-2">
                    <Badge variant="outline" className="text-xs">
                      {booking.type === "ONLINE" ? "Online" : "In-person"}
                    </Badge>
                    {getPaymentBadge(booking.paymentStatus)}
                  </div>
                  <p className="font-medium">{booking.client.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {format(new Date(booking.dateTime), "EEE, MMM d")}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {format(new Date(booking.dateTime), "h:mm a")}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground text-center py-4">
              No upcoming sessions scheduled
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
