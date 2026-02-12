"use client";

import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { MultiSelect } from "@/components/ui/multi-select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Sparkles,
  Loader2,
  ChevronDown,
  Dumbbell,
  Clock,
  Target,
  Check,
  Flame,
  Zap,
  Calendar,
  Info,
} from "lucide-react";
import { toast } from "sonner";
import { MUSCLE_GROUPS, EQUIPMENT_TYPES, EXERCISES } from "@/data/exercises";

const WORKOUT_SPLITS = [
  {
    value: "single",
    label: "Single Day Workout",
    days: 1,
    description: "One workout session",
    dayLabels: ["Workout"],
    muscleGroups: [null], // null means use selected workout type
  },
  {
    value: "upper-lower",
    label: "Upper/Lower Split",
    days: 2,
    description: "Alternate between upper and lower body",
    dayLabels: ["Upper Body", "Lower Body"],
    muscleGroups: [
      ["Chest", "Back", "Shoulders", "Biceps", "Triceps"],
      ["Quadriceps", "Hamstrings", "Glutes", "Calves"],
    ],
  },
  {
    value: "ppl",
    label: "Push/Pull/Legs (PPL)",
    days: 3,
    description: "Classic 3-day split",
    dayLabels: ["Push", "Pull", "Legs"],
    muscleGroups: [
      ["Chest", "Shoulders", "Triceps"],
      ["Back", "Biceps", "Forearms"],
      ["Quadriceps", "Hamstrings", "Glutes", "Calves"],
    ],
  },
  {
    value: "4-day",
    label: "4-Day Split",
    days: 4,
    description: "Upper/Lower twice per week",
    dayLabels: ["Upper A", "Lower A", "Upper B", "Lower B"],
    muscleGroups: [
      ["Chest", "Back", "Shoulders"],
      ["Quadriceps", "Hamstrings", "Glutes"],
      ["Chest", "Back", "Biceps", "Triceps"],
      ["Quadriceps", "Hamstrings", "Calves"],
    ],
  },
  {
    value: "5-day",
    label: "5-Day Split",
    days: 5,
    description: "Bro split - one muscle group per day",
    dayLabels: ["Chest", "Back", "Shoulders", "Legs", "Arms"],
    muscleGroups: [
      ["Chest"],
      ["Back"],
      ["Shoulders"],
      ["Quadriceps", "Hamstrings", "Glutes", "Calves"],
      ["Biceps", "Triceps"],
    ],
  },
  {
    value: "full-week",
    label: "Full Week (7 Days)",
    days: 7,
    description: "Complete weekly program with rest days",
    dayLabels: ["Push", "Pull", "Legs", "Upper", "Lower", "Full Body", "Active Recovery"],
    muscleGroups: [
      ["Chest", "Shoulders", "Triceps"],
      ["Back", "Biceps", "Forearms"],
      ["Quadriceps", "Hamstrings", "Glutes", "Calves"],
      ["Chest", "Back", "Shoulders"],
      ["Quadriceps", "Hamstrings", "Calves"],
      ["Chest", "Back", "Shoulders", "Quadriceps"],
      null, // Flexibility/mobility day
    ],
  },
];

const WORKOUT_TYPES = [
  { value: "strength", label: "Strength Training" },
  { value: "cardio", label: "Cardio" },
  { value: "hiit", label: "HIIT" },
  { value: "flexibility", label: "Flexibility & Mobility" },
  { value: "yoga", label: "Yoga" },
  { value: "circuit", label: "Circuit Training" },
  { value: "full-body", label: "Full Body Workout" },
  { value: "upper-body", label: "Upper Body Focus" },
  { value: "lower-body", label: "Lower Body Focus" },
  { value: "push", label: "Push Day" },
  { value: "pull", label: "Pull Day" },
  { value: "legs", label: "Legs Day" },
];

const DIFFICULTY_LEVELS = [
  { value: "beginner", label: "Beginner" },
  { value: "intermediate", label: "Intermediate" },
  { value: "advanced", label: "Advanced" },
];

const DURATION_OPTIONS = [
  { value: "15", label: "15 minutes" },
  { value: "30", label: "30 minutes" },
  { value: "45", label: "45 minutes" },
  { value: "60", label: "60 minutes" },
  { value: "75", label: "75 minutes" },
  { value: "90", label: "90 minutes" },
];

interface WorkoutGenerationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function WorkoutGenerationDialog({
  open,
  onOpenChange,
  onSuccess,
}: WorkoutGenerationDialogProps) {
  const [step, setStep] = useState<"form" | "generating" | "preview">("form");
  const [isAdvancedOpen, setIsAdvancedOpen] = useState(false);

  const [formData, setFormData] = useState({
    workoutName: "",
    workoutSplit: "single",
    workoutType: "",
    difficulty: "intermediate",
    duration: "45",
    targetMuscles: [] as string[],
    availableEquipment: [] as string[],
    // Advanced options
    exerciseCount: "6",
    includeWarmup: true,
    includeCooldown: true,
    restBetweenSets: "60",
    setsPerExercise: "3",
  });

  type GeneratedExercise = {
    name: string;
    muscleGroup: string;
    equipment: string;
    sets: number;
    reps: number;
    restTime: number;
    notes?: string;
  };

  type GeneratedDay = {
    day: number;
    label: string;
    exercises: GeneratedExercise[];
    warmup?: Array<{ name: string; duration: number }>;
    cooldown?: Array<{ name: string; duration: number }>;
  };

  const [generatedWorkout, setGeneratedWorkout] = useState<{
    title: string;
    description: string;
    category: string;
    difficulty: string;
    duration: number;
    daysCount: number;
    // Single-day format
    exercises?: GeneratedExercise[];
    warmup?: Array<{ name: string; duration: number }>;
    cooldown?: Array<{ name: string; duration: number }>;
    // Multi-day format
    days?: GeneratedDay[];
  } | null>(null);

  const [previewDay, setPreviewDay] = useState(1);

  // Fetch database exercises
  const { data: dbExercises } = trpc.content.getExerciseTemplates.useQuery({});

  // Combine static and database exercises
  const allExercises = useMemo(() => {
    const staticExercises = EXERCISES.map(e => ({ ...e, isCustom: false }));
    const customExercises = (dbExercises || []).map(e => ({
      id: `db-${e.id}`,
      dbId: e.id,
      name: e.name,
      muscleGroup: e.muscleGroup,
      equipment: e.equipment,
      difficulty: e.difficulty as "beginner" | "intermediate" | "advanced",
      description: e.description || "",
      instructions: e.instructions || "",
      isCustom: true,
    }));
    return [...customExercises, ...staticExercises];
  }, [dbExercises]);

  const createWorkout = trpc.content.createWorkout.useMutation({
    onSuccess: () => {
      toast.success("AI-generated workout saved!");
      onSuccess?.();
      handleClose();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to save workout");
    },
  });

  const resetForm = () => {
    setFormData({
      workoutName: "",
      workoutSplit: "single",
      workoutType: "",
      difficulty: "intermediate",
      duration: "45",
      targetMuscles: [],
      availableEquipment: [],
      exerciseCount: "6",
      includeWarmup: true,
      includeCooldown: true,
      restBetweenSets: "60",
      setsPerExercise: "3",
    });
    setGeneratedWorkout(null);
    setPreviewDay(1);
    setStep("form");
  };

  const handleClose = () => {
    resetForm();
    onOpenChange(false);
  };

  const handleGenerate = () => {
    if (!formData.workoutType && formData.workoutSplit === "single") {
      toast.error("Please select a workout type");
      return;
    }

    setStep("generating");

    // Simulate AI generation
    setTimeout(() => {
      const exerciseCount = parseInt(formData.exerciseCount);
      const setsPerExercise = parseInt(formData.setsPerExercise);
      const restTime = parseInt(formData.restBetweenSets);
      const duration = parseInt(formData.duration);

      const selectedSplit = WORKOUT_SPLITS.find(s => s.value === formData.workoutSplit) || WORKOUT_SPLITS[0];

      // Generate reps based on workout type
      const getReps = (type: string) => {
        switch (type) {
          case "strength":
            return Math.floor(Math.random() * 4) + 6; // 6-9 reps
          case "hiit":
          case "cardio":
            return Math.floor(Math.random() * 6) + 15; // 15-20 reps
          case "circuit":
            return Math.floor(Math.random() * 4) + 12; // 12-15 reps
          default:
            return Math.floor(Math.random() * 4) + 10; // 10-13 reps
        }
      };

      // Generate warmup
      const generateWarmup = () => formData.includeWarmup ? [
        { name: "Light Cardio (Jogging/Jumping Jacks)", duration: 180 },
        { name: "Arm Circles", duration: 60 },
        { name: "Leg Swings", duration: 60 },
        { name: "Hip Rotations", duration: 60 },
      ] : undefined;

      // Generate cooldown
      const generateCooldown = () => formData.includeCooldown ? [
        { name: "Static Stretches", duration: 180 },
        { name: "Deep Breathing", duration: 60 },
        { name: "Foam Rolling (Optional)", duration: 120 },
      ] : undefined;

      // Generate exercises for a specific muscle group filter
      const generateExercisesForMuscles = (muscleGroups: string[] | null): GeneratedExercise[] => {
        let filteredExercises = [...allExercises];

        // Filter by difficulty
        if (formData.difficulty === "beginner") {
          filteredExercises = filteredExercises.filter(e => e.difficulty === "beginner");
        } else if (formData.difficulty === "advanced") {
          filteredExercises = filteredExercises.filter(e => e.difficulty !== "beginner");
        }

        // Filter by available equipment
        if (formData.availableEquipment.length > 0) {
          filteredExercises = filteredExercises.filter(e =>
            formData.availableEquipment.includes(e.equipment) || e.equipment === "Bodyweight"
          );
        }

        // Filter by muscle groups
        if (muscleGroups && muscleGroups.length > 0) {
          filteredExercises = filteredExercises.filter(e =>
            muscleGroups.includes(e.muscleGroup)
          );
        }

        // If not enough exercises, fall back to all exercises
        if (filteredExercises.length < exerciseCount) {
          filteredExercises = [...allExercises];
          if (muscleGroups && muscleGroups.length > 0) {
            filteredExercises = filteredExercises.filter(e =>
              muscleGroups.includes(e.muscleGroup)
            );
          }
        }

        // Shuffle and select
        const shuffled = filteredExercises.sort(() => Math.random() - 0.5);
        const selected = shuffled.slice(0, exerciseCount);

        return selected.map(ex => ({
          name: ex.name,
          muscleGroup: ex.muscleGroup,
          equipment: ex.equipment,
          sets: setsPerExercise,
          reps: getReps(formData.workoutType || "strength"),
          restTime,
          notes: ex.description,
        }));
      };

      // Build workout type labels
      const workoutTypeLabels: Record<string, string> = {
        strength: "Strength",
        cardio: "Cardio",
        hiit: "HIIT",
        flexibility: "Flexibility",
        yoga: "Yoga",
        circuit: "Circuit",
        "full-body": "Full Body",
        "upper-body": "Upper Body",
        "lower-body": "Lower Body",
        push: "Push",
        pull: "Pull",
        legs: "Legs",
      };

      if (selectedSplit.days === 1) {
        // Single-day workout (existing behavior)
        // Apply workout type muscle group filters
        const workoutTypeMuscleMap: Record<string, string[]> = {
          "upper-body": ["Chest", "Back", "Shoulders", "Biceps", "Triceps"],
          "lower-body": ["Quadriceps", "Hamstrings", "Glutes", "Calves"],
          "push": ["Chest", "Shoulders", "Triceps"],
          "pull": ["Back", "Biceps", "Forearms"],
          "legs": ["Quadriceps", "Hamstrings", "Glutes", "Calves"],
        };

        const muscleFilter = formData.targetMuscles.length > 0
          ? formData.targetMuscles
          : workoutTypeMuscleMap[formData.workoutType] || null;

        const exercises = generateExercisesForMuscles(muscleFilter);

        const title = formData.workoutName ||
          `${workoutTypeLabels[formData.workoutType]} ${formData.difficulty.charAt(0).toUpperCase() + formData.difficulty.slice(1)} Workout`;

        const description = `AI-generated ${duration}-minute ${formData.difficulty} ${workoutTypeLabels[formData.workoutType].toLowerCase()} workout with ${exerciseCount} exercises.`;

        setGeneratedWorkout({
          title,
          description,
          category: formData.workoutType,
          difficulty: formData.difficulty,
          duration,
          daysCount: 1,
          exercises,
          warmup: generateWarmup(),
          cooldown: generateCooldown(),
        });
      } else {
        // Multi-day workout
        const days: GeneratedDay[] = [];

        for (let i = 0; i < selectedSplit.days; i++) {
          const muscleGroups = selectedSplit.muscleGroups[i];
          const dayLabel = selectedSplit.dayLabels[i];

          // For flexibility/recovery days
          if (muscleGroups === null && dayLabel.toLowerCase().includes("recovery")) {
            days.push({
              day: i + 1,
              label: dayLabel,
              exercises: [
                { name: "Light Walking", muscleGroup: "Cardio", equipment: "Bodyweight", sets: 1, reps: 1, restTime: 0, notes: "10-15 minutes" },
                { name: "Full Body Stretches", muscleGroup: "Flexibility", equipment: "Bodyweight", sets: 1, reps: 1, restTime: 0, notes: "Hold each stretch 30s" },
                { name: "Foam Rolling", muscleGroup: "Flexibility", equipment: "Other", sets: 1, reps: 1, restTime: 0, notes: "Focus on tight areas" },
              ],
              warmup: undefined,
              cooldown: undefined,
            });
          } else {
            days.push({
              day: i + 1,
              label: dayLabel,
              exercises: generateExercisesForMuscles(muscleGroups as string[]),
              warmup: generateWarmup(),
              cooldown: generateCooldown(),
            });
          }
        }

        const title = formData.workoutName ||
          `${selectedSplit.label} - ${formData.difficulty.charAt(0).toUpperCase() + formData.difficulty.slice(1)} Program`;

        const totalExercises = days.reduce((sum, d) => sum + d.exercises.length, 0);
        const description = `AI-generated ${selectedSplit.days}-day ${formData.difficulty} workout program with ${totalExercises} total exercises.`;

        setGeneratedWorkout({
          title,
          description,
          category: formData.workoutType || "strength",
          difficulty: formData.difficulty,
          duration,
          daysCount: selectedSplit.days,
          days,
        });

        setPreviewDay(1);
      }

      setStep("preview");
    }, 2000);
  };

  const handleSave = () => {
    if (!generatedWorkout) return;

    let content: Record<string, unknown>;

    if (generatedWorkout.days && generatedWorkout.days.length > 0) {
      // Multi-day format
      content = {
        days: generatedWorkout.days.map((day) => ({
          day: day.day,
          label: day.label,
          exercises: day.exercises.map((ex, index) => ({
            order: index + 1,
            exerciseId: "",
            name: ex.name,
            muscleGroup: ex.muscleGroup,
            sets: ex.sets,
            reps: ex.reps,
            weight: 0,
            weightUnit: "kg" as const,
            duration: 0,
            restTime: ex.restTime,
            notes: ex.notes || "",
          })),
          warmup: day.warmup,
          cooldown: day.cooldown,
        })),
      };
    } else {
      // Single-day format
      content = {
        exercises: (generatedWorkout.exercises || []).map((ex, index) => ({
          order: index + 1,
          exerciseId: "",
          name: ex.name,
          muscleGroup: ex.muscleGroup,
          sets: ex.sets,
          reps: ex.reps,
          weight: 0,
          weightUnit: "kg" as const,
          duration: 0,
          restTime: ex.restTime,
          notes: ex.notes || "",
        })),
        warmup: generatedWorkout.warmup,
        cooldown: generatedWorkout.cooldown,
      };
    }

    createWorkout.mutate({
      title: generatedWorkout.title,
      description: generatedWorkout.description,
      category: generatedWorkout.category,
      difficulty: generatedWorkout.difficulty,
      duration: generatedWorkout.duration,
      daysCount: generatedWorkout.daysCount > 1 ? generatedWorkout.daysCount : undefined,
      content,
      source: "AI_GENERATED",
    });
  };

  const muscleGroupOptions = MUSCLE_GROUPS.map(g => ({ value: g, label: g }));
  const equipmentOptions = EQUIPMENT_TYPES.map(e => ({ value: e, label: e }));

  // Helper function to find exercise instructions
  const getExerciseInstructions = (exerciseName: string): string | undefined => {
    const exercise = allExercises.find(
      e => e.name.toLowerCase() === exerciseName.toLowerCase()
    );
    return exercise?.instructions;
  };

  // Exercise card component with collapsible instructions
  const ExerciseCard = ({ exercise, index }: { exercise: GeneratedExercise; index: number }) => {
    const [isOpen, setIsOpen] = useState(false);
    const instructions = getExerciseInstructions(exercise.name);

    return (
      <div className="border rounded-lg p-3">
        <div className="flex items-start justify-between gap-2 mb-2">
          <div>
            <p className="font-medium text-sm">{index + 1}. {exercise.name}</p>
            <p className="text-xs text-muted-foreground">{exercise.muscleGroup}</p>
          </div>
          <Badge variant="outline" className="text-xs">
            {exercise.equipment}
          </Badge>
        </div>
        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          <span>{exercise.sets} sets</span>
          <span>{exercise.reps} reps</span>
          <span>{exercise.restTime}s rest</span>
        </div>
        {instructions && (
          <Collapsible open={isOpen} onOpenChange={setIsOpen}>
            <CollapsibleTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="w-full mt-2 h-7 text-xs justify-start gap-1 text-muted-foreground hover:text-foreground"
              >
                <Info className="h-3 w-3" />
                <span>How to perform</span>
                <ChevronDown className={`h-3 w-3 ml-auto transition-transform ${isOpen ? "rotate-180" : ""}`} />
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-2">
              <div className="bg-muted/50 rounded-md p-3 text-xs text-muted-foreground space-y-1">
                {instructions.split('\n').map((line, i) => (
                  <p key={i}>{line}</p>
                ))}
              </div>
            </CollapsibleContent>
          </Collapsible>
        )}
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            {step === "form" && "Generate Workout with AI"}
            {step === "generating" && "Generating Your Workout..."}
            {step === "preview" && "Your Generated Workout"}
          </DialogTitle>
          <DialogDescription>
            {step === "form" && "Configure your preferences and let AI create a personalized workout"}
            {step === "generating" && "Please wait while we create your customized workout"}
            {step === "preview" && "Review your AI-generated workout"}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto min-h-0 pr-4">
          {step === "form" && (
            <div className="space-y-6 py-4">
              {/* Workout Split Selection */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Workout Split
                </Label>
                <div className="grid grid-cols-2 gap-2">
                  {WORKOUT_SPLITS.map((split) => (
                    <div
                      key={split.value}
                      className={`p-3 border rounded-lg cursor-pointer transition-all ${
                        formData.workoutSplit === split.value
                          ? "border-primary bg-primary/5 ring-1 ring-primary"
                          : "hover:border-muted-foreground/50"
                      }`}
                      onClick={() => setFormData({ ...formData, workoutSplit: split.value })}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-medium text-sm">{split.label}</span>
                        <Badge variant="outline" className="text-xs">
                          {split.days} {split.days === 1 ? "Day" : "Days"}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">{split.description}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Basic Info */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Workout Name (Optional)</Label>
                  <Input
                    placeholder={formData.workoutSplit === "single" ? "My Custom Workout" : "My Workout Program"}
                    value={formData.workoutName}
                    onChange={(e) => setFormData({ ...formData, workoutName: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Workout Type {formData.workoutSplit === "single" ? "*" : "(Optional)"}</Label>
                  <Select
                    value={formData.workoutType}
                    onValueChange={(value) => setFormData({ ...formData, workoutType: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      {WORKOUT_TYPES.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {formData.workoutSplit !== "single" && (
                    <p className="text-xs text-muted-foreground">
                      Muscle groups auto-selected based on split
                    </p>
                  )}
                </div>
              </div>

              {/* Difficulty & Duration */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Difficulty Level</Label>
                  <Select
                    value={formData.difficulty}
                    onValueChange={(value) => setFormData({ ...formData, difficulty: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {DIFFICULTY_LEVELS.map((level) => (
                        <SelectItem key={level.value} value={level.value}>
                          {level.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Duration</Label>
                  <Select
                    value={formData.duration}
                    onValueChange={(value) => setFormData({ ...formData, duration: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {DURATION_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Target Muscles */}
              <div className="space-y-2">
                <Label>Target Muscle Groups (Optional)</Label>
                <MultiSelect
                  options={muscleGroupOptions}
                  selected={formData.targetMuscles}
                  onChange={(muscles) => setFormData({ ...formData, targetMuscles: muscles })}
                  placeholder="Select target muscles..."
                />
                <p className="text-xs text-muted-foreground">
                  Leave empty to auto-select based on workout type
                </p>
              </div>

              {/* Available Equipment */}
              <div className="space-y-2">
                <Label>Available Equipment (Optional)</Label>
                <MultiSelect
                  options={equipmentOptions}
                  selected={formData.availableEquipment}
                  onChange={(equipment) => setFormData({ ...formData, availableEquipment: equipment })}
                  placeholder="Select available equipment..."
                />
                <p className="text-xs text-muted-foreground">
                  Leave empty to include all equipment types
                </p>
              </div>

              <Separator />

              {/* Advanced Options */}
              <Collapsible open={isAdvancedOpen} onOpenChange={setIsAdvancedOpen}>
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" className="w-full justify-between">
                    <span>Advanced Options</span>
                    <ChevronDown className={`h-4 w-4 transition-transform ${isAdvancedOpen ? "rotate-180" : ""}`} />
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="space-y-4 pt-4">
                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label>Number of Exercises</Label>
                      <Select
                        value={formData.exerciseCount}
                        onValueChange={(value) => setFormData({ ...formData, exerciseCount: value })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {[4, 5, 6, 7, 8, 9, 10].map((n) => (
                            <SelectItem key={n} value={n.toString()}>
                              {n} exercises
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Sets per Exercise</Label>
                      <Select
                        value={formData.setsPerExercise}
                        onValueChange={(value) => setFormData({ ...formData, setsPerExercise: value })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {[2, 3, 4, 5].map((n) => (
                            <SelectItem key={n} value={n.toString()}>
                              {n} sets
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Rest Between Sets (sec)</Label>
                      <Select
                        value={formData.restBetweenSets}
                        onValueChange={(value) => setFormData({ ...formData, restBetweenSets: value })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {[30, 45, 60, 90, 120].map((n) => (
                            <SelectItem key={n} value={n.toString()}>
                              {n} sec
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="flex items-center space-x-6">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="includeWarmup"
                        checked={formData.includeWarmup}
                        onCheckedChange={(checked) => setFormData({ ...formData, includeWarmup: !!checked })}
                      />
                      <Label htmlFor="includeWarmup">Include warmup routine</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="includeCooldown"
                        checked={formData.includeCooldown}
                        onCheckedChange={(checked) => setFormData({ ...formData, includeCooldown: !!checked })}
                      />
                      <Label htmlFor="includeCooldown">Include cooldown routine</Label>
                    </div>
                  </div>
                </CollapsibleContent>
              </Collapsible>
            </div>
          )}

          {step === "generating" && (
            <div className="flex flex-col items-center justify-center py-16">
              <div className="relative">
                <Loader2 className="h-16 w-16 animate-spin text-primary" />
                <Dumbbell className="h-6 w-6 text-primary absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
              </div>
              <p className="mt-6 text-lg font-medium">Creating your personalized workout...</p>
              <p className="text-muted-foreground mt-2">This may take a moment</p>
            </div>
          )}

          {step === "preview" && generatedWorkout && (
            <div className="space-y-6 py-4">
              {/* Workout Overview */}
              <div>
                <h3 className="text-xl font-semibold flex items-center gap-2">
                  {generatedWorkout.title}
                  <Badge className="bg-primary/10 text-primary border-primary/20">
                    <Sparkles className="h-3 w-3 mr-1" />
                    AI Generated
                  </Badge>
                  {generatedWorkout.daysCount > 1 && (
                    <Badge variant="outline" className="gap-1">
                      <Calendar className="h-3 w-3" />
                      {generatedWorkout.daysCount} Days
                    </Badge>
                  )}
                </h3>
                <p className="text-muted-foreground mt-1">{generatedWorkout.description}</p>
              </div>

              {/* Quick Stats */}
              <Card>
                <CardContent className="pt-4">
                  <div className={`grid gap-4 text-center ${generatedWorkout.daysCount > 1 ? "grid-cols-4" : "grid-cols-4"}`}>
                    <div className="bg-blue-50 dark:bg-blue-950/30 rounded-lg p-3">
                      <Clock className="h-5 w-5 mx-auto text-blue-600 dark:text-blue-400 mb-1" />
                      <p className="text-lg font-bold text-blue-600 dark:text-blue-400">
                        {generatedWorkout.duration}
                      </p>
                      <p className="text-xs text-muted-foreground">Min/Day</p>
                    </div>
                    <div className="bg-orange-50 dark:bg-orange-950/30 rounded-lg p-3">
                      <Dumbbell className="h-5 w-5 mx-auto text-orange-600 dark:text-orange-400 mb-1" />
                      <p className="text-lg font-bold text-orange-600 dark:text-orange-400">
                        {generatedWorkout.days
                          ? generatedWorkout.days.reduce((sum, d) => sum + d.exercises.length, 0)
                          : (generatedWorkout.exercises?.length || 0)}
                      </p>
                      <p className="text-xs text-muted-foreground">Total Exercises</p>
                    </div>
                    <div className="bg-purple-50 dark:bg-purple-950/30 rounded-lg p-3">
                      <Target className="h-5 w-5 mx-auto text-purple-600 dark:text-purple-400 mb-1" />
                      <p className="text-lg font-bold text-purple-600 dark:text-purple-400 capitalize">
                        {generatedWorkout.difficulty}
                      </p>
                      <p className="text-xs text-muted-foreground">Difficulty</p>
                    </div>
                    {generatedWorkout.daysCount > 1 ? (
                      <div className="bg-green-50 dark:bg-green-950/30 rounded-lg p-3">
                        <Calendar className="h-5 w-5 mx-auto text-green-600 dark:text-green-400 mb-1" />
                        <p className="text-lg font-bold text-green-600 dark:text-green-400">
                          {generatedWorkout.daysCount}
                        </p>
                        <p className="text-xs text-muted-foreground">Days</p>
                      </div>
                    ) : (
                      <div className="bg-green-50 dark:bg-green-950/30 rounded-lg p-3">
                        <Zap className="h-5 w-5 mx-auto text-green-600 dark:text-green-400 mb-1" />
                        <p className="text-lg font-bold text-green-600 dark:text-green-400 capitalize">
                          {generatedWorkout.category}
                        </p>
                        <p className="text-xs text-muted-foreground">Type</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Multi-day Tabs */}
              {generatedWorkout.days && generatedWorkout.days.length > 0 ? (
                <Tabs value={`day-${previewDay}`} onValueChange={(v) => setPreviewDay(parseInt(v.replace("day-", "")))}>
                  <TabsList className="grid w-full" style={{ gridTemplateColumns: `repeat(${generatedWorkout.days.length}, 1fr)` }}>
                    {generatedWorkout.days.map((day) => (
                      <TabsTrigger key={day.day} value={`day-${day.day}`}>
                        {day.label}
                      </TabsTrigger>
                    ))}
                  </TabsList>
                  {generatedWorkout.days.map((day) => (
                    <TabsContent key={day.day} value={`day-${day.day}`} className="space-y-4 mt-4">
                      {/* Day Warmup */}
                      {day.warmup && (
                        <Card>
                          <CardHeader className="pb-2">
                            <CardTitle className="text-sm flex items-center gap-2">
                              <Flame className="h-4 w-4 text-orange-500" />
                              Warmup
                            </CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="space-y-2">
                              {day.warmup.map((item, i) => (
                                <div key={i} className="flex items-center justify-between text-sm bg-muted/50 rounded p-2">
                                  <span>{item.name}</span>
                                  <Badge variant="outline">{Math.floor(item.duration / 60)} min</Badge>
                                </div>
                              ))}
                            </div>
                          </CardContent>
                        </Card>
                      )}

                      {/* Day Exercises */}
                      <Card>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm flex items-center gap-2">
                            <Dumbbell className="h-4 w-4 text-primary" />
                            {day.label} Workout
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-3">
                            {day.exercises.map((exercise, i) => (
                              <ExerciseCard key={i} exercise={exercise} index={i} />
                            ))}
                          </div>
                        </CardContent>
                      </Card>

                      {/* Day Cooldown */}
                      {day.cooldown && (
                        <Card>
                          <CardHeader className="pb-2">
                            <CardTitle className="text-sm flex items-center gap-2">
                              <Target className="h-4 w-4 text-blue-500" />
                              Cooldown
                            </CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="space-y-2">
                              {day.cooldown.map((item, i) => (
                                <div key={i} className="flex items-center justify-between text-sm bg-muted/50 rounded p-2">
                                  <span>{item.name}</span>
                                  <Badge variant="outline">{Math.floor(item.duration / 60)} min</Badge>
                                </div>
                              ))}
                            </div>
                          </CardContent>
                        </Card>
                      )}
                    </TabsContent>
                  ))}
                </Tabs>
              ) : (
                <>
                  {/* Single-day Warmup */}
                  {generatedWorkout.warmup && (
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm flex items-center gap-2">
                          <Flame className="h-4 w-4 text-orange-500" />
                          Warmup
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2">
                          {generatedWorkout.warmup.map((item, i) => (
                            <div key={i} className="flex items-center justify-between text-sm bg-muted/50 rounded p-2">
                              <span>{item.name}</span>
                              <Badge variant="outline">{Math.floor(item.duration / 60)} min</Badge>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {/* Single-day Exercises */}
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <Dumbbell className="h-4 w-4 text-primary" />
                        Main Workout
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {(generatedWorkout.exercises || []).map((exercise, i) => (
                          <ExerciseCard key={i} exercise={exercise} index={i} />
                        ))}
                      </div>
                    </CardContent>
                  </Card>

                  {/* Single-day Cooldown */}
                  {generatedWorkout.cooldown && (
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm flex items-center gap-2">
                          <Target className="h-4 w-4 text-blue-500" />
                          Cooldown
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2">
                          {generatedWorkout.cooldown.map((item, i) => (
                            <div key={i} className="flex items-center justify-between text-sm bg-muted/50 rounded p-2">
                              <span>{item.name}</span>
                              <Badge variant="outline">{Math.floor(item.duration / 60)} min</Badge>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </>
              )}
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 flex-shrink-0">
          {step === "form" && (
            <>
              <Button variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button onClick={handleGenerate}>
                <Sparkles className="mr-2 h-4 w-4" />
                Generate Workout
              </Button>
            </>
          )}
          {step === "preview" && (
            <>
              <Button variant="outline" onClick={resetForm}>
                Generate Another
              </Button>
              <Button onClick={handleSave} disabled={createWorkout.isPending}>
                {createWorkout.isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Check className="mr-2 h-4 w-4" />
                )}
                Save Workout
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
