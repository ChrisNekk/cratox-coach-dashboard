"use client";

import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
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
  ChevronLeft,
  Search,
  MoreHorizontal,
  Eye,
  Trash2,
  Plus,
  History,
  ChevronDown,
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { toast } from "sonner";
import Link from "next/link";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";

type ReportType = "CLIENT_PROGRESS" | "LICENSE_UTILIZATION" | "REVENUE" | "TEAM_PERFORMANCE" | "CUSTOM";

const reportTypeConfig: Record<ReportType, {
  label: string;
  icon: React.ReactNode;
  color: string;
  bgColor: string;
}> = {
  CLIENT_PROGRESS: {
    label: "Client Progress",
    icon: <TrendingUp className="h-4 w-4" />,
    color: "text-green-500",
    bgColor: "bg-green-500/10",
  },
  LICENSE_UTILIZATION: {
    label: "License Utilization",
    icon: <Users className="h-4 w-4" />,
    color: "text-blue-500",
    bgColor: "bg-blue-500/10",
  },
  REVENUE: {
    label: "Revenue",
    icon: <DollarSign className="h-4 w-4" />,
    color: "text-amber-500",
    bgColor: "bg-amber-500/10",
  },
  TEAM_PERFORMANCE: {
    label: "Team Performance",
    icon: <BarChart3 className="h-4 w-4" />,
    color: "text-purple-500",
    bgColor: "bg-purple-500/10",
  },
  CUSTOM: {
    label: "Custom Report",
    icon: <FileText className="h-4 w-4" />,
    color: "text-gray-500",
    bgColor: "bg-gray-500/10",
  },
};

export default function ReportHistoryPage() {
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [selectedReport, setSelectedReport] = useState<string | null>(null);
  const [deleteReportId, setDeleteReportId] = useState<string | null>(null);

  const { data: historyData, isLoading, refetch } = trpc.report.getHistory.useQuery({
    type: typeFilter !== "all" ? typeFilter as ReportType : undefined,
  });

  const { data: reportDetail, isLoading: isLoadingDetail } = trpc.report.getGeneratedReport.useQuery(
    { id: selectedReport! },
    { enabled: !!selectedReport }
  );

  const deleteReport = trpc.report.deleteGeneratedReport.useMutation({
    onSuccess: () => {
      toast.success("Report deleted");
      refetch();
      setDeleteReportId(null);
    },
    onError: (error) => {
      toast.error(error.message || "Failed to delete report");
    },
  });

  // Filter reports by search
  const filteredReports = useMemo(() => {
    if (!historyData?.reports) return [];
    if (!search) return historyData.reports;

    const searchLower = search.toLowerCase();
    return historyData.reports.filter((report) =>
      report.name.toLowerCase().includes(searchLower)
    );
  }, [historyData?.reports, search]);

  // Get table data from report detail
  const tableData = useMemo(() => {
    if (!reportDetail) return { columns: [], rows: [] };

    const data = reportDetail.data as unknown;
    const type = reportDetail.type as ReportType;

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
  }, [reportDetail]);

  const getReportFileName = () => {
    if (!reportDetail) return "report";
    return reportDetail.name.toLowerCase().replace(/\s+/g, "_");
  };

  const exportToCSV = () => {
    if (!reportDetail || tableData.rows.length === 0) {
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
    link.download = `${getReportFileName()}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
    toast.success("CSV exported successfully!");
  };

  const exportToPDF = () => {
    if (!reportDetail || tableData.rows.length === 0) {
      toast.error("No data to export");
      return;
    }

    const doc = new jsPDF();

    doc.setFontSize(20);
    doc.text(reportDetail.name, 14, 22);

    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Generated: ${format(new Date(reportDetail.generatedAt), "MMM d, yyyy 'at' h:mm a")}`, 14, 30);

    if (reportDetail.type === "REVENUE" && "summary" in tableData) {
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

    doc.save(`${getReportFileName()}.pdf`);
    toast.success("PDF exported successfully!");
  };

  const exportToExcel = () => {
    if (!reportDetail || tableData.rows.length === 0) {
      toast.error("No data to export");
      return;
    }

    const wb = XLSX.utils.book_new();
    const wsData = [tableData.columns, ...tableData.rows];
    const ws = XLSX.utils.aoa_to_sheet(wsData);

    if (reportDetail.type === "REVENUE" && "summary" in tableData) {
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
    XLSX.writeFile(wb, `${getReportFileName()}.xlsx`);
    toast.success("Excel exported successfully!");
  };

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
            <h2 className="text-2xl font-bold tracking-tight">Report History</h2>
            <p className="text-muted-foreground">
              Browse and download previously generated reports
            </p>
          </div>
        </div>
        <Link href="/reports/generate">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            New Report
          </Button>
        </Link>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search reports..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="All types" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All types</SelectItem>
            {(Object.keys(reportTypeConfig) as ReportType[]).map((type) => (
              <SelectItem key={type} value={type}>
                {reportTypeConfig[type].label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Reports List */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <History className="h-4 w-4" />
            Generated Reports
          </CardTitle>
          <CardDescription>
            {filteredReports.length} report{filteredReports.length !== 1 ? "s" : ""} found
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="flex items-center gap-4 p-4 border rounded-lg">
                  <Skeleton className="h-10 w-10 rounded-lg" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-48" />
                    <Skeleton className="h-3 w-32" />
                  </div>
                </div>
              ))}
            </div>
          ) : filteredReports.length > 0 ? (
            <div className="space-y-3">
              {filteredReports.map((report) => {
                const config = reportTypeConfig[report.type as ReportType];
                return (
                  <div
                    key={report.id}
                    className="flex items-center gap-4 p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className={`h-10 w-10 rounded-lg ${config.bgColor} flex items-center justify-center`}>
                      <span className={config.color}>{config.icon}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-medium truncate">{report.name}</h3>
                        <Badge variant="outline" className="shrink-0">
                          {config.label}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
                        <span>{report.recordCount} records</span>
                        <span>
                          {formatDistanceToNow(new Date(report.generatedAt), { addSuffix: true })}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSelectedReport(report.id)}
                      >
                        <Eye className="mr-2 h-4 w-4" />
                        View
                      </Button>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => setSelectedReport(report.id)}>
                            <Eye className="mr-2 h-4 w-4" />
                            View Report
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-destructive"
                            onClick={() => setDeleteReportId(report.id)}
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-12">
              <History className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
              <h3 className="text-lg font-medium mb-2">No reports found</h3>
              <p className="text-muted-foreground mb-4">
                {search ? "Try adjusting your search" : "Generate your first report to see it here"}
              </p>
              {!search && (
                <Link href="/reports/generate">
                  <Button>
                    <Plus className="mr-2 h-4 w-4" />
                    Generate Report
                  </Button>
                </Link>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Report Detail Dialog */}
      <Dialog open={!!selectedReport} onOpenChange={(open) => !open && setSelectedReport(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <div>
                <DialogTitle>{reportDetail?.name || "Report"}</DialogTitle>
                <DialogDescription>
                  {reportDetail && (
                    <>
                      Generated {format(new Date(reportDetail.generatedAt), "MMM d, yyyy 'at' h:mm a")}
                      {" "}&middot;{" "}
                      {tableData.rows.length} records
                    </>
                  )}
                </DialogDescription>
              </div>
              {reportDetail && tableData.rows.length > 0 && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm">
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
              )}
            </div>
          </DialogHeader>

          <div className="flex-1 overflow-hidden">
            {isLoadingDetail ? (
              <div className="space-y-3 p-4">
                <Skeleton className="h-10 w-full" />
                {[1, 2, 3, 4, 5].map((i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : reportDetail && tableData.rows.length > 0 ? (
              <div className="space-y-4">
                {/* Revenue Summary */}
                {reportDetail.type === "REVENUE" && "summary" in tableData && (
                  <div className="grid grid-cols-4 gap-3 px-1">
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
                <ScrollArea className="h-[400px] rounded-md border">
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
                              {(tableData.columns[cellIndex] === "Status" ||
                                tableData.columns[cellIndex] === "Goal") ? (
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
                              ) : tableData.columns[cellIndex] === "Progress" ||
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
                              ) : (
                                cell
                              )}
                            </TableCell>
                          ))}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </ScrollArea>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <FileText className="h-12 w-12 text-muted-foreground/50 mb-4" />
                <h3 className="text-lg font-medium mb-2">No data</h3>
                <p className="text-muted-foreground text-sm">
                  This report contains no records
                </p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteReportId} onOpenChange={(open) => !open && setDeleteReportId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Report</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this report? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteReportId && deleteReport.mutate({ id: deleteReportId })}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteReport.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Delete"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
