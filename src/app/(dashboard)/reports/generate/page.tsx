"use client";

import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Calendar } from "@/components/ui/calendar";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  BarChart3,
  Users,
  DollarSign,
  TrendingUp,
  FileText,
  Loader2,
  Download,
  FileSpreadsheet,
  CalendarIcon,
  ChevronLeft,
  Filter,
  Eye,
  History,
  ChevronDown,
} from "lucide-react";
import { format, subDays, startOfMonth, endOfMonth, subMonths } from "date-fns";
import { toast } from "sonner";
import Link from "next/link";
import type { DateRange } from "react-day-picker";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";

type ReportType = "CLIENT_PROGRESS" | "LICENSE_UTILIZATION" | "REVENUE" | "TEAM_PERFORMANCE" | "CUSTOM";

const reportTypeConfig: Record<ReportType, {
  label: string;
  icon: React.ReactNode;
  color: string;
  description: string;
}> = {
  CLIENT_PROGRESS: {
    label: "Client Progress",
    icon: <TrendingUp className="h-5 w-5" />,
    color: "text-green-500",
    description: "Track client weight progress and goal achievement",
  },
  LICENSE_UTILIZATION: {
    label: "License Utilization",
    icon: <Users className="h-5 w-5" />,
    color: "text-blue-500",
    description: "View license status, activations, and expirations",
  },
  REVENUE: {
    label: "Revenue",
    icon: <DollarSign className="h-5 w-5" />,
    color: "text-amber-500",
    description: "Analyze booking revenue and payment status",
  },
  TEAM_PERFORMANCE: {
    label: "Team Performance",
    icon: <BarChart3 className="h-5 w-5" />,
    color: "text-purple-500",
    description: "Compare progress across different teams",
  },
  CUSTOM: {
    label: "Custom Report",
    icon: <FileText className="h-5 w-5" />,
    color: "text-gray-500",
    description: "Generate a custom report with selected data",
  },
};

const datePresets = [
  { label: "Last 7 days", getValue: () => ({ from: subDays(new Date(), 7), to: new Date() }) },
  { label: "Last 30 days", getValue: () => ({ from: subDays(new Date(), 30), to: new Date() }) },
  { label: "This month", getValue: () => ({ from: startOfMonth(new Date()), to: new Date() }) },
  { label: "Last month", getValue: () => ({ from: startOfMonth(subMonths(new Date(), 1)), to: endOfMonth(subMonths(new Date(), 1)) }) },
  { label: "Last 3 months", getValue: () => ({ from: subMonths(new Date(), 3), to: new Date() }) },
];

export default function ReportGeneratorPage() {
  const [reportType, setReportType] = useState<ReportType>("CLIENT_PROGRESS");
  const [reportName, setReportName] = useState("");
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: subDays(new Date(), 30),
    to: new Date(),
  });
  const [selectedClients, setSelectedClients] = useState<string[]>([]);
  const [selectedTeams, setSelectedTeams] = useState<string[]>([]);
  const [reportData, setReportData] = useState<unknown>(null);
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);

  const { data: filterOptions, isLoading: isLoadingFilters } = trpc.report.getFilterOptions.useQuery();

  const generateReport = trpc.report.generateCustom.useMutation({
    onSuccess: (data) => {
      setReportData(data);
      toast.success("Report generated and saved to history!", {
        action: {
          label: "View History",
          onClick: () => window.location.href = "/reports/history",
        },
      });
    },
    onError: (error) => {
      toast.error(error.message || "Failed to generate report");
    },
  });

  const handleGenerate = () => {
    generateReport.mutate({
      type: reportType,
      name: reportName || undefined,
      filters: {
        startDate: dateRange?.from?.toISOString(),
        endDate: dateRange?.to?.toISOString(),
        clientIds: selectedClients.length > 0 ? selectedClients : undefined,
        teamIds: selectedTeams.length > 0 ? selectedTeams : undefined,
      },
    });
  };

  const handleClientToggle = (clientId: string) => {
    setSelectedClients((prev) =>
      prev.includes(clientId) ? prev.filter((id) => id !== clientId) : [...prev, clientId]
    );
  };

  const handleTeamToggle = (teamId: string) => {
    setSelectedTeams((prev) =>
      prev.includes(teamId) ? prev.filter((id) => id !== teamId) : [...prev, teamId]
    );
  };

  const handleSelectAllClients = () => {
    if (selectedClients.length === filterOptions?.clients.length) {
      setSelectedClients([]);
    } else {
      setSelectedClients(filterOptions?.clients.map((c) => c.id) || []);
    }
  };

  const handleSelectAllTeams = () => {
    if (selectedTeams.length === filterOptions?.teams.length) {
      setSelectedTeams([]);
    } else {
      setSelectedTeams(filterOptions?.teams.map((t) => t.id) || []);
    }
  };

  // Get table columns and rows based on report type and data
  const tableData = useMemo(() => {
    if (!reportData) return { columns: [], rows: [] };

    const data = (reportData as { data: unknown }).data;

    switch (reportType) {
      case "CLIENT_PROGRESS": {
        const clients = data as Array<{
          id: string;
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
          columns: ["Name", "Email", "Team", "Goal", "Start", "Current", "Target", "Progress", "Last Active"],
          rows: clients.map((c) => [
            c.name,
            c.email,
            c.team,
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
          id: string;
          clientName: string;
          clientEmail: string;
          status: string;
          activatedAt: string | null;
          expiresAt: string | null;
          daysRemaining: number | null;
        }>;
        return {
          columns: ["Client", "Email", "Status", "Activated", "Expires", "Days Left"],
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
            id: string;
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
          id: string;
          name: string;
          color: string;
          members: number;
          activeMembers: number;
          activeRate: number;
          avgProgress: number | null;
        }>;
        return {
          columns: ["Team", "Members", "Active", "Active Rate", "Avg Progress"],
          rows: teams.map((t) => [
            t.name,
            `${t.members}`,
            `${t.activeMembers}`,
            `${t.activeRate}%`,
            t.avgProgress !== null ? `${t.avgProgress}%` : "-",
          ]),
        };
      }
      case "CUSTOM": {
        const customData = data as Array<{
          id: string;
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
      default:
        return { columns: [], rows: [] };
    }
  }, [reportData, reportType]);

  const getReportFileName = () => {
    const name = reportName || reportTypeConfig[reportType].label;
    return name.toLowerCase().replace(/\s+/g, "_");
  };

  const exportToCSV = () => {
    if (!reportData || tableData.rows.length === 0) {
      toast.error("No data to export");
      return;
    }

    // Create CSV content
    const csvContent = [
      tableData.columns.join(","),
      ...tableData.rows.map((row) =>
        row.map((cell) => {
          // Escape quotes and wrap in quotes if contains comma
          const str = String(cell);
          if (str.includes(",") || str.includes('"') || str.includes("\n")) {
            return `"${str.replace(/"/g, '""')}"`;
          }
          return str;
        }).join(",")
      ),
    ].join("\n");

    // Create blob and download
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `${getReportFileName()}_${format(new Date(), "yyyy-MM-dd")}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
    toast.success("CSV exported successfully!");
  };

  const exportToPDF = () => {
    if (!reportData || tableData.rows.length === 0) {
      toast.error("No data to export");
      return;
    }

    const doc = new jsPDF();
    const config = reportTypeConfig[reportType];
    const title = reportName || config.label + " Report";

    // Title
    doc.setFontSize(20);
    doc.text(title, 14, 22);

    // Date range
    doc.setFontSize(10);
    doc.setTextColor(100);
    if (dateRange?.from && dateRange?.to) {
      doc.text(
        `Period: ${format(dateRange.from, "MMM d, yyyy")} - ${format(dateRange.to, "MMM d, yyyy")}`,
        14,
        30
      );
    }
    doc.text(`Generated: ${format(new Date(), "MMM d, yyyy 'at' h:mm a")}`, 14, 36);

    // Summary for revenue reports
    if (reportType === "REVENUE" && "summary" in tableData) {
      const summary = tableData.summary as {
        totalRevenue: number;
        totalBookings: number;
        paidBookings: number;
        pendingPayments: number;
      };
      doc.setFontSize(12);
      doc.setTextColor(0);
      doc.text("Summary", 14, 48);
      doc.setFontSize(10);
      doc.text(`Total Revenue: $${summary.totalRevenue.toFixed(2)}`, 14, 56);
      doc.text(`Total Bookings: ${summary.totalBookings}`, 14, 62);
      doc.text(`Paid: ${summary.paidBookings} | Pending: ${summary.pendingPayments}`, 14, 68);

      autoTable(doc, {
        head: [tableData.columns],
        body: tableData.rows,
        startY: 76,
        styles: { fontSize: 8 },
        headStyles: { fillColor: [59, 130, 246] },
      });
    } else {
      autoTable(doc, {
        head: [tableData.columns],
        body: tableData.rows,
        startY: 44,
        styles: { fontSize: 8 },
        headStyles: { fillColor: [59, 130, 246] },
      });
    }

    doc.save(`${getReportFileName()}_${format(new Date(), "yyyy-MM-dd")}.pdf`);
    toast.success("PDF exported successfully!");
  };

  const exportToExcel = () => {
    if (!reportData || tableData.rows.length === 0) {
      toast.error("No data to export");
      return;
    }

    const config = reportTypeConfig[reportType];

    // Create workbook and worksheet
    const wb = XLSX.utils.book_new();

    // Create data array with headers
    const wsData = [tableData.columns, ...tableData.rows];
    const ws = XLSX.utils.aoa_to_sheet(wsData);

    // Add summary sheet for revenue reports
    if (reportType === "REVENUE" && "summary" in tableData) {
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
        [],
        ["Generated", format(new Date(), "MMM d, yyyy 'at' h:mm a")],
      ];
      const summaryWs = XLSX.utils.aoa_to_sheet(summaryData);
      XLSX.utils.book_append_sheet(wb, summaryWs, "Summary");
    }

    XLSX.utils.book_append_sheet(wb, ws, config.label);
    XLSX.writeFile(wb, `${getReportFileName()}_${format(new Date(), "yyyy-MM-dd")}.xlsx`);
    toast.success("Excel exported successfully!");
  };

  const showFilters = reportType === "CLIENT_PROGRESS" || reportType === "CUSTOM";
  const showDateFilter = reportType === "REVENUE";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/reports">
            <Button variant="ghost" size="icon">
              <ChevronLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Generate Report</h2>
            <p className="text-muted-foreground">
              Create custom reports with filters and export to CSV, PDF, or Excel
            </p>
          </div>
        </div>
        <Link href="/reports/history">
          <Button variant="outline">
            <History className="mr-2 h-4 w-4" />
            View History
          </Button>
        </Link>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Configuration Panel */}
        <div className="lg:col-span-1 space-y-6">
          {/* Report Name */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Report Name</CardTitle>
              <CardDescription>Optional name for this report</CardDescription>
            </CardHeader>
            <CardContent>
              <Input
                placeholder={`e.g., ${reportTypeConfig[reportType].label} - ${format(new Date(), "MMM yyyy")}`}
                value={reportName}
                onChange={(e) => setReportName(e.target.value)}
              />
            </CardContent>
          </Card>

          {/* Report Type Selection */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Report Type</CardTitle>
              <CardDescription>Select the type of report to generate</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {(Object.keys(reportTypeConfig) as ReportType[]).map((type) => {
                const config = reportTypeConfig[type];
                return (
                  <div
                    key={type}
                    className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                      reportType === type
                        ? "border-primary bg-primary/5"
                        : "hover:bg-muted/50"
                    }`}
                    onClick={() => {
                      setReportType(type);
                      setReportData(null);
                    }}
                  >
                    <div className={config.color}>{config.icon}</div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm">{config.label}</p>
                      <p className="text-xs text-muted-foreground line-clamp-1">
                        {config.description}
                      </p>
                    </div>
                    {reportType === type && (
                      <Badge variant="default" className="shrink-0">Selected</Badge>
                    )}
                  </div>
                );
              })}
            </CardContent>
          </Card>

          {/* Date Range Filter (for Revenue) */}
          {showDateFilter && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <CalendarIcon className="h-4 w-4" />
                  Date Range
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {/* Presets */}
                <div className="flex flex-wrap gap-2">
                  {datePresets.map((preset) => (
                    <Button
                      key={preset.label}
                      variant="outline"
                      size="sm"
                      className="text-xs"
                      onClick={() => setDateRange(preset.getValue())}
                    >
                      {preset.label}
                    </Button>
                  ))}
                </div>

                {/* Custom Range */}
                <Popover open={isDatePickerOpen} onOpenChange={setIsDatePickerOpen}>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start">
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {dateRange?.from ? (
                        dateRange.to ? (
                          <>
                            {format(dateRange.from, "LLL dd, y")} -{" "}
                            {format(dateRange.to, "LLL dd, y")}
                          </>
                        ) : (
                          format(dateRange.from, "LLL dd, y")
                        )
                      ) : (
                        "Pick a date range"
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="range"
                      selected={dateRange}
                      onSelect={(range) => {
                        setDateRange(range);
                        if (range?.from && range?.to) {
                          setIsDatePickerOpen(false);
                        }
                      }}
                      numberOfMonths={2}
                    />
                  </PopoverContent>
                </Popover>
              </CardContent>
            </Card>
          )}

          {/* Client & Team Filters */}
          {showFilters && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Filter className="h-4 w-4" />
                  Filters
                </CardTitle>
                <CardDescription>Filter by clients or teams (optional)</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {isLoadingFilters ? (
                  <div className="space-y-2">
                    <Skeleton className="h-8 w-full" />
                    <Skeleton className="h-8 w-full" />
                  </div>
                ) : (
                  <>
                    {/* Teams Filter */}
                    {filterOptions?.teams && filterOptions.teams.length > 0 && (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <Label className="text-sm font-medium">Teams</Label>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-auto py-1 px-2 text-xs"
                            onClick={handleSelectAllTeams}
                          >
                            {selectedTeams.length === filterOptions.teams.length
                              ? "Clear all"
                              : "Select all"}
                          </Button>
                        </div>
                        <ScrollArea className="h-32 rounded-md border p-2">
                          <div className="space-y-2">
                            {filterOptions.teams.map((team) => (
                              <div
                                key={team.id}
                                className="flex items-center gap-2"
                              >
                                <Checkbox
                                  id={`team-${team.id}`}
                                  checked={selectedTeams.includes(team.id)}
                                  onCheckedChange={() => handleTeamToggle(team.id)}
                                />
                                <label
                                  htmlFor={`team-${team.id}`}
                                  className="flex items-center gap-2 text-sm cursor-pointer"
                                >
                                  <span
                                    className="w-3 h-3 rounded-full"
                                    style={{ backgroundColor: team.color || "#6b7280" }}
                                  />
                                  {team.name}
                                </label>
                              </div>
                            ))}
                          </div>
                        </ScrollArea>
                      </div>
                    )}

                    {/* Clients Filter */}
                    {filterOptions?.clients && filterOptions.clients.length > 0 && (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <Label className="text-sm font-medium">Clients</Label>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-auto py-1 px-2 text-xs"
                            onClick={handleSelectAllClients}
                          >
                            {selectedClients.length === filterOptions.clients.length
                              ? "Clear all"
                              : "Select all"}
                          </Button>
                        </div>
                        <ScrollArea className="h-48 rounded-md border p-2">
                          <div className="space-y-2">
                            {filterOptions.clients.map((client) => (
                              <div
                                key={client.id}
                                className="flex items-center gap-2"
                              >
                                <Checkbox
                                  id={`client-${client.id}`}
                                  checked={selectedClients.includes(client.id)}
                                  onCheckedChange={() => handleClientToggle(client.id)}
                                />
                                <label
                                  htmlFor={`client-${client.id}`}
                                  className="text-sm cursor-pointer truncate"
                                >
                                  {client.name}
                                </label>
                              </div>
                            ))}
                          </div>
                        </ScrollArea>
                      </div>
                    )}
                  </>
                )}
              </CardContent>
            </Card>
          )}

          {/* Generate Button */}
          <Button
            className="w-full"
            size="lg"
            onClick={handleGenerate}
            disabled={generateReport.isPending}
          >
            {generateReport.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Eye className="mr-2 h-4 w-4" />
                Generate Report
              </>
            )}
          </Button>
        </div>

        {/* Preview Panel */}
        <div className="lg:col-span-2">
          <Card className="h-full">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base">Report Preview</CardTitle>
                <CardDescription>
                  {reportData
                    ? `${tableData.rows.length} records found`
                    : "Generate a report to see the preview"}
                </CardDescription>
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    disabled={!reportData || tableData.rows.length === 0}
                  >
                    <Download className="mr-2 h-4 w-4" />
                    Export
                    <ChevronDown className="ml-2 h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={exportToCSV}>
                    <FileText className="mr-2 h-4 w-4" />
                    Export as CSV
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={exportToPDF}>
                    <Download className="mr-2 h-4 w-4" />
                    Export as PDF
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={exportToExcel}>
                    <FileSpreadsheet className="mr-2 h-4 w-4" />
                    Export as Excel
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </CardHeader>
            <CardContent>
              {generateReport.isPending ? (
                <div className="space-y-3">
                  <Skeleton className="h-10 w-full" />
                  {[1, 2, 3, 4, 5].map((i) => (
                    <Skeleton key={i} className="h-12 w-full" />
                  ))}
                </div>
              ) : reportData && tableData.rows.length > 0 ? (
                <div className="space-y-4">
                  {/* Summary for Revenue */}
                  {reportType === "REVENUE" && "summary" in tableData && (
                    <div className="grid grid-cols-4 gap-3 pb-4 border-b">
                      {[
                        { label: "Total Revenue", value: `$${(tableData.summary as { totalRevenue: number }).totalRevenue.toFixed(2)}`, color: "text-green-600" },
                        { label: "Total Bookings", value: (tableData.summary as { totalBookings: number }).totalBookings },
                        { label: "Paid", value: (tableData.summary as { paidBookings: number }).paidBookings, color: "text-blue-600" },
                        { label: "Pending", value: (tableData.summary as { pendingPayments: number }).pendingPayments, color: "text-amber-600" },
                      ].map((stat) => (
                        <div key={stat.label} className="text-center p-3 bg-muted/50 rounded-lg">
                          <p className="text-xs text-muted-foreground">{stat.label}</p>
                          <p className={`text-lg font-semibold ${stat.color || ""}`}>{stat.value}</p>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Data Table */}
                  <ScrollArea className="h-[500px] rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          {tableData.columns.map((col, i) => (
                            <TableHead key={i} className="bg-muted/50 sticky top-0">
                              {col}
                            </TableHead>
                          ))}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {tableData.rows.map((row, rowIndex) => (
                          <TableRow key={rowIndex}>
                            {row.map((cell, cellIndex) => (
                              <TableCell key={cellIndex}>
                                {/* Status badges */}
                                {(tableData.columns[cellIndex] === "Status" ||
                                  tableData.columns[cellIndex] === "Goal") && (
                                  <Badge
                                    variant={
                                      cell === "ACTIVE" || cell === "PAID"
                                        ? "default"
                                        : cell === "PENDING"
                                        ? "secondary"
                                        : cell === "EXPIRED" || cell === "FAILED"
                                        ? "destructive"
                                        : "outline"
                                    }
                                  >
                                    {String(cell)}
                                  </Badge>
                                )}
                                {/* Progress percentage coloring */}
                                {tableData.columns[cellIndex] === "Progress" ||
                                tableData.columns[cellIndex] === "Avg Progress" ||
                                tableData.columns[cellIndex] === "Active Rate" ? (
                                  <span
                                    className={
                                      cell === "-"
                                        ? "text-muted-foreground"
                                        : parseInt(String(cell)) >= 80
                                        ? "text-green-600 font-medium"
                                        : parseInt(String(cell)) >= 50
                                        ? "text-amber-600 font-medium"
                                        : "text-red-600 font-medium"
                                    }
                                  >
                                    {cell}
                                  </span>
                                ) : tableData.columns[cellIndex] !== "Status" &&
                                  tableData.columns[cellIndex] !== "Goal" ? (
                                  cell
                                ) : null}
                              </TableCell>
                            ))}
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </ScrollArea>
                </div>
              ) : reportData && tableData.rows.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <FileText className="h-12 w-12 text-muted-foreground/50 mb-4" />
                  <h3 className="text-lg font-medium mb-2">No data found</h3>
                  <p className="text-muted-foreground text-sm">
                    Try adjusting your filters or date range
                  </p>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <BarChart3 className="h-12 w-12 text-muted-foreground/50 mb-4" />
                  <h3 className="text-lg font-medium mb-2">Select report type and generate</h3>
                  <p className="text-muted-foreground text-sm max-w-sm">
                    Choose a report type from the options on the left, configure any filters, then
                    click Generate Report to see the preview
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
