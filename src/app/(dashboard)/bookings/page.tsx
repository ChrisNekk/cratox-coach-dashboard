"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { trpc } from "@/lib/trpc/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
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
  Link2,
  ChevronDown,
} from "lucide-react";
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, startOfYear, endOfYear, subMonths } from "date-fns";
import { toast } from "sonner";

type RevenuePeriod = "week" | "month" | "year" | "all";

const revenuePeriodLabels: Record<RevenuePeriod, string> = {
  week: "This Week",
  month: "This Month",
  year: "This Year",
  all: "All Time",
};

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
  const [revenuePeriod, setRevenuePeriod] = useState<RevenuePeriod>("month");

  const startDate = startOfMonth(new Date());
  const endDate = endOfMonth(new Date());

  // Calculate date range for revenue based on selected period
  const revenueDateRange = useMemo(() => {
    const today = new Date();
    switch (revenuePeriod) {
      case "week":
        return { startDate: startOfWeek(today, { weekStartsOn: 1 }), endDate: endOfWeek(today, { weekStartsOn: 1 }) };
      case "month":
        return { startDate: startOfMonth(today), endDate: endOfMonth(today) };
      case "year":
        return { startDate: startOfYear(today), endDate: endOfYear(today) };
      case "all":
        return {}; // No date filter = all time
    }
  }, [revenuePeriod]);

  const { data: bookings, isLoading, refetch } = trpc.booking.getAll.useQuery({
    status: statusFilter !== "all" ? (statusFilter as "SCHEDULED" | "COMPLETED" | "CANCELLED" | "NO_SHOW") : undefined,
    startDate,
    endDate,
  });

  // Stats for this month (total, completed)
  const { data: stats } = trpc.booking.getStats.useQuery({ startDate, endDate });
  
  // Separate query for revenue with selected period
  const { data: revenueStats } = trpc.booking.getStats.useQuery(revenueDateRange);

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
    <div className="space-y-4">
      {/* Header with Stats and Actions */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-6">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Bookings</h2>
            <p className="text-sm text-muted-foreground">
              Manage your coaching sessions
            </p>
          </div>
          {/* Compact Stats */}
          <TooltipProvider>
            <div className="hidden md:flex items-center gap-4 text-sm">
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-muted cursor-help">
                    <CalendarIcon className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">{stats?.total || 0}</span>
                    <span className="text-muted-foreground">total</span>
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Total sessions scheduled this month</p>
                </TooltipContent>
              </Tooltip>
              
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-green-100 dark:bg-green-900/30 cursor-help">
                    <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
                    <span className="font-medium text-green-700 dark:text-green-300">{stats?.completed || 0}</span>
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Completed sessions this month</p>
                </TooltipContent>
              </Tooltip>
              
              <DropdownMenu>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <DropdownMenuTrigger asChild>
                      <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-muted hover:bg-muted/80 transition-colors cursor-pointer">
                        <DollarSign className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">${revenueStats?.revenue || 0}</span>
                        <ChevronDown className="h-3 w-3 text-muted-foreground ml-0.5" />
                      </button>
                    </DropdownMenuTrigger>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Revenue from completed sessions ({revenuePeriodLabels[revenuePeriod].toLowerCase()})</p>
                  </TooltipContent>
                </Tooltip>
                <DropdownMenuContent align="start">
                  {(Object.keys(revenuePeriodLabels) as RevenuePeriod[]).map((period) => (
                    <DropdownMenuItem
                      key={period}
                      onClick={() => setRevenuePeriod(period)}
                      className={revenuePeriod === period ? "bg-muted" : ""}
                    >
                      {revenuePeriodLabels[period]}
                      {revenuePeriod === period && <CheckCircle className="ml-auto h-4 w-4" />}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </TooltipProvider>
        </div>
        <div className="flex items-center gap-2">
          {/* Calendar Sync Dialog */}
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm">
                <Link2 className="mr-2 h-4 w-4" />
                Sync Calendar
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Calendar Sync</DialogTitle>
              </DialogHeader>
              <CalendarSync compact />
            </DialogContent>
          </Dialog>
          <Button asChild>
            <Link href="/bookings/new">
              <Plus className="mr-2 h-4 w-4" />
              New Booking
            </Link>
          </Button>
        </div>
      </div>

      {/* Mobile Stats */}
      <TooltipProvider>
        <div className="grid grid-cols-4 gap-2 md:hidden">
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex flex-col items-center p-2 rounded-md bg-muted">
                <span className="text-lg font-bold">{stats?.total || 0}</span>
                <span className="text-[10px] text-muted-foreground">Total</span>
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p>Sessions this month</p>
            </TooltipContent>
          </Tooltip>
          
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex flex-col items-center p-2 rounded-md bg-green-100 dark:bg-green-900/30">
                <span className="text-lg font-bold text-green-700 dark:text-green-300">{stats?.completed || 0}</span>
                <span className="text-[10px] text-green-600 dark:text-green-400">Done</span>
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p>Completed this month</p>
            </TooltipContent>
          </Tooltip>
          
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex flex-col items-center p-2 rounded-md bg-red-100 dark:bg-red-900/30">
                <span className="text-lg font-bold text-red-700 dark:text-red-300">{stats?.cancelled || 0}</span>
                <span className="text-[10px] text-red-600 dark:text-red-400">Cancelled</span>
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p>Cancelled this month</p>
            </TooltipContent>
          </Tooltip>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <div className="flex flex-col items-center p-2 rounded-md bg-muted cursor-pointer hover:bg-muted/80">
                <span className="text-lg font-bold">${revenueStats?.revenue || 0}</span>
                <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                  {revenuePeriod === "all" ? "All" : revenuePeriod === "week" ? "Week" : revenuePeriod === "year" ? "Year" : "Month"}
                  <ChevronDown className="h-2.5 w-2.5" />
                </span>
              </div>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {(Object.keys(revenuePeriodLabels) as RevenuePeriod[]).map((period) => (
                <DropdownMenuItem
                  key={period}
                  onClick={() => setRevenuePeriod(period)}
                  className={revenuePeriod === period ? "bg-muted" : ""}
                >
                  {revenuePeriodLabels[period]}
                  {revenuePeriod === period && <CheckCircle className="ml-auto h-4 w-4" />}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </TooltipProvider>

      {/* Main Calendar */}
      <Card className="overflow-hidden">
        <CardContent className="p-0">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <div className="flex items-center justify-between px-4 py-3 border-b">
              <TabsList>
                <TabsTrigger value="calendar" className="flex items-center gap-2">
                  <CalendarDays className="h-4 w-4" />
                  Calendar
                </TabsTrigger>
                <TabsTrigger value="list" className="flex items-center gap-2">
                  <List className="h-4 w-4" />
                  List
                </TabsTrigger>
              </TabsList>
              
              {activeTab === "list" && (
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-[140px] h-8">
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
              <div className="p-4">
                <BookingCalendar onBookingCreated={refetch} onBookingUpdated={refetch} />
              </div>
            </TabsContent>
            
            <TabsContent value="list" className="mt-0">
              <div className="p-4">
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
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
