"use client";

import { useState } from "react";
import Link from "next/link";
import { trpc } from "@/lib/trpc/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  ArrowLeft,
  Plus,
  MoreHorizontal,
  Edit,
  Trash2,
  Clock,
  AlertTriangle,
  Trophy,
  Target,
  Calendar,
  Zap,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";

export default function NotificationRulesPage() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingRuleId, setEditingRuleId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    triggerType: "" as string,
    channel: "BOTH" as "EMAIL" | "IN_APP" | "BOTH",
    titleTemplate: "",
    messageTemplate: "",
    days: "",
  });

  const { data: rules, isLoading, refetch } = trpc.notification.getRules.useQuery();

  const createRule = trpc.notification.createRule.useMutation({
    onSuccess: () => {
      toast.success("Automation rule created!");
      setIsDialogOpen(false);
      resetForm();
      refetch();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to create rule");
    },
  });

  const updateRule = trpc.notification.updateRule.useMutation({
    onSuccess: () => {
      toast.success("Rule updated!");
      setIsDialogOpen(false);
      setEditingRuleId(null);
      resetForm();
      refetch();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to update rule");
    },
  });

  const toggleRule = trpc.notification.toggleRule.useMutation({
    onSuccess: () => {
      refetch();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to toggle rule");
    },
  });

  const deleteRule = trpc.notification.deleteRule.useMutation({
    onSuccess: () => {
      toast.success("Rule deleted");
      refetch();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to delete rule");
    },
  });

  const resetForm = () => {
    setFormData({
      name: "",
      triggerType: "",
      channel: "BOTH",
      titleTemplate: "",
      messageTemplate: "",
      days: "",
    });
    setEditingRuleId(null);
  };

  const openCreateDialog = () => {
    resetForm();
    setIsDialogOpen(true);
  };

  const openEditDialog = (rule: NonNullable<typeof rules>[number]) => {
    const conditions = rule.conditions as Record<string, number> | null;
    setFormData({
      name: rule.name,
      triggerType: rule.triggerType,
      channel: rule.channel,
      titleTemplate: rule.titleTemplate,
      messageTemplate: rule.messageTemplate,
      days: conditions?.days?.toString() ?? "",
    });
    setEditingRuleId(rule.id);
    setIsDialogOpen(true);
  };

  const handleSubmit = () => {
    if (!formData.name || !formData.triggerType || !formData.titleTemplate || !formData.messageTemplate) {
      toast.error("Please fill in all required fields");
      return;
    }

    const conditions: Record<string, number> = {};
    if (formData.days && ["INACTIVITY_DAYS", "LICENSE_EXPIRING_DAYS", "MISSED_TARGET_STREAK"].includes(formData.triggerType)) {
      conditions.days = parseInt(formData.days);
    }

    if (editingRuleId) {
      updateRule.mutate({
        id: editingRuleId,
        name: formData.name,
        triggerType: formData.triggerType as "INACTIVITY_DAYS" | "LICENSE_EXPIRING_DAYS" | "GOAL_ACHIEVED" | "MISSED_TARGET_STREAK" | "WEIGHT_MILESTONE" | "CUSTOM_SCHEDULE",
        channel: formData.channel,
        titleTemplate: formData.titleTemplate,
        messageTemplate: formData.messageTemplate,
        conditions: Object.keys(conditions).length > 0 ? conditions : undefined,
      });
    } else {
      createRule.mutate({
        name: formData.name,
        triggerType: formData.triggerType as "INACTIVITY_DAYS" | "LICENSE_EXPIRING_DAYS" | "GOAL_ACHIEVED" | "MISSED_TARGET_STREAK" | "WEIGHT_MILESTONE" | "CUSTOM_SCHEDULE",
        channel: formData.channel,
        titleTemplate: formData.titleTemplate,
        messageTemplate: formData.messageTemplate,
        conditions: Object.keys(conditions).length > 0 ? conditions : undefined,
      });
    }
  };

  const isSubmitting = createRule.isPending || updateRule.isPending;

  const getTriggerIcon = (triggerType: string) => {
    switch (triggerType) {
      case "INACTIVITY_DAYS":
        return <Clock className="h-5 w-5 text-amber-500" />;
      case "LICENSE_EXPIRING_DAYS":
        return <AlertTriangle className="h-5 w-5 text-orange-500" />;
      case "GOAL_ACHIEVED":
        return <Trophy className="h-5 w-5 text-green-500" />;
      case "MISSED_TARGET_STREAK":
        return <Target className="h-5 w-5 text-red-500" />;
      case "WEIGHT_MILESTONE":
        return <Zap className="h-5 w-5 text-purple-500" />;
      default:
        return <Calendar className="h-5 w-5 text-blue-500" />;
    }
  };

  const getTriggerLabel = (triggerType: string) => {
    switch (triggerType) {
      case "INACTIVITY_DAYS":
        return "Inactivity";
      case "LICENSE_EXPIRING_DAYS":
        return "License Expiring";
      case "GOAL_ACHIEVED":
        return "Goal Achieved";
      case "MISSED_TARGET_STREAK":
        return "Missed Targets";
      case "WEIGHT_MILESTONE":
        return "Weight Milestone";
      case "CUSTOM_SCHEDULE":
        return "Scheduled";
      default:
        return triggerType;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/notifications">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div className="flex-1">
          <h2 className="text-2xl font-bold tracking-tight">Automation Rules</h2>
          <p className="text-muted-foreground">
            Set up automatic notifications based on client behavior
          </p>
        </div>
        <Button onClick={openCreateDialog}>
          <Plus className="mr-2 h-4 w-4" />
          Create Rule
        </Button>
        <Dialog open={isDialogOpen} onOpenChange={(open) => { setIsDialogOpen(open); if (!open) resetForm(); }}>
          <DialogContent className="sm:max-w-[600px] p-0 gap-0 overflow-hidden">
            {/* Header */}
            <div className="px-6 py-5 border-b">
              <DialogTitle className="flex items-center gap-2.5 text-lg font-semibold">
                <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary/10">
                  {editingRuleId ? <Edit className="h-4 w-4 text-primary" /> : <Zap className="h-4 w-4 text-primary" />}
                </div>
                {editingRuleId ? "Edit Automation Rule" : "Create Automation Rule"}
              </DialogTitle>
              <DialogDescription className="text-sm text-muted-foreground mt-1">
                {editingRuleId ? "Update the rule settings" : "Set up automatic notifications based on triggers"}
              </DialogDescription>
            </div>
            
            {/* Content */}
            <div className="px-6 py-5 space-y-5 max-h-[calc(90vh-180px)] overflow-y-auto">
              <div className="space-y-2">
                <Label htmlFor="name" className="text-sm font-medium">
                  Rule Name <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="name"
                  placeholder="e.g., Inactivity Reminder"
                  className="h-11"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium">
                  Trigger Type <span className="text-red-500">*</span>
                </Label>
                <Select
                  value={formData.triggerType}
                  onValueChange={(value) => setFormData({ ...formData, triggerType: value })}
                >
                  <SelectTrigger className="h-11">
                    <SelectValue placeholder="Select trigger" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="INACTIVITY_DAYS">Inactivity (X days)</SelectItem>
                    <SelectItem value="LICENSE_EXPIRING_DAYS">License Expiring (X days)</SelectItem>
                    <SelectItem value="GOAL_ACHIEVED">Goal Achieved</SelectItem>
                    <SelectItem value="MISSED_TARGET_STREAK">Missed Target Streak</SelectItem>
                    <SelectItem value="WEIGHT_MILESTONE">Weight Milestone</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {["INACTIVITY_DAYS", "LICENSE_EXPIRING_DAYS", "MISSED_TARGET_STREAK"].includes(formData.triggerType) && (
                <div className="space-y-2">
                  <Label htmlFor="days" className="text-sm font-medium">Number of Days</Label>
                  <Input
                    id="days"
                    type="number"
                    min="1"
                    placeholder="3"
                    className="h-11"
                    value={formData.days}
                    onChange={(e) => setFormData({ ...formData, days: e.target.value })}
                  />
                </div>
              )}
              <div className="space-y-2">
                <Label className="text-sm font-medium">Notification Channel</Label>
                <Select
                  value={formData.channel}
                  onValueChange={(value) => setFormData({ ...formData, channel: value as typeof formData.channel })}
                >
                  <SelectTrigger className="h-11">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="BOTH">Email & In-App</SelectItem>
                    <SelectItem value="EMAIL">Email Only</SelectItem>
                    <SelectItem value="IN_APP">In-App Only</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="titleTemplate" className="text-sm font-medium">
                  Notification Title <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="titleTemplate"
                  placeholder="e.g., We miss you!"
                  className="h-11"
                  value={formData.titleTemplate}
                  onChange={(e) => setFormData({ ...formData, titleTemplate: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="messageTemplate" className="text-sm font-medium">
                  Message Template <span className="text-red-500">*</span>
                </Label>
                <Textarea
                  id="messageTemplate"
                  placeholder="Hi {name}, we noticed you haven't logged in for {days} days..."
                  className="min-h-[100px]"
                  value={formData.messageTemplate}
                  onChange={(e) => setFormData({ ...formData, messageTemplate: e.target.value })}
                />
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm text-muted-foreground">Insert variable:</span>
                  {["{name}", "{days}"].map((variable) => (
                    <button
                      key={variable}
                      type="button"
                      className="inline-flex items-center h-7 px-2.5 text-xs font-mono rounded-md border bg-muted/50 hover:bg-muted text-foreground transition-colors"
                      onClick={() => setFormData({ ...formData, messageTemplate: formData.messageTemplate + variable })}
                    >
                      {variable}
                    </button>
                  ))}
                </div>
              </div>

              {/* Tip Box */}
              <div className="rounded-xl bg-cyan-50 dark:bg-cyan-950/30 border border-cyan-200 dark:border-cyan-800 px-4 py-3.5">
                <p className="text-sm text-cyan-700 dark:text-cyan-300 leading-relaxed">
                  <span className="font-semibold text-cyan-800 dark:text-cyan-200">Tip:</span> Use variables like{" "}
                  <code className="rounded-md bg-cyan-100 dark:bg-cyan-900/50 px-1.5 py-0.5 font-mono text-xs text-cyan-800 dark:text-cyan-200">
                    {"{name}"}
                  </code>{" "}
                  to personalize messages. They will be replaced with actual client data.
                </p>
              </div>
            </div>
            
            {/* Footer */}
            <div className="px-6 py-4 border-t bg-muted/30 flex items-center justify-end gap-3">
              <Button variant="outline" onClick={() => setIsDialogOpen(false)} className="h-10 px-5">
                Cancel
              </Button>
              <Button onClick={handleSubmit} disabled={isSubmitting} className="h-10 px-5 gap-2">
                {isSubmitting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : editingRuleId ? (
                  <Edit className="h-4 w-4" />
                ) : (
                  <Plus className="h-4 w-4" />
                )}
                {editingRuleId ? "Save Changes" : "Create Rule"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Rules List */}
      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <Skeleton className="h-12 w-12 rounded-lg" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-5 w-32" />
                    <Skeleton className="h-4 w-48" />
                  </div>
                  <Skeleton className="h-6 w-12" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : rules && rules.length > 0 ? (
        <div className="space-y-4">
          {rules.map((rule) => (
            <Card 
              key={rule.id} 
              className={`cursor-pointer hover:border-primary transition-colors ${!rule.isActive ? "opacity-60" : ""}`}
              onClick={() => openEditDialog(rule)}
            >
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-lg bg-muted flex items-center justify-center">
                    {getTriggerIcon(rule.triggerType)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-medium">{rule.name}</h3>
                      <Badge variant="outline">{getTriggerLabel(rule.triggerType)}</Badge>
                      {rule.conditions && typeof rule.conditions === "object" && "days" in rule.conditions && (
                        <Badge variant="secondary">{(rule.conditions as { days: number }).days} days</Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      &quot;{rule.titleTemplate}&quot;
                    </p>
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-1">
                      {rule.messageTemplate}
                    </p>
                  </div>
                  <div className="flex items-center gap-4" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center gap-2">
                      <Label htmlFor={`toggle-${rule.id}`} className="text-sm">
                        {rule.isActive ? "Active" : "Inactive"}
                      </Label>
                      <Switch
                        id={`toggle-${rule.id}`}
                        checked={rule.isActive}
                        onCheckedChange={() => toggleRule.mutate({ id: rule.id })}
                      />
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => openEditDialog(rule)}>
                          <Edit className="mr-2 h-4 w-4" />
                          Edit Rule
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="text-destructive"
                          onClick={() => {
                            if (confirm("Delete this rule?")) {
                              deleteRule.mutate({ id: rule.id });
                            }
                          }}
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete Rule
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="py-12">
            <div className="text-center">
              <Zap className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
              <h3 className="text-lg font-medium mb-2">No automation rules yet</h3>
              <p className="text-muted-foreground mb-4">
                Create rules to automatically notify clients based on their activity
              </p>
              <Button onClick={openCreateDialog}>
                <Plus className="mr-2 h-4 w-4" />
                Create Your First Rule
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Info Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">How Automation Works</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <p>
            <strong>Inactivity:</strong> Triggers when a client hasn&apos;t logged any activity for the specified number of days.
          </p>
          <p>
            <strong>License Expiring:</strong> Sends a reminder when a client&apos;s license is about to expire.
          </p>
          <p>
            <strong>Goal Achieved:</strong> Automatically congratulates clients when they hit their weekly or monthly goals.
          </p>
          <p>
            <strong>Missed Targets:</strong> Alerts clients who have missed their daily targets multiple days in a row.
          </p>
          <p>
            <strong>Weight Milestone:</strong> Celebrates when clients reach significant weight milestones.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
