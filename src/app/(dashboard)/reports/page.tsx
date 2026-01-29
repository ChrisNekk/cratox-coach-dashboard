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
  BarChart3,
  Plus,
  MoreHorizontal,
  Play,
  Download,
  Trash2,
  Clock,
  Users,
  DollarSign,
  TrendingUp,
  Loader2,
  FileText,
  Mail,
  Calendar,
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { toast } from "sonner";

export default function ReportsPage() {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    type: "" as string,
    scheduleFrequency: "NONE" as "DAILY" | "WEEKLY" | "MONTHLY" | "NONE",
    emailDelivery: false,
  });

  const { data: reports, isLoading, refetch } = trpc.report.getAll.useQuery();
  const { data: templates } = trpc.report.getTemplates.useQuery();

  const createReport = trpc.report.create.useMutation({
    onSuccess: () => {
      toast.success("Report created!");
      setIsCreateOpen(false);
      resetForm();
      refetch();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to create report");
    },
  });

  const generateReport = trpc.report.generate.useMutation({
    onSuccess: (data) => {
      toast.success("Report generated!");
      console.log("Report data:", data);
      // In production, this would open a modal or download the report
    },
    onError: (error) => {
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

  const resetForm = () => {
    setFormData({
      name: "",
      type: "",
      scheduleFrequency: "NONE",
      emailDelivery: false,
    });
  };

  const handleCreate = () => {
    if (!formData.name || !formData.type) {
      toast.error("Please fill in all required fields");
      return;
    }
    createReport.mutate({
      name: formData.name,
      type: formData.type as "CLIENT_PROGRESS" | "LICENSE_UTILIZATION" | "REVENUE" | "TEAM_PERFORMANCE" | "CUSTOM",
      scheduleFrequency: formData.scheduleFrequency,
      emailDelivery: formData.emailDelivery,
    });
  };

  const handleSelectTemplate = (template: { id: string; name: string; type: string }) => {
    setFormData({
      ...formData,
      name: template.name,
      type: template.type,
    });
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
                    onCheckedChange={(checked) => setFormData({ ...formData, emailDelivery: checked })}
                  />
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
              <Button onClick={handleCreate} disabled={createReport.isPending} className="h-10 px-5 gap-2">
                {createReport.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Plus className="h-4 w-4" />
                )}
                Create Report
              </Button>
            </div>
          </DialogContent>
        </Dialog>
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
                          <Play className="mr-2 h-4 w-4" />
                          Generate
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
                          <Play className="mr-2 h-4 w-4" />
                          Generate Now
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          <Download className="mr-2 h-4 w-4" />
                          Download Last
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
    </div>
  );
}
