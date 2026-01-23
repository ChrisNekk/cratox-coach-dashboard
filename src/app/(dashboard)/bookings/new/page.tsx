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
import { ArrowLeft, CalendarIcon, Loader2 } from "lucide-react";
import { format, setHours, setMinutes } from "date-fns";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

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

  const { data: clients } = trpc.client.getAll.useQuery();
  const { data: packages } = trpc.package.getAll.useQuery({ isActive: true });

  const createBooking = trpc.booking.create.useMutation({
    onSuccess: () => {
      toast.success("Booking created successfully!");
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
                  {clients?.map((client) => (
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
                value={formData.packageId}
                onValueChange={(value) => setFormData({ ...formData, packageId: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a package" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">No package</SelectItem>
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
              <p className="text-xs text-muted-foreground">
                A payment link will be generated for the client
              </p>
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
