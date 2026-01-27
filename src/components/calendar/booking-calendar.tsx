"use client";

import { useState, useRef } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import listPlugin from "@fullcalendar/list";
import type { EventClickArg, DateSelectArg, DayHeaderContentArg } from "@fullcalendar/core";
import { format, isSameDay } from "date-fns";
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
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock, MapPin, Video, User, Trash2, Plus, Search, ChevronLeft, ChevronRight, ChevronDown, Settings } from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc/client";

const CALENDAR_SETTINGS_KEY = "cratox.calendarSettings.v1";

interface CalendarSettings {
  startHour: number;
  endHour: number;
}

const defaultSettings: CalendarSettings = {
  startHour: 6,
  endHour: 22,
};

function loadCalendarSettings(): CalendarSettings {
  if (typeof window === "undefined") return defaultSettings;
  try {
    const raw = localStorage.getItem(CALENDAR_SETTINGS_KEY);
    if (!raw) return defaultSettings;
    const parsed = JSON.parse(raw);
    return {
      startHour: typeof parsed.startHour === "number" ? parsed.startHour : defaultSettings.startHour,
      endHour: typeof parsed.endHour === "number" ? parsed.endHour : defaultSettings.endHour,
    };
  } catch {
    return defaultSettings;
  }
}

function saveCalendarSettings(settings: CalendarSettings) {
  try {
    localStorage.setItem(CALENDAR_SETTINGS_KEY, JSON.stringify(settings));
  } catch {
    // ignore
  }
}

// Generate hour options for the dropdown
const hourOptions = Array.from({ length: 24 }, (_, i) => ({
  value: i,
  label: i === 0 ? "12:00 AM" : i < 12 ? `${i}:00 AM` : i === 12 ? "12:00 PM" : `${i - 12}:00 PM`,
}));

interface BookingEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  extendedProps: {
    clientId: string;
    clientName: string;
    type: "ONE_ON_ONE" | "ONLINE";
    status: "SCHEDULED" | "COMPLETED" | "CANCELLED" | "NO_SHOW";
    location?: string;
    meetingLink?: string;
    price: number;
    notes?: string;
  };
}

interface BookingCalendarProps {
  onBookingCreated?: () => void;
  onBookingUpdated?: () => void;
  compact?: boolean;
}

// Event colors based on type/status - matching the reference design
const eventColors = [
  { bg: "#DBEAFE", border: "#3B82F6", text: "#1E40AF" }, // Blue
  { bg: "#D1FAE5", border: "#10B981", text: "#065F46" }, // Green
  { bg: "#FEF3C7", border: "#F59E0B", text: "#92400E" }, // Yellow
  { bg: "#F3F4F6", border: "#9CA3AF", text: "#374151" }, // Gray
  { bg: "#EDE9FE", border: "#8B5CF6", text: "#5B21B6" }, // Purple
  { bg: "#FCE7F3", border: "#EC4899", text: "#9D174D" }, // Pink
];

export function BookingCalendar({ onBookingCreated, onBookingUpdated, compact = false }: BookingCalendarProps) {
  const calendarRef = useRef<FullCalendar>(null);
  const [showEventDialog, setShowEventDialog] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<BookingEvent | null>(null);
  const [selectedDate, setSelectedDate] = useState<{ start: Date; end: Date } | null>(null);
  const [currentView, setCurrentView] = useState<string>("timeGridWeek");
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [newBooking, setNewBooking] = useState({
    clientId: "",
    type: "ONE_ON_ONE" as "ONE_ON_ONE" | "ONLINE",
    duration: "60",
    location: "",
    meetingLink: "",
    price: "",
    notes: "",
  });
  const [isNewClient, setIsNewClient] = useState(false);
  const [newClientData, setNewClientData] = useState({
    name: "",
    email: "",
  });

  // Time range settings - use lazy initialization
  const [timeSettings, setTimeSettings] = useState<CalendarSettings>(() => loadCalendarSettings());

  // Save settings when they change
  const updateTimeSettings = (newSettings: Partial<CalendarSettings>) => {
    const updated = { ...timeSettings, ...newSettings };
    // Ensure start is before end
    if (updated.startHour >= updated.endHour) {
      toast.error("Start time must be before end time");
      return;
    }
    setTimeSettings(updated);
    saveCalendarSettings(updated);
    toast.success("Calendar hours updated");
  };

  const { data: bookings, refetch: refetchBookings } = trpc.booking.getAll.useQuery();
  const { data: clients, refetch: refetchClients } = trpc.client.getAll.useQuery();
  
  const createClient = trpc.client.create.useMutation({
    onSuccess: (newClient) => {
      toast.success("Client created successfully");
      refetchClients();
      // Now create the booking with the new client
      if (selectedDate) {
        createBooking.mutate({
          clientId: newClient.id,
          type: newBooking.type,
          dateTime: selectedDate.start,
          duration: parseInt(newBooking.duration),
          location: newBooking.type === "ONE_ON_ONE" ? newBooking.location : undefined,
          meetingLink: newBooking.type === "ONLINE" ? newBooking.meetingLink : undefined,
          price: parseFloat(newBooking.price) || 0,
          description: newBooking.notes || undefined,
        });
      }
    },
    onError: (error) => {
      toast.error(error.message || "Failed to create client");
    },
  });
  
  const createBooking = trpc.booking.create.useMutation({
    onSuccess: () => {
      toast.success("Booking created successfully");
      setShowCreateDialog(false);
      refetchBookings();
      onBookingCreated?.();
      resetNewBooking();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to create booking");
    },
  });
  const updateBooking = trpc.booking.update.useMutation({
    onSuccess: () => {
      toast.success("Booking updated successfully");
      setShowEventDialog(false);
      refetchBookings();
      onBookingUpdated?.();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to update booking");
    },
  });
  const deleteBooking = trpc.booking.delete.useMutation({
    onSuccess: () => {
      toast.success("Booking cancelled");
      setShowEventDialog(false);
      refetchBookings();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to cancel booking");
    },
  });

  const resetNewBooking = () => {
    setNewBooking({
      clientId: "",
      type: "ONE_ON_ONE",
      duration: "60",
      location: "",
      meetingLink: "",
      price: "",
      notes: "",
    });
    setIsNewClient(false);
    setNewClientData({ name: "", email: "" });
  };

  // Get color based on client index for variety
  const getEventColor = (clientId: string) => {
    const hash = clientId.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return eventColors[hash % eventColors.length];
  };

  // Custom day header content
  const renderDayHeader = (arg: DayHeaderContentArg) => {
    const isToday = isSameDay(arg.date, new Date());
    
    return (
      <div className="calendar-day-header">
        <div className="calendar-day-header-content">
          <span className={`calendar-day-name ${isToday ? "today" : ""}`}>
            {format(arg.date, "EEE")}
          </span>
          <span className={`calendar-day-number ${isToday ? "today" : ""}`}>
            {format(arg.date, "d")}
          </span>
        </div>
      </div>
    );
  };

  // Transform bookings to calendar events
  const events = (bookings || []).map((booking) => {
    const color = getEventColor(booking.clientId);
    return {
      id: booking.id,
      title: booking.client.name,
      start: new Date(booking.dateTime),
      end: new Date(new Date(booking.dateTime).getTime() + booking.duration * 60000),
      backgroundColor: color.bg,
      borderColor: color.border,
      textColor: color.text,
      extendedProps: {
        clientId: booking.clientId,
        clientName: booking.client.name,
        type: booking.type,
        status: booking.status,
        location: booking.location || undefined,
        meetingLink: booking.meetingLink || undefined,
        price: booking.price,
        notes: booking.notes || undefined,
      },
    };
  });

  const handleEventClick = (clickInfo: EventClickArg) => {
    const event = clickInfo.event;
    setSelectedEvent({
      id: event.id,
      title: event.title,
      start: event.start!,
      end: event.end!,
      extendedProps: event.extendedProps as BookingEvent["extendedProps"],
    });
    setShowEventDialog(true);
  };

  const handleDateSelect = (selectInfo: DateSelectArg) => {
    setSelectedDate({ start: selectInfo.start, end: selectInfo.end });
    setShowCreateDialog(true);
  };

  const handleCreateBooking = () => {
    if (!selectedDate) {
      toast.error("Please select a date");
      return;
    }

    if (isNewClient) {
      // Validate new client data
      if (!newClientData.name.trim()) {
        toast.error("Please enter the client's name");
        return;
      }
      if (!newClientData.email.trim()) {
        toast.error("Please enter the client's email");
        return;
      }
      // Create client first, then booking will be created in onSuccess
      createClient.mutate({
        name: newClientData.name,
        email: newClientData.email,
      });
    } else {
      // Existing client
      if (!newBooking.clientId) {
        toast.error("Please select a client");
        return;
      }
      createBooking.mutate({
        clientId: newBooking.clientId,
        type: newBooking.type,
        dateTime: selectedDate.start,
        duration: parseInt(newBooking.duration),
        location: newBooking.type === "ONE_ON_ONE" ? newBooking.location : undefined,
        meetingLink: newBooking.type === "ONLINE" ? newBooking.meetingLink : undefined,
        price: parseFloat(newBooking.price) || 0,
        description: newBooking.notes || undefined,
      });
    }
  };

  const handleClientSelect = (value: string) => {
    if (value === "new-client") {
      setIsNewClient(true);
      setNewBooking({ ...newBooking, clientId: "" });
    } else {
      setIsNewClient(false);
      setNewBooking({ ...newBooking, clientId: value });
    }
  };

  const handleStatusChange = (status: string) => {
    if (!selectedEvent) return;
    updateBooking.mutate({
      id: selectedEvent.id,
      status: status as "SCHEDULED" | "COMPLETED" | "CANCELLED" | "NO_SHOW",
    });
  };

  const handleDeleteBooking = () => {
    if (!selectedEvent) return;
    if (confirm("Are you sure you want to cancel this booking?")) {
      deleteBooking.mutate({ id: selectedEvent.id });
    }
  };

  // Custom navigation handlers
  const handlePrev = () => {
    const calendarApi = calendarRef.current?.getApi();
    if (calendarApi) {
      calendarApi.prev();
      setCurrentDate(calendarApi.getDate());
    }
  };

  const handleNext = () => {
    const calendarApi = calendarRef.current?.getApi();
    if (calendarApi) {
      calendarApi.next();
      setCurrentDate(calendarApi.getDate());
    }
  };

  const handleToday = () => {
    const calendarApi = calendarRef.current?.getApi();
    if (calendarApi) {
      calendarApi.today();
      setCurrentDate(calendarApi.getDate());
    }
  };

  const handleViewChange = (view: string) => {
    const calendarApi = calendarRef.current?.getApi();
    if (calendarApi) {
      calendarApi.changeView(view);
      setCurrentView(view);
    }
  };

  const getViewLabel = () => {
    switch (currentView) {
      case "dayGridMonth":
        return "Month view";
      case "timeGridWeek":
        return "Week view";
      case "timeGridDay":
        return "Day view";
      case "listWeek":
        return "List view";
      default:
        return "Week view";
    }
  };

  const handleAddEvent = () => {
    setSelectedDate({ start: new Date(), end: new Date(Date.now() + 3600000) });
    setShowCreateDialog(true);
  };

  return (
    <div className={`calendar-container ${compact ? "compact" : ""}`}>
      {/* Custom Header */}
      <div className="calendar-header">
        <div className="calendar-header-left">
          <div className="calendar-date-badge">
            <span className="calendar-date-badge-month">{format(currentDate, "MMM").toUpperCase()}</span>
            <span className="calendar-date-badge-day">{format(currentDate, "d")}</span>
          </div>
          <div className="calendar-title-group">
            <h2 className="calendar-title">{format(currentDate, "MMMM yyyy")}</h2>
            <p className="calendar-subtitle">
              {format(currentDate, "MMM d, yyyy")} – {format(new Date(currentDate.getTime() + 6 * 24 * 60 * 60 * 1000), "MMM d, yyyy")}
            </p>
          </div>
        </div>
        
        <div className="calendar-header-right">
          {!compact && (
            <Button variant="ghost" size="icon" className="calendar-search-btn">
              <Search className="h-4 w-4" />
            </Button>
          )}
          
          <div className="calendar-nav-group">
            <Button variant="outline" size="icon" onClick={handlePrev} className="calendar-nav-btn">
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" onClick={handleToday} className="calendar-today-btn">
              Today
            </Button>
            <Button variant="outline" size="icon" onClick={handleNext} className="calendar-nav-btn">
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
          
          {!compact && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="calendar-view-btn">
                  {getViewLabel()}
                  <ChevronDown className="ml-2 h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => handleViewChange("dayGridMonth")}>
                  Month view
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleViewChange("timeGridWeek")}>
                  Week view
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleViewChange("timeGridDay")}>
                  Day view
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleViewChange("listWeek")}>
                  List view
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}

          {!compact && (
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="icon" title="Calendar settings">
                  <Settings className="h-4 w-4" />
                </Button>
              </PopoverTrigger>
              <PopoverContent align="end" className="w-64">
                <div className="space-y-4">
                  <div>
                    <h4 className="font-medium text-sm mb-2">Display Hours</h4>
                    <p className="text-xs text-muted-foreground mb-3">
                      Set your working hours to show on the calendar
                    </p>
                  </div>
                  <div className="space-y-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs">Start Time</Label>
                      <Select
                        value={String(timeSettings.startHour)}
                        onValueChange={(value) => updateTimeSettings({ startHour: parseInt(value) })}
                      >
                        <SelectTrigger className="h-8">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {hourOptions.slice(0, 20).map((opt) => (
                            <SelectItem key={opt.value} value={String(opt.value)}>
                              {opt.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">End Time</Label>
                      <Select
                        value={String(timeSettings.endHour)}
                        onValueChange={(value) => updateTimeSettings({ endHour: parseInt(value) })}
                      >
                        <SelectTrigger className="h-8">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {hourOptions.slice(4).map((opt) => (
                            <SelectItem key={opt.value} value={String(opt.value)}>
                              {opt.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    Currently showing {hourOptions[timeSettings.startHour].label} – {hourOptions[timeSettings.endHour].label}
                  </p>
                </div>
              </PopoverContent>
            </Popover>
          )}
          
          <Button onClick={handleAddEvent} className={compact ? "calendar-add-btn-compact" : "calendar-add-btn"}>
            <Plus className={compact ? "h-4 w-4" : "mr-2 h-4 w-4"} />
            {!compact && "Add event"}
          </Button>
        </div>
      </div>

      {/* Calendar */}
      <div className={compact ? "h-[320px]" : "h-[650px]"}>
        <FullCalendar
          ref={calendarRef}
          plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin, listPlugin]}
          initialView="timeGridWeek"
          headerToolbar={false}
          events={events}
          eventClick={handleEventClick}
          selectable={true}
          select={handleDateSelect}
          selectMirror={true}
          dayMaxEvents={compact ? 2 : 3}
          weekends={true}
          nowIndicator={true}
          firstDay={1}
          slotMinTime={compact ? "08:00:00" : `${String(timeSettings.startHour).padStart(2, "0")}:00:00`}
          slotMaxTime={compact ? "18:00:00" : `${String(timeSettings.endHour).padStart(2, "0")}:00:00`}
          allDaySlot={false}
          height="100%"
          slotDuration={compact ? "01:00:00" : "01:00:00"}
          slotLabelInterval="01:00:00"
          slotLabelFormat={{
            hour: "numeric",
            minute: "2-digit",
            meridiem: "short",
          }}
          eventTimeFormat={{
            hour: "numeric",
            minute: "2-digit",
            meridiem: "short",
          }}
          dayHeaderContent={renderDayHeader}
          eventContent={(eventInfo) => (
            <div className="calendar-event-content">
              <div className="calendar-event-title">{eventInfo.event.title}</div>
              {!compact && (
                <div className="calendar-event-time">
                  {format(eventInfo.event.start!, "h:mm a")}
                </div>
              )}
            </div>
          )}
        />
      </div>

      {/* Event Details Dialog */}
      <Dialog open={showEventDialog} onOpenChange={setShowEventDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Booking Details
            </DialogTitle>
            <DialogDescription>
              View and manage this booking
            </DialogDescription>
          </DialogHeader>
          {selectedEvent && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">{selectedEvent.extendedProps.clientName}</span>
                </div>
                <Badge
                  variant={
                    selectedEvent.extendedProps.status === "COMPLETED"
                      ? "default"
                      : selectedEvent.extendedProps.status === "CANCELLED"
                      ? "destructive"
                      : "secondary"
                  }
                >
                  {selectedEvent.extendedProps.status}
                </Badge>
              </div>

              <div className="grid gap-3">
                <div className="flex items-center gap-2 text-sm">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span>{format(selectedEvent.start, "EEEE, MMMM d, yyyy")}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span>
                    {format(selectedEvent.start, "h:mm a")} - {format(selectedEvent.end, "h:mm a")}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  {selectedEvent.extendedProps.type === "ONE_ON_ONE" ? (
                    <>
                      <MapPin className="h-4 w-4 text-muted-foreground" />
                      <span>{selectedEvent.extendedProps.location || "Location TBD"}</span>
                    </>
                  ) : (
                    <>
                      <Video className="h-4 w-4 text-muted-foreground" />
                      <span>Online Session</span>
                    </>
                  )}
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <span className="font-medium">Price:</span>
                  <span>${selectedEvent.extendedProps.price}</span>
                </div>
              </div>

              {selectedEvent.extendedProps.notes && (
                <div className="rounded-md bg-muted p-3">
                  <p className="text-sm text-muted-foreground">{selectedEvent.extendedProps.notes}</p>
                </div>
              )}

              <div className="space-y-2">
                <Label>Update Status</Label>
                <Select
                  value={selectedEvent.extendedProps.status}
                  onValueChange={handleStatusChange}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="SCHEDULED">Scheduled</SelectItem>
                    <SelectItem value="COMPLETED">Completed</SelectItem>
                    <SelectItem value="CANCELLED">Cancelled</SelectItem>
                    <SelectItem value="NO_SHOW">No Show</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
          <DialogFooter className="gap-2">
            <Button variant="destructive" onClick={handleDeleteBooking}>
              <Trash2 className="h-4 w-4 mr-2" />
              Cancel Booking
            </Button>
            <Button variant="outline" onClick={() => setShowEventDialog(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Booking Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Create New Booking
            </DialogTitle>
            <DialogDescription>
              {selectedDate && (
                <>Schedule a session on {format(selectedDate.start, "EEEE, MMMM d, yyyy")} at {format(selectedDate.start, "h:mm a")}</>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Client *</Label>
              <Select
                value={isNewClient ? "new-client" : newBooking.clientId}
                onValueChange={handleClientSelect}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a client" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="new-client">
                    <div className="flex items-center gap-2 text-primary font-medium">
                      <Plus className="h-4 w-4" />
                      Add new client
                    </div>
                  </SelectItem>
                  <div className="my-1 border-t" />
                  {clients?.map((client) => (
                    <SelectItem key={client.id} value={client.id}>
                      {client.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {isNewClient && (
              <div className="space-y-4 p-4 rounded-lg border bg-muted/30">
                <p className="text-sm font-medium text-muted-foreground">New Client Details</p>
                <div className="space-y-2">
                  <Label>Name *</Label>
                  <Input
                    placeholder="Client's full name"
                    value={newClientData.name}
                    onChange={(e) => setNewClientData({ ...newClientData, name: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Email *</Label>
                  <Input
                    type="email"
                    placeholder="client@example.com"
                    value={newClientData.email}
                    onChange={(e) => setNewClientData({ ...newClientData, email: e.target.value })}
                  />
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label>Session Type</Label>
              <Select
                value={newBooking.type}
                onValueChange={(value: "ONE_ON_ONE" | "ONLINE") =>
                  setNewBooking({ ...newBooking, type: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ONE_ON_ONE">
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4" />
                      1:1 In-Person
                    </div>
                  </SelectItem>
                  <SelectItem value="ONLINE">
                    <div className="flex items-center gap-2">
                      <Video className="h-4 w-4" />
                      Online Session
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Duration (minutes)</Label>
              <Select
                value={newBooking.duration}
                onValueChange={(value) => setNewBooking({ ...newBooking, duration: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="30">30 minutes</SelectItem>
                  <SelectItem value="45">45 minutes</SelectItem>
                  <SelectItem value="60">1 hour</SelectItem>
                  <SelectItem value="90">1.5 hours</SelectItem>
                  <SelectItem value="120">2 hours</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {newBooking.type === "ONE_ON_ONE" ? (
              <div className="space-y-2">
                <Label>Location</Label>
                <Input
                  placeholder="e.g., Gym, Office, etc."
                  value={newBooking.location}
                  onChange={(e) => setNewBooking({ ...newBooking, location: e.target.value })}
                />
              </div>
            ) : (
              <div className="space-y-2">
                <Label>Meeting Link</Label>
                <Input
                  placeholder="e.g., Zoom, Google Meet link"
                  value={newBooking.meetingLink}
                  onChange={(e) => setNewBooking({ ...newBooking, meetingLink: e.target.value })}
                />
              </div>
            )}

            <div className="space-y-2">
              <Label>Price ($)</Label>
              <Input
                type="number"
                placeholder="0.00"
                value={newBooking.price}
                onChange={(e) => setNewBooking({ ...newBooking, price: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label>Notes</Label>
              <Input
                placeholder="Any additional notes..."
                value={newBooking.notes}
                onChange={(e) => setNewBooking({ ...newBooking, notes: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleCreateBooking} 
              disabled={createBooking.isPending || createClient.isPending}
            >
              {createBooking.isPending || createClient.isPending 
                ? "Creating..." 
                : isNewClient 
                  ? "Create Client & Booking" 
                  : "Create Booking"
              }
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
