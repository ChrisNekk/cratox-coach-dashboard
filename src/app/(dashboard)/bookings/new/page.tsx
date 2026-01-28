"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { trpc } from "@/lib/trpc/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ArrowLeft, CalendarIcon, Loader2, Mail, CreditCard, CalendarCheck, Info, Banknote, Link2 } from "lucide-react";
import { format, setHours, setMinutes } from "date-fns";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export default function NewBookingPage() {
  const router = useRouter();
  const [date, setDate] = useState<Date | undefined>(new Date());
  const [formData, setFormData] = useState({
    clientId: "",
    type: "ONE_ON_ONE" as "ONE_ON_ONE" | "ONLINE",
    duration: 60,
    hour: "10",
    minute: "00",
    title: "",
    description: "",
    location: "",
    meetingLink: "",
    price: "",
    packageId: "",
  });
  
  // Payment options
  const [paymentType, setPaymentType] = useState<"none" | "link" | "cash">("none");
  const [customPaymentLink, setCustomPaymentLink] = useState("");
  
  // Notification options
  const [sendCalendarInvite, setSendCalendarInvite] = useState(true);
  const [sendEmailConfirmation, setSendEmailConfirmation] = useState(true);

  const { data: clients } = trpc.client.getAll.useQuery();
  const { data: packages } = trpc.package.getAll.useQuery({ isActive: true });

  const createBooking = trpc.booking.create.useMutation({
    onSuccess: (data) => {
      const notifications = data.notificationsSent || [];
      let message = "Booking created successfully!";
      
      if (notifications.length > 0) {
        const parts: string[] = [];
        if (notifications.includes("email")) parts.push("email confirmation");
        if (notifications.includes("calendar")) parts.push("calendar invite");
        if (notifications.includes("payment_link")) parts.push("payment link");
        if (notifications.includes("paid_cash")) parts.push("marked as paid");
        
        if (parts.length > 0) {
          message += ` ${parts.join(", ")}.`;
        }
      }
      
      toast.success(message);
      router.push("/bookings");
    },
    onError: (error) => {
      toast.error(error.message || "Failed to create booking");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.clientId) {
      toast.error("Please select a client");
      return;
    }

    if (!date) {
      toast.error("Please select a date");
      return;
    }

    const dateTime = setMinutes(
      setHours(date, parseInt(formData.hour)),
      parseInt(formData.minute)
    );

    createBooking.mutate({
      clientId: formData.clientId,
      type: formData.type,
      dateTime,
      duration: formData.duration,
      title: formData.title || undefined,
      description: formData.description || undefined,
      location: formData.type === "ONE_ON_ONE" ? formData.location || undefined : undefined,
      meetingLink: formData.type === "ONLINE" ? formData.meetingLink || undefined : undefined,
      price: formData.price ? parseFloat(formData.price) : undefined,
      packageId: formData.packageId || undefined,
      // Payment options
      paymentLink: paymentType === "link" && customPaymentLink ? customPaymentLink : undefined,
      paidInCash: paymentType === "cash",
      // Notification options
      sendCalendarInvite,
      sendEmailConfirmation,
    });
  };

  const hours = Array.from({ length: 12 }, (_, i) => String(i + 8).padStart(2, "0")); // 8 AM to 7 PM
  const minutes = ["00", "15", "30", "45"];

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/bookings">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h2 className="text-2xl font-bold tracking-tight">New Booking</h2>
          <p className="text-muted-foreground">
            Schedule a new coaching session
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader>
            <CardTitle>Session Details</CardTitle>
            <CardDescription>
              Fill in the details for the coaching session
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Client Selection */}
            <div className="space-y-2">
              <Label htmlFor="client">Client *</Label>
              <Select
                value={formData.clientId}
                onValueChange={(value) => setFormData({ ...formData, clientId: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a client" />
                </SelectTrigger>
                <SelectContent>
                  {clients?.map((client: (typeof clients)[number]) => (
                    <SelectItem key={client.id} value={client.id}>
                      {client.name} ({client.email})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Session Type */}
            <div className="space-y-2">
              <Label>Session Type *</Label>
              <div className="grid grid-cols-2 gap-4">
                <Button
                  type="button"
                  variant={formData.type === "ONE_ON_ONE" ? "default" : "outline"}
                  className="h-auto py-4"
                  onClick={() => setFormData({ ...formData, type: "ONE_ON_ONE" })}
                >
                  <div className="text-center">
                    <p className="font-medium">In-Person</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Face-to-face session
                    </p>
                  </div>
                </Button>
                <Button
                  type="button"
                  variant={formData.type === "ONLINE" ? "default" : "outline"}
                  className="h-auto py-4"
                  onClick={() => setFormData({ ...formData, type: "ONLINE" })}
                >
                  <div className="text-center">
                    <p className="font-medium">Online</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Video call session
                    </p>
                  </div>
                </Button>
              </div>
            </div>

            {/* Date and Time */}
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Date *</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !date && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {date ? format(date, "PPP") : "Pick a date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={date}
                      onSelect={setDate}
                      initialFocus
                      disabled={(date) => date < new Date()}
                    />
                  </PopoverContent>
                </Popover>
              </div>
              <div className="space-y-2">
                <Label>Time *</Label>
                <div className="flex gap-2">
                  <Select
                    value={formData.hour}
                    onValueChange={(value) => setFormData({ ...formData, hour: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {hours.map((hour) => (
                        <SelectItem key={hour} value={hour}>
                          {parseInt(hour) > 12 ? parseInt(hour) - 12 : hour}
                          {parseInt(hour) >= 12 ? " PM" : " AM"}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select
                    value={formData.minute}
                    onValueChange={(value) => setFormData({ ...formData, minute: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {minutes.map((minute) => (
                        <SelectItem key={minute} value={minute}>
                          :{minute}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Duration */}
            <div className="space-y-2">
              <Label>Duration</Label>
              <Select
                value={String(formData.duration)}
                onValueChange={(value) => setFormData({ ...formData, duration: parseInt(value) })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="30">30 minutes</SelectItem>
                  <SelectItem value="45">45 minutes</SelectItem>
                  <SelectItem value="60">60 minutes</SelectItem>
                  <SelectItem value="90">90 minutes</SelectItem>
                  <SelectItem value="120">2 hours</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Location / Meeting Link */}
            {formData.type === "ONE_ON_ONE" ? (
              <div className="space-y-2">
                <Label htmlFor="location">Location</Label>
                <Input
                  id="location"
                  placeholder="123 Gym Street, City"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                />
              </div>
            ) : (
              <div className="space-y-2">
                <Label htmlFor="meetingLink">Meeting Link</Label>
                <Input
                  id="meetingLink"
                  placeholder="https://zoom.us/j/..."
                  value={formData.meetingLink}
                  onChange={(e) => setFormData({ ...formData, meetingLink: e.target.value })}
                />
              </div>
            )}

            {/* Title and Description */}
            <div className="space-y-2">
              <Label htmlFor="title">Session Title (Optional)</Label>
              <Input
                id="title"
                placeholder="Initial Consultation"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Notes (Optional)</Label>
              <Textarea
                id="description"
                placeholder="Any notes about this session..."
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </div>

            {/* Package Selection */}
            <div className="space-y-2">
              <Label>Package (Optional)</Label>
              <Select
                value={formData.packageId || "none"}
                onValueChange={(value) => setFormData({ ...formData, packageId: value === "none" ? "" : value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a package" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No package</SelectItem>
                  {packages?.map((pkg) => (
                    <SelectItem key={pkg.id} value={pkg.id}>
                      {pkg.name} (${pkg.price})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Price */}
            <div className="space-y-2">
              <Label htmlFor="price">Session Price (Optional)</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                  $
                </span>
                <Input
                  id="price"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="75.00"
                  className="pl-7"
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                />
              </div>
            </div>

            {/* Notification Options */}
            <div className="space-y-4 pt-4 border-t">
              <div className="flex items-center gap-2">
                <h4 className="font-medium text-sm">Client Notifications</h4>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs">
                      <p>Choose what notifications to send to the client when creating this booking</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              
              <div className="space-y-4">
                {/* Calendar Invite */}
                <div className="flex items-center justify-between rounded-lg border p-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900/30">
                      <CalendarCheck className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div>
                      <Label htmlFor="calendar-invite" className="font-medium cursor-pointer">
                        Send Calendar Invite
                      </Label>
                      <p className="text-xs text-muted-foreground">
                        Client will receive a calendar invite (.ics file)
                      </p>
                    </div>
                  </div>
                  <Switch
                    id="calendar-invite"
                    checked={sendCalendarInvite}
                    onCheckedChange={setSendCalendarInvite}
                  />
                </div>

                {/* Payment Options */}
                {formData.price && (
                  <div className="space-y-3 rounded-lg border p-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-100 dark:bg-green-900/30">
                        <CreditCard className="h-5 w-5 text-green-600 dark:text-green-400" />
                      </div>
                      <div>
                        <Label className="font-medium">Payment Collection</Label>
                        <p className="text-xs text-muted-foreground">
                          How will the client pay for this session?
                        </p>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-3 gap-2">
                      <Button
                        type="button"
                        variant={paymentType === "none" ? "default" : "outline"}
                        size="sm"
                        className="w-full"
                        onClick={() => setPaymentType("none")}
                      >
                        Later
                      </Button>
                      <Button
                        type="button"
                        variant={paymentType === "link" ? "default" : "outline"}
                        size="sm"
                        className="w-full gap-1"
                        onClick={() => setPaymentType("link")}
                      >
                        <Link2 className="h-3 w-3" />
                        Link
                      </Button>
                      <Button
                        type="button"
                        variant={paymentType === "cash" ? "default" : "outline"}
                        size="sm"
                        className="w-full gap-1"
                        onClick={() => setPaymentType("cash")}
                      >
                        <Banknote className="h-3 w-3" />
                        Cash
                      </Button>
                    </div>

                    {paymentType === "link" && (
                      <div className="space-y-2 pt-2">
                        <Label htmlFor="custom-payment-link" className="text-xs">
                          Payment Link (PayPal, Stripe, etc.)
                        </Label>
                        <Input
                          id="custom-payment-link"
                          placeholder="https://paypal.me/yourlink or https://buy.stripe.com/..."
                          value={customPaymentLink}
                          onChange={(e) => setCustomPaymentLink(e.target.value)}
                        />
                        <p className="text-xs text-muted-foreground">
                          This link will be included in the confirmation email
                        </p>
                      </div>
                    )}

                    {paymentType === "cash" && (
                      <div className="flex items-center gap-2 rounded-md bg-green-50 dark:bg-green-900/20 p-2 mt-2">
                        <Banknote className="h-4 w-4 text-green-600 dark:text-green-400" />
                        <p className="text-xs text-green-700 dark:text-green-300">
                          This booking will be marked as paid (${formData.price})
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {/* Email Confirmation */}
                <div className="flex items-center justify-between rounded-lg border p-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-100 dark:bg-purple-900/30">
                      <Mail className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                    </div>
                    <div>
                      <Label htmlFor="email-confirmation" className="font-medium cursor-pointer">
                        Send Email Confirmation
                      </Label>
                      <p className="text-xs text-muted-foreground">
                        {sendCalendarInvite || (paymentType === "link" && customPaymentLink)
                          ? "Includes calendar invite" + (paymentType === "link" && customPaymentLink ? " and payment link" : "")
                          : "Session details and confirmation"
                        }
                      </p>
                    </div>
                  </div>
                  <Switch
                    id="email-confirmation"
                    checked={sendEmailConfirmation}
                    onCheckedChange={setSendEmailConfirmation}
                  />
                </div>
              </div>

              {/* Summary of what will be sent */}
              {(sendCalendarInvite || sendEmailConfirmation || paymentType !== "none") && (
                <div className="rounded-lg bg-muted/50 p-3 text-sm">
                  <p className="font-medium mb-1">When you create this booking:</p>
                  <ul className="list-disc list-inside space-y-1 text-muted-foreground text-xs">
                    {sendEmailConfirmation && (
                      <li>An email confirmation will be sent to the client</li>
                    )}
                    {sendCalendarInvite && (
                      <li>A calendar invite will be attached to the email</li>
                    )}
                    {paymentType === "link" && customPaymentLink && (
                      <li>Your payment link will be included in the email</li>
                    )}
                    {paymentType === "cash" && (
                      <li>The booking will be marked as paid (cash)</li>
                    )}
                  </ul>
                </div>
              )}
            </div>

            <div className="flex gap-4 pt-4">
              <Button type="button" variant="outline" asChild className="flex-1">
                <Link href="/bookings">Cancel</Link>
              </Button>
              <Button type="submit" className="flex-1" disabled={createBooking.isPending}>
                {createBooking.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Create Booking
              </Button>
            </div>
          </CardContent>
        </Card>
      </form>
    </div>
  );
}
