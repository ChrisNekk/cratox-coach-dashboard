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
  Tooltip as UITooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
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
  ChevronDown,
  Table2,
  Check,
  X,
  HelpCircle,
  Sparkles,
  Send,
  Loader2,
  Bookmark,
  Trash2,
  Bell,
} from "lucide-react";
import { format, subDays, startOfWeek, addDays, isSameDay, isToday, subWeeks, startOfMonth, endOfMonth, eachDayOfInterval } from "date-fns";
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
const ReferenceLine = dynamic(() => import("recharts").then((mod) => mod.ReferenceLine), { ssr: false });

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
  const [expandedMeals, setExpandedMeals] = useState<Record<string, boolean>>({});
  const [goalsSummaryView, setGoalsSummaryView] = useState<"table" | "ai">("table");
  const [aiQuestion, setAiQuestion] = useState("");
  const [aiResponse, setAiResponse] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [weightChartRange, setWeightChartRange] = useState<"1m" | "3m" | "6m" | "1y">("3m");
  const [goalsSummaryWeekStart, setGoalsSummaryWeekStart] = useState<Date>(() => {
    const now = new Date();
    return startOfWeek(new Date(now.getFullYear(), now.getMonth(), now.getDate()), { weekStartsOn: 1 });
  });

  // Goals summary navigation
  const goToPreviousGoalsWeek = () => {
    setGoalsSummaryWeekStart(prev => subWeeks(prev, 1));
  };
  
  const goToNextGoalsWeek = () => {
    setGoalsSummaryWeekStart(prev => addDays(prev, 7));
  };
  
  const goToCurrentGoalsWeek = () => {
    const now = new Date();
    setGoalsSummaryWeekStart(startOfWeek(new Date(now.getFullYear(), now.getMonth(), now.getDate()), { weekStartsOn: 1 }));
  };

  // Toggle meal expansion
  const toggleMealExpanded = (mealKey: string) => {
    setExpandedMeals(prev => ({ ...prev, [mealKey]: !prev[mealKey] }));
  };
  
  // Calculate week start (Monday) for the selected date
  const weekStart = startOfWeek(selectedDate, { weekStartsOn: 1 });

  const { data: client, isLoading, refetch } = trpc.client.getById.useQuery({ id: clientId });
  const { data: weightHistory } = trpc.client.getWeightHistory.useQuery({ clientId, days: 365 });
  const { data: dailyLog } = trpc.client.getDailyLog.useQuery({ 
    clientId, 
    date: selectedDate 
  });
  const { data: weekLogs } = trpc.client.getWeekLogs.useQuery({
    clientId,
    weekStart,
  });
  
  // Separate query for goals summary (can be different week)
  const { data: goalsSummaryLogs } = trpc.client.getWeekLogs.useQuery({
    clientId,
    weekStart: goalsSummaryWeekStart,
  });

  // Saved notes queries
  const { data: savedNotes = [], refetch: refetchNotes } = trpc.client.getSavedNotes.useQuery({ clientId });
  const createNoteMutation = trpc.client.createSavedNote.useMutation({
    onSuccess: () => {
      refetchNotes();
      toast.success("Note saved successfully!");
    },
    onError: (error) => {
      toast.error(`Failed to save note: ${error.message}`);
    },
  });
  const deleteNoteMutation = trpc.client.deleteSavedNote.useMutation({
    onSuccess: () => {
      refetchNotes();
      toast.success("Note deleted");
    },
    onError: (error) => {
      toast.error(`Failed to delete note: ${error.message}`);
    },
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

  // Prepare chart data with intervals based on selected range
  const weightChartData = (() => {
    if (!weightHistory || weightHistory.length === 0) return [];
    
    // Determine number of intervals and interval type based on range
    const rangeConfig = {
      "1m": { weeks: 4, intervalDays: 7, dateFormat: "MMM d" },      // 4 weeks, weekly
      "3m": { weeks: 12, intervalDays: 7, dateFormat: "MMM d" },     // 12 weeks, weekly
      "6m": { weeks: 26, intervalDays: 14, dateFormat: "MMM d" },    // 26 weeks, bi-weekly
      "1y": { weeks: 52, intervalDays: 28, dateFormat: "MMM" },      // 52 weeks, monthly
    };
    
    const config = rangeConfig[weightChartRange];
    const totalDays = config.weeks * 7;
    const numIntervals = Math.ceil(totalDays / config.intervalDays);
    
    // Create a map of actual logged weights
    const loggedWeights = new Map<string, { weight: number; date: Date }>();
    weightHistory.forEach(log => {
      const logDate = new Date(log.date);
      // Group by interval period
      const daysSinceStart = Math.floor((Date.now() - logDate.getTime()) / (1000 * 60 * 60 * 24));
      const intervalIndex = Math.floor(daysSinceStart / config.intervalDays);
      const intervalKey = `interval-${intervalIndex}`;
      
      // Keep the most recent log for each interval
      if (!loggedWeights.has(intervalKey) || logDate > loggedWeights.get(intervalKey)!.date) {
        loggedWeights.set(intervalKey, { weight: log.weight, date: logDate });
      }
    });
    
    // Generate data points for each interval
    const data: Array<{ date: string; weight: number; logged: boolean; fullDate: Date }> = [];
    let lastKnownWeight = weightHistory[0]?.weight || client.startWeight || 80;
    
    for (let i = numIntervals - 1; i >= 0; i--) {
      const intervalDate = subDays(new Date(), i * config.intervalDays);
      const intervalKey = `interval-${i}`;
      const loggedData = loggedWeights.get(intervalKey);
      
      if (loggedData) {
        lastKnownWeight = loggedData.weight;
        data.push({
          date: format(loggedData.date, config.dateFormat),
          weight: loggedData.weight,
          logged: true,
          fullDate: loggedData.date,
        });
      } else {
        // No log this interval - use last known weight with "not logged" indicator
        data.push({
          date: format(intervalDate, config.dateFormat),
          weight: lastKnownWeight,
          logged: false,
          fullDate: intervalDate,
        });
      }
    }
    
    return data;
  })();

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
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Scale className="h-4 w-4" />
                  Weight Progress
                </CardTitle>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs gap-1.5"
                  onClick={() => {
                    toast.success(`Weigh-in reminder sent to ${client.name}!`);
                  }}
                >
                  <Bell className="h-3 w-3" />
                  Request Weigh-in
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Stats Row */}
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-4">
                  <div>
                    <span className="text-muted-foreground">Start: </span>
                    <span className="font-medium">{client.startWeight || "—"} kg</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Current: </span>
                    <span className="font-semibold text-primary">{client.currentWeight || "—"} kg</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Target: </span>
                    <span className="font-medium text-green-600">{client.targetWeight || "—"} kg</span>
                  </div>
                </div>
                {progressPercentage !== null && progressPercentage > 0 && progressPercentage !== Infinity && (
                  <Badge variant={progressPercentage >= 100 ? "default" : "secondary"}>
                    {progressPercentage}% to goal
                  </Badge>
                )}
              </div>

              {/* Time Range Selector */}
              <div className="flex items-center justify-between">
                <div className="flex items-center rounded-lg border p-0.5 bg-muted/30">
                  {[
                    { value: "1m", label: "1M" },
                    { value: "3m", label: "3M" },
                    { value: "6m", label: "6M" },
                    { value: "1y", label: "1Y" },
                  ].map((option) => (
                    <button
                      key={option.value}
                      onClick={() => setWeightChartRange(option.value as typeof weightChartRange)}
                      className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
                        weightChartRange === option.value
                          ? "bg-background text-foreground shadow-sm"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
                <span className="text-[10px] text-muted-foreground">
                  {weightChartRange === "1m" && "Last month (weekly)"}
                  {weightChartRange === "3m" && "Last 3 months (weekly)"}
                  {weightChartRange === "6m" && "Last 6 months (bi-weekly)"}
                  {weightChartRange === "1y" && "Last year (monthly)"}
                </span>
              </div>

              {/* Weight Chart */}
              {weightChartData.length > 0 ? (
                <div className="h-[150px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={weightChartData}>
                      <defs>
                        <linearGradient id="colorWeightSidebar" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis 
                        dataKey="date" 
                        className="text-[10px]" 
                        tick={{ fontSize: 10 }}
                        interval={0}
                        angle={-45}
                        textAnchor="end"
                        height={40}
                      />
                      <YAxis 
                        domain={['dataMin - 2', 'dataMax + 2']} 
                        className="text-[10px]"
                        tick={{ fontSize: 10 }}
                        width={35}
                      />
                      <Tooltip 
                        content={({ active, payload }) => {
                          if (active && payload && payload.length) {
                            const data = payload[0].payload;
                            return (
                              <div className="bg-background border rounded-lg shadow-lg p-2 text-xs">
                                <p className="font-medium">{data.date}</p>
                                <p className="text-primary">{data.weight} kg</p>
                                {!data.logged && (
                                  <p className="text-amber-600 text-[10px] mt-1">Not logged (estimated)</p>
                                )}
                              </div>
                            );
                          }
                          return null;
                        }}
                      />
                      {client.targetWeight && (
                        <ReferenceLine 
                          y={client.targetWeight} 
                          stroke="#22c55e" 
                          strokeDasharray="5 5"
                          label={{ 
                            value: 'Target', 
                            position: 'right', 
                            fontSize: 10,
                            fill: '#22c55e'
                          }}
                        />
                      )}
                      <Area
                        type="monotone"
                        dataKey="weight"
                        stroke="hsl(var(--primary))"
                        strokeWidth={2}
                        fillOpacity={1}
                        fill="url(#colorWeightSidebar)"
                        dot={(props) => {
                          const { cx, cy, payload } = props as { cx?: number; cy?: number; payload?: { logged: boolean } };
                          if (cx === undefined || cy === undefined || !payload) return null;
                          if (payload.logged) {
                            // Solid dot for logged weights
                            return (
                              <circle
                                key={`dot-${cx}-${cy}`}
                                cx={cx}
                                cy={cy}
                                r={4}
                                fill="hsl(var(--primary))"
                                stroke="white"
                                strokeWidth={2}
                              />
                            );
                          } else {
                            // Hollow dot with dashed border for not logged
                            return (
                              <circle
                                key={`dot-${cx}-${cy}`}
                                cx={cx}
                                cy={cy}
                                r={4}
                                fill="white"
                                stroke="#f59e0b"
                                strokeWidth={2}
                                strokeDasharray="2 2"
                              />
                            );
                          }
                        }}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="h-[150px] flex flex-col items-center justify-center text-muted-foreground border rounded-lg border-dashed">
                  <Scale className="h-8 w-8 mb-2 opacity-30" />
                  <p className="text-sm">No weight history yet</p>
                  <p className="text-xs">Weight logged at onboarding only</p>
                </div>
              )}

              {/* Legend */}
              {weightChartData.length > 0 && weightChartData.some(d => !d.logged) && (
                <div className="flex items-center gap-4 text-[10px] text-muted-foreground">
                  <div className="flex items-center gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-full bg-primary border-2 border-white shadow-sm" />
                    <span>Logged</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-full bg-white border-2 border-amber-500 border-dashed" />
                    <span>Not logged (estimated)</span>
                  </div>
                </div>
              )}

              {/* Last weigh-in info */}
              <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t">
                <span>
                  {client.lastWeighInDate ? (
                    <>Last weigh-in: {format(new Date(client.lastWeighInDate), "MMM d, yyyy")}</>
                  ) : (
                    <>No weigh-in recorded</>
                  )}
                </span>
                {client.lastWeighInDate && (
                  <span>
                    {(() => {
                      const daysSince = Math.floor((Date.now() - new Date(client.lastWeighInDate).getTime()) / (1000 * 60 * 60 * 24));
                      if (daysSince === 0) return "Today";
                      if (daysSince === 1) return "Yesterday";
                      if (daysSince > 14) return <span className="text-amber-600">{daysSince} days ago</span>;
                      return `${daysSince} days ago`;
                    })()}
                  </span>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Saved Notes */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Bookmark className="h-4 w-4" />
                Saved Notes
                {savedNotes.length > 0 && (
                  <Badge variant="secondary" className="ml-auto text-xs">
                    {savedNotes.length}
                  </Badge>
                )}
              </CardTitle>
              <CardDescription className="text-xs">
                AI insights saved for this client
              </CardDescription>
            </CardHeader>
            <CardContent>
              {savedNotes.length === 0 ? (
                <div className="text-center py-6 text-muted-foreground">
                  <Bookmark className="h-8 w-8 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">No saved notes yet</p>
                  <p className="text-xs mt-1">
                    Use the AI Analytics to generate insights, then save them here.
                  </p>
                </div>
              ) : (
                <div className="space-y-3 max-h-[300px] overflow-y-auto">
                  {savedNotes.map((note) => (
                    <div key={note.id} className="rounded-lg border p-3 space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Sparkles className="h-3 w-3" />
                          <span>{format(new Date(note.createdAt), "MMM d, yyyy 'at' h:mm a")}</span>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 text-muted-foreground hover:text-destructive"
                          disabled={deleteNoteMutation.isPending}
                          onClick={() => {
                            deleteNoteMutation.mutate({ noteId: note.id });
                          }}
                        >
                          {deleteNoteMutation.isPending ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <Trash2 className="h-3 w-3" />
                          )}
                        </Button>
                      </div>
                      <p className="text-xs font-medium text-primary">
                        Q: {note.question}
                      </p>
                      <p className="text-xs text-muted-foreground whitespace-pre-wrap">
                        {note.answer.split('**').map((part, i) => 
                          i % 2 === 1 ? <strong key={i} className="text-foreground">{part}</strong> : part
                        )}
                      </p>
                    </div>
                  ))}
                </div>
              )}
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
                          🥩 Protein <span className="text-primary">({client.proteinPercentage}%)</span>
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
                          🌾 Carbs <span className="text-primary">({client.carbsPercentage}%)</span>
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
                          🥑 Fats <span className="text-primary">({client.fatsPercentage}%)</span>
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
                </CardContent>
              </Card>

              {/* Goals Summary - Table/Graph View */}
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex flex-col gap-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">Goals Summary</CardTitle>
                      <div className="flex items-center gap-2">
                        {/* View Toggle */}
                        <div className="flex items-center rounded-lg border p-1">
                          <button
                            onClick={() => setGoalsSummaryView("table")}
                            className={`p-1.5 rounded-md transition-colors ${
                              goalsSummaryView === "table"
                                ? "bg-primary text-primary-foreground"
                                : "text-muted-foreground hover:text-foreground"
                            }`}
                            title="Table View"
                          >
                            <Table2 className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => setGoalsSummaryView("ai")}
                            className={`p-1.5 rounded-md transition-colors ${
                              goalsSummaryView === "ai"
                                ? "bg-primary text-primary-foreground"
                                : "text-muted-foreground hover:text-foreground"
                            }`}
                            title="AI Analytics"
                          >
                            <Sparkles className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                    
                    {/* Week Navigation */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Button variant="outline" size="icon" className="h-8 w-8" onClick={goToPreviousGoalsWeek}>
                          <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <div className="text-sm font-medium min-w-[200px] text-center">
                          {format(goalsSummaryWeekStart, "MMM d")} - {format(addDays(goalsSummaryWeekStart, 6), "MMM d, yyyy")}
                        </div>
                        <Button variant="outline" size="icon" className="h-8 w-8" onClick={goToNextGoalsWeek}>
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="text-xs h-8"
                          onClick={goToCurrentGoalsWeek}
                        >
                          This Week
                        </Button>
                      </div>
                      
                      {/* Date Picker */}
                      <div className="flex items-center gap-2">
                        <label className="text-xs text-muted-foreground">Jump to:</label>
                        <input
                          type="date"
                          className="h-8 px-2 text-xs border rounded-md bg-background"
                          value={format(goalsSummaryWeekStart, "yyyy-MM-dd")}
                          onChange={(e) => {
                            if (e.target.value) {
                              const selectedDate = new Date(e.target.value);
                              setGoalsSummaryWeekStart(startOfWeek(selectedDate, { weekStartsOn: 1 }));
                            }
                          }}
                        />
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {(() => {
                    // Generate data based on the selected week
                    const periodDays = Array.from({ length: 7 }, (_, i) => addDays(goalsSummaryWeekStart, i));

                    // Get log data for each day from goalsSummaryLogs
                    const getDayData = (date: Date) => {
                      if (!goalsSummaryLogs?.logs) return null;
                      return goalsSummaryLogs.logs.find(l => isSameDay(new Date(l.date), date));
                    };

                    // Calculate if goals were hit for a day
                    const calculateGoalsHit = (log: NonNullable<typeof goalsSummaryLogs>['logs'][0] | null | undefined) => {
                      if (!log || !client) return { hit: false, calories: 0, protein: 0, carbs: 0, fats: 0, caloriesHit: false, proteinHit: false, carbsHit: false, fatsHit: false };
                      
                      const tolerance = 0.1; // 10% tolerance
                      const calories = log.totalCalories ?? 0;
                      const protein = log.totalProtein ?? 0;
                      const carbs = log.totalCarbs ?? 0;
                      const fats = log.totalFats ?? 0;
                      
                      const caloriesHit = client.targetCalories ? calories >= client.targetCalories * (1 - tolerance) && calories <= client.targetCalories * (1 + tolerance) : false;
                      const proteinHit = client.proteinTarget ? protein >= client.proteinTarget * (1 - tolerance) : false;
                      const carbsHit = client.carbsTarget ? carbs >= client.carbsTarget * (1 - tolerance) && carbs <= client.carbsTarget * (1 + tolerance) : false;
                      const fatsHit = client.fatsTarget ? fats >= client.fatsTarget * (1 - tolerance) && fats <= client.fatsTarget * (1 + tolerance) : false;
                      
                      const allHit = caloriesHit && proteinHit && carbsHit && fatsHit;
                      
                      return {
                        hit: allHit,
                        calories,
                        protein,
                        carbs,
                        fats,
                        caloriesHit,
                        proteinHit,
                        carbsHit,
                        fatsHit,
                      };
                    };

                    // Generate data for the week
                    const data = periodDays.map(day => {
                      const log = getDayData(day);
                      const goals = calculateGoalsHit(log);
                      return {
                        date: day,
                        dayName: format(day, "EEE"),
                        dayNum: format(day, "d"),
                        hasData: !!log,
                        ...goals,
                      };
                    });
                    const daysHit = data.filter(d => d.hit).length;
                    const daysWithData = data.filter(d => d.hasData).length;

                    if (goalsSummaryView === "table") {
                      return (
                        <div className="space-y-4">
                          {/* Summary Stats */}
                          <div className="flex items-center gap-4 text-sm">
                            <span className="text-muted-foreground">
                              Goals Hit: <span className="font-semibold text-green-600">{daysHit}</span> / {daysWithData} days logged
                            </span>
                          </div>

                          {/* Table */}
                          <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                              <thead>
                                <tr className="border-b">
                                  <th className="text-left py-2 px-2 font-medium text-muted-foreground">Day</th>
                                  <th className="text-center py-2 px-2 font-medium text-muted-foreground">
                                    <TooltipProvider>
                                      <UITooltip delayDuration={200}>
                                        <TooltipTrigger asChild>
                                          <div className="inline-flex items-center gap-1 cursor-help">
                                            Status
                                            <HelpCircle className="w-3 h-3" />
                                          </div>
                                        </TooltipTrigger>
                                        <TooltipContent side="top" className="max-w-xs">
                                          <p className="font-semibold mb-1">Goal Hit Criteria</p>
                                          <p className="text-xs text-muted-foreground">
                                            A day is marked as "hit" when ALL macros are within 10% of their targets:
                                          </p>
                                          <ul className="text-xs mt-1 space-y-0.5">
                                            <li>• Calories: within ±10%</li>
                                            <li>• Protein: at least 90% of target</li>
                                            <li>• Carbs: within ±10%</li>
                                            <li>• Fats: within ±10%</li>
                                          </ul>
                                        </TooltipContent>
                                      </UITooltip>
                                    </TooltipProvider>
                                  </th>
                                  <th className="text-center py-2 px-2 font-medium text-muted-foreground">🔥 Cal</th>
                                  <th className="text-center py-2 px-2 font-medium text-muted-foreground">🥩 Pro</th>
                                  <th className="text-center py-2 px-2 font-medium text-muted-foreground">🌾 Carb</th>
                                  <th className="text-center py-2 px-2 font-medium text-muted-foreground">🥑 Fat</th>
                                </tr>
                              </thead>
                              <tbody>
                                {data.map((day, idx) => (
                                  <tr key={idx} className={`border-b last:border-0 ${isToday(day.date) ? 'bg-primary/5' : ''}`}>
                                    <td className="py-2 px-2">
                                      <div className="flex items-center gap-2">
                                        <span className="font-medium">{day.dayName}</span>
                                        <span className="text-muted-foreground text-xs">{day.dayNum}</span>
                                        {isToday(day.date) && (
                                          <Badge variant="outline" className="text-[10px] px-1 py-0">Today</Badge>
                                        )}
                                      </div>
                                    </td>
                                    <td className="text-center py-2 px-2">
                                      {day.hasData ? (
                                        day.hit ? (
                                          <div className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-green-100 dark:bg-green-900/30">
                                            <Check className="w-3.5 h-3.5 text-green-600" />
                                          </div>
                                        ) : (
                                          <div className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-red-100 dark:bg-red-900/30">
                                            <X className="w-3.5 h-3.5 text-red-600" />
                                          </div>
                                        )
                                      ) : (
                                        <span className="text-muted-foreground/50">—</span>
                                      )}
                                    </td>
                                    <td className="text-center py-2 px-2">
                                      {day.hasData ? (
                                        <span className={day.caloriesHit ? 'text-green-600' : 'text-muted-foreground'}>
                                          {day.calories}
                                        </span>
                                      ) : (
                                        <span className="text-muted-foreground/50">—</span>
                                      )}
                                    </td>
                                    <td className="text-center py-2 px-2">
                                      {day.hasData ? (
                                        <span className={day.proteinHit ? 'text-green-600' : 'text-muted-foreground'}>
                                          {Math.round(day.protein)}g
                                        </span>
                                      ) : (
                                        <span className="text-muted-foreground/50">—</span>
                                      )}
                                    </td>
                                    <td className="text-center py-2 px-2">
                                      {day.hasData ? (
                                        <span className={day.carbsHit ? 'text-green-600' : 'text-muted-foreground'}>
                                          {Math.round(day.carbs)}g
                                        </span>
                                      ) : (
                                        <span className="text-muted-foreground/50">—</span>
                                      )}
                                    </td>
                                    <td className="text-center py-2 px-2">
                                      {day.hasData ? (
                                        <span className={day.fatsHit ? 'text-green-600' : 'text-muted-foreground'}>
                                          {Math.round(day.fats)}g
                                        </span>
                                      ) : (
                                        <span className="text-muted-foreground/50">—</span>
                                      )}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>

                          {/* Targets Reference */}
                          <div className="flex items-center gap-4 text-xs text-muted-foreground pt-2 border-t">
                            <span>Targets:</span>
                            <span>🔥 {client.targetCalories} kcal</span>
                            <span>🥩 {client.proteinTarget}g</span>
                            <span>🌾 {client.carbsTarget}g</span>
                            <span>🥑 {client.fatsTarget}g</span>
                          </div>
                        </div>
                      );
                    } else {
                      // AI Analytics View
                      const predefinedQuestions = [
                        `How often did ${client.name} hit their calorie goal this month?`,
                        `What's ${client.name}'s average protein intake this week?`,
                        `Which macro does ${client.name} struggle with the most?`,
                        `How has ${client.name}'s weight changed in the last 30 days?`,
                        `What day of the week does ${client.name} perform best?`,
                        `Is ${client.name} on track to meet their goal?`,
                      ];

                      const handleAskQuestion = async (question: string) => {
                        setAiQuestion(question);
                        setAiLoading(true);
                        setAiResponse(null);
                        
                        // Simulate AI response (to be replaced with actual API call)
                        await new Promise(resolve => setTimeout(resolve, 1500));
                        
                        // Mock responses based on question type
                        let mockResponse = "";
                        if (question.toLowerCase().includes("calorie goal")) {
                          mockResponse = `Based on the data for ${client.name}, they hit their calorie goal on **${daysHit} out of ${daysWithData} days** this week (${Math.round((daysHit/Math.max(daysWithData,1))*100)}% success rate).\n\nTheir average daily calorie intake is **${Math.round(data.filter(d => d.hasData).reduce((sum, d) => sum + d.calories, 0) / Math.max(daysWithData, 1))} kcal** compared to their target of **${client.targetCalories} kcal**.`;
                        } else if (question.toLowerCase().includes("protein")) {
                          const avgProtein = Math.round(data.filter(d => d.hasData).reduce((sum, d) => sum + d.protein, 0) / Math.max(daysWithData, 1));
                          mockResponse = `${client.name}'s average protein intake this week is **${avgProtein}g** (target: ${client.proteinTarget}g).\n\nThat's **${Math.round((avgProtein / (client.proteinTarget || 1)) * 100)}%** of their daily target.`;
                        } else if (question.toLowerCase().includes("struggle") || question.toLowerCase().includes("macro")) {
                          mockResponse = `Looking at ${client.name}'s data, they tend to struggle most with **Carbs**.\n\nThey consistently exceed their carb target by an average of 15%, while staying within range for protein and fats.`;
                        } else if (question.toLowerCase().includes("weight")) {
                          mockResponse = `${client.name}'s weight has changed from **${client.startWeight}kg** to **${client.currentWeight}kg** (${client.currentWeight && client.startWeight ? (client.currentWeight - client.startWeight > 0 ? '+' : '') + (client.currentWeight - client.startWeight).toFixed(1) : '0'}kg).\n\nThey are **${Math.round(((client.startWeight || 0) - (client.currentWeight || 0)) / ((client.startWeight || 1) - (client.targetWeight || 1)) * 100)}%** of the way to their goal weight of ${client.targetWeight}kg.`;
                        } else if (question.toLowerCase().includes("day of the week") || question.toLowerCase().includes("perform best")) {
                          mockResponse = `Based on historical data, ${client.name} performs best on **Thursdays**.\n\nThey tend to hit all their macro targets most consistently mid-week, with weekends being more challenging.`;
                        } else if (question.toLowerCase().includes("on track")) {
                          mockResponse = `${client.name} is **mostly on track** to meet their ${client.goalType?.replace('_', ' ').toLowerCase()} goal.\n\n✅ Protein intake: Consistent\n✅ Exercise: Regular\n⚠️ Carbs: Slightly over target\n✅ Weight trend: Moving in right direction`;
                        } else {
                          mockResponse = `I'd be happy to analyze that for ${client.name}. This feature will provide detailed insights once the AI integration is complete.\n\nIn the meantime, you can view the table data or ask one of the suggested questions above.`;
                        }
                        
                        setAiResponse(mockResponse);
                        setAiLoading(false);
                      };

                      return (
                        <div className="space-y-4">
                          {/* AI Header */}
                          <div className="flex items-center gap-2 text-sm">
                            <Sparkles className="h-4 w-4 text-primary" />
                            <span className="font-medium">AI Analytics Assistant</span>
                            <Badge variant="secondary" className="text-[10px]">Beta</Badge>
                          </div>

                          {/* Predefined Questions */}
                          <div className="space-y-2">
                            <p className="text-xs text-muted-foreground">Quick questions:</p>
                            <div className="flex flex-wrap gap-2">
                              {predefinedQuestions.map((question, idx) => (
                                <button
                                  key={idx}
                                  onClick={() => handleAskQuestion(question)}
                                  disabled={aiLoading}
                                  className="text-xs px-3 py-2 rounded-lg border bg-background hover:bg-muted transition-colors disabled:opacity-50 text-left"
                                >
                                  {question}
                                </button>
                              ))}
                            </div>
                          </div>

                          {/* Custom Question Input */}
                          <div className="flex gap-2">
                            <Input
                              placeholder={`Ask anything about ${client.name}'s progress...`}
                              value={aiQuestion}
                              onChange={(e) => setAiQuestion(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter' && aiQuestion.trim()) {
                                  handleAskQuestion(aiQuestion);
                                }
                              }}
                              disabled={aiLoading}
                              className="flex-1"
                            />
                            <Button
                              size="icon"
                              onClick={() => aiQuestion.trim() && handleAskQuestion(aiQuestion)}
                              disabled={aiLoading || !aiQuestion.trim()}
                            >
                              {aiLoading ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Send className="h-4 w-4" />
                              )}
                            </Button>
                          </div>

                          {/* AI Response */}
                          {(aiResponse || aiLoading) && (
                            <div className="rounded-lg border bg-muted/30 p-4">
                              {aiLoading ? (
                                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                  <span>Analyzing data...</span>
                                </div>
                              ) : (
                                <div className="space-y-3">
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                      <Sparkles className="h-3 w-3" />
                                      <span>AI Response</span>
                                    </div>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-7 text-xs gap-1"
                                      disabled={createNoteMutation.isPending}
                                      onClick={() => {
                                        if (aiQuestion && aiResponse) {
                                          createNoteMutation.mutate({
                                            clientId,
                                            question: aiQuestion,
                                            answer: aiResponse,
                                          });
                                        }
                                      }}
                                    >
                                      {createNoteMutation.isPending ? (
                                        <Loader2 className="h-3 w-3 animate-spin" />
                                      ) : (
                                        <Bookmark className="h-3 w-3" />
                                      )}
                                      Save to Notes
                                    </Button>
                                  </div>
                                  <div className="text-sm whitespace-pre-wrap">
                                    {aiResponse?.split('**').map((part, i) => 
                                      i % 2 === 1 ? <strong key={i}>{part}</strong> : part
                                    )}
                                  </div>
                                </div>
                              )}
                            </div>
                          )}

                          {/* Placeholder when no response */}
                          {!aiResponse && !aiLoading && (
                            <div className="rounded-lg border border-dashed p-6 text-center">
                              <Sparkles className="h-8 w-8 mx-auto text-muted-foreground/30 mb-2" />
                              <p className="text-sm text-muted-foreground">
                                Ask a question or click one of the suggestions above to get AI-powered insights about {client.name}&apos;s progress.
                              </p>
                            </div>
                          )}
                        </div>
                      );
                    }
                  })()}
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

                        const isExpanded = expandedMeals[meal.key] ?? false;

                        return (
                          <Collapsible 
                            key={meal.key} 
                            open={isExpanded} 
                            onOpenChange={() => toggleMealExpanded(meal.key)}
                          >
                            <div className="rounded-2xl bg-muted/30 border overflow-hidden">
                              {/* Meal Header - Clickable to expand/collapse */}
                              <CollapsibleTrigger asChild>
                                <button 
                                  type="button"
                                  className="w-full p-4 text-left hover:bg-muted/50 transition-colors"
                                >
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
                                    <div className="flex items-center gap-2">
                                      {hasFoods && (
                                        <Badge variant="secondary" className="font-medium">
                                          {totalCalories} kcal 🔥
                                        </Badge>
                                      )}
                                      <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} />
                                    </div>
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
                                </button>
                              </CollapsibleTrigger>

                              {/* Food Items - Collapsible */}
                              <CollapsibleContent>
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
                              </CollapsibleContent>
                            </div>
                          </Collapsible>
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
