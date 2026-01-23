"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
  ClipboardList,
  Plus,
  MoreHorizontal,
  Trash2,
  Calendar,
  Users,
  Search,
  Loader2,
  UserPlus,
  Flame,
  Target,
} from "lucide-react";
import { toast } from "sonner";

export default function MealPlansPage() {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isAssignOpen, setIsAssignOpen] = useState(false);
  const [goalFilter, setGoalFilter] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [selectedMealPlanId, setSelectedMealPlanId] = useState<string>("");
  const [selectedClientIds, setSelectedClientIds] = useState<string[]>([]);

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    duration: "",
    goalType: "",
    targetCalories: "",
    targetProtein: "",
    targetCarbs: "",
    targetFats: "",
  });

  const { data: mealPlans, isLoading, refetch } = trpc.content.getMealPlans.useQuery({
    goalType: goalFilter !== "all" ? (goalFilter as "WEIGHT_LOSS" | "WEIGHT_GAIN" | "MAINTAIN_WEIGHT") : undefined,
  });
  const { data: clients } = trpc.client.getAll.useQuery();

  const createMealPlan = trpc.content.createMealPlan.useMutation({
    onSuccess: () => {
      toast.success("Meal plan created!");
      setIsCreateOpen(false);
      resetForm();
      refetch();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to create meal plan");
    },
  });

  const deleteMealPlan = trpc.content.deleteMealPlan.useMutation({
    onSuccess: () => {
      toast.success("Meal plan deleted");
      refetch();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to delete meal plan");
    },
  });

  const assignMealPlan = trpc.content.assignMealPlan.useMutation({
    onSuccess: () => {
      toast.success("Meal plan assigned to clients!");
      setIsAssignOpen(false);
      setSelectedClientIds([]);
      refetch();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to assign meal plan");
    },
  });

  const resetForm = () => {
    setFormData({
      title: "",
      description: "",
      duration: "",
      goalType: "",
      targetCalories: "",
      targetProtein: "",
      targetCarbs: "",
      targetFats: "",
    });
  };

  const handleCreate = () => {
    if (!formData.title) {
      toast.error("Please enter a meal plan title");
      return;
    }
    createMealPlan.mutate({
      title: formData.title,
      description: formData.description || undefined,
      duration: formData.duration ? parseInt(formData.duration) : undefined,
      goalType: formData.goalType as "WEIGHT_LOSS" | "WEIGHT_GAIN" | "MAINTAIN_WEIGHT" | undefined,
      targetCalories: formData.targetCalories ? parseInt(formData.targetCalories) : undefined,
      targetProtein: formData.targetProtein ? parseFloat(formData.targetProtein) : undefined,
      targetCarbs: formData.targetCarbs ? parseFloat(formData.targetCarbs) : undefined,
      targetFats: formData.targetFats ? parseFloat(formData.targetFats) : undefined,
    });
  };

  const handleAssign = () => {
    if (selectedClientIds.length === 0) {
      toast.error("Please select at least one client");
      return;
    }
    assignMealPlan.mutate({
      mealPlanId: selectedMealPlanId,
      clientIds: selectedClientIds,
      startDate: new Date(),
    });
  };

  const openAssignDialog = (mealPlanId: string) => {
    setSelectedMealPlanId(mealPlanId);
    setIsAssignOpen(true);
  };

  const toggleClientSelection = (clientId: string) => {
    setSelectedClientIds((prev) =>
      prev.includes(clientId)
        ? prev.filter((id) => id !== clientId)
        : [...prev, clientId]
    );
  };

  const filteredMealPlans = mealPlans?.filter(
    (m) =>
      m.title.toLowerCase().includes(search.toLowerCase()) ||
      m.description?.toLowerCase().includes(search.toLowerCase())
  );

  const getGoalBadge = (goalType: string) => {
    switch (goalType) {
      case "WEIGHT_LOSS":
        return <Badge variant="destructive">Weight Loss</Badge>;
      case "WEIGHT_GAIN":
        return <Badge variant="default">Weight Gain</Badge>;
      case "MAINTAIN_WEIGHT":
        return <Badge variant="secondary">Maintain</Badge>;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Meal Plans</h2>
          <p className="text-muted-foreground">
            Create structured meal plans for your clients
          </p>
        </div>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => resetForm()}>
              <Plus className="mr-2 h-4 w-4" />
              Create Meal Plan
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Create New Meal Plan</DialogTitle>
              <DialogDescription>
                Design a structured meal plan for your clients
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4 max-h-[60vh] overflow-y-auto">
              <div className="space-y-2">
                <Label htmlFor="title">Meal Plan Title *</Label>
                <Input
                  id="title"
                  placeholder="7-Day Weight Loss Plan"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  placeholder="A balanced meal plan for..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="duration">Duration (days)</Label>
                  <Input
                    id="duration"
                    type="number"
                    min="1"
                    placeholder="7"
                    value={formData.duration}
                    onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Goal Type</Label>
                  <Select
                    value={formData.goalType}
                    onValueChange={(value) => setFormData({ ...formData, goalType: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="WEIGHT_LOSS">Weight Loss</SelectItem>
                      <SelectItem value="WEIGHT_GAIN">Weight Gain</SelectItem>
                      <SelectItem value="MAINTAIN_WEIGHT">Maintain Weight</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Daily Targets</Label>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="targetCalories" className="text-xs">Calories</Label>
                    <Input
                      id="targetCalories"
                      type="number"
                      min="0"
                      placeholder="1600"
                      value={formData.targetCalories}
                      onChange={(e) => setFormData({ ...formData, targetCalories: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="targetProtein" className="text-xs">Protein (g)</Label>
                    <Input
                      id="targetProtein"
                      type="number"
                      min="0"
                      placeholder="120"
                      value={formData.targetProtein}
                      onChange={(e) => setFormData({ ...formData, targetProtein: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="targetCarbs" className="text-xs">Carbs (g)</Label>
                    <Input
                      id="targetCarbs"
                      type="number"
                      min="0"
                      placeholder="160"
                      value={formData.targetCarbs}
                      onChange={(e) => setFormData({ ...formData, targetCarbs: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="targetFats" className="text-xs">Fats (g)</Label>
                    <Input
                      id="targetFats"
                      type="number"
                      min="0"
                      placeholder="53"
                      value={formData.targetFats}
                      onChange={(e) => setFormData({ ...formData, targetFats: e.target.value })}
                    />
                  </div>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreate} disabled={createMealPlan.isPending}>
                {createMealPlan.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Create Meal Plan
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col gap-4 md:flex-row">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search meal plans..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={goalFilter} onValueChange={setGoalFilter}>
              <SelectTrigger className="w-full md:w-[180px]">
                <SelectValue placeholder="All Goals" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Goals</SelectItem>
                <SelectItem value="WEIGHT_LOSS">Weight Loss</SelectItem>
                <SelectItem value="WEIGHT_GAIN">Weight Gain</SelectItem>
                <SelectItem value="MAINTAIN_WEIGHT">Maintain Weight</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Meal Plans Grid */}
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
      ) : filteredMealPlans && filteredMealPlans.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredMealPlans.map((mealPlan) => (
            <Card key={mealPlan.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      {mealPlan.title}
                      {mealPlan.isSystem && (
                        <Badge variant="outline" className="text-xs">
                          System
                        </Badge>
                      )}
                    </CardTitle>
                    <CardDescription className="mt-1">
                      {mealPlan.description || "No description"}
                    </CardDescription>
                  </div>
                  {!mealPlan.isSystem && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => openAssignDialog(mealPlan.id)}>
                          <UserPlus className="mr-2 h-4 w-4" />
                          Assign to Clients
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="text-destructive"
                          onClick={() => {
                            if (confirm("Delete this meal plan?")) {
                              deleteMealPlan.mutate({ id: mealPlan.id });
                            }
                          }}
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex flex-wrap gap-2">
                  {mealPlan.goalType && getGoalBadge(mealPlan.goalType)}
                  {mealPlan.duration && (
                    <Badge variant="outline">
                      <Calendar className="mr-1 h-3 w-3" />
                      {mealPlan.duration} days
                    </Badge>
                  )}
                </div>
                {mealPlan.targetCalories && (
                  <div className="flex items-center gap-4 text-sm">
                    <div className="flex items-center gap-1 text-orange-500">
                      <Flame className="h-4 w-4" />
                      {mealPlan.targetCalories} kcal/day
                    </div>
                  </div>
                )}
                {(mealPlan.targetProtein || mealPlan.targetCarbs || mealPlan.targetFats) && (
                  <div className="flex items-center gap-3 text-sm text-muted-foreground">
                    {mealPlan.targetProtein && <span>P: {mealPlan.targetProtein}g</span>}
                    {mealPlan.targetCarbs && <span>C: {mealPlan.targetCarbs}g</span>}
                    {mealPlan.targetFats && <span>F: {mealPlan.targetFats}g</span>}
                  </div>
                )}
                <div className="flex items-center gap-1 text-sm text-muted-foreground">
                  <Users className="h-4 w-4" />
                  {mealPlan._count.assignedClients} assigned
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={() => openAssignDialog(mealPlan.id)}
                >
                  <UserPlus className="mr-2 h-4 w-4" />
                  Assign to Clients
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="py-12">
            <div className="text-center">
              <ClipboardList className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
              <h3 className="text-lg font-medium mb-2">No meal plans found</h3>
              <p className="text-muted-foreground mb-4">
                Create your first meal plan to assign to clients
              </p>
              <Button onClick={() => setIsCreateOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Create Meal Plan
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Assign Dialog */}
      <Dialog open={isAssignOpen} onOpenChange={setIsAssignOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign Meal Plan to Clients</DialogTitle>
            <DialogDescription>
              Select clients to assign this meal plan to
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 max-h-[300px] overflow-y-auto">
            {clients?.map((client) => (
              <div
                key={client.id}
                className={`flex items-center justify-between p-3 rounded-lg cursor-pointer transition-colors ${
                  selectedClientIds.includes(client.id)
                    ? "bg-primary/10 border border-primary"
                    : "hover:bg-muted"
                }`}
                onClick={() => toggleClientSelection(client.id)}
              >
                <div>
                  <p className="font-medium">{client.name}</p>
                  <p className="text-sm text-muted-foreground">{client.email}</p>
                </div>
                {selectedClientIds.includes(client.id) && (
                  <Badge>Selected</Badge>
                )}
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAssignOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAssign} disabled={assignMealPlan.isPending}>
              {assignMealPlan.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Assign ({selectedClientIds.length})
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
