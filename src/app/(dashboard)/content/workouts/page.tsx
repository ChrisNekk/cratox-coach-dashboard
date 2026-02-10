"use client";

import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { EXERCISES, MUSCLE_GROUPS, EQUIPMENT_TYPES, type Exercise } from "@/data/exercises";
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
  Video,
  ExternalLink,
  GripVertical,
  X,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { toast } from "sonner";

export default function WorkoutsPage() {
  const [activeTab, setActiveTab] = useState("workouts");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isAssignOpen, setIsAssignOpen] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [selectedWorkoutId, setSelectedWorkoutId] = useState<string>("");
  const [selectedClientIds, setSelectedClientIds] = useState<string[]>([]);

  // Exercise filters
  const [exerciseSearch, setExerciseSearch] = useState("");
  const [muscleGroupFilter, setMuscleGroupFilter] = useState<string>("all");
  const [equipmentFilter, setEquipmentFilter] = useState<string>("all");
  const [difficultyFilter, setDifficultyFilter] = useState<string>("all");

  // Exercise create/edit state
  const [isExerciseCreateOpen, setIsExerciseCreateOpen] = useState(false);
  const [isExerciseEditOpen, setIsExerciseEditOpen] = useState(false);
  const [editingExerciseId, setEditingExerciseId] = useState<string | null>(null);
  const [exerciseFormData, setExerciseFormData] = useState({
    name: "",
    muscleGroup: "",
    equipment: "",
    difficulty: "intermediate" as "beginner" | "intermediate" | "advanced",
    description: "",
    instructions: "",
    videoUrl: "",
  });

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    category: "",
    difficulty: "",
    duration: "",
  });

  // Workout exercises state
  type WorkoutExercise = {
    id: string;
    exerciseId: string;
    name: string;
    muscleGroup: string;
    sets: number;
    reps: number;
    weight: number;
    weightUnit: "kg" | "lbs";
    duration: number; // in seconds
    restTime: number; // in seconds
    notes: string;
  };
  const [workoutExercises, setWorkoutExercises] = useState<WorkoutExercise[]>([]);
  const [workoutExerciseSearch, setWorkoutExerciseSearch] = useState("");
  const [showExercisePicker, setShowExercisePicker] = useState(false);

  const { data: workouts, isLoading, refetch } = trpc.content.getWorkouts.useQuery({
    category: categoryFilter !== "all" ? categoryFilter : undefined,
  });
  const { data: clients } = trpc.client.getAll.useQuery();

  // Exercise templates from database
  const { data: dbExercises, refetch: refetchExercises } = trpc.content.getExerciseTemplates.useQuery({});

  const createExerciseTemplate = trpc.content.createExerciseTemplate.useMutation({
    onSuccess: () => {
      toast.success("Exercise created!");
      setIsExerciseCreateOpen(false);
      resetExerciseForm();
      refetchExercises();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to create exercise");
    },
  });

  const updateExerciseTemplate = trpc.content.updateExerciseTemplate.useMutation({
    onSuccess: () => {
      toast.success("Exercise updated!");
      setIsExerciseEditOpen(false);
      setEditingExerciseId(null);
      resetExerciseForm();
      refetchExercises();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to update exercise");
    },
  });

  const deleteExerciseTemplate = trpc.content.deleteExerciseTemplate.useMutation({
    onSuccess: () => {
      toast.success("Exercise deleted!");
      refetchExercises();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to delete exercise");
    },
  });

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
    setWorkoutExercises([]);
    setWorkoutExerciseSearch("");
    setShowExercisePicker(false);
  };

  // Add exercise to workout
  const addExerciseToWorkout = (exercise: { id: string; name: string; muscleGroup: string }) => {
    const newExercise: WorkoutExercise = {
      id: `we-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      exerciseId: exercise.id,
      name: exercise.name,
      muscleGroup: exercise.muscleGroup,
      sets: 3,
      reps: 10,
      weight: 0,
      weightUnit: "kg",
      duration: 0,
      restTime: 60,
      notes: "",
    };
    setWorkoutExercises((prev) => [...prev, newExercise]);
    setWorkoutExerciseSearch("");
    setShowExercisePicker(false);
  };

  // Update exercise in workout
  const updateWorkoutExercise = (id: string, updates: Partial<WorkoutExercise>) => {
    setWorkoutExercises((prev) =>
      prev.map((ex) => (ex.id === id ? { ...ex, ...updates } : ex))
    );
  };

  // Remove exercise from workout
  const removeExerciseFromWorkout = (id: string) => {
    setWorkoutExercises((prev) => prev.filter((ex) => ex.id !== id));
  };

  // Move exercise up/down
  const moveExercise = (id: string, direction: "up" | "down") => {
    setWorkoutExercises((prev) => {
      const index = prev.findIndex((ex) => ex.id === id);
      if (index === -1) return prev;
      if (direction === "up" && index === 0) return prev;
      if (direction === "down" && index === prev.length - 1) return prev;
      const newExercises = [...prev];
      const swapIndex = direction === "up" ? index - 1 : index + 1;
      [newExercises[index], newExercises[swapIndex]] = [newExercises[swapIndex], newExercises[index]];
      return newExercises;
    });
  };


  const resetExerciseForm = () => {
    setExerciseFormData({
      name: "",
      muscleGroup: "",
      equipment: "",
      difficulty: "intermediate",
      description: "",
      instructions: "",
      videoUrl: "",
    });
  };

  const handleCreateExercise = () => {
    if (!exerciseFormData.name || !exerciseFormData.muscleGroup || !exerciseFormData.equipment) {
      toast.error("Please fill in all required fields");
      return;
    }
    createExerciseTemplate.mutate({
      name: exerciseFormData.name,
      muscleGroup: exerciseFormData.muscleGroup,
      equipment: exerciseFormData.equipment,
      difficulty: exerciseFormData.difficulty,
      description: exerciseFormData.description || undefined,
      instructions: exerciseFormData.instructions || undefined,
      videoUrl: exerciseFormData.videoUrl || undefined,
    });
  };

  const handleUpdateExercise = () => {
    if (!editingExerciseId || !exerciseFormData.name || !exerciseFormData.muscleGroup || !exerciseFormData.equipment) {
      toast.error("Please fill in all required fields");
      return;
    }
    updateExerciseTemplate.mutate({
      id: editingExerciseId,
      name: exerciseFormData.name,
      muscleGroup: exerciseFormData.muscleGroup,
      equipment: exerciseFormData.equipment,
      difficulty: exerciseFormData.difficulty,
      description: exerciseFormData.description || undefined,
      instructions: exerciseFormData.instructions || undefined,
      videoUrl: exerciseFormData.videoUrl || undefined,
    });
  };

  const openEditExercise = (exercise: {
    id: string;
    name: string;
    muscleGroup: string;
    equipment: string;
    difficulty: string;
    description: string | null;
    instructions?: string | null;
    videoUrl?: string | null;
  }) => {
    setEditingExerciseId(exercise.id);
    setExerciseFormData({
      name: exercise.name,
      muscleGroup: exercise.muscleGroup,
      equipment: exercise.equipment,
      difficulty: exercise.difficulty as "beginner" | "intermediate" | "advanced",
      description: exercise.description || "",
      instructions: exercise.instructions || "",
      videoUrl: exercise.videoUrl || "",
    });
    setIsExerciseEditOpen(true);
  };

  const handleCreate = () => {
    if (!formData.title) {
      toast.error("Please enter a workout title");
      return;
    }
    // Build content with exercises
    const content = workoutExercises.length > 0 ? {
      exercises: workoutExercises.map((ex, index) => ({
        order: index + 1,
        exerciseId: ex.exerciseId,
        name: ex.name,
        muscleGroup: ex.muscleGroup,
        sets: ex.sets,
        reps: ex.reps,
        weight: ex.weight,
        weightUnit: ex.weightUnit,
        duration: ex.duration,
        restTime: ex.restTime,
        notes: ex.notes,
      })),
    } : undefined;

    createWorkout.mutate({
      title: formData.title,
      description: formData.description || undefined,
      category: formData.category || undefined,
      difficulty: formData.difficulty || undefined,
      duration: formData.duration ? parseInt(formData.duration) : undefined,
      content,
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

  // Combine static exercises with database exercises
  type CombinedExercise = Exercise & { isCustom?: boolean; dbId?: string; videoUrl?: string | null };

  const allExercises = useMemo(() => {
    const staticExercises: CombinedExercise[] = EXERCISES.map(e => ({ ...e, isCustom: false }));
    const customExercises: CombinedExercise[] = (dbExercises || []).map(e => ({
      id: `db-${e.id}`,
      dbId: e.id,
      name: e.name,
      muscleGroup: e.muscleGroup,
      equipment: e.equipment,
      difficulty: e.difficulty as "beginner" | "intermediate" | "advanced",
      description: e.description || "",
      isCustom: true,
      videoUrl: e.videoUrl,
    }));
    return [...customExercises, ...staticExercises];
  }, [dbExercises]);

  const totalExerciseCount = allExercises.length;

  // Filter exercises for picker (in create workout dialog)
  const pickerExercises = useMemo(() => {
    if (!workoutExerciseSearch.trim()) return [];
    return allExercises
      .filter((ex) =>
        ex.name.toLowerCase().includes(workoutExerciseSearch.toLowerCase()) ||
        ex.muscleGroup.toLowerCase().includes(workoutExerciseSearch.toLowerCase())
      )
      .slice(0, 10);
  }, [allExercises, workoutExerciseSearch]);

  // Filter exercises
  const filteredExercises = useMemo(() => {
    return allExercises.filter((exercise) => {
      const matchesSearch = exercise.name.toLowerCase().includes(exerciseSearch.toLowerCase()) ||
        exercise.description.toLowerCase().includes(exerciseSearch.toLowerCase());
      const matchesMuscle = muscleGroupFilter === "all" || exercise.muscleGroup === muscleGroupFilter;
      const matchesEquipment = equipmentFilter === "all" || exercise.equipment === equipmentFilter;
      const matchesDifficulty = difficultyFilter === "all" || exercise.difficulty === difficultyFilter;
      return matchesSearch && matchesMuscle && matchesEquipment && matchesDifficulty;
    });
  }, [allExercises, exerciseSearch, muscleGroupFilter, equipmentFilter, difficultyFilter]);

  // Group exercises by muscle group for display
  const exercisesByMuscleGroup = useMemo(() => {
    const grouped: Record<string, CombinedExercise[]> = {};
    filteredExercises.forEach((exercise) => {
      if (!grouped[exercise.muscleGroup]) {
        grouped[exercise.muscleGroup] = [];
      }
      grouped[exercise.muscleGroup].push(exercise);
    });
    return grouped;
  }, [filteredExercises]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Workouts & Exercises</h2>
        <p className="text-muted-foreground">
          Manage workout plans and browse exercises
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList>
          <TabsTrigger value="workouts" className="gap-2">
            <Dumbbell className="h-4 w-4" />
            Workouts
          </TabsTrigger>
          <TabsTrigger value="exercises" className="gap-2">
            <Dumbbell className="h-4 w-4" />
            Exercises ({totalExerciseCount})
          </TabsTrigger>
          <TabsTrigger value="my-exercises" className="gap-2">
            <Dumbbell className="h-4 w-4" />
            My Exercises {dbExercises && dbExercises.length > 0 && `(${dbExercises.length})`}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="workouts" className="space-y-6">
          {/* Create Button */}
          <div className="flex justify-end">
            <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => resetForm()}>
              <Plus className="mr-2 h-4 w-4" />
              Create Workout
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[700px] p-0 gap-0 overflow-hidden">
            {/* Header */}
            <div className="px-6 py-5 border-b">
              <DialogTitle className="flex items-center gap-2.5 text-lg font-semibold">
                <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary/10">
                  <Dumbbell className="h-4 w-4 text-primary" />
                </div>
                Create New Workout
              </DialogTitle>
              <DialogDescription className="text-sm text-muted-foreground mt-1">
                Design a workout plan for your clients
              </DialogDescription>
            </div>
            
            {/* Content */}
            <div className="px-6 py-5 space-y-5 max-h-[calc(90vh-180px)] overflow-y-auto">
              <div className="space-y-2">
                <Label htmlFor="title" className="text-sm font-medium">
                  Workout Title <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="title"
                  placeholder="e.g., Full Body Strength"
                  className="h-11"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description" className="text-sm font-medium">Description</Label>
                <Textarea
                  id="description"
                  placeholder="Describe the workout..."
                  className="min-h-[100px]"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Category</Label>
                  <Select
                    value={formData.category}
                    onValueChange={(value) => setFormData({ ...formData, category: value })}
                  >
                    <SelectTrigger className="h-11">
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
                  <Label className="text-sm font-medium">Difficulty</Label>
                  <Select
                    value={formData.difficulty}
                    onValueChange={(value) => setFormData({ ...formData, difficulty: value })}
                  >
                    <SelectTrigger className="h-11">
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
                <Label htmlFor="duration" className="text-sm font-medium">Duration (minutes)</Label>
                <Input
                  id="duration"
                  type="number"
                  min="0"
                  placeholder="45"
                  className="h-11"
                  value={formData.duration}
                  onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
                />
              </div>

              {/* Exercises Section */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-medium">
                    Exercises {workoutExercises.length > 0 && `(${workoutExercises.length})`}
                  </Label>
                </div>

                {/* Exercise Search/Picker */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Search exercises to add..."
                    value={workoutExerciseSearch}
                    onChange={(e) => {
                      setWorkoutExerciseSearch(e.target.value);
                      setShowExercisePicker(e.target.value.length > 0);
                    }}
                    onFocus={() => workoutExerciseSearch.length > 0 && setShowExercisePicker(true)}
                    className="pl-9"
                  />
                  {showExercisePicker && pickerExercises.length > 0 && (
                    <div className="absolute z-50 w-full mt-1 bg-popover border rounded-lg shadow-lg max-h-[200px] overflow-y-auto">
                      {pickerExercises.map((exercise) => (
                        <div
                          key={exercise.id}
                          className="px-3 py-2 hover:bg-muted cursor-pointer flex items-center justify-between"
                          onClick={() => addExerciseToWorkout({
                            id: exercise.dbId || exercise.id,
                            name: exercise.name,
                            muscleGroup: exercise.muscleGroup,
                          })}
                        >
                          <div>
                            <p className="text-sm font-medium">{exercise.name}</p>
                            <p className="text-xs text-muted-foreground">{exercise.muscleGroup} • {exercise.equipment}</p>
                          </div>
                          <Plus className="h-4 w-4 text-muted-foreground" />
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Added Exercises List */}
                {workoutExercises.length > 0 ? (
                  <div className="space-y-3">
                    {workoutExercises.map((exercise, index) => (
                      <div
                        key={exercise.id}
                        className="border rounded-lg p-3 bg-muted/30"
                      >
                        <div className="flex items-start gap-2 mb-3">
                          <div className="flex flex-col gap-0.5">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-5 w-5"
                              onClick={() => moveExercise(exercise.id, "up")}
                              disabled={index === 0}
                            >
                              <ChevronUp className="h-3 w-3" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-5 w-5"
                              onClick={() => moveExercise(exercise.id, "down")}
                              disabled={index === workoutExercises.length - 1}
                            >
                              <ChevronDown className="h-3 w-3" />
                            </Button>
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2">
                              <div>
                                <p className="font-medium text-sm">{exercise.name}</p>
                                <p className="text-xs text-muted-foreground">{exercise.muscleGroup}</p>
                              </div>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-muted-foreground hover:text-destructive"
                                onClick={() => removeExerciseFromWorkout(exercise.id)}
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        </div>

                        <div className="grid grid-cols-4 gap-2">
                          <div className="space-y-1">
                            <Label className="text-xs text-muted-foreground">Sets</Label>
                            <Input
                              type="number"
                              min="1"
                              value={exercise.sets}
                              onChange={(e) => updateWorkoutExercise(exercise.id, { sets: parseInt(e.target.value) || 1 })}
                              className="h-8 text-sm"
                            />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs text-muted-foreground">Reps</Label>
                            <Input
                              type="number"
                              min="1"
                              value={exercise.reps}
                              onChange={(e) => updateWorkoutExercise(exercise.id, { reps: parseInt(e.target.value) || 1 })}
                              className="h-8 text-sm"
                            />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs text-muted-foreground">Weight</Label>
                            <div className="flex gap-1">
                              <Input
                                type="number"
                                min="0"
                                step="0.5"
                                value={exercise.weight || ""}
                                onChange={(e) => updateWorkoutExercise(exercise.id, { weight: parseFloat(e.target.value) || 0 })}
                                className="h-8 text-sm"
                                placeholder="0"
                              />
                            </div>
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs text-muted-foreground">Unit</Label>
                            <Select
                              value={exercise.weightUnit}
                              onValueChange={(value: "kg" | "lbs") => updateWorkoutExercise(exercise.id, { weightUnit: value })}
                            >
                              <SelectTrigger className="h-8 text-sm">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="kg">kg</SelectItem>
                                <SelectItem value="lbs">lbs</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-2 mt-2">
                          <div className="space-y-1">
                            <Label className="text-xs text-muted-foreground">Duration (sec)</Label>
                            <Input
                              type="number"
                              min="0"
                              value={exercise.duration || ""}
                              onChange={(e) => updateWorkoutExercise(exercise.id, { duration: parseInt(e.target.value) || 0 })}
                              className="h-8 text-sm"
                              placeholder="0"
                            />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs text-muted-foreground">Rest (sec)</Label>
                            <Input
                              type="number"
                              min="0"
                              value={exercise.restTime}
                              onChange={(e) => updateWorkoutExercise(exercise.id, { restTime: parseInt(e.target.value) || 0 })}
                              className="h-8 text-sm"
                            />
                          </div>
                        </div>

                        <div className="mt-2">
                          <Input
                            placeholder="Notes (optional)"
                            value={exercise.notes}
                            onChange={(e) => updateWorkoutExercise(exercise.id, { notes: e.target.value })}
                            className="h-8 text-sm"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-6 text-muted-foreground border border-dashed rounded-lg">
                    <Dumbbell className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No exercises added yet</p>
                    <p className="text-xs">Search above to add exercises</p>
                  </div>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t bg-muted/30 flex items-center justify-end gap-3">
              <Button variant="outline" onClick={() => setIsCreateOpen(false)} className="h-10 px-5">
                Cancel
              </Button>
              <Button onClick={handleCreate} disabled={createWorkout.isPending} className="h-10 px-5 gap-2">
                {createWorkout.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Plus className="h-4 w-4" />
                )}
                Create Workout
              </Button>
            </div>
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
        </TabsContent>

        {/* Exercises Tab */}
        <TabsContent value="exercises" className="space-y-6">
          {/* Create Exercise Button */}
          <div className="flex justify-end">
            <Button onClick={() => { resetExerciseForm(); setIsExerciseCreateOpen(true); }}>
              <Plus className="mr-2 h-4 w-4" />
              Create Exercise
            </Button>
          </div>

          {/* Exercise Filters */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-col gap-4 md:flex-row md:flex-wrap">
                <div className="relative flex-1 min-w-[200px]">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Search exercises..."
                    value={exerciseSearch}
                    onChange={(e) => setExerciseSearch(e.target.value)}
                    className="pl-9"
                  />
                </div>
                <Select value={muscleGroupFilter} onValueChange={setMuscleGroupFilter}>
                  <SelectTrigger className="w-full md:w-[180px]">
                    <SelectValue placeholder="Muscle Group" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Muscles</SelectItem>
                    {MUSCLE_GROUPS.map((group) => (
                      <SelectItem key={group} value={group}>{group}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={equipmentFilter} onValueChange={setEquipmentFilter}>
                  <SelectTrigger className="w-full md:w-[180px]">
                    <SelectValue placeholder="Equipment" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Equipment</SelectItem>
                    {EQUIPMENT_TYPES.map((type) => (
                      <SelectItem key={type} value={type}>{type}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={difficultyFilter} onValueChange={setDifficultyFilter}>
                  <SelectTrigger className="w-full md:w-[150px]">
                    <SelectValue placeholder="Difficulty" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Levels</SelectItem>
                    <SelectItem value="beginner">Beginner</SelectItem>
                    <SelectItem value="intermediate">Intermediate</SelectItem>
                    <SelectItem value="advanced">Advanced</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Exercise Count */}
          <div className="text-sm text-muted-foreground">
            Showing {filteredExercises.length} of {totalExerciseCount} exercises
            {dbExercises && dbExercises.length > 0 && (
              <span className="ml-2">({dbExercises.length} custom)</span>
            )}
          </div>

          {/* Exercises List */}
          {filteredExercises.length > 0 ? (
            <div className="space-y-6">
              {Object.entries(exercisesByMuscleGroup).map(([muscleGroup, exercises]) => (
                <Card key={muscleGroup}>
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <Dumbbell className="h-5 w-5 text-primary" />
                      {muscleGroup}
                      <Badge variant="secondary" className="ml-2">{exercises.length}</Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                      {exercises.map((exercise) => (
                        <div
                          key={exercise.id}
                          className="p-4 rounded-lg border bg-card hover:bg-muted/50 transition-colors relative group"
                        >
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <div className="flex items-center gap-2">
                              <h4 className="font-medium text-sm">{exercise.name}</h4>
                              {exercise.isCustom && (
                                <Badge variant="outline" className="text-xs bg-primary/10 text-primary border-primary/20">
                                  Custom
                                </Badge>
                              )}
                            </div>
                            <div className="flex items-center gap-1">
                              <Badge className={getDifficultyColor(exercise.difficulty)} variant="secondary">
                                {exercise.difficulty}
                              </Badge>
                              {exercise.isCustom && exercise.dbId && (
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity">
                                      <MoreHorizontal className="h-3 w-3" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end">
                                    <DropdownMenuItem onClick={() => {
                                      const dbExercise = dbExercises?.find(e => e.id === exercise.dbId);
                                      if (dbExercise) openEditExercise(dbExercise);
                                    }}>
                                      <Edit className="mr-2 h-4 w-4" />
                                      Edit
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem
                                      className="text-destructive"
                                      onClick={() => {
                                        if (exercise.dbId && confirm("Delete this exercise?")) {
                                          deleteExerciseTemplate.mutate({ id: exercise.dbId });
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
                          </div>
                          <p className="text-xs text-muted-foreground mb-2 line-clamp-2">
                            {exercise.description}
                          </p>
                          <div className="flex items-center justify-between gap-2">
                            <Badge variant="outline" className="text-xs">
                              {exercise.equipment}
                            </Badge>
                            {exercise.videoUrl && (
                              <a
                                href={exercise.videoUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <Video className="h-3 w-3" />
                                Video
                              </a>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="py-12">
                <div className="text-center">
                  <Dumbbell className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                  <h3 className="text-lg font-medium mb-2">No exercises found</h3>
                  <p className="text-muted-foreground">
                    Try adjusting your search or filters
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* My Exercises Tab */}
        <TabsContent value="my-exercises" className="space-y-6">
          {/* Create Exercise Button */}
          <div className="flex justify-end">
            <Button onClick={() => { resetExerciseForm(); setIsExerciseCreateOpen(true); }}>
              <Plus className="mr-2 h-4 w-4" />
              Create Exercise
            </Button>
          </div>

          {/* My Exercises List */}
          {dbExercises && dbExercises.length > 0 ? (
            <div className="space-y-4">
              <div className="text-sm text-muted-foreground">
                You have {dbExercises.length} custom exercise{dbExercises.length !== 1 ? 's' : ''}
              </div>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {dbExercises.map((exercise) => (
                  <Card key={exercise.id} className="group">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div>
                          <CardTitle className="text-base flex items-center gap-2">
                            {exercise.name}
                          </CardTitle>
                          <CardDescription className="mt-1 line-clamp-2">
                            {exercise.description || "No description"}
                          </CardDescription>
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => openEditExercise(exercise)}>
                              <Edit className="mr-2 h-4 w-4" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="text-destructive"
                              onClick={() => {
                                if (confirm("Delete this exercise?")) {
                                  deleteExerciseTemplate.mutate({ id: exercise.id });
                                }
                              }}
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex flex-wrap gap-2">
                        <Badge variant="secondary">{exercise.muscleGroup}</Badge>
                        <Badge variant="outline">{exercise.equipment}</Badge>
                        <Badge className={getDifficultyColor(exercise.difficulty)}>
                          {exercise.difficulty}
                        </Badge>
                      </div>
                      {exercise.instructions && (
                        <p className="text-xs text-muted-foreground line-clamp-2">
                          {exercise.instructions}
                        </p>
                      )}
                      {exercise.videoUrl && (
                        <a
                          href={exercise.videoUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 text-xs text-primary hover:underline"
                        >
                          <Video className="h-3.5 w-3.5" />
                          Watch Video
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          ) : (
            <Card>
              <CardContent className="py-12">
                <div className="text-center">
                  <Dumbbell className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                  <h3 className="text-lg font-medium mb-2">No custom exercises yet</h3>
                  <p className="text-muted-foreground mb-4">
                    Create your first custom exercise to add to your library
                  </p>
                  <Button onClick={() => { resetExerciseForm(); setIsExerciseCreateOpen(true); }}>
                    <Plus className="mr-2 h-4 w-4" />
                    Create Exercise
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* Assign Dialog */}
      <Dialog open={isAssignOpen} onOpenChange={setIsAssignOpen}>
        <DialogContent className="sm:max-w-[500px] p-0 gap-0 overflow-hidden">
          {/* Header */}
          <div className="px-6 py-5 border-b">
            <DialogTitle className="flex items-center gap-2.5 text-lg font-semibold">
              <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary/10">
                <UserPlus className="h-4 w-4 text-primary" />
              </div>
              Assign Workout to Clients
            </DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground mt-1">
              Select clients to assign this workout to
            </DialogDescription>
          </div>
          
          {/* Content */}
          <div className="px-6 py-5">
            <div className="border rounded-xl max-h-[300px] overflow-y-auto">
              {clients?.map((client) => (
                <div
                  key={client.id}
                  className={`flex items-center gap-3 px-4 py-3.5 cursor-pointer transition-colors border-b last:border-b-0 ${
                    selectedClientIds.includes(client.id)
                      ? "bg-primary/5"
                      : "hover:bg-muted/50"
                  }`}
                  onClick={() => toggleClientSelection(client.id)}
                >
                  <div className={`flex-shrink-0 h-5 w-5 rounded-md border-2 flex items-center justify-center transition-all ${
                    selectedClientIds.includes(client.id)
                      ? "bg-primary border-primary"
                      : "border-gray-300 dark:border-gray-600"
                  }`}>
                    {selectedClientIds.includes(client.id) && (
                      <svg className="h-3 w-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium text-sm">{client.name}</p>
                    <p className="text-sm text-muted-foreground truncate">{client.email}</p>
                  </div>
                </div>
              ))}
            </div>
            <p className="text-sm text-muted-foreground mt-3">
              {selectedClientIds.length} client(s) selected
            </p>
          </div>
          
          {/* Footer */}
          <div className="px-6 py-4 border-t bg-muted/30 flex items-center justify-end gap-3">
            <Button variant="outline" onClick={() => setIsAssignOpen(false)} className="h-10 px-5">
              Cancel
            </Button>
            <Button onClick={handleAssign} disabled={assignWorkout.isPending} className="h-10 px-5 gap-2">
              {assignWorkout.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <UserPlus className="h-4 w-4" />
              )}
              Assign ({selectedClientIds.length})
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Create Exercise Dialog */}
      <Dialog open={isExerciseCreateOpen} onOpenChange={setIsExerciseCreateOpen}>
        <DialogContent className="sm:max-w-[550px] p-0 gap-0 overflow-hidden">
          <div className="px-6 py-5 border-b">
            <DialogTitle className="flex items-center gap-2.5 text-lg font-semibold">
              <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary/10">
                <Dumbbell className="h-4 w-4 text-primary" />
              </div>
              Create New Exercise
            </DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground mt-1">
              Add a custom exercise to your library
            </DialogDescription>
          </div>

          <div className="px-6 py-5 space-y-4 max-h-[calc(90vh-180px)] overflow-y-auto">
            <div className="space-y-2">
              <Label htmlFor="exercise-name">Exercise Name <span className="text-red-500">*</span></Label>
              <Input
                id="exercise-name"
                placeholder="e.g., Incline Dumbbell Press"
                value={exerciseFormData.name}
                onChange={(e) => setExerciseFormData({ ...exerciseFormData, name: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Muscle Group <span className="text-red-500">*</span></Label>
                <Select
                  value={exerciseFormData.muscleGroup}
                  onValueChange={(value) => setExerciseFormData({ ...exerciseFormData, muscleGroup: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    {MUSCLE_GROUPS.map((group) => (
                      <SelectItem key={group} value={group}>{group}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Equipment <span className="text-red-500">*</span></Label>
                <Select
                  value={exerciseFormData.equipment}
                  onValueChange={(value) => setExerciseFormData({ ...exerciseFormData, equipment: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    {EQUIPMENT_TYPES.map((type) => (
                      <SelectItem key={type} value={type}>{type}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Difficulty</Label>
              <Select
                value={exerciseFormData.difficulty}
                onValueChange={(value) => setExerciseFormData({ ...exerciseFormData, difficulty: value as "beginner" | "intermediate" | "advanced" })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="beginner">Beginner</SelectItem>
                  <SelectItem value="intermediate">Intermediate</SelectItem>
                  <SelectItem value="advanced">Advanced</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="exercise-description">Description</Label>
              <Textarea
                id="exercise-description"
                placeholder="Brief description of the exercise..."
                value={exerciseFormData.description}
                onChange={(e) => setExerciseFormData({ ...exerciseFormData, description: e.target.value })}
                rows={2}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="exercise-instructions">Instructions</Label>
              <Textarea
                id="exercise-instructions"
                placeholder="Step-by-step instructions..."
                value={exerciseFormData.instructions}
                onChange={(e) => setExerciseFormData({ ...exerciseFormData, instructions: e.target.value })}
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="exercise-video">Video URL (optional)</Label>
              <Input
                id="exercise-video"
                placeholder="https://youtube.com/..."
                value={exerciseFormData.videoUrl}
                onChange={(e) => setExerciseFormData({ ...exerciseFormData, videoUrl: e.target.value })}
              />
            </div>
          </div>

          <div className="px-6 py-4 border-t bg-muted/30 flex items-center justify-end gap-3">
            <Button variant="outline" onClick={() => setIsExerciseCreateOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateExercise} disabled={createExerciseTemplate.isPending}>
              {createExerciseTemplate.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Plus className="h-4 w-4 mr-2" />
              )}
              Create Exercise
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Exercise Dialog */}
      <Dialog open={isExerciseEditOpen} onOpenChange={setIsExerciseEditOpen}>
        <DialogContent className="sm:max-w-[550px] p-0 gap-0 overflow-hidden">
          <div className="px-6 py-5 border-b">
            <DialogTitle className="flex items-center gap-2.5 text-lg font-semibold">
              <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary/10">
                <Edit className="h-4 w-4 text-primary" />
              </div>
              Edit Exercise
            </DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground mt-1">
              Update your custom exercise
            </DialogDescription>
          </div>

          <div className="px-6 py-5 space-y-4 max-h-[calc(90vh-180px)] overflow-y-auto">
            <div className="space-y-2">
              <Label htmlFor="edit-exercise-name">Exercise Name <span className="text-red-500">*</span></Label>
              <Input
                id="edit-exercise-name"
                placeholder="e.g., Incline Dumbbell Press"
                value={exerciseFormData.name}
                onChange={(e) => setExerciseFormData({ ...exerciseFormData, name: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Muscle Group <span className="text-red-500">*</span></Label>
                <Select
                  value={exerciseFormData.muscleGroup}
                  onValueChange={(value) => setExerciseFormData({ ...exerciseFormData, muscleGroup: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    {MUSCLE_GROUPS.map((group) => (
                      <SelectItem key={group} value={group}>{group}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Equipment <span className="text-red-500">*</span></Label>
                <Select
                  value={exerciseFormData.equipment}
                  onValueChange={(value) => setExerciseFormData({ ...exerciseFormData, equipment: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    {EQUIPMENT_TYPES.map((type) => (
                      <SelectItem key={type} value={type}>{type}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Difficulty</Label>
              <Select
                value={exerciseFormData.difficulty}
                onValueChange={(value) => setExerciseFormData({ ...exerciseFormData, difficulty: value as "beginner" | "intermediate" | "advanced" })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="beginner">Beginner</SelectItem>
                  <SelectItem value="intermediate">Intermediate</SelectItem>
                  <SelectItem value="advanced">Advanced</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-exercise-description">Description</Label>
              <Textarea
                id="edit-exercise-description"
                placeholder="Brief description of the exercise..."
                value={exerciseFormData.description}
                onChange={(e) => setExerciseFormData({ ...exerciseFormData, description: e.target.value })}
                rows={2}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-exercise-instructions">Instructions</Label>
              <Textarea
                id="edit-exercise-instructions"
                placeholder="Step-by-step instructions..."
                value={exerciseFormData.instructions}
                onChange={(e) => setExerciseFormData({ ...exerciseFormData, instructions: e.target.value })}
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-exercise-video">Video URL (optional)</Label>
              <Input
                id="edit-exercise-video"
                placeholder="https://youtube.com/..."
                value={exerciseFormData.videoUrl}
                onChange={(e) => setExerciseFormData({ ...exerciseFormData, videoUrl: e.target.value })}
              />
            </div>
          </div>

          <div className="px-6 py-4 border-t bg-muted/30 flex items-center justify-end gap-3">
            <Button variant="outline" onClick={() => { setIsExerciseEditOpen(false); setEditingExerciseId(null); }}>
              Cancel
            </Button>
            <Button onClick={handleUpdateExercise} disabled={updateExerciseTemplate.isPending}>
              {updateExerciseTemplate.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Edit className="h-4 w-4 mr-2" />
              )}
              Save Changes
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
