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
  Dumbbell,
  Plus,
  MoreHorizontal,
  Edit,
  Trash2,
  Clock,
  Users,
  Search,
  Loader2,
  UserPlus,
} from "lucide-react";
import { toast } from "sonner";

export default function WorkoutsPage() {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isAssignOpen, setIsAssignOpen] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [selectedWorkoutId, setSelectedWorkoutId] = useState<string>("");
  const [selectedClientIds, setSelectedClientIds] = useState<string[]>([]);

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    category: "",
    difficulty: "",
    duration: "",
  });

  const { data: workouts, isLoading, refetch } = trpc.content.getWorkouts.useQuery({
    category: categoryFilter !== "all" ? categoryFilter : undefined,
  });
  const { data: clients } = trpc.client.getAll.useQuery();

  const createWorkout = trpc.content.createWorkout.useMutation({
    onSuccess: () => {
      toast.success("Workout created!");
      setIsCreateOpen(false);
      resetForm();
      refetch();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to create workout");
    },
  });

  const deleteWorkout = trpc.content.deleteWorkout.useMutation({
    onSuccess: () => {
      toast.success("Workout deleted");
      refetch();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to delete workout");
    },
  });

  const assignWorkout = trpc.content.assignWorkout.useMutation({
    onSuccess: () => {
      toast.success("Workout assigned to clients!");
      setIsAssignOpen(false);
      setSelectedClientIds([]);
      refetch();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to assign workout");
    },
  });

  const resetForm = () => {
    setFormData({
      title: "",
      description: "",
      category: "",
      difficulty: "",
      duration: "",
    });
  };

  const handleCreate = () => {
    if (!formData.title) {
      toast.error("Please enter a workout title");
      return;
    }
    createWorkout.mutate({
      title: formData.title,
      description: formData.description || undefined,
      category: formData.category || undefined,
      difficulty: formData.difficulty || undefined,
      duration: formData.duration ? parseInt(formData.duration) : undefined,
    });
  };

  const handleAssign = () => {
    if (selectedClientIds.length === 0) {
      toast.error("Please select at least one client");
      return;
    }
    assignWorkout.mutate({
      workoutId: selectedWorkoutId,
      clientIds: selectedClientIds,
    });
  };

  const openAssignDialog = (workoutId: string) => {
    setSelectedWorkoutId(workoutId);
    setIsAssignOpen(true);
  };

  const toggleClientSelection = (clientId: string) => {
    setSelectedClientIds((prev) =>
      prev.includes(clientId)
        ? prev.filter((id) => id !== clientId)
        : [...prev, clientId]
    );
  };

  const filteredWorkouts = workouts?.filter(
    (w) =>
      w.title.toLowerCase().includes(search.toLowerCase()) ||
      w.description?.toLowerCase().includes(search.toLowerCase())
  );

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case "beginner":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
      case "intermediate":
        return "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200";
      case "advanced":
        return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200";
      default:
        return "";
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Workouts</h2>
          <p className="text-muted-foreground">
            Manage and assign workout plans to your clients
          </p>
        </div>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => resetForm()}>
              <Plus className="mr-2 h-4 w-4" />
              Create Workout
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Workout</DialogTitle>
              <DialogDescription>
                Design a workout plan for your clients
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="title">Workout Title *</Label>
                <Input
                  id="title"
                  placeholder="Full Body Strength"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  placeholder="A complete full body workout..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Category</Label>
                  <Select
                    value={formData.category}
                    onValueChange={(value) => setFormData({ ...formData, category: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="strength">Strength</SelectItem>
                      <SelectItem value="cardio">Cardio</SelectItem>
                      <SelectItem value="flexibility">Flexibility</SelectItem>
                      <SelectItem value="hiit">HIIT</SelectItem>
                      <SelectItem value="yoga">Yoga</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Difficulty</Label>
                  <Select
                    value={formData.difficulty}
                    onValueChange={(value) => setFormData({ ...formData, difficulty: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="beginner">Beginner</SelectItem>
                      <SelectItem value="intermediate">Intermediate</SelectItem>
                      <SelectItem value="advanced">Advanced</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="duration">Duration (minutes)</Label>
                <Input
                  id="duration"
                  type="number"
                  min="0"
                  placeholder="45"
                  value={formData.duration}
                  onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreate} disabled={createWorkout.isPending}>
                {createWorkout.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Create Workout
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
                placeholder="Search workouts..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-full md:w-[180px]">
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                <SelectItem value="strength">Strength</SelectItem>
                <SelectItem value="cardio">Cardio</SelectItem>
                <SelectItem value="flexibility">Flexibility</SelectItem>
                <SelectItem value="hiit">HIIT</SelectItem>
                <SelectItem value="yoga">Yoga</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Workouts Grid */}
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
      ) : filteredWorkouts && filteredWorkouts.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredWorkouts.map((workout) => (
            <Card key={workout.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      {workout.title}
                      {workout.isSystem && (
                        <Badge variant="outline" className="text-xs">
                          System
                        </Badge>
                      )}
                    </CardTitle>
                    <CardDescription className="mt-1">
                      {workout.description || "No description"}
                    </CardDescription>
                  </div>
                  {!workout.isSystem && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => openAssignDialog(workout.id)}>
                          <UserPlus className="mr-2 h-4 w-4" />
                          Assign to Clients
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="text-destructive"
                          onClick={() => {
                            if (confirm("Delete this workout?")) {
                              deleteWorkout.mutate({ id: workout.id });
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
                  {workout.category && (
                    <Badge variant="secondary">{workout.category}</Badge>
                  )}
                  {workout.difficulty && (
                    <Badge className={getDifficultyColor(workout.difficulty)}>
                      {workout.difficulty}
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  {workout.duration && (
                    <div className="flex items-center gap-1">
                      <Clock className="h-4 w-4" />
                      {workout.duration} min
                    </div>
                  )}
                  <div className="flex items-center gap-1">
                    <Users className="h-4 w-4" />
                    {workout._count.assignedClients} assigned
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={() => openAssignDialog(workout.id)}
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
              <Dumbbell className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
              <h3 className="text-lg font-medium mb-2">No workouts found</h3>
              <p className="text-muted-foreground mb-4">
                Create your first workout to assign to clients
              </p>
              <Button onClick={() => setIsCreateOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Create Workout
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Assign Dialog */}
      <Dialog open={isAssignOpen} onOpenChange={setIsAssignOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign Workout to Clients</DialogTitle>
            <DialogDescription>
              Select clients to assign this workout to
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
            <Button onClick={handleAssign} disabled={assignWorkout.isPending}>
              {assignWorkout.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Assign ({selectedClientIds.length})
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
