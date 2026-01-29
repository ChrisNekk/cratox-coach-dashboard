"use client";

import { useState, useMemo } from "react";
import dynamic from "next/dynamic";
import { trpc } from "@/lib/trpc/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

// Dynamic imports for recharts to avoid SSR issues
const PieChart = dynamic(() => import("recharts").then((mod) => mod.PieChart), { ssr: false });
const Pie = dynamic(() => import("recharts").then((mod) => mod.Pie), { ssr: false });
const Cell = dynamic(() => import("recharts").then((mod) => mod.Cell), { ssr: false });
const BarChart = dynamic(() => import("recharts").then((mod) => mod.BarChart), { ssr: false });
const Bar = dynamic(() => import("recharts").then((mod) => mod.Bar), { ssr: false });
const XAxis = dynamic(() => import("recharts").then((mod) => mod.XAxis), { ssr: false });
const YAxis = dynamic(() => import("recharts").then((mod) => mod.YAxis), { ssr: false });
const RechartsTooltip = dynamic(() => import("recharts").then((mod) => mod.Tooltip), { ssr: false });
const ResponsiveContainer = dynamic(() => import("recharts").then((mod) => mod.ResponsiveContainer), { ssr: false });
const Legend = dynamic(() => import("recharts").then((mod) => mod.Legend), { ssr: false });
import {
  Package,
  Plus,
  MoreHorizontal,
  Edit,
  Trash2,
  DollarSign,
  Calendar,
  CheckCircle,
  Loader2,
  X,
  CreditCard,
  Banknote,
  Clock,
  XCircle,
  RefreshCw,
  Copy,
  ExternalLink,
  Receipt,
  Bell,
  Send,
  Mail,
  TrendingUp,
  Users,
  Award,
  Lightbulb,
  CalendarDays,
  Link2,
} from "lucide-react";
import { format, subDays, startOfDay, endOfDay, isAfter, isBefore, isEqual } from "date-fns";
import { toast } from "sonner";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

type AnalyticsTimeframe = "7d" | "30d" | "90d" | "all" | "custom";

// Chart colors
const CHART_COLORS = [
  "#3B82F6", // blue
  "#10B981", // green
  "#F59E0B", // yellow
  "#EF4444", // red
  "#8B5CF6", // purple
  "#EC4899", // pink
  "#06B6D4", // cyan
  "#F97316", // orange
];

type PaymentMethod = "CASH" | "BANK_TRANSFER" | "CHECK" | "OTHER";

const paymentMethodLabels: Record<PaymentMethod, string> = {
  CASH: "Cash",
  BANK_TRANSFER: "Bank Transfer",
  CHECK: "Check",
  OTHER: "Other",
};

export default function PackagesPage() {
  const [activeTab, setActiveTab] = useState("packages");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isManualPaymentOpen, setIsManualPaymentOpen] = useState(false);
  const [paymentStatusFilter, setPaymentStatusFilter] = useState<string>("all");
  const [selectedPackage, setSelectedPackage] = useState<{
    id: string;
    name: string;
    description?: string | null;
    price: number;
    sessions?: number | null;
    validityDays?: number | null;
    features?: string[] | null;
    isActive: boolean;
  } | null>(null);

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    price: "",
    sessions: "",
    validityDays: "",
    features: [] as string[],
    newFeature: "",
    paymentLink: "",
    isActive: true,
  });

  const [manualPaymentData, setManualPaymentData] = useState({
    clientId: "",
    amount: "",
    description: "",
    paymentMethod: "CASH" as PaymentMethod,
    packageId: "",
  });

  // Delete payment confirmation
  const [deletePaymentId, setDeletePaymentId] = useState<string | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  // Send reminder dialog
  const [isReminderDialogOpen, setIsReminderDialogOpen] = useState(false);
  const [reminderPayment, setReminderPayment] = useState<{
    id: string;
    clientName: string;
    clientEmail: string;
    amount: number;
    paymentLink?: string | null;
  } | null>(null);
  const [reminderTemplate, setReminderTemplate] = useState({
    subject: "",
    message: "",
    includePaymentLink: true,
  });

  // Analytics timeframe
  const [analyticsTimeframe, setAnalyticsTimeframe] = useState<AnalyticsTimeframe>("30d");
  const [customDateRange, setCustomDateRange] = useState<{
    from: Date | undefined;
    to: Date | undefined;
  }>({
    from: subDays(new Date(), 30),
    to: new Date(),
  });

  const { data: packages, isLoading, refetch } = trpc.package.getAll.useQuery();
  const { data: clients } = trpc.client.getAll.useQuery();
  const { data: paymentsData, isLoading: paymentsLoading, refetch: refetchPayments } = trpc.booking.getPayments.useQuery({
    paymentStatus: paymentStatusFilter !== "all" ? (paymentStatusFilter as "PENDING" | "PAID" | "REFUNDED" | "FAILED") : undefined,
  });

  const normalizeFeatures = (features: unknown): string[] => {
    if (!Array.isArray(features)) return [];
    return features.filter((f): f is string => typeof f === "string");
  };

  const createPackage = trpc.package.create.useMutation({
    onSuccess: () => {
      toast.success("Package created successfully!");
      setIsCreateOpen(false);
      resetForm();
      refetch();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to create package");
    },
  });

  const updatePackage = trpc.package.update.useMutation({
    onSuccess: () => {
      toast.success("Package updated successfully!");
      setIsEditOpen(false);
      setSelectedPackage(null);
      resetForm();
      refetch();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to update package");
    },
  });

  const deletePackage = trpc.package.delete.useMutation({
    onSuccess: () => {
      toast.success("Package deleted");
      refetch();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to delete package");
    },
  });

  const recordManualPayment = trpc.booking.recordManualPayment.useMutation({
    onSuccess: () => {
      toast.success("Payment recorded successfully!");
      setIsManualPaymentOpen(false);
      resetManualPaymentForm();
      refetchPayments();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to record payment");
    },
  });

  const updatePaymentStatus = trpc.booking.updatePaymentStatus.useMutation({
    onSuccess: () => {
      toast.success("Payment status updated");
      refetchPayments();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to update payment status");
    },
  });

  const deletePayment = trpc.booking.delete.useMutation({
    onSuccess: () => {
      toast.success("Payment deleted");
      setIsDeleteDialogOpen(false);
      setDeletePaymentId(null);
      refetchPayments();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to update payment status");
    },
  });

  const resetForm = () => {
    setFormData({
      name: "",
      description: "",
      price: "",
      sessions: "",
      validityDays: "",
      features: [],
      newFeature: "",
      paymentLink: "",
      isActive: true,
    });
  };

  const resetManualPaymentForm = () => {
    setManualPaymentData({
      clientId: "",
      amount: "",
      description: "",
      paymentMethod: "CASH",
      packageId: "",
    });
  };

  const handleRecordManualPayment = () => {
    if (!manualPaymentData.clientId || !manualPaymentData.amount || !manualPaymentData.description) {
      toast.error("Please fill in all required fields");
      return;
    }
    recordManualPayment.mutate({
      clientId: manualPaymentData.clientId,
      amount: parseFloat(manualPaymentData.amount),
      description: manualPaymentData.description,
      paymentMethod: manualPaymentData.paymentMethod,
      packageId: manualPaymentData.packageId || undefined,
    });
  };

  const copyPaymentLink = (link: string) => {
    navigator.clipboard.writeText(link);
    toast.success("Payment link copied!");
  };

  const getPaymentStatusBadge = (status: string) => {
    switch (status) {
      case "PAID":
        return <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"><CheckCircle className="mr-1 h-3 w-3" />Paid</Badge>;
      case "PENDING":
        return <Badge variant="secondary"><Clock className="mr-1 h-3 w-3" />Pending</Badge>;
      case "REFUNDED":
        return <Badge variant="outline"><RefreshCw className="mr-1 h-3 w-3" />Refunded</Badge>;
      case "FAILED":
        return <Badge variant="destructive"><XCircle className="mr-1 h-3 w-3" />Failed</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const isManualPayment = (title?: string | null) => {
    return title?.startsWith("Manual Payment:");
  };

  // Get date range based on timeframe
  const getDateRange = useMemo(() => {
    const now = new Date();
    switch (analyticsTimeframe) {
      case "7d":
        return { from: startOfDay(subDays(now, 7)), to: endOfDay(now) };
      case "30d":
        return { from: startOfDay(subDays(now, 30)), to: endOfDay(now) };
      case "90d":
        return { from: startOfDay(subDays(now, 90)), to: endOfDay(now) };
      case "custom":
        return {
          from: customDateRange.from ? startOfDay(customDateRange.from) : startOfDay(subDays(now, 30)),
          to: customDateRange.to ? endOfDay(customDateRange.to) : endOfDay(now),
        };
      case "all":
      default:
        return { from: null, to: null };
    }
  }, [analyticsTimeframe, customDateRange]);

  // Analytics computed data
  const analyticsData = useMemo(() => {
    if (!paymentsData?.payments) return null;

    // Filter payments by date range
    const allPayments = paymentsData.payments;
    const payments = getDateRange.from && getDateRange.to
      ? allPayments.filter((payment) => {
          const paymentDate = new Date(payment.createdAt);
          const from = getDateRange.from!;
          const to = getDateRange.to!;
          return (isAfter(paymentDate, from) || isEqual(paymentDate, from)) && 
                 (isBefore(paymentDate, to) || isEqual(paymentDate, to));
        })
      : allPayments;

    // Calculate filtered totals
    const filteredTotalAmount = payments.reduce((sum, p) => sum + (p.price || 0), 0);
    const filteredPaidAmount = payments
      .filter(p => p.paymentStatus === "PAID")
      .reduce((sum, p) => sum + (p.price || 0), 0);
    const filteredPaidCount = payments.filter(p => p.paymentStatus === "PAID").length;
    
    // Package revenue breakdown
    const packageRevenue: Record<string, { name: string; revenue: number; count: number }> = {};
    const clientSpending: Record<string, { name: string; email: string; total: number; count: number }> = {};
    const paymentMethods: Record<string, { name: string; count: number; amount: number }> = {
      link: { name: "Payment Link", count: 0, amount: 0 },
      manual: { name: "Manual/Cash", count: 0, amount: 0 },
    };
    const paymentStatuses: Record<string, number> = {
      PAID: 0,
      PENDING: 0,
      REFUNDED: 0,
      FAILED: 0,
    };

    payments.forEach((payment) => {
      const amount = payment.price || 0;
      
      // Package breakdown
      const packageName = payment.package?.name || "No Package";
      if (!packageRevenue[packageName]) {
        packageRevenue[packageName] = { name: packageName, revenue: 0, count: 0 };
      }
      packageRevenue[packageName].revenue += amount;
      packageRevenue[packageName].count += 1;

      // Client spending
      const clientId = payment.client.id;
      if (!clientSpending[clientId]) {
        clientSpending[clientId] = { 
          name: payment.client.name, 
          email: payment.client.email,
          total: 0, 
          count: 0 
        };
      }
      clientSpending[clientId].total += amount;
      clientSpending[clientId].count += 1;

      // Payment method
      if (isManualPayment(payment.title)) {
        paymentMethods.manual.count += 1;
        paymentMethods.manual.amount += amount;
      } else {
        paymentMethods.link.count += 1;
        paymentMethods.link.amount += amount;
      }

      // Payment status
      paymentStatuses[payment.paymentStatus] = (paymentStatuses[payment.paymentStatus] || 0) + 1;
    });

    // Sort and format data for charts
    const topPackages = Object.values(packageRevenue)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);

    const topClients = Object.values(clientSpending)
      .sort((a, b) => b.total - a.total)
      .slice(0, 5);

    const methodsData = Object.values(paymentMethods).filter(m => m.count > 0);

    const statusData = Object.entries(paymentStatuses)
      .filter(([, count]) => count > 0)
      .map(([status, count]) => ({ name: status, value: count }));

    // Calculate insights
    const insights: string[] = [];
    
    if (topPackages.length > 0 && topPackages[0].name !== "No Package") {
      insights.push(`"${topPackages[0].name}" is your best-selling package with $${topPackages[0].revenue.toFixed(0)} in revenue.`);
    }
    
    if (topClients.length > 0) {
      insights.push(`${topClients[0].name} is your top client with ${topClients[0].count} payments totaling $${topClients[0].total.toFixed(0)}.`);
    }
    
    const pendingRate = payments.length > 0 
      ? (paymentStatuses.PENDING / payments.length) * 100 
      : 0;
    if (pendingRate > 30) {
      insights.push(`${pendingRate.toFixed(0)}% of payments are pending. Consider sending reminders to improve cash flow.`);
    }

    const manualRate = payments.length > 0 
      ? (paymentMethods.manual.count / payments.length) * 100 
      : 0;
    if (manualRate > 50) {
      insights.push(`${manualRate.toFixed(0)}% of payments are manual. Consider using payment links for easier tracking.`);
    }

    const noPackageRevenue = packageRevenue["No Package"]?.revenue || 0;
    if (filteredTotalAmount > 0 && (noPackageRevenue / filteredTotalAmount) > 0.4) {
      insights.push(`${((noPackageRevenue / filteredTotalAmount) * 100).toFixed(0)}% of revenue is from sessions without packages. Consider creating packages to increase value.`);
    }

    return {
      topPackages,
      topClients,
      methodsData,
      statusData,
      insights,
      averagePayment: payments.length > 0 ? filteredTotalAmount / payments.length : 0,
      filteredStats: {
        totalAmount: filteredTotalAmount,
        totalCount: payments.length,
        paidAmount: filteredPaidAmount,
        paidCount: filteredPaidCount,
      },
    };
  }, [paymentsData, getDateRange]);

  const openDeleteConfirmation = (paymentId: string) => {
    setDeletePaymentId(paymentId);
    setIsDeleteDialogOpen(true);
  };

  const handleDeletePayment = () => {
    if (deletePaymentId) {
      deletePayment.mutate({ id: deletePaymentId });
    }
  };

  const openReminderDialog = (payment: {
    id: string;
    client: { name: string; email: string };
    price: number | null;
    paymentLink?: string | null;
  }) => {
    setReminderPayment({
      id: payment.id,
      clientName: payment.client.name,
      clientEmail: payment.client.email,
      amount: payment.price || 0,
      paymentLink: payment.paymentLink,
    });
    setReminderTemplate({
      subject: `Payment Reminder - $${payment.price?.toFixed(2) || "0.00"}`,
      message: `Hi ${payment.client.name},\n\nThis is a friendly reminder that you have an outstanding payment of $${payment.price?.toFixed(2) || "0.00"} for your coaching session.\n\n${payment.paymentLink ? "You can complete your payment using the link below." : "Please let me know how you'd like to proceed with the payment."}\n\nThank you!`,
      includePaymentLink: !!payment.paymentLink,
    });
    setIsReminderDialogOpen(true);
  };

  const handleSendReminder = () => {
    if (!reminderPayment) return;
    
    // In production, this would send an actual email
    console.log(`[Mock] Sending reminder to ${reminderPayment.clientEmail}`);
    console.log(`Subject: ${reminderTemplate.subject}`);
    console.log(`Message: ${reminderTemplate.message}`);
    if (reminderTemplate.includePaymentLink && reminderPayment.paymentLink) {
      console.log(`Payment Link: ${reminderPayment.paymentLink}`);
    }
    
    toast.success(`Reminder sent to ${reminderPayment.clientName}`);
    setIsReminderDialogOpen(false);
    setReminderPayment(null);
  };

  const handleCreate = () => {
    if (!formData.name || !formData.price) {
      toast.error("Please fill in required fields");
      return;
    }
    createPackage.mutate({
      name: formData.name,
      description: formData.description || undefined,
      price: parseFloat(formData.price),
      sessions: formData.sessions ? parseInt(formData.sessions) : undefined,
      validityDays: formData.validityDays ? parseInt(formData.validityDays) : undefined,
      features: formData.features.length > 0 ? formData.features : undefined,
      paymentLink: formData.paymentLink || undefined,
    });
  };

  const handleUpdate = () => {
    if (!selectedPackage || !formData.name || !formData.price) {
      toast.error("Please fill in required fields");
      return;
    }
    updatePackage.mutate({
      id: selectedPackage.id,
      name: formData.name,
      description: formData.description || undefined,
      price: parseFloat(formData.price),
      sessions: formData.sessions ? parseInt(formData.sessions) : undefined,
      validityDays: formData.validityDays ? parseInt(formData.validityDays) : undefined,
      features: formData.features.length > 0 ? formData.features : undefined,
      paymentLink: formData.paymentLink,
      isActive: formData.isActive,
    });
  };

  const openEditDialog = (pkg: any) => {
    const normalized = {
      id: pkg.id as string,
      name: pkg.name as string,
      description: (pkg.description as string | null) ?? null,
      price: pkg.price as number,
      sessions: (pkg.sessions as number | null) ?? null,
      validityDays: (pkg.validityDays as number | null) ?? null,
      features: normalizeFeatures(pkg.features),
      paymentLink: (pkg.paymentLink as string | null) ?? null,
      isActive: pkg.isActive as boolean,
    };

    setSelectedPackage(normalized);
    setFormData({
      name: normalized.name,
      description: normalized.description || "",
      price: String(normalized.price),
      sessions: normalized.sessions ? String(normalized.sessions) : "",
      validityDays: normalized.validityDays ? String(normalized.validityDays) : "",
      features: normalized.features || [],
      newFeature: "",
      paymentLink: normalized.paymentLink || "",
      isActive: normalized.isActive,
    });
    setIsEditOpen(true);
  };

  const addFeature = () => {
    if (formData.newFeature.trim()) {
      setFormData({
        ...formData,
        features: [...formData.features, formData.newFeature.trim()],
        newFeature: "",
      });
    }
  };

  const removeFeature = (index: number) => {
    setFormData({
      ...formData,
      features: formData.features.filter((_, i) => i !== index),
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Packages & Payments</h2>
          <p className="text-muted-foreground">
            Manage your coaching packages and track all payments
          </p>
        </div>
        <div className="flex gap-2">
          {activeTab === "payments" && (
            <Dialog open={isManualPaymentOpen} onOpenChange={setIsManualPaymentOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" onClick={() => resetManualPaymentForm()}>
                  <Receipt className="mr-2 h-4 w-4" />
                  Record Payment
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Record Manual Payment</DialogTitle>
                  <DialogDescription>
                    Record a payment made outside of the platform (cash, bank transfer, etc.)
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="payment-client">Client *</Label>
                    <Select
                      value={manualPaymentData.clientId}
                      onValueChange={(value) => setManualPaymentData({ ...manualPaymentData, clientId: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select a client" />
                      </SelectTrigger>
                      <SelectContent>
                        {clients?.map((client) => (
                          <SelectItem key={client.id} value={client.id}>
                            {client.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="payment-amount">Amount *</Label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                        <Input
                          id="payment-amount"
                          type="number"
                          step="0.01"
                          min="0"
                          placeholder="75.00"
                          className="pl-7"
                          value={manualPaymentData.amount}
                          onChange={(e) => setManualPaymentData({ ...manualPaymentData, amount: e.target.value })}
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="payment-method">Payment Method</Label>
                      <Select
                        value={manualPaymentData.paymentMethod}
                        onValueChange={(value) => setManualPaymentData({ ...manualPaymentData, paymentMethod: value as PaymentMethod })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="CASH">Cash</SelectItem>
                          <SelectItem value="BANK_TRANSFER">Bank Transfer</SelectItem>
                          <SelectItem value="CHECK">Check</SelectItem>
                          <SelectItem value="OTHER">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="payment-description">Description *</Label>
                    <Input
                      id="payment-description"
                      placeholder="e.g., Monthly coaching fee, Package purchase..."
                      value={manualPaymentData.description}
                      onChange={(e) => setManualPaymentData({ ...manualPaymentData, description: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="payment-package">Package (Optional)</Label>
                    <Select
                      value={manualPaymentData.packageId || "none"}
                      onValueChange={(value) => setManualPaymentData({ ...manualPaymentData, packageId: value === "none" ? "" : value })}
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
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsManualPaymentOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleRecordManualPayment} disabled={recordManualPayment.isPending}>
                    {recordManualPayment.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Record Payment
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => resetForm()}>
                <Plus className="mr-2 h-4 w-4" />
                Create Package
              </Button>
            </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Create New Package</DialogTitle>
              <DialogDescription>
                Design a coaching package to sell to your clients
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4 max-h-[60vh] overflow-y-auto">
              <div className="space-y-2">
                <Label htmlFor="name">Package Name *</Label>
                <Input
                  id="name"
                  placeholder="Transformation Package"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  placeholder="Complete 12-week fitness transformation..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="price">Price *</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                      $
                    </span>
                    <Input
                      id="price"
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="750"
                      className="pl-7"
                      value={formData.price}
                      onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="sessions">Sessions Included</Label>
                  <Input
                    id="sessions"
                    type="number"
                    min="0"
                    placeholder="12"
                    value={formData.sessions}
                    onChange={(e) => setFormData({ ...formData, sessions: e.target.value })}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="validityDays">Validity (Days)</Label>
                <Input
                  id="validityDays"
                  type="number"
                  min="0"
                  placeholder="90"
                  value={formData.validityDays}
                  onChange={(e) => setFormData({ ...formData, validityDays: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Features</Label>
                <div className="flex gap-2">
                  <Input
                    placeholder="Add a feature..."
                    value={formData.newFeature}
                    onChange={(e) => setFormData({ ...formData, newFeature: e.target.value })}
                    onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addFeature())}
                  />
                  <Button type="button" variant="outline" onClick={addFeature}>
                    Add
                  </Button>
                </div>
                {formData.features.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {formData.features.map((feature, index) => (
                      <Badge key={index} variant="secondary" className="gap-1">
                        {feature}
                        <button
                          type="button"
                          onClick={() => removeFeature(index)}
                          className="ml-1 hover:text-destructive"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="paymentLink">Payment Link</Label>
                <div className="relative">
                  <Link2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="paymentLink"
                    type="url"
                    placeholder="https://paypal.me/yourname or Stripe link"
                    className="pl-10"
                    value={formData.paymentLink}
                    onChange={(e) => setFormData({ ...formData, paymentLink: e.target.value })}
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Add your PayPal, Stripe, or other payment link for this package
                </p>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreate} disabled={createPackage.isPending}>
                {createPackage.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Create Package
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="packages" className="gap-2">
            <Package className="h-4 w-4" />
            Packages
          </TabsTrigger>
          <TabsTrigger value="payments" className="gap-2">
            <CreditCard className="h-4 w-4" />
            Payments
            {paymentsData?.stats.pendingCount ? (
              <Badge variant="secondary" className="ml-1 h-5 px-1.5">
                {paymentsData.stats.pendingCount}
              </Badge>
            ) : null}
          </TabsTrigger>
        </TabsList>

        {/* Packages Tab */}
        <TabsContent value="packages" className="mt-6">
          {isLoading ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3].map((i) => (
                <Card key={i}>
                  <CardHeader>
                    <Skeleton className="h-6 w-32" />
                    <Skeleton className="h-4 w-48" />
                  </CardHeader>
                  <CardContent>
                    <Skeleton className="h-20 w-full" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : packages && packages.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {packages.map((pkg) => (
                <Card key={pkg.id} className={!pkg.isActive ? "opacity-60" : ""}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="flex items-center gap-2">
                          {pkg.name}
                          {!pkg.isActive && (
                            <Badge variant="secondary" className="text-xs">
                              Inactive
                            </Badge>
                          )}
                        </CardTitle>
                        <CardDescription className="mt-1">
                          {pkg.description || "No description"}
                        </CardDescription>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => openEditDialog(pkg)}>
                            <Edit className="mr-2 h-4 w-4" />
                            Edit Package
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-destructive"
                            onClick={() => {
                              if (confirm(`Are you sure you want to delete "${pkg.name}"?`)) {
                                deletePackage.mutate({ id: pkg.id });
                              }
                            }}
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete Package
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-baseline gap-1">
                      <span className="text-3xl font-bold">${pkg.price}</span>
                    </div>
                    <div className="space-y-2 text-sm">
                      {pkg.sessions && (
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Calendar className="h-4 w-4" />
                          {pkg.sessions} sessions
                        </div>
                      )}
                      {pkg.validityDays && (
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Calendar className="h-4 w-4" />
                          Valid for {pkg.validityDays} days
                        </div>
                      )}
                    </div>
                    {pkg.features && Array.isArray(pkg.features) && pkg.features.length > 0 && (
                      <div className="space-y-2">
                        {(pkg.features as string[]).slice(0, 4).map((feature, index) => (
                          <div key={index} className="flex items-center gap-2 text-sm">
                            <CheckCircle className="h-4 w-4 text-green-500" />
                            {feature}
                          </div>
                        ))}
                        {(pkg.features as string[]).length > 4 && (
                          <p className="text-xs text-muted-foreground">
                            +{(pkg.features as string[]).length - 4} more features
                          </p>
                        )}
                      </div>
                    )}
                    
                    {/* Payment Link Section */}
                    {pkg.paymentLink ? (
                      <div className="pt-2 border-t">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 min-w-0">
                            <Link2 className="h-4 w-4 text-green-600 dark:text-green-400 flex-shrink-0" />
                            <span className="text-xs text-muted-foreground truncate">
                              {pkg.paymentLink.replace(/^https?:\/\//, '').slice(0, 25)}...
                            </span>
                          </div>
                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 w-7 p-0"
                              onClick={(e) => {
                                e.stopPropagation();
                                navigator.clipboard.writeText(pkg.paymentLink || '');
                                toast.success("Payment link copied!");
                              }}
                            >
                              <Copy className="h-3 w-3" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 w-7 p-0"
                              onClick={(e) => {
                                e.stopPropagation();
                                window.open(pkg.paymentLink || '', '_blank');
                              }}
                            >
                              <ExternalLink className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="pt-2 border-t">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="w-full h-7 text-xs text-muted-foreground hover:text-foreground"
                          onClick={(e) => {
                            e.stopPropagation();
                            openEditDialog(pkg);
                          }}
                        >
                          <Link2 className="h-3 w-3 mr-1" />
                          Add payment link
                        </Button>
                      </div>
                    )}
                  </CardContent>
                  <CardFooter>
                    <p className="text-xs text-muted-foreground">
                      {pkg._count.bookings} bookings
                    </p>
                  </CardFooter>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="py-12">
                <div className="text-center">
                  <Package className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                  <h3 className="text-lg font-medium mb-2">No packages yet</h3>
                  <p className="text-muted-foreground mb-4">
                    Create packages to offer bundled coaching services
                  </p>
                  <Button onClick={() => setIsCreateOpen(true)}>
                    <Plus className="mr-2 h-4 w-4" />
                    Create Your First Package
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Payments Tab */}
        <TabsContent value="payments" className="mt-6 space-y-6">
          {/* Payment Stats */}
          <div className="grid gap-4 md:grid-cols-4">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900/30">
                    <DollarSign className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Total Revenue</p>
                    <p className="text-2xl font-bold">${paymentsData?.stats.totalAmount.toFixed(2) || "0.00"}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-green-100 dark:bg-green-900/30">
                    <CheckCircle className="h-6 w-6 text-green-600 dark:text-green-400" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Paid</p>
                    <p className="text-2xl font-bold">${paymentsData?.stats.paidAmount.toFixed(2) || "0.00"}</p>
                    <p className="text-xs text-muted-foreground">{paymentsData?.stats.paidCount || 0} payments</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-yellow-100 dark:bg-yellow-900/30">
                    <Clock className="h-6 w-6 text-yellow-600 dark:text-yellow-400" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Pending</p>
                    <p className="text-2xl font-bold">${paymentsData?.stats.pendingAmount.toFixed(2) || "0.00"}</p>
                    <p className="text-xs text-muted-foreground">{paymentsData?.stats.pendingCount || 0} awaiting</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-muted">
                    <CreditCard className="h-6 w-6 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Total Transactions</p>
                    <p className="text-2xl font-bold">{paymentsData?.stats.totalCount || 0}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Payments Table */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Payment History</CardTitle>
                  <CardDescription>Track all payments and payment links</CardDescription>
                </div>
                <Select value={paymentStatusFilter} onValueChange={setPaymentStatusFilter}>
                  <SelectTrigger className="w-[140px]">
                    <SelectValue placeholder="Filter by status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="PAID">Paid</SelectItem>
                    <SelectItem value="PENDING">Pending</SelectItem>
                    <SelectItem value="REFUNDED">Refunded</SelectItem>
                    <SelectItem value="FAILED">Failed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent>
              {paymentsLoading ? (
                <div className="space-y-4">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <Skeleton key={i} className="h-12 w-full" />
                  ))}
                </div>
              ) : paymentsData?.payments && paymentsData.payments.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Client</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paymentsData.payments.map((payment) => (
                      <TableRow key={payment.id}>
                        <TableCell className="font-medium">
                          {format(new Date(payment.createdAt), "MMM d, yyyy")}
                        </TableCell>
                        <TableCell>{payment.client.name}</TableCell>
                        <TableCell className="max-w-[200px] truncate">
                          {isManualPayment(payment.title) 
                            ? payment.title?.replace("Manual Payment: ", "") 
                            : payment.title || "Session payment"
                          }
                        </TableCell>
                        <TableCell>
                          {isManualPayment(payment.title) ? (
                            <Badge variant="outline" className="gap-1">
                              <Banknote className="h-3 w-3" />
                              Manual
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="gap-1">
                              <CreditCard className="h-3 w-3" />
                              Link
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="font-medium">${payment.price?.toFixed(2)}</TableCell>
                        <TableCell>{getPaymentStatusBadge(payment.paymentStatus)}</TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              {payment.paymentLink && (
                                <>
                                  <DropdownMenuItem onClick={() => copyPaymentLink(payment.paymentLink!)}>
                                    <Copy className="mr-2 h-4 w-4" />
                                    Copy Payment Link
                                  </DropdownMenuItem>
                                  <DropdownMenuItem asChild>
                                    <a href={payment.paymentLink} target="_blank" rel="noopener noreferrer">
                                      <ExternalLink className="mr-2 h-4 w-4" />
                                      Open Link
                                    </a>
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                </>
                              )}
                              {payment.paymentStatus === "PENDING" && (
                                <>
                                  <DropdownMenuItem
                                    onClick={() => updatePaymentStatus.mutate({ id: payment.id, paymentStatus: "PAID" })}
                                  >
                                    <CheckCircle className="mr-2 h-4 w-4" />
                                    Mark as Paid
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={() => openReminderDialog(payment)}
                                  >
                                    <Bell className="mr-2 h-4 w-4" />
                                    Send Reminder
                                  </DropdownMenuItem>
                                </>
                              )}
                              {payment.paymentStatus === "PAID" && (
                                <DropdownMenuItem
                                  onClick={() => updatePaymentStatus.mutate({ id: payment.id, paymentStatus: "REFUNDED" })}
                                >
                                  <RefreshCw className="mr-2 h-4 w-4" />
                                  Mark as Refunded
                                </DropdownMenuItem>
                              )}
                              {payment.paymentStatus !== "PENDING" && payment.paymentStatus !== "PAID" && (
                                <DropdownMenuItem
                                  onClick={() => updatePaymentStatus.mutate({ id: payment.id, paymentStatus: "PENDING" })}
                                >
                                  <Clock className="mr-2 h-4 w-4" />
                                  Mark as Pending
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                className="text-destructive"
                                onClick={() => openDeleteConfirmation(payment.id)}
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Delete Payment
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-12">
                  <CreditCard className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                  <h3 className="text-lg font-medium mb-2">No payments yet</h3>
                  <p className="text-muted-foreground mb-4">
                    Payments will appear here when you create bookings with prices or record manual payments
                  </p>
                  <Button onClick={() => setIsManualPaymentOpen(true)}>
                    <Receipt className="mr-2 h-4 w-4" />
                    Record Your First Payment
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Payment Analytics */}
          {analyticsData && paymentsData?.payments && paymentsData.payments.length > 0 && (
            <div className="space-y-6">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-muted-foreground" />
                  <h3 className="text-lg font-semibold">Payment Analytics</h3>
                  <Badge variant="secondary" className="ml-2">
                    {analyticsData.filteredStats.totalCount} payments
                  </Badge>
                </div>
                
                {/* Timeframe Selector */}
                <div className="flex items-center gap-2">
                  <div className="flex rounded-lg border p-1">
                    {[
                      { value: "7d", label: "7D" },
                      { value: "30d", label: "30D" },
                      { value: "90d", label: "90D" },
                      { value: "all", label: "All" },
                    ].map((option) => (
                      <Button
                        key={option.value}
                        variant={analyticsTimeframe === option.value ? "default" : "ghost"}
                        size="sm"
                        className="h-7 px-3 text-xs"
                        onClick={() => setAnalyticsTimeframe(option.value as AnalyticsTimeframe)}
                      >
                        {option.label}
                      </Button>
                    ))}
                  </div>
                  
                  {/* Custom Date Range */}
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant={analyticsTimeframe === "custom" ? "default" : "outline"}
                        size="sm"
                        className={cn(
                          "h-8 gap-1 text-xs",
                          analyticsTimeframe === "custom" && "bg-primary text-primary-foreground"
                        )}
                      >
                        <CalendarDays className="h-3 w-3" />
                        {analyticsTimeframe === "custom" && customDateRange.from && customDateRange.to
                          ? `${format(customDateRange.from, "MMM d")} - ${format(customDateRange.to, "MMM d")}`
                          : "Custom"
                        }
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="end">
                      <div className="p-3 border-b">
                        <p className="text-sm font-medium">Select date range</p>
                      </div>
                      <div className="flex">
                        <div className="border-r p-2">
                          <p className="text-xs text-muted-foreground mb-2 px-2">From</p>
                          <CalendarComponent
                            mode="single"
                            selected={customDateRange.from}
                            onSelect={(date) => {
                              setCustomDateRange(prev => ({ ...prev, from: date }));
                              setAnalyticsTimeframe("custom");
                            }}
                            disabled={(date) => date > new Date() || (customDateRange.to ? date > customDateRange.to : false)}
                          />
                        </div>
                        <div className="p-2">
                          <p className="text-xs text-muted-foreground mb-2 px-2">To</p>
                          <CalendarComponent
                            mode="single"
                            selected={customDateRange.to}
                            onSelect={(date) => {
                              setCustomDateRange(prev => ({ ...prev, to: date }));
                              setAnalyticsTimeframe("custom");
                            }}
                            disabled={(date) => date > new Date() || (customDateRange.from ? date < customDateRange.from : false)}
                          />
                        </div>
                      </div>
                    </PopoverContent>
                  </Popover>
                </div>
              </div>

              {/* Period Summary */}
              {analyticsTimeframe !== "all" && (
                <div className="text-sm text-muted-foreground">
                  Showing data from{" "}
                  <span className="font-medium text-foreground">
                    {getDateRange.from ? format(getDateRange.from, "MMM d, yyyy") : ""}
                  </span>
                  {" "}to{" "}
                  <span className="font-medium text-foreground">
                    {getDateRange.to ? format(getDateRange.to, "MMM d, yyyy") : ""}
                  </span>
                  {" "}— Total: <span className="font-medium text-foreground">${analyticsData.filteredStats.totalAmount.toFixed(2)}</span>
                </div>
              )}

              {/* Analytics Grid */}
              <div className="grid gap-6 md:grid-cols-2">
                {/* Package Revenue Breakdown */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Package className="h-4 w-4" />
                      Revenue by Package
                    </CardTitle>
                    <CardDescription>Which packages generate the most revenue</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {analyticsData.topPackages.length > 0 ? (
                      <div className="h-[250px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={analyticsData.topPackages}
                              dataKey="revenue"
                              nameKey="name"
                              cx="50%"
                              cy="50%"
                              outerRadius={80}
                              label={({ name, percent = 0 }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                              labelLine={false}
                            >
                              {analyticsData.topPackages.map((_, index) => (
                                <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                              ))}
                            </Pie>
                            <RechartsTooltip 
                              formatter={(value?: number) => [`$${(value ?? 0).toFixed(2)}`, "Revenue"] as [string, string]}
                            />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground text-center py-8">No package data available</p>
                    )}
                  </CardContent>
                </Card>

                {/* Top Clients */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Users className="h-4 w-4" />
                      Top Clients by Revenue
                    </CardTitle>
                    <CardDescription>Your highest paying clients</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {analyticsData.topClients.length > 0 ? (
                      <div className="h-[250px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={analyticsData.topClients} layout="vertical">
                            <XAxis type="number" tickFormatter={(value) => `$${value}`} />
                            <YAxis 
                              type="category" 
                              dataKey="name" 
                              width={80}
                              tick={{ fontSize: 12 }}
                            />
                            <RechartsTooltip 
                              formatter={(value?: number) => [`$${(value ?? 0).toFixed(2)}`, "Total Spent"] as [string, string]}
                            />
                            <Bar dataKey="total" fill="#3B82F6" radius={[0, 4, 4, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground text-center py-8">No client data available</p>
                    )}
                  </CardContent>
                </Card>

                {/* Payment Methods */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base flex items-center gap-2">
                      <CreditCard className="h-4 w-4" />
                      Payment Methods
                    </CardTitle>
                    <CardDescription>How clients are paying</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {analyticsData.methodsData.length > 0 ? (
                      <div className="h-[200px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={analyticsData.methodsData}
                              dataKey="count"
                              nameKey="name"
                              cx="50%"
                              cy="50%"
                              innerRadius={40}
                              outerRadius={70}
                              label={({ name, percent = 0 }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                              labelLine={false}
                            >
                              <Cell fill="#10B981" />
                              <Cell fill="#F59E0B" />
                            </Pie>
                            <RechartsTooltip 
                              formatter={(value?: number, name?: string, item?: any) => {
                                const amount = item?.payload?.amount ?? 0;
                                return [`${value ?? 0} payments ($${amount.toFixed(2)})`, name ?? ""] as [string, string];
                              }}
                            />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground text-center py-8">No payment method data</p>
                    )}
                  </CardContent>
                </Card>

                {/* Payment Status Distribution */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Award className="h-4 w-4" />
                      Payment Status
                    </CardTitle>
                    <CardDescription>Status breakdown of all payments</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {analyticsData.statusData.length > 0 ? (
                      <div className="h-[200px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={analyticsData.statusData}
                              dataKey="value"
                              nameKey="name"
                              cx="50%"
                              cy="50%"
                              innerRadius={40}
                              outerRadius={70}
                              label={({ name, percent = 0 }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                              labelLine={false}
                            >
                              {analyticsData.statusData.map((entry, index) => {
                                const colors: Record<string, string> = {
                                  PAID: "#10B981",
                                  PENDING: "#F59E0B",
                                  REFUNDED: "#6B7280",
                                  FAILED: "#EF4444",
                                };
                                return <Cell key={`cell-${index}`} fill={colors[entry.name] || CHART_COLORS[index]} />;
                              })}
                            </Pie>
                            <RechartsTooltip formatter={(value?: number) => [`${value ?? 0} payments`, "Count"] as [string, string]} />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground text-center py-8">No status data available</p>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Key Metrics */}
              <div className="grid gap-4 md:grid-cols-4">
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-center">
                      <p className="text-sm text-muted-foreground">Period Revenue</p>
                      <p className="text-2xl font-bold">${analyticsData.filteredStats.totalAmount.toFixed(2)}</p>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-center">
                      <p className="text-sm text-muted-foreground">Average Payment</p>
                      <p className="text-2xl font-bold">${analyticsData.averagePayment.toFixed(2)}</p>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-center">
                      <p className="text-sm text-muted-foreground">Collection Rate</p>
                      <p className="text-2xl font-bold">
                        {analyticsData.filteredStats.totalCount > 0 
                          ? ((analyticsData.filteredStats.paidCount / analyticsData.filteredStats.totalCount) * 100).toFixed(0)
                          : 0}%
                      </p>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-center">
                      <p className="text-sm text-muted-foreground">Unique Clients</p>
                      <p className="text-2xl font-bold">{analyticsData.topClients.length}</p>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Insights */}
              {analyticsData.insights.length > 0 && (
                <Card className="border-blue-200 bg-blue-50/50 dark:border-blue-900 dark:bg-blue-950/20">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Lightbulb className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                      Insights & Recommendations
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2">
                      {analyticsData.insights.map((insight, index) => (
                        <li key={index} className="flex items-start gap-2 text-sm">
                          <span className="text-blue-600 dark:text-blue-400 mt-0.5">•</span>
                          <span>{insight}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Edit Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Package</DialogTitle>
            <DialogDescription>
              Update package details
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4 max-h-[60vh] overflow-y-auto">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Package Name *</Label>
              <Input
                id="edit-name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-description">Description</Label>
              <Textarea
                id="edit-description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-price">Price *</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                    $
                  </span>
                  <Input
                    id="edit-price"
                    type="number"
                    step="0.01"
                    min="0"
                    className="pl-7"
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-sessions">Sessions</Label>
                <Input
                  id="edit-sessions"
                  type="number"
                  min="0"
                  value={formData.sessions}
                  onChange={(e) => setFormData({ ...formData, sessions: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-validityDays">Validity (Days)</Label>
              <Input
                id="edit-validityDays"
                type="number"
                min="0"
                value={formData.validityDays}
                onChange={(e) => setFormData({ ...formData, validityDays: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Features</Label>
              <div className="flex gap-2">
                <Input
                  placeholder="Add a feature..."
                  value={formData.newFeature}
                  onChange={(e) => setFormData({ ...formData, newFeature: e.target.value })}
                  onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addFeature())}
                />
                <Button type="button" variant="outline" onClick={addFeature}>
                  Add
                </Button>
              </div>
              {formData.features.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {formData.features.map((feature, index) => (
                    <Badge key={index} variant="secondary" className="gap-1">
                      {feature}
                      <button
                        type="button"
                        onClick={() => removeFeature(index)}
                        className="ml-1 hover:text-destructive"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-paymentLink">Payment Link</Label>
              <div className="relative">
                <Link2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="edit-paymentLink"
                  type="url"
                  placeholder="https://paypal.me/yourname or Stripe link"
                  className="pl-10"
                  value={formData.paymentLink}
                  onChange={(e) => setFormData({ ...formData, paymentLink: e.target.value })}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Add your PayPal, Stripe, or other payment link for this package
              </p>
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="edit-isActive">Package Active</Label>
              <Switch
                id="edit-isActive"
                checked={formData.isActive}
                onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpdate} disabled={updatePackage.isPending}>
              {updatePackage.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Payment Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Payment</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this payment record? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeletePaymentId(null)}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeletePayment}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deletePayment.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="mr-2 h-4 w-4" />
              )}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Send Reminder Dialog */}
      <Dialog open={isReminderDialogOpen} onOpenChange={setIsReminderDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Send Payment Reminder
            </DialogTitle>
            <DialogDescription>
              Send a reminder email to {reminderPayment?.clientName} for the outstanding payment of ${reminderPayment?.amount.toFixed(2)}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="reminder-to">To</Label>
              <Input
                id="reminder-to"
                value={reminderPayment?.clientEmail || ""}
                disabled
                className="bg-muted"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="reminder-subject">Subject</Label>
              <Input
                id="reminder-subject"
                value={reminderTemplate.subject}
                onChange={(e) => setReminderTemplate({ ...reminderTemplate, subject: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="reminder-message">Message</Label>
              <Textarea
                id="reminder-message"
                rows={6}
                value={reminderTemplate.message}
                onChange={(e) => setReminderTemplate({ ...reminderTemplate, message: e.target.value })}
              />
            </div>
            {reminderPayment?.paymentLink && (
              <div className="flex items-center justify-between rounded-lg border p-3">
                <div className="flex items-center gap-3">
                  <CreditCard className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">Include Payment Link</p>
                    <p className="text-xs text-muted-foreground truncate max-w-[250px]">
                      {reminderPayment.paymentLink}
                    </p>
                  </div>
                </div>
                <Switch
                  checked={reminderTemplate.includePaymentLink}
                  onCheckedChange={(checked) => setReminderTemplate({ ...reminderTemplate, includePaymentLink: checked })}
                />
              </div>
            )}
            <div className="rounded-lg bg-muted/50 p-3">
              <p className="text-xs text-muted-foreground">
                <strong>Preview:</strong> The email will be sent from your coaching account email address.
                {reminderTemplate.includePaymentLink && reminderPayment?.paymentLink && (
                  <> The payment link will be included as a button in the email.</>
                )}
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsReminderDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSendReminder}>
              <Send className="mr-2 h-4 w-4" />
              Send Reminder
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
