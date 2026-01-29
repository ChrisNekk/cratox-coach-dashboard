"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import dynamic from "next/dynamic";
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
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  ArrowLeft,
  MessageSquare,
  Scale,
  Target,
  Flame,
  Droplets,
  Footprints,
  Dumbbell,
  TrendingUp,
  TrendingDown,
  Calendar,
  UtensilsCrossed,
  Apple,
  Coffee,
  Moon,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { format, subDays, startOfWeek, addDays, isSameDay, isToday } from "date-fns";
import { openQuickChatWithClient } from "@/components/quick-chat/quick-chat-widget";
import { toast } from "sonner";

// Dynamic imports for recharts to avoid SSR issues
const LineChart = dynamic(() => import("recharts").then((mod) => mod.LineChart), { ssr: false });
const Line = dynamic(() => import("recharts").then((mod) => mod.Line), { ssr: false });
const XAxis = dynamic(() => import("recharts").then((mod) => mod.XAxis), { ssr: false });
const YAxis = dynamic(() => import("recharts").then((mod) => mod.YAxis), { ssr: false });
const CartesianGrid = dynamic(() => import("recharts").then((mod) => mod.CartesianGrid), { ssr: false });
const Tooltip = dynamic(() => import("recharts").then((mod) => mod.Tooltip), { ssr: false });
const ResponsiveContainer = dynamic(() => import("recharts").then((mod) => mod.ResponsiveContainer), { ssr: false });
const AreaChart = dynamic(() => import("recharts").then((mod) => mod.AreaChart), { ssr: false });
const Area = dynamic(() => import("recharts").then((mod) => mod.Area), { ssr: false });
const BarChart = dynamic(() => import("recharts").then((mod) => mod.BarChart), { ssr: false });
const Bar = dynamic(() => import("recharts").then((mod) => mod.Bar), { ssr: false });

// Nutrient targets with ranges (based on standard recommendations)
const nutrientTargets = {
  fiber: { min: 35, label: "Fibers", unit: "g" },
  unsaturatedFat: { min: 57, label: "Unsaturated fats", unit: "g" },
  saturatedFat: { max: 29, label: "Saturated fats", unit: "g" },
  sugars: { max: 72, label: "Sugars", unit: "g" },
  sodium: { min: 1.2, max: 2.3, label: "Sodium", unit: "g" },
  caffeine: { max: 0.4, label: "Caffeine", unit: "g" },
  alcohol: { max: 20, label: "Alcohol", unit: "g" },
};

// Helper to render range-based progress bar similar to mobile app
function RangeProgressBar({ 
  value, 
  min, 
  max, 
  label, 
  unit 
}: { 
  value: number; 
  min?: number; 
  max?: number; 
  label: string; 
  unit: string;
}) {
  // Determine status and color
  let status: "low" | "good" | "high" = "good";
  let displayText = "";
  
  if (min !== undefined && max !== undefined) {
    // Range type (like sodium)
    if (value < min) {
      status = "low";
      displayText = `${value.toFixed(1)}${unit} / ${min} - ${max}${unit}`;
    } else if (value > max) {
      status = "high";
      displayText = `${value.toFixed(1)}${unit} / ${min} - ${max}${unit}`;
    } else {
      displayText = `${value.toFixed(1)}${unit} / ${min} - ${max}${unit}`;
    }
  } else if (min !== undefined) {
    // Min type (like fiber, unsaturated fats)
    displayText = `${Math.round(value)}${unit} / ${min}${unit} min`;
    if (value < min) status = "low";
  } else if (max !== undefined) {
    // Max type (like saturated fats, sugars, caffeine, alcohol)
    displayText = `${value.toFixed(1)}${unit} / ${max}${unit} max`;
    if (value > max) status = "high";
  }

  // Calculate progress percentage for bar visualization
  const target = max || min || 100;
  const progressPercent = Math.min((value / target) * 100, 150);

  return (
    <div className="flex items-center gap-4 py-2">
      <span className="text-sm font-medium w-32">{label}</span>
      <span className="text-sm text-muted-foreground w-28 text-right">{displayText}</span>
      <div className="w-24 h-2 bg-muted rounded-full overflow-hidden relative">
        {/* Background segments for range indicators */}
        <div className="absolute inset-0 flex">
          <div className="flex-1 bg-red-200 dark:bg-red-900/30" />
          <div className="flex-1 bg-green-200 dark:bg-green-900/30" />
          <div className="flex-1 bg-red-200 dark:bg-red-900/30" />
        </div>
        {/* Actual progress */}
        <div 
          className={`absolute h-full rounded-full transition-all ${
            status === "low" ? "bg-red-500" : 
            status === "high" ? "bg-red-500" : 
            "bg-green-500"
          }`}
          style={{ width: `${Math.min(progressPercent, 100)}%` }}
        />
      </div>
    </div>
  );
}

// Circular progress indicator for calorie tracking (like the mobile app)
function CalorieRing({ 
  progress, 
  dayLetter,
  size = 56,
  isSelected = false,
  isToday = false,
}: { 
  progress: number; 
  dayLetter: string;
  size?: number;
  isSelected?: boolean;
  isToday?: boolean;
}) {
  const strokeWidth = 4;
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const clampedProgress = Math.min(progress, 100);
  const offset = circumference - (clampedProgress / 100) * circumference;

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="transform -rotate-90">
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={strokeWidth}
          className="stroke-gray-200 dark:stroke-gray-700"
        />
        {/* Progress circle */}
        {progress > 0 && (
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            className="stroke-blue-500 transition-all duration-300"
          />
        )}
      </svg>
      {/* Day letter centered inside */}
      <div className="absolute inset-0 flex items-center justify-center">
        <span className={`text-xs font-semibold ${
          isSelected ? 'text-foreground' : 'text-muted-foreground'
        }`}>
          {dayLetter}
        </span>
      </div>
      {/* Today indicator - small dot at top */}
      {isToday && (
        <div className="absolute -top-0.5 left-1/2 -translate-x-1/2 w-1 h-1 bg-gray-800 dark:bg-white rounded-full" />
      )}
    </div>
  );
}

export default function ClientProfilePage() {
  const params = useParams();
  const router = useRouter();
  const clientId = params.id as string;
  
  const [selectedDate, setSelectedDate] = useState<Date>(() => {
    // Use a stable initial date (start of today to avoid hydration issues)
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), now.getDate());
  });
  const [activeTab, setActiveTab] = useState("overview");
  
  // Calculate week start (Monday) for the selected date
  const weekStart = startOfWeek(selectedDate, { weekStartsOn: 1 });

  const { data: client, isLoading, refetch } = trpc.client.getById.useQuery({ id: clientId });
  const { data: weightHistory } = trpc.client.getWeightHistory.useQuery({ clientId, days: 90 });
  const { data: dailyLog } = trpc.client.getDailyLog.useQuery({ 
    clientId, 
    date: selectedDate 
  });
  const { data: weekLogs } = trpc.client.getWeekLogs.useQuery({
    clientId,
    weekStart,
  });

  // Generate week days array
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  // Get calorie progress for a specific day
  const getCalorieProgress = (date: Date) => {
    if (!weekLogs?.logs || !weekLogs.targetCalories) return 0;
    const log = weekLogs.logs.find(l => isSameDay(new Date(l.date), date));
    if (!log?.totalCalories) return 0;
    return Math.round((log.totalCalories / weekLogs.targetCalories) * 100);
  };

  // Navigate weeks
  const goToPreviousWeek = () => {
    setSelectedDate(prev => addDays(prev, -7));
  };

  const goToNextWeek = () => {
    setSelectedDate(prev => addDays(prev, 7));
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
          <Button variant="outline" onClick={() => openQuickChatWithClient(clientId)}>
            <MessageSquare className="mr-2 h-4 w-4" />
            Message
          </Button>
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
                <div>
                  <p className="text-muted-foreground">Current Weight</p>
                  <p className="font-medium">{client.currentWeight ? `${client.currentWeight} kg` : "N/A"}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Logged Meals (7d)</p>
                  <p className="font-medium">{weekLogs?.logs?.length || 0} days</p>
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
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="nutrition">Nutrition</TabsTrigger>
              <TabsTrigger value="exercise">Exercise</TabsTrigger>
              <TabsTrigger value="content">Content</TabsTrigger>
            </TabsList>

            {/* Week Calendar with Calorie Rings - Shared across all tabs */}
            <Card className="mt-4">
              <CardContent className="py-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">{format(weekStart, "MMMM yyyy")}</span>
                  <div className="flex items-center gap-0.5">
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={goToPreviousWeek}>
                      <ChevronLeft className="h-3.5 w-3.5" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="text-xs h-7 px-2"
                      onClick={() => setSelectedDate(new Date())}
                    >
                      Today
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={goToNextWeek}>
                      <ChevronRight className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  {weekDays.map((day) => {
                    const progress = getCalorieProgress(day);
                    const isSelectedDay = isSameDay(day, selectedDate);
                    const isTodayDay = isToday(day);
                    const dayLetter = format(day, "EEEEE"); // Single letter (M, T, W, etc.)
                    const dayNum = format(day, "d");
                    
                    return (
                      <button
                        key={day.toISOString()}
                        onClick={() => setSelectedDate(day)}
                        className="flex flex-col items-center gap-1 group"
                      >
                        <div className={`p-1 rounded-xl transition-all ${
                          isSelectedDay 
                            ? 'bg-white dark:bg-gray-800 shadow-md ring-1 ring-gray-200 dark:ring-gray-700' 
                            : 'group-hover:bg-muted/50'
                        }`}>
                          <CalorieRing 
                            progress={progress} 
                            dayLetter={dayLetter}
                            size={40}
                            isSelected={isSelectedDay}
                            isToday={isTodayDay}
                          />
                        </div>
                        <span className={`text-xs font-semibold ${
                          isSelectedDay ? 'text-foreground' : 'text-muted-foreground'
                        }`}>
                          {dayNum}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            <TabsContent value="overview" className="space-y-6 mt-6">
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
                        <span className="text-sm text-muted-foreground flex items-center gap-1.5">
                          🔥 Calories
                        </span>
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
                        <span className="text-sm text-muted-foreground flex items-center gap-1.5">
                          🥩 Protein
                        </span>
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
                        <span className="text-sm text-muted-foreground flex items-center gap-1.5">
                          🌾 Carbs
                        </span>
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
                        <span className="text-sm text-muted-foreground flex items-center gap-1.5">
                          🥑 Fats
                        </span>
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

                  <Separator className="my-4" />

                  {/* Additional Nutrients */}
                  <div className="space-y-1">
                    <h4 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
                      <UtensilsCrossed className="h-4 w-4" />
                      Additional Nutrients
                    </h4>
                    
                    <RangeProgressBar
                      value={dailyLog?.totalFiber || 0}
                      min={nutrientTargets.fiber.min}
                      label={nutrientTargets.fiber.label}
                      unit={nutrientTargets.fiber.unit}
                    />
                    
                    <RangeProgressBar
                      value={dailyLog?.totalUnsaturatedFat || 0}
                      min={nutrientTargets.unsaturatedFat.min}
                      label={nutrientTargets.unsaturatedFat.label}
                      unit={nutrientTargets.unsaturatedFat.unit}
                    />
                    
                    <RangeProgressBar
                      value={dailyLog?.totalSaturatedFat || 0}
                      max={nutrientTargets.saturatedFat.max}
                      label={nutrientTargets.saturatedFat.label}
                      unit={nutrientTargets.saturatedFat.unit}
                    />
                    
                    <RangeProgressBar
                      value={dailyLog?.totalSugars || 0}
                      max={nutrientTargets.sugars.max}
                      label={nutrientTargets.sugars.label}
                      unit={nutrientTargets.sugars.unit}
                    />
                    
                    <RangeProgressBar
                      value={(dailyLog?.totalSodium || 0) / 1000}
                      min={nutrientTargets.sodium.min}
                      max={nutrientTargets.sodium.max}
                      label={nutrientTargets.sodium.label}
                      unit={nutrientTargets.sodium.unit}
                    />
                    
                    <RangeProgressBar
                      value={(dailyLog?.totalCaffeine || 0) / 1000}
                      max={nutrientTargets.caffeine.max}
                      label={nutrientTargets.caffeine.label}
                      unit={nutrientTargets.caffeine.unit}
                    />
                    
                    <RangeProgressBar
                      value={dailyLog?.totalAlcohol || 0}
                      max={nutrientTargets.alcohol.max}
                      label={nutrientTargets.alcohol.label}
                      unit={nutrientTargets.alcohol.unit}
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Meals Summary - Quick Preview */}
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">Meals Summary</CardTitle>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="text-xs text-muted-foreground hover:text-foreground"
                      onClick={() => setActiveTab("nutrition")}
                    >
                      View details →
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2">
                  {dailyLog ? (
                    <>
                      {[
                        { key: "breakfast", label: "Breakfast", emoji: "🍳", data: dailyLog.breakfast },
                        { key: "lunch", label: "Lunch", emoji: "🍝", data: dailyLog.lunch },
                        { key: "dinner", label: "Dinner", emoji: "🍽️", data: dailyLog.dinner },
                        { key: "snacks", label: "Snacks", emoji: "🍎", data: dailyLog.snacks },
                      ].map((meal) => {
                        const mealData = meal.data as { healthScore?: number; foods?: Array<unknown> } | Array<unknown> | null;
                        const foods = (Array.isArray(mealData) 
                          ? mealData 
                          : (mealData?.foods || [])
                        ) as Array<{ calories: number; protein: number; carbs: number; fats: number }>;
                        const healthScore = !Array.isArray(mealData) && mealData?.healthScore ? mealData.healthScore : null;
                        
                        const totalCalories = foods.reduce((sum, f) => sum + (f.calories || 0), 0);
                        const totalProtein = foods.reduce((sum, f) => sum + (f.protein || 0), 0);
                        const totalCarbs = foods.reduce((sum, f) => sum + (f.carbs || 0), 0);
                        const totalFats = foods.reduce((sum, f) => sum + (f.fats || 0), 0);
                        const hasFoods = foods.length > 0;
                        
                        const getScoreLabel = (score: number) => {
                          if (score >= 9) return { label: "Excellent", color: "text-green-600" };
                          if (score >= 7) return { label: "Great", color: "text-green-500" };
                          if (score >= 5) return { label: "Good", color: "text-yellow-500" };
                          if (score >= 3) return { label: "Fair", color: "text-orange-500" };
                          return { label: "Poor", color: "text-red-500" };
                        };

                        return (
                          <button
                            key={meal.key}
                            onClick={() => setActiveTab("nutrition")}
                            className="w-full flex items-center justify-between p-3 rounded-xl bg-muted/30 border hover:bg-muted/50 transition-colors text-left"
                          >
                            <div className="flex items-center gap-3">
                              <span className="text-lg">{meal.emoji}</span>
                              <span className="font-medium">{meal.label}</span>
                              {healthScore && hasFoods && (
                                <div className="flex items-center gap-1.5">
                                  <div className="relative h-7 w-7">
                                    <svg className="h-7 w-7 transform -rotate-90">
                                      <circle cx="14" cy="14" r="11" fill="none" strokeWidth="2.5" className="stroke-gray-200 dark:stroke-gray-700" />
                                      <circle
                                        cx="14" cy="14" r="11" fill="none" strokeWidth="2.5"
                                        strokeDasharray={`${(healthScore / 10) * 69.1} 69.1`}
                                        strokeLinecap="round"
                                        className={healthScore >= 7 ? "stroke-green-500" : healthScore >= 5 ? "stroke-yellow-500" : "stroke-red-500"}
                                      />
                                    </svg>
                                    <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold">
                                      {healthScore}
                                    </span>
                                  </div>
                                  <span className={`text-xs font-medium ${getScoreLabel(healthScore).color}`}>
                                    {getScoreLabel(healthScore).label}
                                  </span>
                                </div>
                              )}
                            </div>
                            <div className="flex items-center gap-4">
                              {hasFoods ? (
                                <>
                                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                                    <span>🥩 {Math.round(totalProtein)}g</span>
                                    <span>🌾 {Math.round(totalCarbs)}g</span>
                                    <span>🥑 {Math.round(totalFats)}g</span>
                                  </div>
                                  <Badge variant="secondary" className="font-medium text-xs">
                                    {totalCalories} kcal
                                  </Badge>
                                </>
                              ) : (
                                <span className="text-xs text-muted-foreground">No foods logged</span>
                              )}
                            </div>
                          </button>
                        );
                      })}
                    </>
                  ) : (
                    <div className="text-center py-6 text-muted-foreground">
                      <p>No meal data for this date</p>
                    </div>
                  )}
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
                      {/* Fiber - minimum target */}
                      {(() => {
                        const value = dailyLog.totalFiber || 0;
                        const target = nutrientTargets.fiber.min;
                        const isGood = value >= target;
                        return (
                          <div className={`p-4 rounded-xl border ${isGood ? 'bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-900' : 'bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-900'}`}>
                            <div className="flex items-center justify-between mb-1">
                              <p className="text-sm text-muted-foreground">Fiber</p>
                              <Badge variant={isGood ? "default" : "destructive"} className="text-xs">
                                {isGood ? "Good" : "Low"}
                              </Badge>
                            </div>
                            <p className="text-2xl font-bold">{value}g</p>
                            <p className="text-xs text-muted-foreground mt-1">Target: {target}g minimum</p>
                          </div>
                        );
                      })()}
                      
                      {/* Saturated Fat - maximum target */}
                      {(() => {
                        const value = dailyLog.totalSaturatedFat || 0;
                        const target = nutrientTargets.saturatedFat.max;
                        const isGood = value <= target;
                        return (
                          <div className={`p-4 rounded-xl border ${isGood ? 'bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-900' : 'bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-900'}`}>
                            <div className="flex items-center justify-between mb-1">
                              <p className="text-sm text-muted-foreground">Saturated Fat</p>
                              <Badge variant={isGood ? "default" : "destructive"} className="text-xs">
                                {isGood ? "Good" : "High"}
                              </Badge>
                            </div>
                            <p className="text-2xl font-bold">{value}g</p>
                            <p className="text-xs text-muted-foreground mt-1">Target: {target}g maximum</p>
                          </div>
                        );
                      })()}
                      
                      {/* Unsaturated Fat - minimum target */}
                      {(() => {
                        const value = dailyLog.totalUnsaturatedFat || 0;
                        const target = nutrientTargets.unsaturatedFat.min;
                        const isGood = value >= target;
                        return (
                          <div className={`p-4 rounded-xl border ${isGood ? 'bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-900' : 'bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-900'}`}>
                            <div className="flex items-center justify-between mb-1">
                              <p className="text-sm text-muted-foreground">Unsaturated Fat</p>
                              <Badge variant={isGood ? "default" : "destructive"} className="text-xs">
                                {isGood ? "Good" : "Low"}
                              </Badge>
                            </div>
                            <p className="text-2xl font-bold">{value}g</p>
                            <p className="text-xs text-muted-foreground mt-1">Target: {target}g minimum</p>
                          </div>
                        );
                      })()}
                      
                      {/* Sugars - maximum target */}
                      {(() => {
                        const value = dailyLog.totalSugars || 0;
                        const target = nutrientTargets.sugars.max;
                        const isGood = value <= target;
                        return (
                          <div className={`p-4 rounded-xl border ${isGood ? 'bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-900' : 'bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-900'}`}>
                            <div className="flex items-center justify-between mb-1">
                              <p className="text-sm text-muted-foreground">Sugars</p>
                              <Badge variant={isGood ? "default" : "destructive"} className="text-xs">
                                {isGood ? "Good" : "High"}
                              </Badge>
                            </div>
                            <p className="text-2xl font-bold">{value}g</p>
                            <p className="text-xs text-muted-foreground mt-1">Target: {target}g maximum</p>
                          </div>
                        );
                      })()}
                      
                      {/* Sodium - range target */}
                      {(() => {
                        const valueMg = dailyLog.totalSodium || 0;
                        const valueG = valueMg / 1000;
                        const minTarget = nutrientTargets.sodium.min;
                        const maxTarget = nutrientTargets.sodium.max;
                        const isGood = valueG >= minTarget && valueG <= maxTarget;
                        const isLow = valueG < minTarget;
                        return (
                          <div className={`p-4 rounded-xl border ${isGood ? 'bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-900' : 'bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-900'}`}>
                            <div className="flex items-center justify-between mb-1">
                              <p className="text-sm text-muted-foreground">Sodium</p>
                              <Badge variant={isGood ? "default" : "destructive"} className="text-xs">
                                {isGood ? "Good" : isLow ? "Low" : "High"}
                              </Badge>
                            </div>
                            <p className="text-2xl font-bold">{valueMg}mg</p>
                            <p className="text-xs text-muted-foreground mt-1">Target: {minTarget * 1000}-{maxTarget * 1000}mg</p>
                          </div>
                        );
                      })()}
                      
                      {/* Caffeine - maximum target */}
                      {(() => {
                        const valueMg = dailyLog.totalCaffeine || 0;
                        const valueG = valueMg / 1000;
                        const target = nutrientTargets.caffeine.max;
                        const isGood = valueG <= target;
                        return (
                          <div className={`p-4 rounded-xl border ${isGood ? 'bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-900' : 'bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-900'}`}>
                            <div className="flex items-center justify-between mb-1">
                              <p className="text-sm text-muted-foreground">Caffeine</p>
                              <Badge variant={isGood ? "default" : "destructive"} className="text-xs">
                                {isGood ? "Good" : "High"}
                              </Badge>
                            </div>
                            <p className="text-2xl font-bold">{valueMg}mg</p>
                            <p className="text-xs text-muted-foreground mt-1">Target: {target * 1000}mg maximum</p>
                          </div>
                        );
                      })()}
                      
                      {/* Alcohol - maximum target (always show) */}
                      {(() => {
                        const value = dailyLog.totalAlcohol || 0;
                        const target = nutrientTargets.alcohol.max;
                        const isGood = value <= target;
                        return (
                          <div className={`p-4 rounded-xl border ${value === 0 ? 'bg-muted border-transparent' : isGood ? 'bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-900' : 'bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-900'}`}>
                            <div className="flex items-center justify-between mb-1">
                              <p className="text-sm text-muted-foreground">Alcohol</p>
                              {value > 0 && (
                                <Badge variant={isGood ? "secondary" : "destructive"} className="text-xs">
                                  {isGood ? "Moderate" : "High"}
                                </Badge>
                              )}
                            </div>
                            <p className="text-2xl font-bold">{value}g</p>
                            <p className="text-xs text-muted-foreground mt-1">Target: {target}g maximum</p>
                          </div>
                        );
                      })()}
                    </div>
                  ) : (
                    <p className="text-muted-foreground text-center py-8">
                      No nutrition data for this date
                    </p>
                  )}
                </CardContent>
              </Card>

              {/* Meal Log - App Style */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Meal Log</CardTitle>
                  <CardDescription>
                    Food logged for {format(selectedDate, "MMMM d")}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {dailyLog ? (
                    <>
                      {[
                        { key: "breakfast", label: "Breakfast", emoji: "🍳", data: dailyLog.breakfast },
                        { key: "lunch", label: "Lunch", emoji: "🍝", data: dailyLog.lunch },
                        { key: "dinner", label: "Dinner", emoji: "🍽️", data: dailyLog.dinner },
                        { key: "snacks", label: "Snacks", emoji: "🍎", data: dailyLog.snacks },
                      ].map((meal) => {
                        // Support both old array format and new object format with healthScore
                        const mealData = meal.data as { healthScore?: number; foods?: Array<unknown> } | Array<unknown> | null;
                        const foods = (Array.isArray(mealData) 
                          ? mealData 
                          : (mealData?.foods || [])
                        ) as Array<{
                          name: string;
                          calories: number;
                          protein: number;
                          carbs: number;
                          fats: number;
                          weight?: number;
                          ingredients?: Array<{
                            name: string;
                            calories: number;
                            protein: number;
                            carbs: number;
                            fats: number;
                            weight: number;
                          }>;
                        }>;
                        const healthScore = !Array.isArray(mealData) && mealData?.healthScore ? mealData.healthScore : null;
                        
                        const totalCalories = foods.reduce((sum, f) => sum + (f.calories || 0), 0);
                        const totalProtein = foods.reduce((sum, f) => sum + (f.protein || 0), 0);
                        const totalCarbs = foods.reduce((sum, f) => sum + (f.carbs || 0), 0);
                        const totalFats = foods.reduce((sum, f) => sum + (f.fats || 0), 0);
                        const hasFoods = foods.length > 0;
                        
                        // Health score label
                        const getScoreLabel = (score: number) => {
                          if (score >= 9) return { label: "Excellent", color: "text-green-600" };
                          if (score >= 7) return { label: "Great", color: "text-green-500" };
                          if (score >= 5) return { label: "Good", color: "text-yellow-500" };
                          if (score >= 3) return { label: "Fair", color: "text-orange-500" };
                          return { label: "Poor", color: "text-red-500" };
                        };

                        return (
                          <div key={meal.key} className="rounded-2xl bg-muted/30 border overflow-hidden">
                            {/* Meal Header */}
                            <div className="p-4">
                              <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-3">
                                  <h4 className="font-semibold text-base">{meal.label}</h4>
                                  {/* Health Score Indicator */}
                                  {healthScore && hasFoods && (
                                    <div className="flex items-center gap-2">
                                      <div className="relative h-10 w-10">
                                        <svg className="h-10 w-10 transform -rotate-90">
                                          <circle
                                            cx="20"
                                            cy="20"
                                            r="16"
                                            fill="none"
                                            strokeWidth="3"
                                            className="stroke-gray-200 dark:stroke-gray-700"
                                          />
                                          <circle
                                            cx="20"
                                            cy="20"
                                            r="16"
                                            fill="none"
                                            strokeWidth="3"
                                            strokeDasharray={`${(healthScore / 10) * 100.5} 100.5`}
                                            strokeLinecap="round"
                                            className={healthScore >= 7 ? "stroke-green-500" : healthScore >= 5 ? "stroke-yellow-500" : "stroke-red-500"}
                                          />
                                        </svg>
                                        <span className="absolute inset-0 flex items-center justify-center text-xs font-bold">
                                          {healthScore}
                                        </span>
                                      </div>
                                      <span className={`text-xs font-medium ${getScoreLabel(healthScore).color}`}>
                                        {getScoreLabel(healthScore).label}
                                      </span>
                                    </div>
                                  )}
                                </div>
                                {hasFoods && (
                                  <Badge variant="secondary" className="font-medium">
                                    {totalCalories} kcal 🔥
                                  </Badge>
                                )}
                              </div>
                              
                              {hasFoods && (
                                <div className="flex items-center gap-4 text-sm">
                                  <span className="flex items-center gap-1">
                                    <span>🥩</span>
                                    <span className="font-medium">{Math.round(totalProtein)}g</span>
                                  </span>
                                  <span className="flex items-center gap-1">
                                    <span>🌾</span>
                                    <span className="font-medium">{Math.round(totalCarbs)}g</span>
                                  </span>
                                  <span className="flex items-center gap-1">
                                    <span>🥑</span>
                                    <span className="font-medium">{Math.round(totalFats)}g</span>
                                  </span>
                                </div>
                              )}
                            </div>

                            {/* Food Items */}
                            {hasFoods ? (
                              <div className="border-t bg-background">
                                {foods.map((food, foodIndex) => (
                                  <Collapsible key={`${meal.key}-${foodIndex}-${food.name}`}>
                                    <CollapsibleTrigger asChild>
                                      <button 
                                        type="button" 
                                        className="w-full flex items-center gap-3 p-3 hover:bg-muted/50 transition-colors text-left"
                                      >
                                        {/* Food Icon/Image Placeholder */}
                                        <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-amber-100 to-orange-100 dark:from-amber-900/30 dark:to-orange-900/30 flex items-center justify-center text-xl flex-shrink-0">
                                          {meal.emoji}
                                        </div>
                                        
                                        {/* Food Details */}
                                        <div className="flex-1 min-w-0">
                                          <p className="font-medium truncate">{food.name}</p>
                                          <p className="text-sm text-muted-foreground">
                                            {food.weight ? `${food.weight}g • ` : ''}{food.calories} kcal
                                          </p>
                                          <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                                            <span>🥩 {Math.round(food.protein)}g</span>
                                            <span>🌾 {Math.round(food.carbs)}g</span>
                                            <span>🥑 {Math.round(food.fats)}g</span>
                                          </div>
                                        </div>
                                        
                                        {/* Expand indicator */}
                                        {food.ingredients && food.ingredients.length > 0 && (
                                          <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                                        )}
                                      </button>
                                    </CollapsibleTrigger>
                                    
                                    {/* Ingredients (expanded) */}
                                    {food.ingredients && food.ingredients.length > 0 && (
                                      <CollapsibleContent>
                                        <div className="px-3 pb-3 pl-[72px] space-y-2">
                                          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                                            Ingredients
                                          </p>
                                          {food.ingredients.map((ing, ingIndex) => (
                                            <div 
                                              key={ingIndex}
                                              className="flex items-center gap-3 p-2 rounded-lg bg-muted/50"
                                            >
                                              <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-green-100 to-emerald-100 dark:from-green-900/30 dark:to-emerald-900/30 flex items-center justify-center text-sm">
                                                🥗
                                              </div>
                                              <div className="flex-1 min-w-0">
                                                <p className="text-sm font-medium truncate">{ing.name}</p>
                                                <p className="text-xs text-muted-foreground">
                                                  {ing.calories} kcal • {ing.weight}g
                                                </p>
                                              </div>
                                              <div className="text-xs text-muted-foreground text-right">
                                                <span>🥩 {Math.round(ing.protein)}g</span>
                                                <span className="mx-1">•</span>
                                                <span>🌾 {Math.round(ing.carbs)}g</span>
                                                <span className="mx-1">•</span>
                                                <span>🥑 {Math.round(ing.fats)}g</span>
                                              </div>
                                            </div>
                                          ))}
                                        </div>
                                      </CollapsibleContent>
                                    )}
                                  </Collapsible>
                                ))}
                              </div>
                            ) : (
                              <div className="border-t bg-background p-4">
                                <p className="text-sm text-muted-foreground text-center">
                                  No {meal.label.toLowerCase()} logged
                                </p>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </>
                  ) : (
                    <div className="text-center py-12">
                      <UtensilsCrossed className="h-12 w-12 mx-auto text-muted-foreground/30 mb-3" />
                      <p className="text-muted-foreground">No meals logged for this date</p>
                    </div>
                  )}
                </CardContent>
              </Card>

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
