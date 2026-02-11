"use client";

import { useMemo, useState, useEffect } from "react";
import Link from "next/link";
import { trpc } from "@/lib/trpc/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { InviteClientDialog } from "@/components/invite-client-dialog";
import { AIChatDialog } from "@/components/ai-chat-dialog";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Search,
  Plus,
  MoreHorizontal,
  Eye,
  MessageSquare,
  Edit,
  Users,
  TrendingUp,
  TrendingDown,
  Minus,
  Check,
  CheckCircle,
  Clock,
  AlertTriangle,
  XCircle,
  Copy,
  Mail,
  Ban,
  UserCheck,
  UserX,
  Info,
  LayoutList,
  LayoutGrid,
  Dumbbell,
  Footprints,
  Droplets,
  Sparkles,
  Bot,
  Zap,
  UtensilsCrossed,
  Pencil,
  Flame,
  Loader2,
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { format, formatDistanceToNow } from "date-fns";
import { toast } from "sonner";

type ResendLicense = {
  id: string;
  invitedEmail: string;
  invitedName: string | null;
  inviteLink: string | null;
};

export default function ClientsPage() {
  const [search, setSearch] = useState("");
  const [teamFilter, setTeamFilter] = useState<string>("all");
  const [goalFilter, setGoalFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [activeTab, setActiveTab] = useState("active");
  const [viewMode, setViewMode] = useState<"list" | "cards">("cards");
  const [resendDialogOpen, setResendDialogOpen] = useState(false);
  const [resendLicense, setResendLicense] = useState<ResendLicense | null>(null);
  const [resendSubject, setResendSubject] = useState("");
  const [resendMessage, setResendMessage] = useState("");

  // Meal plan quick edit state
  const [isMealPlanEditOpen, setIsMealPlanEditOpen] = useState(false);
  const [selectedMealPlanId, setSelectedMealPlanId] = useState<string | null>(null);
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [selectedClientName, setSelectedClientName] = useState<string>("");
  const [editingMacros, setEditingMacros] = useState({ calories: 0, protein: 0, carbs: 0, fats: 0 });
  const [quickEditMacroMode, setQuickEditMacroMode] = useState<'grams' | 'percentage'>('percentage');
  const [quickEditPercentages, setQuickEditPercentages] = useState({ protein: 0, carbs: 0, fats: 0 });
  const [isSavingMealPlan, setIsSavingMealPlan] = useState(false);

  // Workout quick edit state
  const [isWorkoutEditOpen, setIsWorkoutEditOpen] = useState(false);
  const [selectedWorkoutId, setSelectedWorkoutId] = useState<string | null>(null);
  const [workoutClientId, setWorkoutClientId] = useState<string | null>(null);
  const [workoutClientName, setWorkoutClientName] = useState<string>("");
  const [isSavingWorkout, setIsSavingWorkout] = useState(false);
  type WorkoutExercise = {
    id: string;
    exerciseId: string;
    name: string;
    muscleGroup: string;
    sets: number;
    reps: number;
    weight: number;
    weightUnit: "kg" | "lbs";
    duration: number;
    restTime: number;
    notes: string;
  };
  const [editingWorkoutExercises, setEditingWorkoutExercises] = useState<WorkoutExercise[]>([]);

  // Fetch active clients
  const { data: clients, isLoading: clientsLoading, refetch: refetchClients } = trpc.clients.getAll.useQuery({
    search: search || undefined,
    teamId: teamFilter !== "all" ? teamFilter : undefined,
    goalType: goalFilter !== "all" ? (goalFilter as "WEIGHT_LOSS" | "WEIGHT_GAIN" | "MAINTAIN_WEIGHT") : undefined,
  });
  const clientsById = useMemo(() => new Map((clients ?? []).map((c) => [c.id, c])), [clients]);

  // Fetch all licenses (for pending invitations)
  const { data: licenses, isLoading: licensesLoading, refetch: refetchLicenses } = trpc.license.getAll.useQuery({
    status: statusFilter !== "all" ? (statusFilter as "PENDING" | "ACTIVE" | "EXPIRED" | "REVOKED") : undefined,
  });

  // Fetch license stats
  const { data: stats } = trpc.license.getStats.useQuery();

  const { data: teams } = trpc.team.getAll.useQuery();
  const teamsById = useMemo(() => new Map((teams ?? []).map((t) => [t.id, t])), [teams]);

  // License mutations
  const resendInvite = trpc.license.resendInvite.useMutation({
    onSuccess: () => {
      toast.success("Invitation resent!");
      setResendDialogOpen(false);
      setResendLicense(null);
      refetchLicenses();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to resend invitation");
    },
  });

  const revokeLicense = trpc.license.revoke.useMutation({
    onSuccess: () => {
      toast.success("License revoked");
      refetchLicenses();
      refetchClients();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to revoke license");
    },
  });

  // Meal plan queries and mutations
  const { data: mealPlanDetails, refetch: refetchMealPlan } = trpc.content.getMealPlanWithRecipes.useQuery(
    { id: selectedMealPlanId! },
    { enabled: !!selectedMealPlanId }
  );

  const createMealPlanMutation = trpc.content.createMealPlan.useMutation();
  const assignMealPlanMutation = trpc.content.assignMealPlan.useMutation();
  const unassignMealPlanMutation = trpc.content.unassignMealPlan.useMutation();

  // Workout queries and mutations
  const { data: workoutDetails } = trpc.content.getWorkoutById.useQuery(
    { id: selectedWorkoutId! },
    { enabled: !!selectedWorkoutId }
  );
  const createWorkoutMutation = trpc.content.createWorkout.useMutation();
  const assignWorkoutMutation = trpc.content.assignWorkout.useMutation();
  const unassignWorkoutMutation = trpc.content.unassignWorkout.useMutation();

  // Macro calculation helpers
  const gramsToPercentage = (calories: number, grams: number, caloriesPerGram: number) => {
    if (calories <= 0 || grams <= 0) return 0;
    return Math.round((grams * caloriesPerGram / calories) * 100);
  };

  const percentageToGrams = (calories: number, percentage: number, caloriesPerGram: number) => {
    if (calories <= 0 || percentage <= 0) return 0;
    return Math.round((calories * percentage / 100) / caloriesPerGram);
  };

  const calculateCaloriesFromMacros = (protein: number, carbs: number, fats: number) => {
    return Math.round(protein * 4 + carbs * 4 + fats * 9);
  };

  const updateEditingMacrosWithCalories = (field: 'protein' | 'carbs' | 'fats', value: number) => {
    const newMacros = { ...editingMacros, [field]: value };
    const newCalories = calculateCaloriesFromMacros(
      field === 'protein' ? value : editingMacros.protein,
      field === 'carbs' ? value : editingMacros.carbs,
      field === 'fats' ? value : editingMacros.fats
    );
    newMacros.calories = newCalories;
    setEditingMacros(newMacros);
    if (newCalories > 0) {
      setQuickEditPercentages({
        protein: gramsToPercentage(newCalories, field === 'protein' ? value : editingMacros.protein, 4),
        carbs: gramsToPercentage(newCalories, field === 'carbs' ? value : editingMacros.carbs, 4),
        fats: gramsToPercentage(newCalories, field === 'fats' ? value : editingMacros.fats, 9),
      });
    }
  };

  const updateEditingMacrosFromCalories = (newCalories: number) => {
    // Always update the calories value
    setEditingMacros(prev => ({ ...prev, calories: newCalories }));

    // Only recalculate grams when calories are above a reasonable threshold
    // This prevents macros from being cleared while typing
    const MIN_CALORIES_FOR_RECALC = 500;

    if (newCalories >= MIN_CALORIES_FOR_RECALC) {
      // Use percentages as source of truth to calculate grams
      const hasPercentages = quickEditPercentages.protein > 0 || quickEditPercentages.carbs > 0 || quickEditPercentages.fats > 0;

      if (hasPercentages) {
        const newProtein = percentageToGrams(newCalories, quickEditPercentages.protein, 4);
        const newCarbs = percentageToGrams(newCalories, quickEditPercentages.carbs, 4);
        const newFats = percentageToGrams(newCalories, quickEditPercentages.fats, 9);

        setEditingMacros({
          calories: newCalories,
          protein: newProtein,
          carbs: newCarbs,
          fats: newFats,
        });
      }
    }
    // Percentages stay unchanged - they are the source of truth
  };

  const updateEditingMacrosFromPercentage = (field: 'protein' | 'carbs' | 'fats', percentage: number) => {
    const newPercentages = { ...quickEditPercentages, [field]: percentage };
    setQuickEditPercentages(newPercentages);
    const calories = editingMacros.calories;
    if (calories > 0) {
      const caloriesPerGram = field === 'fats' ? 9 : 4;
      const grams = percentageToGrams(calories, percentage, caloriesPerGram);
      setEditingMacros(prev => ({ ...prev, [field]: grams }));
    }
  };

  const openMealPlanQuickEdit = (clientId: string, clientName: string, mealPlanId: string) => {
    setSelectedClientId(clientId);
    setSelectedClientName(clientName);
    setSelectedMealPlanId(mealPlanId);
    setQuickEditMacroMode('percentage');
    setIsMealPlanEditOpen(true);
  };

  // Initialize macros when meal plan details load
  const initializeMealPlanMacros = () => {
    if (mealPlanDetails) {
      const calories = mealPlanDetails.targetCalories || 0;
      const protein = mealPlanDetails.targetProtein || 0;
      const carbs = mealPlanDetails.targetCarbs || 0;
      const fats = mealPlanDetails.targetFats || 0;
      setEditingMacros({ calories, protein, carbs, fats });
      if (calories > 0) {
        setQuickEditPercentages({
          protein: gramsToPercentage(calories, protein, 4),
          carbs: gramsToPercentage(calories, carbs, 4),
          fats: gramsToPercentage(calories, fats, 9),
        });
      }
    }
  };

  // Save meal plan - always creates a copy
  const saveMealPlanMacros = async () => {
    if (!selectedMealPlanId || !mealPlanDetails || !selectedClientId) return;

    setIsSavingMealPlan(true);
    try {
      const dateStr = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

      const newMealPlan = await createMealPlanMutation.mutateAsync({
        title: `${mealPlanDetails.title} - ${selectedClientName} (${dateStr})`,
        description: mealPlanDetails.description || undefined,
        duration: mealPlanDetails.duration || undefined,
        goalType: mealPlanDetails.goalType as "WEIGHT_LOSS" | "WEIGHT_GAIN" | "MAINTAIN_WEIGHT" | undefined,
        targetCalories: editingMacros.calories || undefined,
        targetProtein: editingMacros.protein || undefined,
        targetCarbs: editingMacros.carbs || undefined,
        targetFats: editingMacros.fats || undefined,
        content: mealPlanDetails.content || undefined,
      });

      await unassignMealPlanMutation.mutateAsync({
        mealPlanId: selectedMealPlanId,
        clientId: selectedClientId,
      });

      await assignMealPlanMutation.mutateAsync({
        mealPlanId: newMealPlan.id,
        clientIds: [selectedClientId],
        startDate: new Date(),
      });

      refetchClients();
      setIsMealPlanEditOpen(false);
      toast.success("Created a personalized meal plan!");
    } finally {
      setIsSavingMealPlan(false);
    }
  };

  // Initialize macros when meal plan details load
  useEffect(() => {
    if (mealPlanDetails && isMealPlanEditOpen) {
      initializeMealPlanMacros();
    }
  }, [mealPlanDetails, isMealPlanEditOpen]);

  // Workout quick edit functions
  const openWorkoutQuickEdit = (clientId: string, clientName: string, workoutId: string) => {
    setWorkoutClientId(clientId);
    setWorkoutClientName(clientName);
    setSelectedWorkoutId(workoutId);
    setIsWorkoutEditOpen(true);
  };

  // Initialize workout exercises when workout details load
  const initializeWorkoutExercises = () => {
    if (workoutDetails) {
      const content = workoutDetails.content as { exercises?: WorkoutExercise[] } | null;
      if (content?.exercises) {
        setEditingWorkoutExercises(content.exercises.map((ex, index) => ({
          id: `we-${index}-${Date.now()}`,
          exerciseId: ex.exerciseId || "",
          name: ex.name,
          muscleGroup: ex.muscleGroup,
          sets: ex.sets,
          reps: ex.reps,
          weight: ex.weight || 0,
          weightUnit: ex.weightUnit || "kg",
          duration: ex.duration || 0,
          restTime: ex.restTime || 60,
          notes: ex.notes || "",
        })));
      } else {
        setEditingWorkoutExercises([]);
      }
    }
  };

  // Save workout - always creates a copy
  const saveWorkoutChanges = async () => {
    if (!selectedWorkoutId || !workoutDetails || !workoutClientId) return;

    setIsSavingWorkout(true);
    try {
      const dateStr = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

      const content = editingWorkoutExercises.length > 0 ? {
        exercises: editingWorkoutExercises.map((ex, index) => ({
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

      const newWorkout = await createWorkoutMutation.mutateAsync({
        title: `${workoutDetails.title} - ${workoutClientName} (${dateStr})`,
        description: workoutDetails.description || undefined,
        category: workoutDetails.category || undefined,
        difficulty: workoutDetails.difficulty || undefined,
        duration: workoutDetails.duration || undefined,
        content,
      });

      await unassignWorkoutMutation.mutateAsync({
        workoutId: selectedWorkoutId,
        clientId: workoutClientId,
      });

      await assignWorkoutMutation.mutateAsync({
        workoutId: newWorkout.id,
        clientIds: [workoutClientId],
      });

      refetchClients();
      setIsWorkoutEditOpen(false);
      toast.success("Created a personalized workout!");
    } finally {
      setIsSavingWorkout(false);
    }
  };

  // Update workout exercise
  const updateEditingWorkoutExercise = (id: string, updates: Partial<WorkoutExercise>) => {
    setEditingWorkoutExercises((prev) =>
      prev.map((ex) => (ex.id === id ? { ...ex, ...updates } : ex))
    );
  };

  // Initialize workout exercises when workout details load
  useEffect(() => {
    if (workoutDetails && isWorkoutEditOpen) {
      initializeWorkoutExercises();
    }
  }, [workoutDetails, isWorkoutEditOpen]);

  const copyInviteLink = (link: string) => {
    navigator.clipboard.writeText(link);
    toast.success("Invite link copied!");
  };

  const refetchAll = () => {
    refetchClients();
    refetchLicenses();
  };

  const applyTemplate = (
    template: string,
    values: { clientName: string; inviteLink: string; coachName: string }
  ) => {
    return template
      .replaceAll("{{clientName}}", values.clientName)
      .replaceAll("{{inviteLink}}", values.inviteLink)
      .replaceAll("{{coachName}}", values.coachName);
  };

  const openResendInviteDialog = (license: ResendLicense) => {
    setResendLicense(license);
    setResendSubject("You're invited to Cratox AI");
    setResendMessage(
      `Hi {{clientName}},\n\n` +
        `Your coach has invited you to Cratox AI.\n\n` +
        `Invite link:\n{{inviteLink}}\n\n` +
        `If you have any questions, reply to this email.\n\n` +
        `— {{coachName}}`
    );
    setResendDialogOpen(true);
  };

  // Filter pending licenses (not yet activated)
  const pendingLicenses = licenses?.filter(l => l.status === "PENDING") || [];
  const allLicenses = licenses || [];

  const getGoalIcon = (goalType: string) => {
    switch (goalType) {
      case "WEIGHT_LOSS":
        return <TrendingDown className="h-3 w-3" />;
      case "WEIGHT_GAIN":
        return <TrendingUp className="h-3 w-3" />;
      default:
        return <Minus className="h-3 w-3" />;
    }
  };

  const getGoalVariant = (goalType: string) => {
    switch (goalType) {
      case "WEIGHT_LOSS":
        return "destructive" as const;
      case "WEIGHT_GAIN":
        return "default" as const;
      default:
        return "secondary" as const;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "ACTIVE":
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case "PENDING":
        return <Clock className="h-4 w-4 text-amber-500" />;
      case "EXPIRED":
        return <AlertTriangle className="h-4 w-4 text-orange-500" />;
      case "REVOKED":
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return null;
    }
  };

  const getStatusVariant = (status: string) => {
    switch (status) {
      case "ACTIVE":
        return "default" as const;
      case "PENDING":
        return "secondary" as const;
      case "EXPIRED":
        return "outline" as const;
      case "REVOKED":
        return "destructive" as const;
      default:
        return "outline" as const;
    }
  };

  const calculateProgress = (start?: number | null, current?: number | null, target?: number | null) => {
    if (!start || !current || !target || start === target) return null;
    return Math.round(((start - current) / (start - target)) * 100);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Clients</h2>
          <p className="text-muted-foreground">
            Manage your clients and license invitations
          </p>
        </div>
        <InviteClientDialog
          onSuccess={refetchAll}
          trigger={
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Invite Client
            </Button>
          }
        />
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Active Clients</p>
                <p className="text-2xl font-bold text-green-600">{stats?.active || 0}</p>
              </div>
              <UserCheck className="h-8 w-8 text-green-500/50" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Pending Invites</p>
                <p className="text-2xl font-bold text-amber-600">{stats?.pending || 0}</p>
              </div>
              <Clock className="h-8 w-8 text-amber-500/50" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Expired</p>
                <p className="text-2xl font-bold text-orange-600">{stats?.expired || 0}</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-orange-500/50" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Licenses</p>
                <p className="text-2xl font-bold">{stats?.total || 0}</p>
              </div>
              <Users className="h-8 w-8 text-muted-foreground/50" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* AI Insights Card */}
      <Card className="bg-gradient-to-r from-violet-500/10 via-purple-500/10 to-fuchsia-500/10 border-violet-500/20">
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-lg">
                <Sparkles className="h-6 w-6 text-white" />
              </div>
              <div>
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  AI Client Insights
                  <Badge variant="secondary" className="bg-violet-500/20 text-violet-700 dark:text-violet-300 border-0">
                    <Zap className="h-3 w-3 mr-1" />
                    Powered by AI
                  </Badge>
                </h3>
                <p className="text-muted-foreground mt-1 max-w-lg">
                  Ask questions about any client&apos;s nutrition, activity patterns, or progress.
                  Get personalized coaching suggestions and identify areas that need attention.
                </p>
              </div>
            </div>
            <div className="flex gap-2 md:flex-shrink-0">
              <AIChatDialog
                context="clients"
                trigger={
                  <Button className="bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700">
                    <Bot className="mr-2 h-4 w-4" />
                    Ask AI Assistant
                  </Button>
                }
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Content with Tabs */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <CardTitle>Client Management</CardTitle>
              <CardDescription>
                View active clients and manage pending invitations
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between mb-4">
              <TabsList>
                <TabsTrigger value="active" className="gap-2">
                  <UserCheck className="h-4 w-4" />
                  Active Clients
                  {clients && clients.length > 0 && (
                    <Badge variant="secondary" className="ml-1">
                      {clients.length}
                    </Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger value="pending" className="gap-2">
                  <Clock className="h-4 w-4" />
                  Pending Invites
                  {pendingLicenses.length > 0 && (
                    <Badge variant="secondary" className="ml-1">
                      {pendingLicenses.length}
                    </Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger value="all" className="gap-2">
                  <Users className="h-4 w-4" />
                  All Licenses
                </TabsTrigger>
              </TabsList>

              {/* Filters */}
              <div className="flex flex-wrap items-center gap-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Search..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-9 w-[200px]"
                  />
                </div>
                {activeTab === "active" && (
                  <>
                    <Select value={teamFilter} onValueChange={setTeamFilter}>
                      <SelectTrigger className="w-[150px]">
                        <SelectValue placeholder="All Teams" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Teams</SelectItem>
                        {teams?.map((team) => (
                          <SelectItem key={team.id} value={team.id}>
                            <div className="flex items-center gap-2">
                              <div
                                className="h-2 w-2 rounded-full"
                                style={{ backgroundColor: team.color }}
                              />
                              {team.name}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Select value={goalFilter} onValueChange={setGoalFilter}>
                      <SelectTrigger className="w-[150px]">
                        <SelectValue placeholder="All Goals" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Goals</SelectItem>
                        <SelectItem value="WEIGHT_LOSS">Weight Loss</SelectItem>
                        <SelectItem value="WEIGHT_GAIN">Weight Gain</SelectItem>
                        <SelectItem value="MAINTAIN_WEIGHT">Maintain</SelectItem>
                      </SelectContent>
                    </Select>
                    
                    {/* View Toggle */}
                    <div className="flex items-center border rounded-lg p-1 ml-auto">
                      <Button
                        variant={viewMode === "list" ? "secondary" : "ghost"}
                        size="sm"
                        className="h-8 px-2"
                        onClick={() => setViewMode("list")}
                      >
                        <LayoutList className="h-4 w-4" />
                      </Button>
                      <Button
                        variant={viewMode === "cards" ? "secondary" : "ghost"}
                        size="sm"
                        className="h-8 px-2"
                        onClick={() => setViewMode("cards")}
                      >
                        <LayoutGrid className="h-4 w-4" />
                      </Button>
                    </div>
                  </>
                )}
                {activeTab === "all" && (
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-[150px]">
                      <SelectValue placeholder="All Statuses" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Statuses</SelectItem>
                      <SelectItem value="ACTIVE">Active</SelectItem>
                      <SelectItem value="PENDING">Pending</SelectItem>
                      <SelectItem value="EXPIRED">Expired</SelectItem>
                      <SelectItem value="REVOKED">Revoked</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              </div>
            </div>

            {/* Active Clients Tab */}
            <TabsContent value="active" className="mt-0">
              {clientsLoading ? (
                <div className="space-y-4 py-4">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <div key={i} className="flex items-center gap-4">
                      <Skeleton className="h-10 w-10 rounded-full" />
                      <div className="flex-1 space-y-2">
                        <Skeleton className="h-4 w-32" />
                        <Skeleton className="h-3 w-48" />
                      </div>
                      <Skeleton className="h-6 w-20" />
                    </div>
                  ))}
                </div>
              ) : clients && clients.length > 0 ? (
                viewMode === "list" ? (
                  /* List View */
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Client</TableHead>
                          <TableHead>Goal</TableHead>
                          <TableHead>Progress</TableHead>
                          <TableHead>
                            <div className="flex items-center gap-1">
                              Goals Hit
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                                  </TooltipTrigger>
                                  <TooltipContent className="max-w-xs p-3">
                                    <p className="font-medium mb-1">Weekly Goal Achievement</p>
                                    <p className="text-xs text-muted-foreground mb-2">
                                      Shows the % of days in the last 7 days where the client hit their daily goals.
                                    </p>
                                    <p className="text-xs text-muted-foreground mb-1"><strong>Goals tracked:</strong></p>
                                    <ul className="text-xs text-muted-foreground list-disc pl-4 space-y-0.5">
                                      <li>Calories (within ±10% of target)</li>
                                      <li>Protein (at least 90% of target)</li>
                                      <li>Carbs (within ±10% of target)</li>
                                      <li>Fats (within ±10% of target)</li>
                                      <li>Exercise minutes (at least 90% of goal)</li>
                                    </ul>
                                    <p className="text-xs text-muted-foreground mt-2">
                                      A day counts as &quot;hit&quot; if 80%+ of tracked goals are met.
                                    </p>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            </div>
                          </TableHead>
                          <TableHead>Team</TableHead>
                          <TableHead>Meal Plan</TableHead>
                          <TableHead>Workout</TableHead>
                          <TableHead>License</TableHead>
                          <TableHead>Started</TableHead>
                          <TableHead>Expires</TableHead>
                          <TableHead>Last Active</TableHead>
                          <TableHead className="w-[50px]"></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {clients.map((client) => {
                          const progress = calculateProgress(
                            client.startWeight,
                            client.currentWeight,
                            client.targetWeight
                          );

                          return (
                            <TableRow key={client.id}>
                              <TableCell>
                                <Link
                                  href={`/clients/${client.id}`}
                                  className="flex items-center gap-3 hover:underline"
                                >
                                  <Avatar className="h-9 w-9">
                                    <AvatarFallback className="text-xs">
                                      {client.name
                                        .split(" ")
                                        .map((n) => n[0])
                                        .join("")}
                                    </AvatarFallback>
                                  </Avatar>
                                  <div>
                                    <p className="font-medium">{client.name}</p>
                                    <p className="text-xs text-muted-foreground">
                                      {client.email}
                                    </p>
                                  </div>
                                </Link>
                              </TableCell>
                              <TableCell>
                                <Badge variant={getGoalVariant(client.goalType)} className="gap-1">
                                  {getGoalIcon(client.goalType)}
                                  {client.goalType.replace("_", " ")}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                {progress !== null ? (
                                  <div className="flex items-center gap-2">
                                    <div className="w-16 h-2 bg-muted rounded-full overflow-hidden">
                                      <div
                                        className="h-full bg-primary rounded-full transition-all"
                                        style={{ width: `${Math.max(0, Math.min(100, progress))}%` }}
                                      />
                                    </div>
                                    <span className="text-sm text-muted-foreground">
                                      {progress}%
                                    </span>
                                  </div>
                                ) : (
                                  <span className="text-sm text-muted-foreground">N/A</span>
                                )}
                              </TableCell>
                              <TableCell>
                                {client.goalAchievementPercent !== null ? (
                                  <TooltipProvider>
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <div className="flex items-center gap-2 cursor-help">
                                          <div className="w-12 h-2 bg-muted rounded-full overflow-hidden">
                                            <div
                                              className={`h-full rounded-full transition-all ${
                                                client.goalAchievementPercent >= 70
                                                  ? "bg-green-500"
                                                  : client.goalAchievementPercent >= 40
                                                  ? "bg-amber-500"
                                                  : "bg-red-500"
                                              }`}
                                              style={{ width: `${client.goalAchievementPercent}%` }}
                                            />
                                          </div>
                                          <span className="text-sm text-muted-foreground">
                                            {client.goalAchievementPercent}%
                                          </span>
                                        </div>
                                      </TooltipTrigger>
                                      <TooltipContent>
                                        <p className="text-xs">
                                          {Math.round((client.goalAchievementPercent / 100) * 7)}/7 days goals achieved
                                        </p>
                                      </TooltipContent>
                                    </Tooltip>
                                  </TooltipProvider>
                                ) : (
                                  <span className="text-sm text-muted-foreground">N/A</span>
                                )}
                              </TableCell>
                              <TableCell>
                                {client.team ? (
                                  <div className="flex items-center gap-2">
                                    <div
                                      className="h-2 w-2 rounded-full"
                                      style={{ backgroundColor: client.team.color }}
                                    />
                                    <span className="text-sm">{client.team.name}</span>
                                  </div>
                                ) : (
                                  <span className="text-sm text-muted-foreground">
                                    Unassigned
                                  </span>
                                )}
                              </TableCell>
                              <TableCell>
                                {client.assignedMealPlans && client.assignedMealPlans.length > 0 ? (
                                  <div className="flex items-center gap-1">
                                    <span className="text-sm truncate max-w-[100px] inline-block" title={client.assignedMealPlans[0].mealPlan.title}>
                                      {client.assignedMealPlans[0].mealPlan.title}
                                      {client.assignedMealPlans.length > 1 && (
                                        <span className="text-muted-foreground"> +{client.assignedMealPlans.length - 1}</span>
                                      )}
                                    </span>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-6 w-6 flex-shrink-0"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        openMealPlanQuickEdit(client.id, client.name, client.assignedMealPlans[0].mealPlan.id);
                                      }}
                                    >
                                      <Pencil className="h-3 w-3" />
                                    </Button>
                                  </div>
                                ) : (
                                  <span className="text-sm text-muted-foreground">—</span>
                                )}
                              </TableCell>
                              <TableCell>
                                {client.assignedWorkouts && client.assignedWorkouts.length > 0 ? (
                                  <div className="flex items-center gap-1">
                                    <span className="text-sm truncate max-w-[100px] inline-block" title={client.assignedWorkouts[0].workout.title}>
                                      {client.assignedWorkouts[0].workout.title}
                                      {client.assignedWorkouts.length > 1 && (
                                        <span className="text-muted-foreground"> +{client.assignedWorkouts.length - 1}</span>
                                      )}
                                    </span>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-6 w-6 flex-shrink-0"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        openWorkoutQuickEdit(client.id, client.name, client.assignedWorkouts[0].workout.id);
                                      }}
                                    >
                                      <Pencil className="h-3 w-3" />
                                    </Button>
                                  </div>
                                ) : (
                                  <span className="text-sm text-muted-foreground">—</span>
                                )}
                              </TableCell>
                              <TableCell>
                                {client.license ? (
                                  <Badge variant={getStatusVariant(client.license.status)} className="gap-1">
                                    {getStatusIcon(client.license.status)}
                                    {client.license.status.toLowerCase()}
                                  </Badge>
                                ) : (
                                  <Badge variant="outline">No license</Badge>
                                )}
                              </TableCell>
                              <TableCell className="text-sm text-muted-foreground">
                                {client.license?.activatedAt
                                  ? format(new Date(client.license.activatedAt), "MMM d, yyyy")
                                  : "—"}
                              </TableCell>
                              <TableCell className="text-sm text-muted-foreground">
                                {client.license?.expiresAt
                                  ? format(new Date(client.license.expiresAt), "MMM d, yyyy")
                                  : "—"}
                              </TableCell>
                              <TableCell className="text-sm text-muted-foreground" suppressHydrationWarning>
                                {client.lastActivityAt
                                  ? formatDistanceToNow(new Date(client.lastActivityAt), {
                                      addSuffix: true,
                                    })
                                  : "Never"}
                              </TableCell>
                              <TableCell>
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="icon">
                                      <MoreHorizontal className="h-4 w-4" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end">
                                    <DropdownMenuItem asChild>
                                      <Link href={`/clients/${client.id}`}>
                                        <Eye className="mr-2 h-4 w-4" />
                                        View Profile
                                      </Link>
                                    </DropdownMenuItem>
                                    <DropdownMenuItem asChild>
                                      <Link href={`/messages?client=${client.id}`}>
                                        <MessageSquare className="mr-2 h-4 w-4" />
                                        Send Message
                                      </Link>
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem asChild>
                                      <Link href={`/clients/${client.id}?edit=true`}>
                                        <Edit className="mr-2 h-4 w-4" />
                                        Edit Goals
                                      </Link>
                                    </DropdownMenuItem>
                                    {client.license && client.license.status !== "REVOKED" && (
                                      <>
                                        <DropdownMenuSeparator />
                                        <DropdownMenuItem
                                          className="text-destructive"
                                          onClick={() => {
                                            if (confirm("Are you sure you want to revoke this license?")) {
                                              revokeLicense.mutate({ id: client.license!.id });
                                            }
                                          }}
                                        >
                                          <Ban className="mr-2 h-4 w-4" />
                                          Revoke License
                                        </DropdownMenuItem>
                                      </>
                                    )}
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                ) : (
                  /* Card View */
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4" suppressHydrationWarning>
                    {clients.map((client) => {
                      const progress = calculateProgress(
                        client.startWeight,
                        client.currentWeight,
                        client.targetWeight
                      );
                      const weightChange = client.currentWeight && client.startWeight 
                        ? (client.currentWeight - client.startWeight).toFixed(1)
                        : null;
                      const isPositiveChange = weightChange ? parseFloat(weightChange) > 0 : false;

                      return (
                        <Link key={client.id} href={`/clients/${client.id}`}>
                          <Card className="h-full hover:border-primary transition-colors cursor-pointer">
                            <CardContent className="pt-5">
                              {/* Header */}
                              <div className="flex items-start justify-between mb-4">
                                <div className="flex items-center gap-3">
                                  <Avatar className="h-12 w-12">
                                    <AvatarFallback className="text-sm font-medium">
                                      {client.name
                                        .split(" ")
                                        .map((n) => n[0])
                                        .join("")}
                                    </AvatarFallback>
                                  </Avatar>
                                  <div>
                                    <p className="font-semibold">{client.name}</p>
                                    <div className="flex items-center gap-2 mt-0.5">
                                      {client.team ? (
                                        <div className="flex items-center gap-1.5">
                                          <div
                                            className="h-2 w-2 rounded-full"
                                            style={{ backgroundColor: client.team.color }}
                                          />
                                          <span className="text-xs text-muted-foreground">{client.team.name}</span>
                                        </div>
                                      ) : (
                                        <span className="text-xs text-muted-foreground">Unassigned</span>
                                      )}
                                    </div>
                                  </div>
                                </div>
                                <Badge variant={getGoalVariant(client.goalType)} className="gap-1 text-[10px]">
                                  {getGoalIcon(client.goalType)}
                                  {client.goalType.replace("_", " ")}
                                </Badge>
                              </div>

                              {/* Assigned Meal Plan */}
                              <div className="flex items-center justify-between text-sm mb-3">
                                <span className="text-muted-foreground flex items-center gap-1">
                                  <UtensilsCrossed className="h-3 w-3" />
                                  Meal Plan
                                </span>
                                {client.assignedMealPlans && client.assignedMealPlans.length > 0 ? (
                                  <div className="flex items-center gap-1">
                                    <span className="font-medium text-xs truncate max-w-[120px]" title={client.assignedMealPlans[0].mealPlan.title}>
                                      {client.assignedMealPlans[0].mealPlan.title}
                                      {client.assignedMealPlans.length > 1 && (
                                        <span className="text-muted-foreground"> +{client.assignedMealPlans.length - 1}</span>
                                      )}
                                    </span>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-5 w-5 flex-shrink-0"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        e.preventDefault();
                                        openMealPlanQuickEdit(client.id, client.name, client.assignedMealPlans[0].mealPlan.id);
                                      }}
                                    >
                                      <Pencil className="h-3 w-3" />
                                    </Button>
                                  </div>
                                ) : (
                                  <span className="text-xs text-muted-foreground">None assigned</span>
                                )}
                              </div>

                              {/* Assigned Workout */}
                              <div className="flex items-center justify-between text-sm mb-3">
                                <span className="text-muted-foreground flex items-center gap-1">
                                  <Dumbbell className="h-3 w-3" />
                                  Workout
                                </span>
                                {client.assignedWorkouts && client.assignedWorkouts.length > 0 ? (
                                  <div className="flex items-center gap-1">
                                    <span className="font-medium text-xs truncate max-w-[120px]" title={client.assignedWorkouts[0].workout.title}>
                                      {client.assignedWorkouts[0].workout.title}
                                      {client.assignedWorkouts.length > 1 && (
                                        <span className="text-muted-foreground"> +{client.assignedWorkouts.length - 1}</span>
                                      )}
                                    </span>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-5 w-5 flex-shrink-0"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        e.preventDefault();
                                        openWorkoutQuickEdit(client.id, client.name, client.assignedWorkouts[0].workout.id);
                                      }}
                                    >
                                      <Pencil className="h-3 w-3" />
                                    </Button>
                                  </div>
                                ) : (
                                  <span className="text-xs text-muted-foreground">None assigned</span>
                                )}
                              </div>

                              {/* Weight Progress */}
                              <div className="space-y-3 mb-4">
                                <div className="flex items-center justify-between text-sm">
                                  <span className="text-muted-foreground">Weight Progress</span>
                                  <div className="flex items-center gap-1.5">
                                    {weightChange && (
                                      <span className={`text-xs font-medium ${
                                        client.goalType === "WEIGHT_LOSS"
                                          ? isPositiveChange ? "text-red-500" : "text-green-500"
                                          : client.goalType === "WEIGHT_GAIN"
                                          ? isPositiveChange ? "text-green-500" : "text-red-500"
                                          : "text-muted-foreground"
                                      }`}>
                                        {isPositiveChange ? "+" : ""}{weightChange} kg
                                      </span>
                                    )}
                                    <span className="font-medium">{progress !== null ? `${progress}%` : "N/A"}</span>
                                  </div>
                                </div>
                                {progress !== null && (
                                  <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                                    <div
                                      className="h-full bg-primary rounded-full transition-all"
                                      style={{ width: `${Math.max(0, Math.min(100, progress))}%` }}
                                    />
                                  </div>
                                )}
                              </div>

                              {/* Weekly Goals */}
                              <div className="flex items-center justify-between text-sm mb-4">
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <span className="text-muted-foreground flex items-center gap-1 cursor-help">
                                        Weekly Goals
                                        <Info className="h-3 w-3" />
                                      </span>
                                    </TooltipTrigger>
                                    <TooltipContent className="max-w-xs p-3">
                                      <p className="font-medium mb-1">Weekly Goal Achievement</p>
                                      <p className="text-xs text-muted-foreground mb-2">
                                        Shows the % of days in the last 7 days where the client hit their daily goals.
                                      </p>
                                      <p className="text-xs text-muted-foreground mb-1"><strong>Goals tracked:</strong></p>
                                      <ul className="text-xs text-muted-foreground list-disc pl-4 space-y-0.5">
                                        <li>Calories (within ±10% of target)</li>
                                        <li>Protein (at least 90% of target)</li>
                                        <li>Carbs (within ±10% of target)</li>
                                        <li>Fats (within ±10% of target)</li>
                                        <li>Exercise minutes (at least 90% of goal)</li>
                                      </ul>
                                      <p className="text-xs text-muted-foreground mt-2">
                                        A day counts as &quot;hit&quot; if 80%+ of tracked goals are met.
                                      </p>
                                    </TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                                {client.goalAchievementPercent !== null && client.weeklyGoalsBreakdown ? (
                                  <TooltipProvider>
                                    <Tooltip delayDuration={200}>
                                      <TooltipTrigger asChild>
                                        <div className="flex items-center gap-2 cursor-help">
                                          <div className="w-16 h-2 bg-muted rounded-full overflow-hidden">
                                            <div
                                              className={`h-full rounded-full transition-all ${
                                                client.goalAchievementPercent >= 70
                                                  ? "bg-green-500"
                                                  : client.goalAchievementPercent >= 40
                                                  ? "bg-amber-500"
                                                  : "bg-red-500"
                                              }`}
                                              style={{ width: `${client.goalAchievementPercent}%` }}
                                            />
                                          </div>
                                          <span className="font-medium text-xs">
                                            {client.weeklyGoalsBreakdown.filter(d => d.isHit).length}/7 days
                                          </span>
                                        </div>
                                      </TooltipTrigger>
                                      <TooltipContent side="left" className="p-0 w-96">
                                        <div className="p-3 border-b">
                                          <p className="font-semibold text-sm">Weekly Goals Summary</p>
                                          <p className="text-xs text-muted-foreground">Last 7 days breakdown</p>
                                        </div>
                                        <div className="p-2 space-y-1">
                                          {client.weeklyGoalsBreakdown.map((day, idx) => (
                                            <div key={idx} className={`flex items-center gap-2 p-1.5 rounded text-xs ${day.isHit ? 'bg-green-500/10' : 'bg-muted/50'}`}>
                                              <div className={`w-5 h-5 min-w-[20px] rounded-full flex items-center justify-center ${day.isHit ? 'bg-green-500 text-white' : 'bg-muted-foreground/20 text-muted-foreground'}`}>
                                                {day.isHit ? <Check className="w-3 h-3" /> : <Minus className="w-3 h-3" />}
                                              </div>
                                              <span className="font-medium w-9 shrink-0">{day.dayName}</span>
                                              <div className="flex-1 flex items-center gap-1.5 text-[10px]">
                                                {day.goals.calories && (
                                                  <span className={`px-1 py-0.5 rounded ${day.goals.calories.hit ? 'bg-green-500/20 text-green-700 dark:text-green-400' : 'bg-red-500/20 text-red-700 dark:text-red-400'}`}>
                                                    🔥{day.goals.calories.percent}%
                                                  </span>
                                                )}
                                                {day.goals.protein && (
                                                  <span className={`px-1 py-0.5 rounded ${day.goals.protein.hit ? 'bg-green-500/20 text-green-700 dark:text-green-400' : 'bg-red-500/20 text-red-700 dark:text-red-400'}`}>
                                                    🥩{day.goals.protein.percent}%
                                                  </span>
                                                )}
                                                {day.goals.carbs && (
                                                  <span className={`px-1 py-0.5 rounded ${day.goals.carbs.hit ? 'bg-green-500/20 text-green-700 dark:text-green-400' : 'bg-red-500/20 text-red-700 dark:text-red-400'}`}>
                                                    🌾{day.goals.carbs.percent}%
                                                  </span>
                                                )}
                                                {day.goals.fats && (
                                                  <span className={`px-1 py-0.5 rounded ${day.goals.fats.hit ? 'bg-green-500/20 text-green-700 dark:text-green-400' : 'bg-red-500/20 text-red-700 dark:text-red-400'}`}>
                                                    🥑{day.goals.fats.percent}%
                                                  </span>
                                                )}
                                                {day.goals.exercise && (
                                                  <span className={`px-1 py-0.5 rounded ${day.goals.exercise.hit ? 'bg-green-500/20 text-green-700 dark:text-green-400' : 'bg-red-500/20 text-red-700 dark:text-red-400'}`}>
                                                    🏋️{day.goals.exercise.percent}%
                                                  </span>
                                                )}
                                                {day.goals.steps && (
                                                  <span className={`px-1 py-0.5 rounded ${day.goals.steps.hit ? 'bg-green-500/20 text-green-700 dark:text-green-400' : 'bg-red-500/20 text-red-700 dark:text-red-400'}`}>
                                                    👣{day.goals.steps.percent}%
                                                  </span>
                                                )}
                                                {!day.goals.calories && !day.goals.protein && !day.goals.carbs && !day.goals.fats && !day.goals.exercise && !day.goals.steps && (
                                                  <span className="text-muted-foreground">No data logged</span>
                                                )}
                                              </div>
                                            </div>
                                          ))}
                                        </div>
                                        <div className="p-2 pt-0 text-[10px] text-muted-foreground border-t mt-1">
                                          <span className="text-green-600 dark:text-green-400">Green</span> = goal hit • <span className="text-red-600 dark:text-red-400">Red</span> = missed
                                        </div>
                                      </TooltipContent>
                                    </Tooltip>
                                  </TooltipProvider>
                                ) : (
                                  <span className="text-muted-foreground text-xs">No data</span>
                                )}
                              </div>

                              {/* Today's Progress - Always showing dummy data for demo purposes */}
                              <div className="pt-3 border-t space-y-2">
                                <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">Today&apos;s Progress</p>
                                <div className="grid grid-cols-2 gap-x-3 gap-y-1.5">
                                  {/* Calories */}
                                  <div className="space-y-0.5">
                                    <div className="flex items-center justify-between">
                                      <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                                        <span className="text-[10px]">🔥</span>
                                        Calories
                                      </span>
                                      <span className="text-[10px] font-medium">68%</span>
                                    </div>
                                    <div className="w-full h-1 bg-muted rounded-full overflow-hidden">
                                      <div className="h-full bg-orange-500 rounded-full" style={{ width: "68%" }} />
                                    </div>
                                  </div>
                                  {/* Protein */}
                                  <div className="space-y-0.5">
                                    <div className="flex items-center justify-between">
                                      <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                                        <span className="text-[10px]">🥩</span>
                                        Protein
                                      </span>
                                      <span className="text-[10px] font-medium">85%</span>
                                    </div>
                                    <div className="w-full h-1 bg-muted rounded-full overflow-hidden">
                                      <div className="h-full bg-red-500 rounded-full" style={{ width: "85%" }} />
                                    </div>
                                  </div>
                                  {/* Carbs */}
                                  <div className="space-y-0.5">
                                    <div className="flex items-center justify-between">
                                      <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                                        <span className="text-[10px]">🌾</span>
                                        Carbs
                                      </span>
                                      <span className="text-[10px] font-medium">72%</span>
                                    </div>
                                    <div className="w-full h-1 bg-muted rounded-full overflow-hidden">
                                      <div className="h-full bg-blue-500 rounded-full" style={{ width: "72%" }} />
                                    </div>
                                  </div>
                                  {/* Fats */}
                                  <div className="space-y-0.5">
                                    <div className="flex items-center justify-between">
                                      <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                                        <span className="text-[10px]">🥑</span>
                                        Fats
                                      </span>
                                      <span className="text-[10px] font-medium">45%</span>
                                    </div>
                                    <div className="w-full h-1 bg-muted rounded-full overflow-hidden">
                                      <div className="h-full bg-yellow-500 rounded-full" style={{ width: "45%" }} />
                                    </div>
                                  </div>
                                  {/* Water */}
                                  <div className="space-y-0.5">
                                    <div className="flex items-center justify-between">
                                      <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                                        <Droplets className="h-2.5 w-2.5 text-cyan-500" />
                                        Water
                                      </span>
                                      <span className="text-[10px] font-medium">5/8</span>
                                    </div>
                                    <div className="w-full h-1 bg-muted rounded-full overflow-hidden">
                                      <div className="h-full bg-cyan-500 rounded-full" style={{ width: "62%" }} />
                                    </div>
                                  </div>
                                  {/* Exercise */}
                                  <div className="space-y-0.5">
                                    <div className="flex items-center justify-between">
                                      <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                                        <Dumbbell className="h-2.5 w-2.5 text-purple-500" />
                                        Exercise
                                      </span>
                                      <span className="text-[10px] font-medium">30/45m</span>
                                    </div>
                                    <div className="w-full h-1 bg-muted rounded-full overflow-hidden">
                                      <div className="h-full bg-purple-500 rounded-full" style={{ width: "67%" }} />
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        </Link>
                      );
                    })}
                  </div>
                )
              ) : (
                <div className="text-center py-12">
                  <Users className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                  <h3 className="text-lg font-medium mb-2">No active clients yet</h3>
                  <p className="text-muted-foreground mb-4">
                    Invite clients and they&apos;ll appear here once they activate their license
                  </p>
                  <InviteClientDialog
                    onSuccess={refetchAll}
                    trigger={
                      <Button>
                        <Plus className="mr-2 h-4 w-4" />
                        Invite Client
                      </Button>
                    }
                  />
                </div>
              )}
            </TabsContent>

            {/* Pending Invites Tab */}
            <TabsContent value="pending" className="mt-0">
              {licensesLoading ? (
                <div className="space-y-4 py-4">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="flex items-center gap-4">
                      <Skeleton className="h-10 w-10 rounded" />
                      <div className="flex-1 space-y-2">
                        <Skeleton className="h-4 w-32" />
                        <Skeleton className="h-3 w-48" />
                      </div>
                      <Skeleton className="h-6 w-20" />
                    </div>
                  ))}
                </div>
              ) : pendingLicenses.length > 0 ? (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Invited Client</TableHead>
                        <TableHead>Team</TableHead>
                        <TableHead>Invite Link</TableHead>
                        <TableHead>Sent</TableHead>
                        <TableHead className="w-[50px]"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {pendingLicenses.map((license) => (
                        <TableRow key={license.id}>
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <Avatar className="h-9 w-9">
                                <AvatarFallback className="text-xs bg-amber-100 text-amber-700">
                                  {license.invitedName
                                    ?.split(" ")
                                    .map((n) => n[0])
                                    .join("") || "?"}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <p className="font-medium">{license.invitedName}</p>
                                <p className="text-xs text-muted-foreground">
                                  {license.invitedEmail}
                                </p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            {(() => {
                              const anyLicense = license as any;
                              const team =
                                anyLicense?.team ??
                                (anyLicense?.teamId ? teamsById.get(anyLicense.teamId as string) : undefined);

                              if (!team) return <span className="text-sm text-muted-foreground">—</span>;

                              return (
                                <div className="flex items-center gap-2">
                                  <div className="h-2 w-2 rounded-full" style={{ backgroundColor: team.color }} />
                                  <span className="text-sm">{team.name}</span>
                                </div>
                              );
                            })()}
                          </TableCell>
                          <TableCell>
                            {license.inviteLink && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 gap-2"
                                onClick={() => copyInviteLink(license.inviteLink!)}
                              >
                                <Copy className="h-3 w-3" />
                                Copy Link
                              </Button>
                            )}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground" suppressHydrationWarning>
                            {license.inviteSentAt
                              ? formatDistanceToNow(new Date(license.inviteSentAt), { addSuffix: true })
                              : "—"}
                          </TableCell>
                          <TableCell>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                {license.inviteLink && (
                                  <DropdownMenuItem
                                    onClick={() => copyInviteLink(license.inviteLink!)}
                                  >
                                    <Copy className="mr-2 h-4 w-4" />
                                    Copy Invite Link
                                  </DropdownMenuItem>
                                )}
                                <DropdownMenuItem
                                  onClick={() => openResendInviteDialog(license as unknown as ResendLicense)}
                                >
                                  <Mail className="mr-2 h-4 w-4" />
                                  Resend Invitation
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  className="text-destructive"
                                  onClick={() => {
                                    if (confirm("Are you sure you want to cancel this invitation?")) {
                                      revokeLicense.mutate({ id: license.id });
                                    }
                                  }}
                                >
                                  <UserX className="mr-2 h-4 w-4" />
                                  Cancel Invitation
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="text-center py-12">
                  <Clock className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                  <h3 className="text-lg font-medium mb-2">No pending invitations</h3>
                  <p className="text-muted-foreground mb-4">
                    All your invitations have been accepted or cancelled
                  </p>
                  <InviteClientDialog
                    onSuccess={refetchAll}
                    trigger={
                      <Button>
                        <Plus className="mr-2 h-4 w-4" />
                        Invite New Client
                      </Button>
                    }
                  />
                </div>
              )}
            </TabsContent>

            {/* All Licenses Tab */}
            <TabsContent value="all" className="mt-0">
              {licensesLoading ? (
                <div className="space-y-4 py-4">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <div key={i} className="flex items-center gap-4">
                      <Skeleton className="h-10 w-10 rounded" />
                      <div className="flex-1 space-y-2">
                        <Skeleton className="h-4 w-32" />
                        <Skeleton className="h-3 w-48" />
                      </div>
                      <Skeleton className="h-6 w-20" />
                    </div>
                  ))}
                </div>
              ) : allLicenses.length > 0 ? (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Client</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Team</TableHead>
                        <TableHead>Activated</TableHead>
                        <TableHead>Expires</TableHead>
                        <TableHead className="w-[50px]"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {allLicenses.map((license) => (
                        <TableRow key={license.id}>
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <Avatar className="h-9 w-9">
                                <AvatarFallback className="text-xs">
                                  {(() => {
                                    const anyLicense = license as any;
                                    const client = anyLicense?.clientId
                                      ? clientsById.get(anyLicense.clientId as string)
                                      : undefined;
                                    const name = client?.name ?? anyLicense?.invitedName ?? "?";
                                    return name
                                      .split(" ")
                                      .map((n: string) => n[0])
                                      .join("");
                                  })()}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <p className="font-medium">
                                  {(() => {
                                    const anyLicense = license as any;
                                    const client = anyLicense?.clientId
                                      ? clientsById.get(anyLicense.clientId as string)
                                      : undefined;
                                    return client?.name ?? anyLicense?.invitedName ?? "—";
                                  })()}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {(() => {
                                    const anyLicense = license as any;
                                    const client = anyLicense?.clientId
                                      ? clientsById.get(anyLicense.clientId as string)
                                      : undefined;
                                    return client?.email ?? anyLicense?.invitedEmail ?? "—";
                                  })()}
                                </p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant={getStatusVariant(license.status)} className="gap-1">
                              {getStatusIcon(license.status)}
                              {license.status.toLowerCase()}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {(() => {
                              const anyLicense = license as any;
                              const team =
                                anyLicense?.team ??
                                (anyLicense?.teamId ? teamsById.get(anyLicense.teamId as string) : undefined);

                              if (!team) return <span className="text-sm text-muted-foreground">—</span>;

                              return (
                                <div className="flex items-center gap-2">
                                  <div className="h-2 w-2 rounded-full" style={{ backgroundColor: team.color }} />
                                  <span className="text-sm">{team.name}</span>
                                </div>
                              );
                            })()}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {license.activatedAt
                              ? format(new Date(license.activatedAt), "MMM d, yyyy")
                              : "—"}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {license.expiresAt
                              ? format(new Date(license.expiresAt), "MMM d, yyyy")
                              : "—"}
                          </TableCell>
                          <TableCell>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                {(() => {
                                  const anyLicense = license as any;
                                  const client = anyLicense?.clientId
                                    ? clientsById.get(anyLicense.clientId as string)
                                    : undefined;
                                  if (!client) return null;
                                  return (
                                    <DropdownMenuItem asChild>
                                      <Link href={`/clients/${client.id}`}>
                                        <Eye className="mr-2 h-4 w-4" />
                                        View Profile
                                      </Link>
                                    </DropdownMenuItem>
                                  );
                                })()}
                                {license.inviteLink && (
                                  <DropdownMenuItem
                                    onClick={() => copyInviteLink(license.inviteLink!)}
                                  >
                                    <Copy className="mr-2 h-4 w-4" />
                                    Copy Invite Link
                                  </DropdownMenuItem>
                                )}
                                {license.status === "PENDING" && (
                                  <DropdownMenuItem
                                    onClick={() => openResendInviteDialog(license as unknown as ResendLicense)}
                                  >
                                    <Mail className="mr-2 h-4 w-4" />
                                    Resend Invitation
                                  </DropdownMenuItem>
                                )}
                                {license.status !== "REVOKED" && (
                                  <>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem
                                      className="text-destructive"
                                      onClick={() => {
                                        if (confirm("Are you sure you want to revoke this license?")) {
                                          revokeLicense.mutate({ id: license.id });
                                        }
                                      }}
                                    >
                                      <Ban className="mr-2 h-4 w-4" />
                                      Revoke License
                                    </DropdownMenuItem>
                                  </>
                                )}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="text-center py-12">
                  <Users className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                  <h3 className="text-lg font-medium mb-2">No licenses yet</h3>
                  <p className="text-muted-foreground mb-4">
                    Invite your first client to get started
                  </p>
                  <InviteClientDialog
                    onSuccess={refetchAll}
                    trigger={
                      <Button>
                        <Plus className="mr-2 h-4 w-4" />
                        Invite Client
                      </Button>
                    }
                  />
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Resend Invitation - Email Editor */}
      <Dialog open={resendDialogOpen} onOpenChange={setResendDialogOpen}>
        <DialogContent className="sm:max-w-[600px] p-0 gap-0 overflow-hidden">
          {/* Header */}
          <div className="px-6 py-5 border-b">
            <DialogTitle className="flex items-center gap-2.5 text-lg font-semibold">
              <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary/10">
                <Mail className="h-4 w-4 text-primary" />
              </div>
              Resend Invitation
            </DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground mt-1">
              Edit the email that will be sent to the client
            </DialogDescription>
          </div>

          {/* Content */}
          <div className="px-6 py-5 space-y-4 max-h-[calc(90vh-180px)] overflow-y-auto">
            <div className="space-y-2">
              <Label className="text-sm font-medium">To</Label>
              <Input value={resendLicense?.invitedEmail ?? ""} readOnly className="h-11 bg-muted/50" />
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium">Subject</Label>
              <Input
                value={resendSubject}
                onChange={(e) => setResendSubject(e.target.value)}
                placeholder="Subject"
                className="h-11"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium">Message</Label>
              <Textarea
                value={resendMessage}
                onChange={(e) => setResendMessage(e.target.value)}
                className="min-h-[180px] text-sm"
                placeholder="Message"
              />
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm text-muted-foreground">Insert variable:</span>
                {["{{clientName}}", "{{inviteLink}}", "{{coachName}}"].map((variable) => (
                  <button
                    key={variable}
                    type="button"
                    className="inline-flex items-center h-7 px-2.5 text-xs font-mono rounded-md border bg-muted/50 hover:bg-muted text-foreground transition-colors"
                    onClick={() => setResendMessage(prev => prev + variable)}
                  >
                    {variable}
                  </button>
                ))}
              </div>
            </div>

            {/* Tip Box */}
            <div className="rounded-xl bg-cyan-50 dark:bg-cyan-950/30 border border-cyan-200 dark:border-cyan-800 px-4 py-3.5">
              <p className="text-sm text-cyan-700 dark:text-cyan-300 leading-relaxed">
                <span className="font-semibold text-cyan-800 dark:text-cyan-200">Tip:</span> Variables like{" "}
                <code className="rounded-md bg-cyan-100 dark:bg-cyan-900/50 px-1.5 py-0.5 font-mono text-xs text-cyan-800 dark:text-cyan-200">
                  {"{{clientName}}"}
                </code>{" "}
                will be replaced with actual data when sent.
              </p>
            </div>

            <div className="rounded-xl border bg-muted/30 p-4">
              <p className="text-sm font-medium text-muted-foreground mb-3">Preview</p>
              {(() => {
                const clientName = resendLicense?.invitedName || "there";
                const inviteLink = resendLicense?.inviteLink || "";
                const coachName = "Your coach";
                const subject = applyTemplate(resendSubject || "", { clientName, inviteLink, coachName });
                const body = applyTemplate(resendMessage || "", { clientName, inviteLink, coachName });
                return (
                  <div className="space-y-2 text-sm">
                    <div>
                      <span className="text-muted-foreground">Subject:</span>{" "}
                      <span className="font-medium">{subject || "—"}</span>
                    </div>
                    <pre className="whitespace-pre-wrap text-sm leading-relaxed bg-background rounded-lg p-3 border">{body || "—"}</pre>
                  </div>
                );
              })()}
            </div>
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t bg-muted/30 flex items-center justify-end gap-3">
            <Button variant="outline" onClick={() => setResendDialogOpen(false)} className="h-10 px-5">
              Cancel
            </Button>
            <Button
              className="h-10 px-5 gap-2"
              onClick={() => {
                if (!resendLicense?.id) return;
                const clientName = resendLicense.invitedName || "there";
                const inviteLink = resendLicense.inviteLink || "";
                const coachName = "Your coach";
                resendInvite.mutate({
                  id: resendLicense.id,
                  subject: applyTemplate(resendSubject, { clientName, inviteLink, coachName }),
                  message: applyTemplate(resendMessage, { clientName, inviteLink, coachName }),
                });
              }}
              disabled={!resendLicense?.id || resendInvite.isPending}
            >
              <Mail className="h-4 w-4" />
              {resendInvite.isPending ? "Sending..." : "Send Email"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Meal Plan Quick Edit Dialog */}
      <Dialog open={isMealPlanEditOpen} onOpenChange={setIsMealPlanEditOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UtensilsCrossed className="h-5 w-5" />
              Quick Edit Meal Plan
            </DialogTitle>
            <DialogDescription>
              {mealPlanDetails?.title ? (
                <>Editing for {selectedClientName}</>
              ) : (
                "Loading..."
              )}
            </DialogDescription>
          </DialogHeader>

          {mealPlanDetails ? (
            <div className="space-y-4 py-2">
              {/* Info banner */}
              <div className="flex items-center gap-2 text-xs px-3 py-2 rounded-md bg-blue-50 text-blue-600 dark:bg-blue-950/30 dark:text-blue-400">
                <span>Saving will create a personalized copy for {selectedClientName}. The original meal plan will not be changed.</span>
              </div>

              {/* Toggle between grams and percentage */}
              <div className="flex items-center justify-end">
                <div className="flex items-center gap-1 rounded-lg border p-1 bg-background">
                  <Button
                    type="button"
                    variant={quickEditMacroMode === 'grams' ? 'default' : 'ghost'}
                    size="sm"
                    className="h-7 px-3 text-xs"
                    onClick={() => setQuickEditMacroMode('grams')}
                  >
                    Grams
                  </Button>
                  <Button
                    type="button"
                    variant={quickEditMacroMode === 'percentage' ? 'default' : 'ghost'}
                    size="sm"
                    className="h-7 px-3 text-xs"
                    onClick={() => {
                      setQuickEditMacroMode('percentage');
                      if (editingMacros.calories > 0) {
                        setQuickEditPercentages({
                          protein: gramsToPercentage(editingMacros.calories, editingMacros.protein, 4),
                          carbs: gramsToPercentage(editingMacros.calories, editingMacros.carbs, 4),
                          fats: gramsToPercentage(editingMacros.calories, editingMacros.fats, 9),
                        });
                      }
                    }}
                  >
                    Percentage
                  </Button>
                </div>
              </div>

              {/* Calories input */}
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground flex items-center gap-1">
                  <Flame className="h-3 w-3 text-orange-500" />
                  Calories/day
                </Label>
                <Input
                  type="number"
                  value={editingMacros.calories || ""}
                  onChange={(e) => updateEditingMacrosFromCalories(parseInt(e.target.value) || 0)}
                  className="h-10 text-center text-lg font-bold text-orange-500"
                />
              </div>

              {/* Macros grid */}
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">
                    Protein {quickEditMacroMode === 'grams' ? '(g)' : '(%)'}
                  </Label>
                  <Input
                    type="number"
                    value={quickEditMacroMode === 'grams' ? (editingMacros.protein || "") : (quickEditPercentages.protein || "")}
                    onChange={(e) => quickEditMacroMode === 'grams'
                      ? updateEditingMacrosWithCalories('protein', parseInt(e.target.value) || 0)
                      : updateEditingMacrosFromPercentage('protein', parseInt(e.target.value) || 0)
                    }
                    className="h-10 text-center font-bold text-red-500"
                  />
                  <p className="text-xs text-muted-foreground text-center">
                    {quickEditMacroMode === 'grams'
                      ? (quickEditPercentages.protein ? `${quickEditPercentages.protein}%` : '-')
                      : (editingMacros.protein ? `${editingMacros.protein}g` : '-')
                    }
                  </p>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">
                    Carbs {quickEditMacroMode === 'grams' ? '(g)' : '(%)'}
                  </Label>
                  <Input
                    type="number"
                    value={quickEditMacroMode === 'grams' ? (editingMacros.carbs || "") : (quickEditPercentages.carbs || "")}
                    onChange={(e) => quickEditMacroMode === 'grams'
                      ? updateEditingMacrosWithCalories('carbs', parseInt(e.target.value) || 0)
                      : updateEditingMacrosFromPercentage('carbs', parseInt(e.target.value) || 0)
                    }
                    className="h-10 text-center font-bold text-blue-500"
                  />
                  <p className="text-xs text-muted-foreground text-center">
                    {quickEditMacroMode === 'grams'
                      ? (quickEditPercentages.carbs ? `${quickEditPercentages.carbs}%` : '-')
                      : (editingMacros.carbs ? `${editingMacros.carbs}g` : '-')
                    }
                  </p>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">
                    Fats {quickEditMacroMode === 'grams' ? '(g)' : '(%)'}
                  </Label>
                  <Input
                    type="number"
                    value={quickEditMacroMode === 'grams' ? (editingMacros.fats || "") : (quickEditPercentages.fats || "")}
                    onChange={(e) => quickEditMacroMode === 'grams'
                      ? updateEditingMacrosWithCalories('fats', parseInt(e.target.value) || 0)
                      : updateEditingMacrosFromPercentage('fats', parseInt(e.target.value) || 0)
                    }
                    className="h-10 text-center font-bold text-yellow-500"
                  />
                  <p className="text-xs text-muted-foreground text-center">
                    {quickEditMacroMode === 'grams'
                      ? (quickEditPercentages.fats ? `${quickEditPercentages.fats}%` : '-')
                      : (editingMacros.fats ? `${editingMacros.fats}g` : '-')
                    }
                  </p>
                </div>
              </div>

              {/* Percentage total indicator */}
              {(() => {
                const total = quickEditPercentages.protein + quickEditPercentages.carbs + quickEditPercentages.fats;
                if (total > 0 && total !== 100) {
                  return (
                    <div className={`flex items-center justify-center gap-2 text-xs px-2 py-1.5 rounded-md ${
                      total > 100
                        ? 'bg-red-50 text-red-600 dark:bg-red-950/30 dark:text-red-400'
                        : 'bg-amber-50 text-amber-600 dark:bg-amber-950/30 dark:text-amber-400'
                    }`}>
                      <span className="font-medium">Total: {total}%</span>
                      <span>{total > 100 ? `(${total - 100}% over)` : `(${100 - total}% remaining)`}</span>
                    </div>
                  );
                }
                if (total === 100) {
                  return (
                    <div className="flex items-center justify-center gap-2 text-xs px-2 py-1.5 rounded-md bg-green-50 text-green-600 dark:bg-green-950/30 dark:text-green-400">
                      <span className="font-medium">Total: 100%</span>
                    </div>
                  );
                }
                return null;
              })()}
            </div>
          ) : (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsMealPlanEditOpen(false)}>
              Cancel
            </Button>
            <Button onClick={saveMealPlanMacros} disabled={isSavingMealPlan || !mealPlanDetails}>
              {isSavingMealPlan ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Check className="h-4 w-4 mr-2" />
                  Save Changes
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Workout Quick Edit Dialog */}
      <Dialog open={isWorkoutEditOpen} onOpenChange={setIsWorkoutEditOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Dumbbell className="h-5 w-5" />
              Quick Edit Workout
            </DialogTitle>
            <DialogDescription>
              {workoutDetails?.title ? (
                <>Editing for {workoutClientName}</>
              ) : (
                "Loading..."
              )}
            </DialogDescription>
          </DialogHeader>

          {workoutDetails ? (
            <div className="space-y-4 py-2 overflow-y-auto flex-1">
              {/* Info banner */}
              <div className="flex items-center gap-2 text-xs px-3 py-2 rounded-md bg-blue-50 text-blue-600 dark:bg-blue-950/30 dark:text-blue-400">
                <Info className="h-4 w-4 flex-shrink-0" />
                <span>Changes will create a personalized copy for this client</span>
              </div>

              {/* Workout info */}
              <div className="text-sm text-muted-foreground">
                <span className="font-medium text-foreground">{workoutDetails.title}</span>
                {workoutDetails.category && <span className="ml-2">• {workoutDetails.category}</span>}
                {workoutDetails.difficulty && <span className="ml-2">• {workoutDetails.difficulty}</span>}
              </div>

              {/* Exercises */}
              <div className="space-y-3">
                <Label className="text-sm font-medium">
                  Exercises ({editingWorkoutExercises.length})
                </Label>

                {editingWorkoutExercises.length > 0 ? (
                  <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                    {editingWorkoutExercises.map((exercise, index) => (
                      <div
                        key={exercise.id}
                        className="border rounded-lg p-3 bg-muted/30 space-y-2"
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium text-sm flex items-center gap-2">
                              <span className="text-muted-foreground text-xs">{index + 1}.</span>
                              {exercise.name}
                            </p>
                            <p className="text-xs text-muted-foreground">{exercise.muscleGroup}</p>
                          </div>
                        </div>

                        <div className="grid grid-cols-4 gap-2">
                          <div className="space-y-1">
                            <Label className="text-xs text-muted-foreground">Sets</Label>
                            <Input
                              type="number"
                              min="1"
                              value={exercise.sets}
                              onChange={(e) => updateEditingWorkoutExercise(exercise.id, { sets: parseInt(e.target.value) || 1 })}
                              className="h-8 text-sm"
                            />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs text-muted-foreground">Reps</Label>
                            <Input
                              type="number"
                              min="1"
                              value={exercise.reps}
                              onChange={(e) => updateEditingWorkoutExercise(exercise.id, { reps: parseInt(e.target.value) || 1 })}
                              className="h-8 text-sm"
                            />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs text-muted-foreground">Weight</Label>
                            <Input
                              type="number"
                              min="0"
                              step="0.5"
                              value={exercise.weight || ""}
                              onChange={(e) => updateEditingWorkoutExercise(exercise.id, { weight: parseFloat(e.target.value) || 0 })}
                              className="h-8 text-sm"
                              placeholder="0"
                            />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs text-muted-foreground">Unit</Label>
                            <Select
                              value={exercise.weightUnit}
                              onValueChange={(value: "kg" | "lbs") => updateEditingWorkoutExercise(exercise.id, { weightUnit: value })}
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

                        <div className="grid grid-cols-2 gap-2">
                          <div className="space-y-1">
                            <Label className="text-xs text-muted-foreground">Rest (sec)</Label>
                            <Input
                              type="number"
                              min="0"
                              value={exercise.restTime}
                              onChange={(e) => updateEditingWorkoutExercise(exercise.id, { restTime: parseInt(e.target.value) || 0 })}
                              className="h-8 text-sm"
                            />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs text-muted-foreground">Notes</Label>
                            <Input
                              placeholder="Optional"
                              value={exercise.notes}
                              onChange={(e) => updateEditingWorkoutExercise(exercise.id, { notes: e.target.value })}
                              className="h-8 text-sm"
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-6 text-muted-foreground border border-dashed rounded-lg">
                    <Dumbbell className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No exercises in this workout</p>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsWorkoutEditOpen(false)}>
              Cancel
            </Button>
            <Button onClick={saveWorkoutChanges} disabled={isSavingWorkout || !workoutDetails}>
              {isSavingWorkout ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Check className="h-4 w-4 mr-2" />
                  Save Changes
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
