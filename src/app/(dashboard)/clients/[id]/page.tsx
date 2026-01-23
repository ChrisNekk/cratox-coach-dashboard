"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { trpc } from "@/lib/trpc/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
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
  ArrowLeft,
  MessageSquare,
  Edit,
  Scale,
  Target,
  Flame,
  Droplets,
  Footprints,
  Dumbbell,
  TrendingUp,
  TrendingDown,
  Calendar,
  Activity,
  UtensilsCrossed,
  Apple,
  Coffee,
  Moon,
  Loader2,
} from "lucide-react";
import { format, subDays } from "date-fns";
import { toast } from "sonner";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
} from "recharts";

export default function ClientProfilePage() {
  const params = useParams();
  const router = useRouter();
  const clientId = params.id as string;
  
  const [isEditingGoals, setIsEditingGoals] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());

  const { data: client, isLoading, refetch } = trpc.client.getById.useQuery({ id: clientId });
  const { data: weightHistory } = trpc.client.getWeightHistory.useQuery({ clientId, days: 90 });
  const { data: dailyLog } = trpc.client.getDailyLog.useQuery({ 
    clientId, 
    date: selectedDate 
  });

  const updateClient = trpc.client.update.useMutation({
    onSuccess: () => {
      toast.success("Client goals updated successfully");
      setIsEditingGoals(false);
      refetch();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to update goals");
    },
  });

  const [goalFormData, setGoalFormData] = useState({
    targetCalories: 0,
    proteinTarget: 0,
    carbsTarget: 0,
    fatsTarget: 0,
    targetWeight: 0,
    stepsGoal: 0,
    waterIntakeGoal: 0,
    exerciseMinutesGoal: 0,
  });

  // Update form data when client data loads
  if (client && goalFormData.targetCalories === 0 && client.targetCalories) {
    setGoalFormData({
      targetCalories: client.targetCalories || 2000,
      proteinTarget: client.proteinTarget || 150,
      carbsTarget: client.carbsTarget || 200,
      fatsTarget: client.fatsTarget || 65,
      targetWeight: client.targetWeight || 70,
      stepsGoal: client.stepsGoal || 10000,
      waterIntakeGoal: client.waterIntakeGoal || 8,
      exerciseMinutesGoal: client.exerciseMinutesGoal || 30,
    });
  }

  const handleSaveGoals = () => {
    updateClient.mutate({
      id: clientId,
      ...goalFormData,
    });
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid gap-6 lg:grid-cols-3">
          <Skeleton className="h-96 lg:col-span-1" />
          <Skeleton className="h-96 lg:col-span-2" />
        </div>
      </div>
    );
  }

  if (!client) {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-bold mb-2">Client not found</h2>
        <p className="text-muted-foreground mb-4">
          The client you&apos;re looking for doesn&apos;t exist or you don&apos;t have access.
        </p>
        <Button asChild>
          <Link href="/clients">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Clients
          </Link>
        </Button>
      </div>
    );
  }

  const progressPercentage = client.startWeight && client.targetWeight && client.currentWeight
    ? Math.round(((client.startWeight - client.currentWeight) / (client.startWeight - client.targetWeight)) * 100)
    : null;

  // Prepare chart data
  const weightChartData = weightHistory?.map((log) => ({
    date: format(new Date(log.date), "MMM d"),
    weight: log.weight,
  })) || [];

  // Macro percentages for today
  const todayCalories = dailyLog?.totalCalories || 0;
  const todayProtein = dailyLog?.totalProtein || 0;
  const todayCarbs = dailyLog?.totalCarbs || 0;
  const todayFats = dailyLog?.totalFats || 0;

  const calorieProgress = client.targetCalories ? Math.round((todayCalories / client.targetCalories) * 100) : 0;
  const proteinProgress = client.proteinTarget ? Math.round((todayProtein / client.proteinTarget) * 100) : 0;
  const carbsProgress = client.carbsTarget ? Math.round((todayCarbs / client.carbsTarget) * 100) : 0;
  const fatsProgress = client.fatsTarget ? Math.round((todayFats / client.fatsTarget) * 100) : 0;

  const getProgressColor = (progress: number) => {
    if (progress < 70) return "text-amber-500";
    if (progress > 110) return "text-red-500";
    return "text-green-500";
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/clients">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div className="flex items-center gap-4">
            <Avatar className="h-16 w-16">
              <AvatarFallback className="text-xl">
                {client.name.split(" ").map((n) => n[0]).join("")}
              </AvatarFallback>
            </Avatar>
            <div>
              <h1 className="text-2xl font-bold">{client.name}</h1>
              <p className="text-muted-foreground">{client.email}</p>
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link href={`/messages?client=${client.id}`}>
              <MessageSquare className="mr-2 h-4 w-4" />
              Message
            </Link>
          </Button>
          <Dialog open={isEditingGoals} onOpenChange={setIsEditingGoals}>
            <DialogTrigger asChild>
              <Button>
                <Edit className="mr-2 h-4 w-4" />
                Edit Goals
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Edit Goals & Targets</DialogTitle>
                <DialogDescription>
                  Modify {client.name}&apos;s nutrition and activity targets
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-6 py-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="targetCalories">Daily Calories</Label>
                    <Input
                      id="targetCalories"
                      type="number"
                      value={goalFormData.targetCalories}
                      onChange={(e) => setGoalFormData({ ...goalFormData, targetCalories: parseInt(e.target.value) })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="targetWeight">Target Weight (kg)</Label>
                    <Input
                      id="targetWeight"
                      type="number"
                      step="0.1"
                      value={goalFormData.targetWeight}
                      onChange={(e) => setGoalFormData({ ...goalFormData, targetWeight: parseFloat(e.target.value) })}
                    />
                  </div>
                </div>
                <Separator />
                <div className="grid gap-4 md:grid-cols-3">
                  <div className="space-y-2">
                    <Label htmlFor="proteinTarget">Protein (g)</Label>
                    <Input
                      id="proteinTarget"
                      type="number"
                      value={goalFormData.proteinTarget}
                      onChange={(e) => setGoalFormData({ ...goalFormData, proteinTarget: parseInt(e.target.value) })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="carbsTarget">Carbs (g)</Label>
                    <Input
                      id="carbsTarget"
                      type="number"
                      value={goalFormData.carbsTarget}
                      onChange={(e) => setGoalFormData({ ...goalFormData, carbsTarget: parseInt(e.target.value) })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="fatsTarget">Fats (g)</Label>
                    <Input
                      id="fatsTarget"
                      type="number"
                      value={goalFormData.fatsTarget}
                      onChange={(e) => setGoalFormData({ ...goalFormData, fatsTarget: parseInt(e.target.value) })}
                    />
                  </div>
                </div>
                <Separator />
                <div className="grid gap-4 md:grid-cols-3">
                  <div className="space-y-2">
                    <Label htmlFor="stepsGoal">Daily Steps</Label>
                    <Input
                      id="stepsGoal"
                      type="number"
                      value={goalFormData.stepsGoal}
                      onChange={(e) => setGoalFormData({ ...goalFormData, stepsGoal: parseInt(e.target.value) })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="waterIntakeGoal">Water (cups)</Label>
                    <Input
                      id="waterIntakeGoal"
                      type="number"
                      value={goalFormData.waterIntakeGoal}
                      onChange={(e) => setGoalFormData({ ...goalFormData, waterIntakeGoal: parseInt(e.target.value) })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="exerciseMinutesGoal">Exercise (min)</Label>
                    <Input
                      id="exerciseMinutesGoal"
                      type="number"
                      value={goalFormData.exerciseMinutesGoal}
                      onChange={(e) => setGoalFormData({ ...goalFormData, exerciseMinutesGoal: parseInt(e.target.value) })}
                    />
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsEditingGoals(false)}>
                  Cancel
                </Button>
                <Button onClick={handleSaveGoals} disabled={updateClient.isPending}>
                  {updateClient.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Save Changes
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left Column - Profile Overview */}
        <div className="space-y-6">
          {/* Basic Info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Profile Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Age</p>
                  <p className="font-medium">{client.age || "N/A"} years</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Gender</p>
                  <p className="font-medium capitalize">{client.gender?.toLowerCase() || "N/A"}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Height</p>
                  <p className="font-medium">{client.heightCm || "N/A"} cm</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Goal</p>
                  <Badge variant={
                    client.goalType === "WEIGHT_LOSS" ? "destructive" :
                    client.goalType === "WEIGHT_GAIN" ? "default" : "secondary"
                  }>
                    {client.goalType.replace("_", " ")}
                  </Badge>
                </div>
              </div>
              <Separator />
              <div className="space-y-2">
                <p className="text-muted-foreground text-sm">Team</p>
                {client.team ? (
                  <div className="flex items-center gap-2">
                    <div
                      className="h-3 w-3 rounded-full"
                      style={{ backgroundColor: client.team.color }}
                    />
                    <span>{client.team.name}</span>
                  </div>
                ) : (
                  <span className="text-muted-foreground">Unassigned</span>
                )}
              </div>
              <div className="space-y-2">
                <p className="text-muted-foreground text-sm">License Status</p>
                {client.license ? (
                  <div className="flex items-center justify-between">
                    <Badge variant={client.license.status === "ACTIVE" ? "default" : "secondary"}>
                      {client.license.status}
                    </Badge>
                    {client.license.expiresAt && (
                      <span className="text-xs text-muted-foreground">
                        Expires {format(new Date(client.license.expiresAt), "MMM d, yyyy")}
                      </span>
                    )}
                  </div>
                ) : (
                  <Badge variant="outline">No license</Badge>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Weight Progress */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Scale className="h-4 w-4" />
                Weight Progress
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-3 gap-2 text-center">
                <div>
                  <p className="text-xs text-muted-foreground">Start</p>
                  <p className="text-lg font-bold">{client.startWeight || "—"}</p>
                  <p className="text-xs text-muted-foreground">kg</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Current</p>
                  <p className="text-lg font-bold text-primary">{client.currentWeight || "—"}</p>
                  <p className="text-xs text-muted-foreground">kg</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Target</p>
                  <p className="text-lg font-bold">{client.targetWeight || "—"}</p>
                  <p className="text-xs text-muted-foreground">kg</p>
                </div>
              </div>
              {progressPercentage !== null && (
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Progress</span>
                    <span className="font-medium">{progressPercentage}%</span>
                  </div>
                  <Progress value={Math.max(0, Math.min(100, progressPercentage))} />
                </div>
              )}
              {client.lastWeighInDate && (
                <p className="text-xs text-muted-foreground text-center">
                  Last weigh-in: {format(new Date(client.lastWeighInDate), "MMM d, yyyy")} ({client.lastWeighInAmount} kg)
                </p>
              )}
            </CardContent>
          </Card>

          {/* Daily Targets */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Target className="h-4 w-4" />
                Daily Targets
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Flame className="h-4 w-4 text-orange-500" />
                  <span className="text-sm">Calories</span>
                </div>
                <span className="font-medium">{client.targetCalories || "—"} kcal</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="h-4 w-4 rounded-full bg-red-500" />
                  <span className="text-sm">Protein</span>
                </div>
                <span className="font-medium">
                  {client.proteinTarget || "—"}g ({client.proteinPercentage || "—"}%)
                </span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="h-4 w-4 rounded-full bg-blue-500" />
                  <span className="text-sm">Carbs</span>
                </div>
                <span className="font-medium">
                  {client.carbsTarget || "—"}g ({client.carbsPercentage || "—"}%)
                </span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="h-4 w-4 rounded-full bg-yellow-500" />
                  <span className="text-sm">Fats</span>
                </div>
                <span className="font-medium">
                  {client.fatsTarget || "—"}g ({client.fatsPercentage || "—"}%)
                </span>
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Droplets className="h-4 w-4 text-blue-500" />
                  <span className="text-sm">Water</span>
                </div>
                <span className="font-medium">{client.waterIntakeGoal || 8} cups</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Footprints className="h-4 w-4 text-green-500" />
                  <span className="text-sm">Steps</span>
                </div>
                <span className="font-medium">{client.stepsGoal?.toLocaleString() || "10,000"}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Dumbbell className="h-4 w-4 text-purple-500" />
                  <span className="text-sm">Exercise</span>
                </div>
                <span className="font-medium">{client.exerciseMinutesGoal || 30} min</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Detailed Data */}
        <div className="lg:col-span-2 space-y-6">
          <Tabs defaultValue="overview" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="nutrition">Nutrition</TabsTrigger>
              <TabsTrigger value="exercise">Exercise</TabsTrigger>
              <TabsTrigger value="content">Content</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-6 mt-6">
              {/* Weight Chart */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Weight Trend</CardTitle>
                  <CardDescription>Last 90 days weight history</CardDescription>
                </CardHeader>
                <CardContent>
                  {weightChartData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={250}>
                      <AreaChart data={weightChartData}>
                        <defs>
                          <linearGradient id="colorWeight" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                            <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                        <XAxis dataKey="date" className="text-xs" />
                        <YAxis domain={['auto', 'auto']} className="text-xs" />
                        <Tooltip />
                        <Area
                          type="monotone"
                          dataKey="weight"
                          stroke="hsl(var(--primary))"
                          fillOpacity={1}
                          fill="url(#colorWeight)"
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-[250px] flex items-center justify-center text-muted-foreground">
                      No weight data available
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Today's Summary */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Today&apos;s Progress</CardTitle>
                  <CardDescription>
                    {format(selectedDate, "EEEE, MMMM d, yyyy")}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Calories</span>
                        <span className={`text-sm font-medium ${getProgressColor(calorieProgress)}`}>
                          {calorieProgress}%
                        </span>
                      </div>
                      <Progress value={Math.min(100, calorieProgress)} className="h-2" />
                      <p className="text-xs text-muted-foreground">
                        {todayCalories} / {client.targetCalories} kcal
                      </p>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Protein</span>
                        <span className={`text-sm font-medium ${getProgressColor(proteinProgress)}`}>
                          {proteinProgress}%
                        </span>
                      </div>
                      <Progress value={Math.min(100, proteinProgress)} className="h-2" />
                      <p className="text-xs text-muted-foreground">
                        {todayProtein}g / {client.proteinTarget}g
                      </p>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Carbs</span>
                        <span className={`text-sm font-medium ${getProgressColor(carbsProgress)}`}>
                          {carbsProgress}%
                        </span>
                      </div>
                      <Progress value={Math.min(100, carbsProgress)} className="h-2" />
                      <p className="text-xs text-muted-foreground">
                        {todayCarbs}g / {client.carbsTarget}g
                      </p>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Fats</span>
                        <span className={`text-sm font-medium ${getProgressColor(fatsProgress)}`}>
                          {fatsProgress}%
                        </span>
                      </div>
                      <Progress value={Math.min(100, fatsProgress)} className="h-2" />
                      <p className="text-xs text-muted-foreground">
                        {todayFats}g / {client.fatsTarget}g
                      </p>
                    </div>
                  </div>

                  <Separator className="my-4" />

                  <div className="grid gap-4 md:grid-cols-3">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-lg bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
                        <Droplets className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Water</p>
                        <p className="font-medium">
                          {dailyLog?.waterIntake || 0} / {client.waterIntakeGoal} cups
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-lg bg-green-100 dark:bg-green-900 flex items-center justify-center">
                        <Footprints className="h-5 w-5 text-green-600 dark:text-green-400" />
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Steps</p>
                        <p className="font-medium">
                          {dailyLog?.steps?.toLocaleString() || 0} / {client.stepsGoal?.toLocaleString()}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-lg bg-purple-100 dark:bg-purple-900 flex items-center justify-center">
                        <Dumbbell className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Exercise</p>
                        <p className="font-medium">
                          {dailyLog?.exerciseMinutes || 0} / {client.exerciseMinutesGoal} min
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="nutrition" className="space-y-6 mt-6">
              {/* Detailed Nutrition */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Nutrition Details</CardTitle>
                  <CardDescription>
                    Detailed nutrient breakdown for {format(selectedDate, "MMMM d")}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {dailyLog ? (
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                      <div className="p-3 rounded-lg bg-muted">
                        <p className="text-xs text-muted-foreground">Fiber</p>
                        <p className="text-lg font-bold">{dailyLog.totalFiber || 0}g</p>
                      </div>
                      <div className="p-3 rounded-lg bg-muted">
                        <p className="text-xs text-muted-foreground">Saturated Fat</p>
                        <p className="text-lg font-bold">{dailyLog.totalSaturatedFat || 0}g</p>
                      </div>
                      <div className="p-3 rounded-lg bg-muted">
                        <p className="text-xs text-muted-foreground">Unsaturated Fat</p>
                        <p className="text-lg font-bold">{dailyLog.totalUnsaturatedFat || 0}g</p>
                      </div>
                      <div className="p-3 rounded-lg bg-muted">
                        <p className="text-xs text-muted-foreground">Sugars</p>
                        <p className="text-lg font-bold">{dailyLog.totalSugars || 0}g</p>
                      </div>
                      <div className="p-3 rounded-lg bg-muted">
                        <p className="text-xs text-muted-foreground">Sodium</p>
                        <p className="text-lg font-bold">{dailyLog.totalSodium || 0}mg</p>
                      </div>
                      <div className="p-3 rounded-lg bg-muted">
                        <p className="text-xs text-muted-foreground">Caffeine</p>
                        <p className="text-lg font-bold">{dailyLog.totalCaffeine || 0}mg</p>
                      </div>
                      {(dailyLog.totalAlcohol || 0) > 0 && (
                        <div className="p-3 rounded-lg bg-amber-100 dark:bg-amber-900">
                          <p className="text-xs text-muted-foreground">Alcohol</p>
                          <p className="text-lg font-bold">{dailyLog.totalAlcohol}g</p>
                        </div>
                      )}
                    </div>
                  ) : (
                    <p className="text-muted-foreground text-center py-8">
                      No nutrition data for this date
                    </p>
                  )}
                </CardContent>
              </Card>

              {/* Meal Log */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Meal Log</CardTitle>
                </CardHeader>
                <CardContent>
                  {dailyLog ? (
                    <div className="space-y-4">
                      {[
                        { key: "breakfast", icon: Coffee, label: "Breakfast", data: dailyLog.breakfast },
                        { key: "lunch", icon: UtensilsCrossed, label: "Lunch", data: dailyLog.lunch },
                        { key: "dinner", icon: Moon, label: "Dinner", data: dailyLog.dinner },
                        { key: "snacks", icon: Apple, label: "Snacks", data: dailyLog.snacks },
                      ].map((meal) => (
                        <div key={meal.key} className="border rounded-lg p-4">
                          <div className="flex items-center gap-2 mb-3">
                            <meal.icon className="h-4 w-4 text-muted-foreground" />
                            <span className="font-medium">{meal.label}</span>
                          </div>
                          {meal.data && Array.isArray(meal.data) && meal.data.length > 0 ? (
                            <div className="space-y-2">
                              {(meal.data as Array<{ name: string; calories: number; protein: number; carbs: number; fats: number }>).map((food, i) => (
                                <div key={i} className="flex items-center justify-between text-sm">
                                  <span>{food.name}</span>
                                  <span className="text-muted-foreground">
                                    {food.calories} kcal | P: {food.protein}g | C: {food.carbs}g | F: {food.fats}g
                                  </span>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-sm text-muted-foreground">Not logged</p>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-muted-foreground text-center py-8">
                      No meals logged for this date
                    </p>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="exercise" className="space-y-6 mt-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Exercise Log</CardTitle>
                  <CardDescription>Recent workout activity</CardDescription>
                </CardHeader>
                <CardContent>
                  {client.exercises && client.exercises.length > 0 ? (
                    <div className="space-y-3">
                      {client.exercises.map((exercise) => (
                        <div
                          key={exercise.id}
                          className="flex items-center justify-between p-3 border rounded-lg"
                        >
                          <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                              <Dumbbell className="h-5 w-5 text-primary" />
                            </div>
                            <div>
                              <p className="font-medium">{exercise.name}</p>
                              <p className="text-sm text-muted-foreground">
                                {format(new Date(exercise.date), "MMM d, yyyy")} •{" "}
                                {exercise.duration} min
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="font-medium">{exercise.caloriesBurned} kcal</p>
                            <Badge variant="outline" className="text-xs">
                              {exercise.source === "APPLE_HEALTH" ? "Apple Health" : "Manual"}
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-muted-foreground text-center py-8">
                      No exercises logged yet
                    </p>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="content" className="space-y-6 mt-6">
              {/* Assigned Content */}
              <div className="grid gap-6 md:grid-cols-2">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Assigned Workouts</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {client.assignedWorkouts && client.assignedWorkouts.length > 0 ? (
                      <div className="space-y-2">
                        {client.assignedWorkouts.map((aw) => (
                          <div key={aw.id} className="flex items-center justify-between p-2 border rounded">
                            <span className="font-medium">{aw.workout.title}</span>
                            <Badge variant={aw.completedAt ? "default" : "outline"}>
                              {aw.completedAt ? "Completed" : "Pending"}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-muted-foreground text-center py-4">
                        No workouts assigned
                      </p>
                    )}
                    <Button variant="outline" className="w-full mt-4" asChild>
                      <Link href="/content/workouts">Assign Workout</Link>
                    </Button>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Assigned Meal Plans</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {client.assignedMealPlans && client.assignedMealPlans.length > 0 ? (
                      <div className="space-y-2">
                        {client.assignedMealPlans.map((amp) => (
                          <div key={amp.id} className="flex items-center justify-between p-2 border rounded">
                            <span className="font-medium">{amp.mealPlan.title}</span>
                            <span className="text-xs text-muted-foreground">
                              {amp.startDate && format(new Date(amp.startDate), "MMM d")}
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-muted-foreground text-center py-4">
                        No meal plans assigned
                      </p>
                    )}
                    <Button variant="outline" className="w-full mt-4" asChild>
                      <Link href="/content/meal-plans">Assign Meal Plan</Link>
                    </Button>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
