"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
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
  BarChart3,
  Plus,
  MoreHorizontal,
  Download,
  Trash2,
  Clock,
  Users,
  DollarSign,
  TrendingUp,
  Loader2,
  FileText,
  Mail,
  Wand2,
  History,
  FileSpreadsheet,
  Pencil,
  CalendarClock,
  Settings2,
} from "lucide-react";
import Link from "next/link";
import { format, formatDistanceToNow } from "date-fns";
import { toast } from "sonner";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";

type ReportType = "CLIENT_PROGRESS" | "LICENSE_UTILIZATION" | "REVENUE" | "TEAM_PERFORMANCE" | "CUSTOM";

export default function ReportsPage() {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [downloadDialogOpen, setDownloadDialogOpen] = useState(false);
  const [generatedReportData, setGeneratedReportData] = useState<{
    name: string;
    type: ReportType;
    data: unknown;
  } | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    type: "" as string,
    scheduleFrequency: "NONE" as "DAILY" | "WEEKLY" | "MONTHLY" | "NONE",
    scheduleDay: null as number | null, // 0-6 for weekly (Sun-Sat), 1-31 for monthly day, 101-107 for "first Mon-Sun", 201-207 for "last Mon-Sun"
    scheduleTime: "09:00",
    emailDelivery: false,
    deliveryEmail: "",
  });
  const [editingReport, setEditingReport] = useState<string | null>(null);
  const [isEditOpen, setIsEditOpen] = useState(false);

  const { data: reports, isLoading, refetch } = trpc.report.getAll.useQuery();
  const { data: templates } = trpc.report.getTemplates.useQuery();

  const [pendingReportId, setPendingReportId] = useState<string | null>(null);

  const createReport = trpc.report.create.useMutation({
    onSuccess: (data) => {
      toast.success("Report created! Generating...");
      setIsCreateOpen(false);
      resetForm();
      refetch();
      // Immediately trigger generation after creation
      setPendingReportId(data.id);
      generateReport.mutate({ id: data.id });
    },
    onError: (error) => {
      toast.error(error.message || "Failed to create report");
    },
  });

  const generateReport = trpc.report.generate.useMutation({
    onSuccess: async (data, variables) => {
      // For newly created reports, use pendingReportId if available
      const reportId = pendingReportId || variables.id;
      setPendingReportId(null);

      // Refetch to get updated reports list (including newly created ones)
      const { data: updatedReports } = await refetch();

      // Find the report in the updated list
      const report = updatedReports?.find(r => r.id === reportId);

      // If report found, show download dialog
      if (report) {
        setGeneratedReportData({
          name: report.name,
          type: report.type as ReportType,
          data: data,
        });
        setDownloadDialogOpen(true);
      } else if (formData.name && formData.type) {
        // Fallback: use form data for newly created report
        setGeneratedReportData({
          name: formData.name,
          type: formData.type as ReportType,
          data: data,
        });
        setDownloadDialogOpen(true);
      }
    },
    onError: (error) => {
      setPendingReportId(null);
      toast.error(error.message || "Failed to generate report");
    },
  });

  const deleteReport = trpc.report.delete.useMutation({
    onSuccess: () => {
      toast.success("Report deleted");
      refetch();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to delete report");
    },
  });

  const updateReport = trpc.report.update.useMutation({
    onSuccess: () => {
      toast.success("Report updated!");
      setIsEditOpen(false);
      setEditingReport(null);
      resetForm();
      refetch();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to update report");
    },
  });

  const resetForm = () => {
    setFormData({
      name: "",
      type: "",
      scheduleFrequency: "NONE",
      scheduleDay: null,
      scheduleTime: "09:00",
      emailDelivery: false,
      deliveryEmail: "",
    });
  };

  const handleCreate = () => {
    if (!formData.name || !formData.type) {
      toast.error("Please fill in all required fields");
      return;
    }
    if (formData.emailDelivery && !formData.deliveryEmail) {
      toast.error("Please enter an email address for report delivery");
      return;
    }
    createReport.mutate({
      name: formData.name,
      type: formData.type as ReportType,
      scheduleFrequency: formData.scheduleFrequency,
      scheduleDay: formData.scheduleFrequency !== "NONE" ? formData.scheduleDay : null,
      scheduleTime: formData.scheduleFrequency !== "NONE" ? formData.scheduleTime : null,
      emailDelivery: formData.emailDelivery,
      deliveryEmail: formData.emailDelivery ? formData.deliveryEmail : null,
    });
  };

  const handleUpdate = () => {
    if (!editingReport) return;
    if (!formData.name) {
      toast.error("Please enter a report name");
      return;
    }
    if (formData.emailDelivery && !formData.deliveryEmail) {
      toast.error("Please enter an email address for report delivery");
      return;
    }
    updateReport.mutate({
      id: editingReport,
      name: formData.name,
      scheduleFrequency: formData.scheduleFrequency,
      scheduleDay: formData.scheduleFrequency !== "NONE" ? formData.scheduleDay : null,
      scheduleTime: formData.scheduleFrequency !== "NONE" ? formData.scheduleTime : null,
      emailDelivery: formData.emailDelivery,
      deliveryEmail: formData.emailDelivery ? formData.deliveryEmail : null,
    });
  };

  const openEditDialog = (report: NonNullable<typeof reports>[number]) => {
    setEditingReport(report.id);
    setFormData({
      name: report.name,
      type: report.type,
      scheduleFrequency: report.scheduleFrequency as "DAILY" | "WEEKLY" | "MONTHLY" | "NONE",
      scheduleDay: report.scheduleDay,
      scheduleTime: report.scheduleTime || "09:00",
      emailDelivery: report.emailDelivery,
      deliveryEmail: (report as { deliveryEmail?: string | null }).deliveryEmail || "",
    });
    setIsEditOpen(true);
  };

  // Helper functions for schedule display
  const getWeekdayLabel = (day: number) => {
    const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    return days[day] || "";
  };

  const getTimeLabel = (time: string | null) => {
    if (!time) return "";
    const [hours] = time.split(":");
    const hour = parseInt(hours);
    if (hour === 0) return "12:00 AM";
    if (hour === 12) return "12:00 PM";
    if (hour > 12) return `${hour - 12}:00 PM`;
    return `${hour}:00 AM`;
  };

  const getScheduleDayLabel = (frequency: string, day: number | null) => {
    if (day === null) return "";
    if (frequency === "WEEKLY") {
      return `Every ${getWeekdayLabel(day)}`;
    }
    if (frequency === "MONTHLY") {
      if (day >= 1 && day <= 31) {
        const suffix = day === 1 || day === 21 || day === 31 ? "st" : day === 2 || day === 22 ? "nd" : day === 3 || day === 23 ? "rd" : "th";
        return `On the ${day}${suffix}`;
      }
      if (day >= 101 && day <= 107) {
        return `First ${getWeekdayLabel(day - 101)}`;
      }
      if (day >= 201 && day <= 207) {
        return `Last ${getWeekdayLabel(day - 201)}`;
      }
    }
    return "";
  };

  const handleSelectTemplate = (template: { id: string; name: string; type: string }) => {
    setFormData({
      ...formData,
      name: template.name,
      type: template.type,
    });
  };

  // Convert report data to table format for export
  const getTableData = (type: ReportType, data: unknown) => {
    switch (type) {
      case "CLIENT_PROGRESS": {
        const clients = data as Array<{
          name: string;
          email: string;
          team: string;
          goalType: string;
          startWeight: number | null;
          currentWeight: number | null;
          targetWeight: number | null;
          progress: number | null;
          lastActivity: string | null;
        }>;
        return {
          columns: ["Name", "Email", "Team", "Goal", "Start Weight", "Current Weight", "Target Weight", "Progress", "Last Active"],
          rows: clients.map((c) => [
            c.name,
            c.email,
            c.team || "Unassigned",
            c.goalType?.replace("_", " ") || "-",
            c.startWeight ? `${c.startWeight} kg` : "-",
            c.currentWeight ? `${c.currentWeight} kg` : "-",
            c.targetWeight ? `${c.targetWeight} kg` : "-",
            c.progress !== null ? `${c.progress}%` : "-",
            c.lastActivity ? format(new Date(c.lastActivity), "MMM d, yyyy") : "Never",
          ]),
        };
      }
      case "LICENSE_UTILIZATION": {
        const licenses = data as Array<{
          clientName: string;
          clientEmail: string;
          status: string;
          activatedAt: string | null;
          expiresAt: string | null;
          daysRemaining: number | null;
        }>;
        return {
          columns: ["Client", "Email", "Status", "Activated", "Expires", "Days Remaining"],
          rows: licenses.map((l) => [
            l.clientName,
            l.clientEmail,
            l.status,
            l.activatedAt ? format(new Date(l.activatedAt), "MMM d, yyyy") : "-",
            l.expiresAt ? format(new Date(l.expiresAt), "MMM d, yyyy") : "-",
            l.daysRemaining !== null ? (l.daysRemaining > 0 ? `${l.daysRemaining}` : "Expired") : "-",
          ]),
        };
      }
      case "REVENUE": {
        const revenueData = data as {
          bookings: Array<{
            date: string;
            client: string;
            type: string;
            package: string | null;
            amount: number | null;
            status: string;
          }>;
          summary: {
            totalRevenue: number;
            totalBookings: number;
            paidBookings: number;
            pendingPayments: number;
          };
        };
        return {
          columns: ["Date", "Client", "Type", "Package", "Amount", "Status"],
          rows: revenueData.bookings.map((b) => [
            format(new Date(b.date), "MMM d, yyyy"),
            b.client,
            b.type?.replace("_", " ") || "-",
            b.package || "-",
            b.amount ? `$${b.amount.toFixed(2)}` : "-",
            b.status || "-",
          ]),
          summary: revenueData.summary,
        };
      }
      case "TEAM_PERFORMANCE": {
        const teams = data as Array<{
          name: string;
          members: number;
          activeMembers: number;
          activeRate: number;
          avgProgress: number | null;
        }>;
        return {
          columns: ["Team", "Members", "Active Members", "Active Rate", "Avg Progress"],
          rows: teams.map((t) => [
            t.name,
            `${t.members}`,
            `${t.activeMembers}`,
            `${t.activeRate}%`,
            t.avgProgress !== null ? `${t.avgProgress}%` : "-",
          ]),
        };
      }
      default: {
        const customData = data as Array<{
          name: string;
          email: string;
          team: string | null;
          goalType: string;
          currentWeight: number | null;
          targetCalories: number | null;
          recentLogs: number;
          avgCalories: number | null;
        }>;
        return {
          columns: ["Name", "Email", "Team", "Goal", "Weight", "Target Cal", "Recent Logs", "Avg Cal"],
          rows: customData.map((c) => [
            c.name,
            c.email,
            c.team || "Unassigned",
            c.goalType?.replace("_", " ") || "-",
            c.currentWeight ? `${c.currentWeight} kg` : "-",
            c.targetCalories ? `${c.targetCalories}` : "-",
            `${c.recentLogs}`,
            c.avgCalories ? `${c.avgCalories}` : "-",
          ]),
        };
      }
    }
  };

  const exportToCSV = () => {
    if (!generatedReportData) return;

    const tableData = getTableData(generatedReportData.type, generatedReportData.data);
    if (tableData.rows.length === 0) {
      toast.error("No data to export");
      return;
    }

    const csvContent = [
      tableData.columns.join(","),
      ...tableData.rows.map((row) =>
        row.map((cell) => {
          const str = String(cell);
          if (str.includes(",") || str.includes('"') || str.includes("\n")) {
            return `"${str.replace(/"/g, '""')}"`;
          }
          return str;
        }).join(",")
      ),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `${generatedReportData.name.toLowerCase().replace(/\s+/g, "_")}_${format(new Date(), "yyyy-MM-dd")}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
    toast.success("CSV downloaded!");
    setDownloadDialogOpen(false);
  };

  const exportToPDF = () => {
    if (!generatedReportData) return;

    const tableData = getTableData(generatedReportData.type, generatedReportData.data);
    if (tableData.rows.length === 0) {
      toast.error("No data to export");
      return;
    }

    const doc = new jsPDF();

    doc.setFontSize(20);
    doc.text(generatedReportData.name, 14, 22);

    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Generated: ${format(new Date(), "MMM d, yyyy 'at' h:mm a")}`, 14, 30);

    if (generatedReportData.type === "REVENUE" && "summary" in tableData) {
      const summary = tableData.summary as {
        totalRevenue: number;
        totalBookings: number;
        paidBookings: number;
        pendingPayments: number;
      };
      doc.setFontSize(12);
      doc.setTextColor(0);
      doc.text("Summary", 14, 42);
      doc.setFontSize(10);
      doc.text(`Total Revenue: $${summary.totalRevenue.toFixed(2)}`, 14, 50);
      doc.text(`Total Bookings: ${summary.totalBookings}`, 14, 56);
      doc.text(`Paid: ${summary.paidBookings} | Pending: ${summary.pendingPayments}`, 14, 62);

      autoTable(doc, {
        head: [tableData.columns],
        body: tableData.rows,
        startY: 70,
        styles: { fontSize: 8 },
        headStyles: { fillColor: [59, 130, 246] },
      });
    } else {
      autoTable(doc, {
        head: [tableData.columns],
        body: tableData.rows,
        startY: 38,
        styles: { fontSize: 8 },
        headStyles: { fillColor: [59, 130, 246] },
      });
    }

    doc.save(`${generatedReportData.name.toLowerCase().replace(/\s+/g, "_")}_${format(new Date(), "yyyy-MM-dd")}.pdf`);
    toast.success("PDF downloaded!");
    setDownloadDialogOpen(false);
  };

  const exportToExcel = () => {
    if (!generatedReportData) return;

    const tableData = getTableData(generatedReportData.type, generatedReportData.data);
    if (tableData.rows.length === 0) {
      toast.error("No data to export");
      return;
    }

    const wb = XLSX.utils.book_new();
    const wsData = [tableData.columns, ...tableData.rows];
    const ws = XLSX.utils.aoa_to_sheet(wsData);

    if (generatedReportData.type === "REVENUE" && "summary" in tableData) {
      const summary = tableData.summary as {
        totalRevenue: number;
        totalBookings: number;
        paidBookings: number;
        pendingPayments: number;
      };
      const summaryData = [
        ["Summary"],
        ["Total Revenue", `$${summary.totalRevenue.toFixed(2)}`],
        ["Total Bookings", summary.totalBookings],
        ["Paid Bookings", summary.paidBookings],
        ["Pending Payments", summary.pendingPayments],
      ];
      const summaryWs = XLSX.utils.aoa_to_sheet(summaryData);
      XLSX.utils.book_append_sheet(wb, summaryWs, "Summary");
    }

    XLSX.utils.book_append_sheet(wb, ws, "Data");
    XLSX.writeFile(wb, `${generatedReportData.name.toLowerCase().replace(/\s+/g, "_")}_${format(new Date(), "yyyy-MM-dd")}.xlsx`);
    toast.success("Excel downloaded!");
    setDownloadDialogOpen(false);
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "CLIENT_PROGRESS":
        return <TrendingUp className="h-5 w-5 text-green-500" />;
      case "LICENSE_UTILIZATION":
        return <Users className="h-5 w-5 text-blue-500" />;
      case "REVENUE":
        return <DollarSign className="h-5 w-5 text-amber-500" />;
      case "TEAM_PERFORMANCE":
        return <BarChart3 className="h-5 w-5 text-purple-500" />;
      default:
        return <FileText className="h-5 w-5 text-gray-500" />;
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case "CLIENT_PROGRESS":
        return "Client Progress";
      case "LICENSE_UTILIZATION":
        return "License Utilization";
      case "REVENUE":
        return "Revenue";
      case "TEAM_PERFORMANCE":
        return "Team Performance";
      default:
        return "Custom";
    }
  };

  const getFrequencyLabel = (frequency: string) => {
    switch (frequency) {
      case "DAILY":
        return "Daily";
      case "WEEKLY":
        return "Weekly";
      case "MONTHLY":
        return "Monthly";
      default:
        return "Manual";
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Reports</h2>
          <p className="text-muted-foreground">
            Generate and schedule reports for your coaching practice
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/reports/history">
            <Button variant="outline">
              <History className="mr-2 h-4 w-4" />
              History
            </Button>
          </Link>
          <Link href="/reports/generate">
            <Button variant="outline">
              <Wand2 className="mr-2 h-4 w-4" />
              Custom Report
            </Button>
          </Link>
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => resetForm()}>
              <Plus className="mr-2 h-4 w-4" />
              Create Report
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[550px] p-0 gap-0 overflow-hidden">
            {/* Header */}
            <div className="px-6 py-5 border-b">
              <DialogTitle className="flex items-center gap-2.5 text-lg font-semibold">
                <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary/10">
                  <BarChart3 className="h-4 w-4 text-primary" />
                </div>
                Create New Report
              </DialogTitle>
              <DialogDescription className="text-sm text-muted-foreground mt-1">
                Choose a template or create a custom report
              </DialogDescription>
            </div>

            {/* Content */}
            <div className="px-6 py-5 space-y-5 max-h-[calc(90vh-180px)] overflow-y-auto">
              {/* Templates */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">Report Templates</Label>
                <div className="grid grid-cols-2 gap-2">
                  {templates?.map((template) => (
                    <Button
                      key={template.id}
                      variant={formData.type === template.type ? "default" : "outline"}
                      className="h-auto py-3 justify-start"
                      onClick={() => handleSelectTemplate(template)}
                    >
                      <div className="flex items-center gap-2">
                        {getTypeIcon(template.type)}
                        <span className="text-xs">{template.name}</span>
                      </div>
                    </Button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="name" className="text-sm font-medium">
                  Report Name <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="name"
                  placeholder="e.g., Monthly Client Progress"
                  className="h-11"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium">Schedule</Label>
                <Select
                  value={formData.scheduleFrequency}
                  onValueChange={(value) => setFormData({ ...formData, scheduleFrequency: value as typeof formData.scheduleFrequency })}
                >
                  <SelectTrigger className="h-11">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="NONE">Manual (No Schedule)</SelectItem>
                    <SelectItem value="DAILY">Daily</SelectItem>
                    <SelectItem value="WEEKLY">Weekly</SelectItem>
                    <SelectItem value="MONTHLY">Monthly</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {formData.scheduleFrequency !== "NONE" && (
                <div className="space-y-4">
                  {/* Weekly: Day of week selection */}
                  {formData.scheduleFrequency === "WEEKLY" && (
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Delivery Day</Label>
                      <Select
                        value={formData.scheduleDay?.toString() || ""}
                        onValueChange={(value) => setFormData({ ...formData, scheduleDay: parseInt(value) })}
                      >
                        <SelectTrigger className="h-11">
                          <SelectValue placeholder="Select day of week" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="1">Every Monday</SelectItem>
                          <SelectItem value="2">Every Tuesday</SelectItem>
                          <SelectItem value="3">Every Wednesday</SelectItem>
                          <SelectItem value="4">Every Thursday</SelectItem>
                          <SelectItem value="5">Every Friday</SelectItem>
                          <SelectItem value="6">Every Saturday</SelectItem>
                          <SelectItem value="0">Every Sunday</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  {/* Monthly: Day of month selection */}
                  {formData.scheduleFrequency === "MONTHLY" && (
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Delivery Day</Label>
                      <Select
                        value={formData.scheduleDay?.toString() || ""}
                        onValueChange={(value) => setFormData({ ...formData, scheduleDay: parseInt(value) })}
                      >
                        <SelectTrigger className="h-11">
                          <SelectValue placeholder="Select day of month" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="1">On the 1st of every month</SelectItem>
                          <SelectItem value="15">On the 15th of every month</SelectItem>
                          <SelectItem value="28">On the 28th of every month</SelectItem>
                          <SelectItem value="101">First Monday of the month</SelectItem>
                          <SelectItem value="102">First Tuesday of the month</SelectItem>
                          <SelectItem value="103">First Wednesday of the month</SelectItem>
                          <SelectItem value="104">First Thursday of the month</SelectItem>
                          <SelectItem value="105">First Friday of the month</SelectItem>
                          <SelectItem value="201">Last Monday of the month</SelectItem>
                          <SelectItem value="205">Last Friday of the month</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  {/* Time selection */}
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Delivery Time</Label>
                    <Select
                      value={formData.scheduleTime || "09:00"}
                      onValueChange={(value) => setFormData({ ...formData, scheduleTime: value })}
                    >
                      <SelectTrigger className="h-11">
                        <SelectValue placeholder="Select time" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="06:00">6:00 AM</SelectItem>
                        <SelectItem value="07:00">7:00 AM</SelectItem>
                        <SelectItem value="08:00">8:00 AM</SelectItem>
                        <SelectItem value="09:00">9:00 AM</SelectItem>
                        <SelectItem value="10:00">10:00 AM</SelectItem>
                        <SelectItem value="12:00">12:00 PM</SelectItem>
                        <SelectItem value="14:00">2:00 PM</SelectItem>
                        <SelectItem value="17:00">5:00 PM</SelectItem>
                        <SelectItem value="18:00">6:00 PM</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex items-center justify-between rounded-xl border p-4">
                    <div className="space-y-1">
                      <Label htmlFor="emailDelivery" className="text-sm font-medium">Email Delivery</Label>
                      <p className="text-sm text-muted-foreground">
                        Receive the report via email
                      </p>
                    </div>
                    <Switch
                      id="emailDelivery"
                      checked={formData.emailDelivery}
                      onCheckedChange={(checked) => setFormData({ ...formData, emailDelivery: checked, deliveryEmail: checked ? formData.deliveryEmail : "" })}
                    />
                  </div>
                  {formData.emailDelivery && (
                    <div className="space-y-2">
                      <Label htmlFor="deliveryEmail" className="text-sm font-medium">
                        Delivery Email <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        id="deliveryEmail"
                        type="email"
                        placeholder="email@example.com"
                        className="h-11"
                        value={formData.deliveryEmail}
                        onChange={(e) => setFormData({ ...formData, deliveryEmail: e.target.value })}
                      />
                      <p className="text-xs text-muted-foreground">
                        Reports will be sent to this email address
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Tip Box */}
              <div className="rounded-xl bg-cyan-50 dark:bg-cyan-950/30 border border-cyan-200 dark:border-cyan-800 px-4 py-3.5">
                <p className="text-sm text-cyan-700 dark:text-cyan-300 leading-relaxed">
                  <span className="font-semibold text-cyan-800 dark:text-cyan-200">Tip:</span> Scheduled reports will be automatically generated and can be emailed to you on your preferred frequency.
                </p>
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t bg-muted/30 flex items-center justify-end gap-3">
              <Button variant="outline" onClick={() => setIsCreateOpen(false)} className="h-10 px-5">
                Cancel
              </Button>
              <Button
                onClick={handleCreate}
                disabled={createReport.isPending || (pendingReportId !== null && generateReport.isPending)}
                className="h-10 px-5 gap-2"
              >
                {createReport.isPending || (pendingReportId !== null && generateReport.isPending) ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    {createReport.isPending ? "Creating..." : "Generating..."}
                  </>
                ) : (
                  <>
                    <Plus className="h-4 w-4" />
                    Create Report
                  </>
                )}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
        </div>
      </div>

      {/* Quick Report Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        {templates?.map((template) => (
          <Card
            key={template.id}
            className="cursor-pointer hover:border-primary transition-colors"
            onClick={() => {
              handleSelectTemplate(template);
              setIsCreateOpen(true);
            }}
          >
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center">
                  {getTypeIcon(template.type)}
                </div>
                <div>
                  <p className="font-medium text-sm">{template.name}</p>
                  <p className="text-xs text-muted-foreground line-clamp-1">
                    {template.description}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Saved Reports */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Saved Reports</CardTitle>
          <CardDescription>
            Your created reports and schedules
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center gap-4 p-4 border rounded-lg">
                  <Skeleton className="h-12 w-12 rounded-lg" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-5 w-32" />
                    <Skeleton className="h-4 w-48" />
                  </div>
                </div>
              ))}
            </div>
          ) : reports && reports.length > 0 ? (
            <div className="space-y-3">
              {reports.map((report) => (
                <div
                  key={report.id}
                  className="flex items-center gap-4 p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="h-12 w-12 rounded-lg bg-muted flex items-center justify-center">
                    {getTypeIcon(report.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-medium">{report.name}</h3>
                      <Badge variant="outline">{getTypeLabel(report.type)}</Badge>
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
                      {report.scheduleFrequency !== "NONE" && (
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {getFrequencyLabel(report.scheduleFrequency)}
                        </span>
                      )}
                      {report.emailDelivery && (
                        <span className="flex items-center gap-1">
                          <Mail className="h-3 w-3" />
                          Email
                        </span>
                      )}
                      {report.lastGeneratedAt && (
                        <span>
                          Last run: {formatDistanceToNow(new Date(report.lastGeneratedAt), { addSuffix: true })}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => generateReport.mutate({ id: report.id })}
                      disabled={generateReport.isPending}
                    >
                      {generateReport.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <>
                          <Download className="mr-2 h-4 w-4" />
                          Download
                        </>
                      )}
                    </Button>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => generateReport.mutate({ id: report.id })}>
                          <Download className="mr-2 h-4 w-4" />
                          Download Report
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => openEditDialog(report)}>
                          <Pencil className="mr-2 h-4 w-4" />
                          Edit Report
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="text-destructive"
                          onClick={() => {
                            if (confirm("Delete this report?")) {
                              deleteReport.mutate({ id: report.id });
                            }
                          }}
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
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
              <BarChart3 className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
              <h3 className="text-lg font-medium mb-2">No reports yet</h3>
              <p className="text-muted-foreground mb-4">
                Create reports to track your coaching metrics
              </p>
              <Button onClick={() => setIsCreateOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Create Your First Report
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Scheduled Reports Section */}
      {reports && reports.filter(r => r.scheduleFrequency !== "NONE").length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <CalendarClock className="h-5 w-5" />
              Scheduled Reports
            </CardTitle>
            <CardDescription>
              Manage your automated report schedules
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {reports
                .filter(r => r.scheduleFrequency !== "NONE")
                .map((report) => (
                  <div
                    key={report.id}
                    className="flex items-center gap-4 p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      <CalendarClock className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-medium">{report.name}</h3>
                        <Badge variant="secondary">{getFrequencyLabel(report.scheduleFrequency)}</Badge>
                        {(report.scheduleDay !== null || report.scheduleTime) && (
                          <Badge variant="outline" className="text-xs">
                            {report.scheduleDay !== null ? getScheduleDayLabel(report.scheduleFrequency, report.scheduleDay) : ""}
                            {report.scheduleTime && ` at ${getTimeLabel(report.scheduleTime)}`}
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          {getTypeIcon(report.type)}
                          <span className="ml-1">{getTypeLabel(report.type)}</span>
                        </span>
                        {report.emailDelivery && (
                          <span className="flex items-center gap-1">
                            <Mail className="h-3 w-3" />
                            {(report as { deliveryEmail?: string | null }).deliveryEmail || "No email set"}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openEditDialog(report)}
                      >
                        <Settings2 className="mr-2 h-4 w-4" />
                        Manage
                      </Button>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => openEditDialog(report)}>
                            <Pencil className="mr-2 h-4 w-4" />
                            Edit Schedule
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => generateReport.mutate({ id: report.id })}>
                            <Download className="mr-2 h-4 w-4" />
                            Download Now
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-destructive"
                            onClick={() => {
                              if (confirm("Delete this scheduled report?")) {
                                deleteReport.mutate({ id: report.id });
                              }
                            }}
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Download Format Dialog */}
      <Dialog open={downloadDialogOpen} onOpenChange={setDownloadDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Download className="h-5 w-5" />
              Download Report
            </DialogTitle>
            <DialogDescription>
              {generatedReportData?.name} - Choose your preferred format
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 py-4">
            <Button
              variant="outline"
              className="justify-start h-14"
              onClick={exportToCSV}
            >
              <FileText className="mr-3 h-5 w-5 text-green-600" />
              <div className="text-left">
                <p className="font-medium">CSV</p>
                <p className="text-xs text-muted-foreground">Spreadsheet compatible format</p>
              </div>
            </Button>
            <Button
              variant="outline"
              className="justify-start h-14"
              onClick={exportToPDF}
            >
              <Download className="mr-3 h-5 w-5 text-red-600" />
              <div className="text-left">
                <p className="font-medium">PDF</p>
                <p className="text-xs text-muted-foreground">Formatted document for printing</p>
              </div>
            </Button>
            <Button
              variant="outline"
              className="justify-start h-14"
              onClick={exportToExcel}
            >
              <FileSpreadsheet className="mr-3 h-5 w-5 text-emerald-600" />
              <div className="text-left">
                <p className="font-medium">Excel</p>
                <p className="text-xs text-muted-foreground">Microsoft Excel workbook</p>
              </div>
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Report Dialog */}
      <Dialog open={isEditOpen} onOpenChange={(open) => {
        setIsEditOpen(open);
        if (!open) {
          setEditingReport(null);
          resetForm();
        }
      }}>
        <DialogContent className="sm:max-w-[550px] p-0 gap-0 overflow-hidden">
          {/* Header */}
          <div className="px-6 py-5 border-b">
            <DialogTitle className="flex items-center gap-2.5 text-lg font-semibold">
              <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary/10">
                <Settings2 className="h-4 w-4 text-primary" />
              </div>
              Edit Report Schedule
            </DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground mt-1">
              Update the schedule and delivery settings for this report
            </DialogDescription>
          </div>

          {/* Content */}
          <div className="px-6 py-5 space-y-5 max-h-[calc(90vh-180px)] overflow-y-auto">
            <div className="space-y-2">
              <Label htmlFor="edit-name" className="text-sm font-medium">
                Report Name <span className="text-red-500">*</span>
              </Label>
              <Input
                id="edit-name"
                placeholder="e.g., Monthly Client Progress"
                className="h-11"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium">Report Type</Label>
              <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50 border">
                {getTypeIcon(formData.type)}
                <span className="text-sm font-medium">{getTypeLabel(formData.type)}</span>
              </div>
              <p className="text-xs text-muted-foreground">Report type cannot be changed after creation</p>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium">Schedule Frequency</Label>
              <Select
                value={formData.scheduleFrequency}
                onValueChange={(value) => setFormData({ ...formData, scheduleFrequency: value as typeof formData.scheduleFrequency })}
              >
                <SelectTrigger className="h-11">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="NONE">Manual (No Schedule)</SelectItem>
                  <SelectItem value="DAILY">Daily</SelectItem>
                  <SelectItem value="WEEKLY">Weekly</SelectItem>
                  <SelectItem value="MONTHLY">Monthly</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {formData.scheduleFrequency !== "NONE" && (
              <div className="space-y-4">
                {/* Weekly: Day of week selection */}
                {formData.scheduleFrequency === "WEEKLY" && (
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Delivery Day</Label>
                    <Select
                      value={formData.scheduleDay?.toString() || ""}
                      onValueChange={(value) => setFormData({ ...formData, scheduleDay: parseInt(value) })}
                    >
                      <SelectTrigger className="h-11">
                        <SelectValue placeholder="Select day of week" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">Every Monday</SelectItem>
                        <SelectItem value="2">Every Tuesday</SelectItem>
                        <SelectItem value="3">Every Wednesday</SelectItem>
                        <SelectItem value="4">Every Thursday</SelectItem>
                        <SelectItem value="5">Every Friday</SelectItem>
                        <SelectItem value="6">Every Saturday</SelectItem>
                        <SelectItem value="0">Every Sunday</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {/* Monthly: Day of month selection */}
                {formData.scheduleFrequency === "MONTHLY" && (
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Delivery Day</Label>
                    <Select
                      value={formData.scheduleDay?.toString() || ""}
                      onValueChange={(value) => setFormData({ ...formData, scheduleDay: parseInt(value) })}
                    >
                      <SelectTrigger className="h-11">
                        <SelectValue placeholder="Select day of month" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">On the 1st of every month</SelectItem>
                        <SelectItem value="15">On the 15th of every month</SelectItem>
                        <SelectItem value="28">On the 28th of every month</SelectItem>
                        <SelectItem value="101">First Monday of the month</SelectItem>
                        <SelectItem value="102">First Tuesday of the month</SelectItem>
                        <SelectItem value="103">First Wednesday of the month</SelectItem>
                        <SelectItem value="104">First Thursday of the month</SelectItem>
                        <SelectItem value="105">First Friday of the month</SelectItem>
                        <SelectItem value="201">Last Monday of the month</SelectItem>
                        <SelectItem value="205">Last Friday of the month</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {/* Time selection */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Delivery Time</Label>
                  <Select
                    value={formData.scheduleTime || "09:00"}
                    onValueChange={(value) => setFormData({ ...formData, scheduleTime: value })}
                  >
                    <SelectTrigger className="h-11">
                      <SelectValue placeholder="Select time" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="06:00">6:00 AM</SelectItem>
                      <SelectItem value="07:00">7:00 AM</SelectItem>
                      <SelectItem value="08:00">8:00 AM</SelectItem>
                      <SelectItem value="09:00">9:00 AM</SelectItem>
                      <SelectItem value="10:00">10:00 AM</SelectItem>
                      <SelectItem value="12:00">12:00 PM</SelectItem>
                      <SelectItem value="14:00">2:00 PM</SelectItem>
                      <SelectItem value="17:00">5:00 PM</SelectItem>
                      <SelectItem value="18:00">6:00 PM</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center justify-between rounded-xl border p-4">
                  <div className="space-y-1">
                    <Label htmlFor="edit-emailDelivery" className="text-sm font-medium">Email Delivery</Label>
                    <p className="text-sm text-muted-foreground">
                      Receive the report via email
                    </p>
                  </div>
                  <Switch
                    id="edit-emailDelivery"
                    checked={formData.emailDelivery}
                    onCheckedChange={(checked) => setFormData({ ...formData, emailDelivery: checked, deliveryEmail: checked ? formData.deliveryEmail : "" })}
                  />
                </div>
                {formData.emailDelivery && (
                  <div className="space-y-2">
                    <Label htmlFor="edit-deliveryEmail" className="text-sm font-medium">
                      Delivery Email <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="edit-deliveryEmail"
                      type="email"
                      placeholder="email@example.com"
                      className="h-11"
                      value={formData.deliveryEmail}
                      onChange={(e) => setFormData({ ...formData, deliveryEmail: e.target.value })}
                    />
                    <p className="text-xs text-muted-foreground">
                      Reports will be sent to this email address
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t bg-muted/30 flex items-center justify-end gap-3">
            <Button variant="outline" onClick={() => setIsEditOpen(false)} className="h-10 px-5">
              Cancel
            </Button>
            <Button onClick={handleUpdate} disabled={updateReport.isPending} className="h-10 px-5 gap-2">
              {updateReport.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Pencil className="h-4 w-4" />
              )}
              Save Changes
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
