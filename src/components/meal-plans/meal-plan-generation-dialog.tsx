"use client";

import { useState } from "react";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  Sparkles,
  Loader2,
  X,
  Plus,
  ChevronDown,
  Calendar,
  Coffee,
  Sun,
  Moon,
  Cookie,
  Flame,
  Target,
  Leaf,
  Check,
} from "lucide-react";
import { toast } from "sonner";

const DIET_TYPES = [
  { value: "standard", label: "Standard (No Restrictions)" },
  { value: "vegetarian", label: "Vegetarian" },
  { value: "vegan", label: "Vegan" },
  { value: "pescatarian", label: "Pescatarian" },
  { value: "keto", label: "Keto" },
  { value: "paleo", label: "Paleo" },
  { value: "mediterranean", label: "Mediterranean" },
  { value: "low-carb", label: "Low Carb" },
  { value: "high-protein", label: "High Protein" },
];

const DIETARY_RESTRICTIONS = [
  { value: "gluten-free", label: "Gluten-Free" },
  { value: "dairy-free", label: "Dairy-Free" },
  { value: "nut-free", label: "Nut-Free" },
  { value: "soy-free", label: "Soy-Free" },
  { value: "egg-free", label: "Egg-Free" },
  { value: "shellfish-free", label: "Shellfish-Free" },
  { value: "halal", label: "Halal" },
  { value: "kosher", label: "Kosher" },
];

const NUTRITIONAL_FOCUS = [
  { value: "high-fiber", label: "High in Fiber" },
  { value: "high-vitamin-c", label: "High in Vitamin C" },
  { value: "high-iron", label: "High in Iron" },
  { value: "high-calcium", label: "High in Calcium" },
  { value: "high-omega3", label: "High in Omega-3" },
  { value: "low-sodium", label: "Low Sodium" },
  { value: "low-sugar", label: "Low Sugar" },
  { value: "heart-healthy", label: "Heart Healthy" },
  { value: "anti-inflammatory", label: "Anti-Inflammatory" },
  { value: "gut-health", label: "Gut Health" },
];

const GOAL_TYPES = [
  { value: "WEIGHT_LOSS", label: "Weight Loss" },
  { value: "WEIGHT_GAIN", label: "Weight Gain" },
  { value: "MAINTAIN_WEIGHT", label: "Maintain Weight" },
  { value: "MUSCLE_BUILDING", label: "Muscle Building" },
  { value: "ATHLETIC_PERFORMANCE", label: "Athletic Performance" },
];

const MEAL_SLOTS = [
  { value: "breakfast", label: "Breakfast", icon: Coffee },
  { value: "lunch", label: "Lunch", icon: Sun },
  { value: "dinner", label: "Dinner", icon: Moon },
  { value: "snack", label: "Snack", icon: Cookie },
];

interface MealPlanGenerationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function MealPlanGenerationDialog({
  open,
  onOpenChange,
  onSuccess,
}: MealPlanGenerationDialogProps) {
  const [step, setStep] = useState<"form" | "generating" | "preview">("form");
  const [macroMode, setMacroMode] = useState<"daily" | "per-meal">("daily");
  const [excludeIngredient, setExcludeIngredient] = useState("");
  const [isAdvancedOpen, setIsAdvancedOpen] = useState(false);
  const [showAllDays, setShowAllDays] = useState(false);
  const [selectedRecipe, setSelectedRecipe] = useState<{
    name: string;
    slot: string;
    day: number;
    calories: number;
    protein: number;
    carbs: number;
    fats: number;
  } | null>(null);

  const [formData, setFormData] = useState({
    planName: "",
    duration: "7",
    goalType: "",
    dietType: "standard",
    dietaryRestrictions: [] as string[],
    nutritionalFocus: [] as string[],
    excludeIngredients: [] as string[],
    // Daily macros
    dailyCaloriesMin: "",
    dailyCaloriesMax: "",
    dailyProteinMin: "",
    dailyProteinMax: "",
    dailyCarbsMin: "",
    dailyCarbsMax: "",
    dailyFatsMin: "",
    dailyFatsMax: "",
    // Per-meal macros
    breakfastCaloriesMin: "",
    breakfastCaloriesMax: "",
    breakfastProteinMin: "",
    breakfastProteinMax: "",
    lunchCaloriesMin: "",
    lunchCaloriesMax: "",
    lunchProteinMin: "",
    lunchProteinMax: "",
    dinnerCaloriesMin: "",
    dinnerCaloriesMax: "",
    dinnerProteinMin: "",
    dinnerProteinMax: "",
    snackCaloriesMin: "",
    snackCaloriesMax: "",
    snackProteinMin: "",
    snackProteinMax: "",
    // Options
    includeSnacks: true,
    mealsPerDay: "3",
    variety: "high",
  });

  const [generatedPlan, setGeneratedPlan] = useState<{
    title: string;
    description: string;
    duration: number;
    goalType: string;
    dailyTargets: {
      calories: number;
      protein: number;
      carbs: number;
      fats: number;
    };
    days: Array<{
      day: number;
      meals: Array<{
        slot: string;
        recipeName: string;
        calories: number;
        protein: number;
        carbs: number;
        fats: number;
      }>;
      totals: {
        calories: number;
        protein: number;
        carbs: number;
        fats: number;
      };
    }>;
  } | null>(null);

  const createMealPlan = trpc.content.createMealPlan.useMutation({
    onSuccess: () => {
      toast.success("Meal plan saved successfully!");
      onSuccess?.();
      handleClose();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to save meal plan");
    },
  });

  const resetForm = () => {
    setFormData({
      planName: "",
      duration: "7",
      goalType: "",
      dietType: "standard",
      dietaryRestrictions: [],
      nutritionalFocus: [],
      excludeIngredients: [],
      dailyCaloriesMin: "",
      dailyCaloriesMax: "",
      dailyProteinMin: "",
      dailyProteinMax: "",
      dailyCarbsMin: "",
      dailyCarbsMax: "",
      dailyFatsMin: "",
      dailyFatsMax: "",
      breakfastCaloriesMin: "",
      breakfastCaloriesMax: "",
      breakfastProteinMin: "",
      breakfastProteinMax: "",
      lunchCaloriesMin: "",
      lunchCaloriesMax: "",
      lunchProteinMin: "",
      lunchProteinMax: "",
      dinnerCaloriesMin: "",
      dinnerCaloriesMax: "",
      dinnerProteinMin: "",
      dinnerProteinMax: "",
      snackCaloriesMin: "",
      snackCaloriesMax: "",
      snackProteinMin: "",
      snackProteinMax: "",
      includeSnacks: true,
      mealsPerDay: "3",
      variety: "high",
    });
    setGeneratedPlan(null);
    setStep("form");
    setMacroMode("daily");
    setShowAllDays(false);
    setSelectedRecipe(null);
  };

  const handleClose = () => {
    resetForm();
    onOpenChange(false);
  };

  const addExcludeIngredient = () => {
    if (excludeIngredient.trim() && !formData.excludeIngredients.includes(excludeIngredient.trim())) {
      setFormData({
        ...formData,
        excludeIngredients: [...formData.excludeIngredients, excludeIngredient.trim()],
      });
      setExcludeIngredient("");
    }
  };

  const handleGenerate = () => {
    if (!formData.dailyCaloriesMin && macroMode === "daily") {
      toast.error("Please specify daily calorie target");
      return;
    }

    setStep("generating");

    // Simulate AI generation with demo data
    setTimeout(() => {
      const duration = parseInt(formData.duration);
      const targetCalories = parseInt(formData.dailyCaloriesMin) || 1800;
      const targetProtein = parseInt(formData.dailyProteinMin) || Math.round(targetCalories * 0.25 / 4);
      const targetCarbs = parseInt(formData.dailyCarbsMin) || Math.round(targetCalories * 0.45 / 4);
      const targetFats = parseInt(formData.dailyFatsMin) || Math.round(targetCalories * 0.30 / 9);

      // Generate demo meal plan
      const demoMeals: Record<string, Array<{ name: string; cal: number; p: number; c: number; f: number }>> = {
        breakfast: [
          { name: "Greek Yogurt Parfait with Berries", cal: 380, p: 22, c: 45, f: 12 },
          { name: "Avocado Toast with Poached Eggs", cal: 420, p: 18, c: 38, f: 24 },
          { name: "Overnight Oats with Banana", cal: 350, p: 14, c: 55, f: 10 },
          { name: "Veggie Omelette with Whole Grain Toast", cal: 400, p: 26, c: 32, f: 18 },
          { name: "Smoothie Bowl with Granola", cal: 390, p: 16, c: 52, f: 14 },
          { name: "Cottage Cheese Pancakes", cal: 360, p: 28, c: 36, f: 12 },
          { name: "Breakfast Burrito Bowl", cal: 450, p: 24, c: 42, f: 20 },
        ],
        lunch: [
          { name: "Grilled Chicken Salad", cal: 520, p: 42, c: 28, f: 26 },
          { name: "Quinoa Buddha Bowl", cal: 480, p: 18, c: 62, f: 18 },
          { name: "Turkey & Avocado Wrap", cal: 540, p: 35, c: 45, f: 24 },
          { name: "Mediterranean Grain Bowl", cal: 510, p: 22, c: 58, f: 22 },
          { name: "Asian Chicken Lettuce Wraps", cal: 420, p: 38, c: 24, f: 20 },
          { name: "Lentil Soup with Crusty Bread", cal: 460, p: 24, c: 56, f: 14 },
          { name: "Salmon Poke Bowl", cal: 550, p: 36, c: 48, f: 24 },
        ],
        dinner: [
          { name: "Baked Salmon with Roasted Vegetables", cal: 580, p: 45, c: 32, f: 28 },
          { name: "Chicken Stir-Fry with Brown Rice", cal: 620, p: 42, c: 58, f: 22 },
          { name: "Lean Beef Tacos with Black Beans", cal: 590, p: 38, c: 52, f: 24 },
          { name: "Grilled Shrimp with Quinoa Pilaf", cal: 540, p: 40, c: 48, f: 20 },
          { name: "Turkey Meatballs with Zucchini Noodles", cal: 480, p: 44, c: 28, f: 22 },
          { name: "Herb-Crusted Cod with Sweet Potato", cal: 520, p: 38, c: 45, f: 18 },
          { name: "Chicken Tikka Masala with Cauliflower Rice", cal: 560, p: 42, c: 36, f: 26 },
        ],
        snack: [
          { name: "Apple with Almond Butter", cal: 220, p: 6, c: 28, f: 12 },
          { name: "Greek Yogurt with Honey", cal: 180, p: 15, c: 22, f: 4 },
          { name: "Mixed Nuts & Dark Chocolate", cal: 250, p: 8, c: 18, f: 18 },
          { name: "Hummus with Veggie Sticks", cal: 200, p: 8, c: 24, f: 10 },
          { name: "Protein Energy Balls", cal: 190, p: 10, c: 20, f: 8 },
          { name: "Cheese & Whole Grain Crackers", cal: 210, p: 12, c: 18, f: 12 },
          { name: "Cottage Cheese with Pineapple", cal: 170, p: 18, c: 16, f: 4 },
        ],
      };

      const days = Array.from({ length: duration }, (_, i) => {
        const dayMeals = [];
        const slots = formData.includeSnacks
          ? ["breakfast", "lunch", "dinner", "snack"]
          : ["breakfast", "lunch", "dinner"];

        for (const slot of slots) {
          const mealOptions = demoMeals[slot];
          const meal = mealOptions[Math.floor(Math.random() * mealOptions.length)];
          dayMeals.push({
            slot,
            recipeName: meal.name,
            calories: meal.cal,
            protein: meal.p,
            carbs: meal.c,
            fats: meal.f,
          });
        }

        const totals = dayMeals.reduce(
          (acc, meal) => ({
            calories: acc.calories + meal.calories,
            protein: acc.protein + meal.protein,
            carbs: acc.carbs + meal.carbs,
            fats: acc.fats + meal.fats,
          }),
          { calories: 0, protein: 0, carbs: 0, fats: 0 }
        );

        return { day: i + 1, meals: dayMeals, totals };
      });

      const goalLabels: Record<string, string> = {
        WEIGHT_LOSS: "Weight Loss",
        WEIGHT_GAIN: "Weight Gain",
        MAINTAIN_WEIGHT: "Maintenance",
        MUSCLE_BUILDING: "Muscle Building",
        ATHLETIC_PERFORMANCE: "Athletic Performance",
      };

      const dietLabels: Record<string, string> = {
        standard: "",
        vegetarian: "Vegetarian ",
        vegan: "Vegan ",
        pescatarian: "Pescatarian ",
        keto: "Keto ",
        paleo: "Paleo ",
        mediterranean: "Mediterranean ",
        "low-carb": "Low-Carb ",
        "high-protein": "High-Protein ",
      };

      setGeneratedPlan({
        title: formData.planName || `${duration}-Day ${dietLabels[formData.dietType] || ""}${goalLabels[formData.goalType] || "Balanced"} Plan`,
        description: `A personalized ${duration}-day meal plan${formData.goalType ? ` designed for ${goalLabels[formData.goalType].toLowerCase()}` : ""}${formData.dietType !== "standard" ? `, following a ${dietLabels[formData.dietType].toLowerCase().trim()} diet` : ""}.`,
        duration,
        goalType: formData.goalType,
        dailyTargets: {
          calories: targetCalories,
          protein: targetProtein,
          carbs: targetCarbs,
          fats: targetFats,
        },
        days,
      });

      setStep("preview");
    }, 2000);
  };

  const handleSave = () => {
    if (!generatedPlan) return;

    // Map goal types to database enum (only these 3 are supported in DB)
    const goalTypeMap: Record<string, "WEIGHT_LOSS" | "WEIGHT_GAIN" | "MAINTAIN_WEIGHT" | undefined> = {
      WEIGHT_LOSS: "WEIGHT_LOSS",
      WEIGHT_GAIN: "WEIGHT_GAIN",
      MAINTAIN_WEIGHT: "MAINTAIN_WEIGHT",
      MUSCLE_BUILDING: "WEIGHT_GAIN", // Map to closest
      ATHLETIC_PERFORMANCE: "MAINTAIN_WEIGHT", // Map to closest
    };

    createMealPlan.mutate({
      title: generatedPlan.title,
      description: generatedPlan.description,
      duration: generatedPlan.duration,
      goalType: generatedPlan.goalType ? goalTypeMap[generatedPlan.goalType] : undefined,
      targetCalories: generatedPlan.dailyTargets.calories,
      targetProtein: generatedPlan.dailyTargets.protein,
      targetCarbs: generatedPlan.dailyTargets.carbs,
      targetFats: generatedPlan.dailyTargets.fats,
      content: {
        days: generatedPlan.days,
        dietType: formData.dietType,
        dietaryRestrictions: formData.dietaryRestrictions,
        nutritionalFocus: formData.nutritionalFocus,
        excludeIngredients: formData.excludeIngredients,
      },
    });
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            {step === "form" && "Generate Meal Plan with AI"}
            {step === "generating" && "Generating Your Meal Plan..."}
            {step === "preview" && "Your Generated Meal Plan"}
          </DialogTitle>
          <DialogDescription>
            {step === "form" && "Configure your preferences and let AI create a personalized meal plan"}
            {step === "generating" && "Please wait while we create your customized meal plan"}
            {step === "preview" && "Review your AI-generated meal plan"}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto min-h-0 pr-4">
          {step === "form" && (
            <div className="space-y-6 py-4">
              {/* Basic Info */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Plan Name (Optional)</Label>
                  <Input
                    placeholder="My Custom Meal Plan"
                    value={formData.planName}
                    onChange={(e) => setFormData({ ...formData, planName: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Duration (Days)</Label>
                  <Select
                    value={formData.duration}
                    onValueChange={(value) => setFormData({ ...formData, duration: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="3">3 Days</SelectItem>
                      <SelectItem value="5">5 Days</SelectItem>
                      <SelectItem value="7">7 Days (1 Week)</SelectItem>
                      <SelectItem value="14">14 Days (2 Weeks)</SelectItem>
                      <SelectItem value="21">21 Days (3 Weeks)</SelectItem>
                      <SelectItem value="28">28 Days (4 Weeks)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Goal & Diet Type */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Goal Type</Label>
                  <Select
                    value={formData.goalType}
                    onValueChange={(value) => setFormData({ ...formData, goalType: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select goal" />
                    </SelectTrigger>
                    <SelectContent>
                      {GOAL_TYPES.map((goal) => (
                        <SelectItem key={goal.value} value={goal.value}>
                          {goal.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Diet Type</Label>
                  <Select
                    value={formData.dietType}
                    onValueChange={(value) => setFormData({ ...formData, dietType: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {DIET_TYPES.map((diet) => (
                        <SelectItem key={diet.value} value={diet.value}>
                          {diet.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Dietary Restrictions */}
              <div className="space-y-2">
                <Label>Dietary Restrictions</Label>
                <MultiSelect
                  options={DIETARY_RESTRICTIONS}
                  selected={formData.dietaryRestrictions}
                  onChange={(restrictions) => setFormData({ ...formData, dietaryRestrictions: restrictions })}
                  placeholder="Select any dietary restrictions..."
                />
              </div>

              {/* Nutritional Focus */}
              <div className="space-y-2">
                <Label>Nutritional Focus (Optional)</Label>
                <MultiSelect
                  options={NUTRITIONAL_FOCUS}
                  selected={formData.nutritionalFocus}
                  onChange={(focus) => setFormData({ ...formData, nutritionalFocus: focus })}
                  placeholder="e.g., High in Fiber, Low Sodium..."
                />
              </div>

              {/* Exclude Ingredients */}
              <div className="space-y-2">
                <Label>Exclude Ingredients</Label>
                <div className="flex gap-2">
                  <Input
                    placeholder="e.g., mushrooms, cilantro"
                    value={excludeIngredient}
                    onChange={(e) => setExcludeIngredient(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addExcludeIngredient())}
                  />
                  <Button type="button" variant="outline" size="icon" onClick={addExcludeIngredient}>
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                {formData.excludeIngredients.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {formData.excludeIngredients.map((ing) => (
                      <Badge key={ing} variant="destructive" className="gap-1">
                        {ing}
                        <button
                          onClick={() =>
                            setFormData({
                              ...formData,
                              excludeIngredients: formData.excludeIngredients.filter((i) => i !== ing),
                            })
                          }
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                )}
              </div>

              <Separator />

              {/* Macro Targets */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label className="text-base font-medium">Nutritional Targets</Label>
                  <Tabs value={macroMode} onValueChange={(v) => setMacroMode(v as "daily" | "per-meal")}>
                    <TabsList className="h-8">
                      <TabsTrigger value="daily" className="text-xs px-3">Daily</TabsTrigger>
                      <TabsTrigger value="per-meal" className="text-xs px-3">Per Meal</TabsTrigger>
                    </TabsList>
                  </Tabs>
                </div>

                {macroMode === "daily" ? (
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-sm text-muted-foreground">Calories (kcal/day)</Label>
                      <div className="flex items-center gap-2">
                        <Input
                          type="number"
                          placeholder="Min"
                          value={formData.dailyCaloriesMin}
                          onChange={(e) => setFormData({ ...formData, dailyCaloriesMin: e.target.value })}
                        />
                        <span className="text-muted-foreground">-</span>
                        <Input
                          type="number"
                          placeholder="Max"
                          value={formData.dailyCaloriesMax}
                          onChange={(e) => setFormData({ ...formData, dailyCaloriesMax: e.target.value })}
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm text-muted-foreground">Protein (g/day)</Label>
                      <div className="flex items-center gap-2">
                        <Input
                          type="number"
                          placeholder="Min"
                          value={formData.dailyProteinMin}
                          onChange={(e) => setFormData({ ...formData, dailyProteinMin: e.target.value })}
                        />
                        <span className="text-muted-foreground">-</span>
                        <Input
                          type="number"
                          placeholder="Max"
                          value={formData.dailyProteinMax}
                          onChange={(e) => setFormData({ ...formData, dailyProteinMax: e.target.value })}
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm text-muted-foreground">Carbs (g/day)</Label>
                      <div className="flex items-center gap-2">
                        <Input
                          type="number"
                          placeholder="Min"
                          value={formData.dailyCarbsMin}
                          onChange={(e) => setFormData({ ...formData, dailyCarbsMin: e.target.value })}
                        />
                        <span className="text-muted-foreground">-</span>
                        <Input
                          type="number"
                          placeholder="Max"
                          value={formData.dailyCarbsMax}
                          onChange={(e) => setFormData({ ...formData, dailyCarbsMax: e.target.value })}
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm text-muted-foreground">Fats (g/day)</Label>
                      <div className="flex items-center gap-2">
                        <Input
                          type="number"
                          placeholder="Min"
                          value={formData.dailyFatsMin}
                          onChange={(e) => setFormData({ ...formData, dailyFatsMin: e.target.value })}
                        />
                        <span className="text-muted-foreground">-</span>
                        <Input
                          type="number"
                          placeholder="Max"
                          value={formData.dailyFatsMax}
                          onChange={(e) => setFormData({ ...formData, dailyFatsMax: e.target.value })}
                        />
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {MEAL_SLOTS.map((slot) => {
                      const SlotIcon = slot.icon;
                      const prefix = slot.value as "breakfast" | "lunch" | "dinner" | "snack";
                      return (
                        <div key={slot.value} className="border rounded-lg p-4">
                          <div className="flex items-center gap-2 mb-3">
                            <SlotIcon className="h-4 w-4 text-primary" />
                            <Label className="font-medium">{slot.label}</Label>
                          </div>
                          <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1">
                              <Label className="text-xs text-muted-foreground">Calories</Label>
                              <div className="flex items-center gap-1">
                                <Input
                                  type="number"
                                  placeholder="Min"
                                  className="h-8 text-sm"
                                  value={formData[`${prefix}CaloriesMin` as keyof typeof formData] as string}
                                  onChange={(e) => setFormData({ ...formData, [`${prefix}CaloriesMin`]: e.target.value })}
                                />
                                <span className="text-muted-foreground text-sm">-</span>
                                <Input
                                  type="number"
                                  placeholder="Max"
                                  className="h-8 text-sm"
                                  value={formData[`${prefix}CaloriesMax` as keyof typeof formData] as string}
                                  onChange={(e) => setFormData({ ...formData, [`${prefix}CaloriesMax`]: e.target.value })}
                                />
                              </div>
                            </div>
                            <div className="space-y-1">
                              <Label className="text-xs text-muted-foreground">Protein (g)</Label>
                              <div className="flex items-center gap-1">
                                <Input
                                  type="number"
                                  placeholder="Min"
                                  className="h-8 text-sm"
                                  value={formData[`${prefix}ProteinMin` as keyof typeof formData] as string}
                                  onChange={(e) => setFormData({ ...formData, [`${prefix}ProteinMin`]: e.target.value })}
                                />
                                <span className="text-muted-foreground text-sm">-</span>
                                <Input
                                  type="number"
                                  placeholder="Max"
                                  className="h-8 text-sm"
                                  value={formData[`${prefix}ProteinMax` as keyof typeof formData] as string}
                                  onChange={(e) => setFormData({ ...formData, [`${prefix}ProteinMax`]: e.target.value })}
                                />
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Advanced Options */}
              <Collapsible open={isAdvancedOpen} onOpenChange={setIsAdvancedOpen}>
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" className="w-full justify-between">
                    <span>Advanced Options</span>
                    <ChevronDown className={`h-4 w-4 transition-transform ${isAdvancedOpen ? "rotate-180" : ""}`} />
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="space-y-4 pt-4">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="includeSnacks"
                      checked={formData.includeSnacks}
                      onCheckedChange={(checked) => setFormData({ ...formData, includeSnacks: !!checked })}
                    />
                    <Label htmlFor="includeSnacks">Include snacks in the plan</Label>
                  </div>
                  <div className="space-y-2">
                    <Label>Recipe Variety</Label>
                    <Select
                      value={formData.variety}
                      onValueChange={(value) => setFormData({ ...formData, variety: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">Low (Repeat meals often)</SelectItem>
                        <SelectItem value="medium">Medium (Some repetition)</SelectItem>
                        <SelectItem value="high">High (Maximum variety)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </CollapsibleContent>
              </Collapsible>
            </div>
          )}

          {step === "generating" && (
            <div className="flex flex-col items-center justify-center py-16">
              <div className="relative">
                <Loader2 className="h-16 w-16 animate-spin text-primary" />
                <Sparkles className="h-6 w-6 text-primary absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
              </div>
              <p className="mt-6 text-lg font-medium">Creating your personalized meal plan...</p>
              <p className="text-muted-foreground mt-2">This may take a moment</p>
            </div>
          )}

          {step === "preview" && generatedPlan && (
            <div className="space-y-6 py-4">
              {/* Plan Overview */}
              <div>
                <h3 className="text-xl font-semibold">{generatedPlan.title}</h3>
                <p className="text-muted-foreground mt-1">{generatedPlan.description}</p>
              </div>

              {/* Daily Targets */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Target className="h-4 w-4" />
                    Daily Targets
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-4 gap-4 text-center">
                    <div className="bg-orange-50 dark:bg-orange-950/30 rounded-lg p-3">
                      <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                        {generatedPlan.dailyTargets.calories}
                      </p>
                      <p className="text-xs text-muted-foreground">Calories</p>
                    </div>
                    <div className="bg-blue-50 dark:bg-blue-950/30 rounded-lg p-3">
                      <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                        {generatedPlan.dailyTargets.protein}g
                      </p>
                      <p className="text-xs text-muted-foreground">Protein</p>
                    </div>
                    <div className="bg-amber-50 dark:bg-amber-950/30 rounded-lg p-3">
                      <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">
                        {generatedPlan.dailyTargets.carbs}g
                      </p>
                      <p className="text-xs text-muted-foreground">Carbs</p>
                    </div>
                    <div className="bg-purple-50 dark:bg-purple-950/30 rounded-lg p-3">
                      <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                        {generatedPlan.dailyTargets.fats}g
                      </p>
                      <p className="text-xs text-muted-foreground">Fats</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Days Preview */}
              <div className="space-y-4">
                <h4 className="font-medium flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Meal Schedule Preview
                </h4>

                {(showAllDays ? generatedPlan.days : generatedPlan.days.slice(0, 3)).map((day) => (
                  <Card key={day.day}>
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-sm">Day {day.day}</CardTitle>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Flame className="h-3 w-3" />
                          {day.totals.calories} kcal
                          <span>|</span>
                          P: {day.totals.protein}g
                          <span>|</span>
                          C: {day.totals.carbs}g
                          <span>|</span>
                          F: {day.totals.fats}g
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {day.meals.map((meal) => {
                          const slotInfo = MEAL_SLOTS.find((s) => s.value === meal.slot);
                          const SlotIcon = slotInfo?.icon || Coffee;
                          const isSelected = selectedRecipe?.name === meal.recipeName && selectedRecipe?.day === day.day && selectedRecipe?.slot === meal.slot;
                          return (
                            <div key={meal.slot}>
                              <div
                                className={`flex items-center justify-between rounded-lg p-2 cursor-pointer transition-colors ${
                                  isSelected
                                    ? "bg-primary/10 border border-primary"
                                    : "bg-muted/50 hover:bg-muted"
                                }`}
                                onClick={() => {
                                  if (isSelected) {
                                    setSelectedRecipe(null);
                                  } else {
                                    setSelectedRecipe({
                                      name: meal.recipeName,
                                      slot: meal.slot,
                                      day: day.day,
                                      calories: meal.calories,
                                      protein: meal.protein,
                                      carbs: meal.carbs,
                                      fats: meal.fats,
                                    });
                                  }
                                }}
                              >
                                <div className="flex items-center gap-2">
                                  <SlotIcon className="h-4 w-4 text-primary" />
                                  <div>
                                    <p className="text-sm font-medium">{meal.recipeName}</p>
                                    <p className="text-xs text-muted-foreground capitalize">{meal.slot}</p>
                                  </div>
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  {meal.calories} kcal | P: {meal.protein}g
                                </div>
                              </div>
                              {/* Inline Recipe Preview */}
                              {isSelected && (
                                <div className="mt-2 ml-6 p-3 bg-primary/5 border border-primary/20 rounded-lg space-y-3">
                                  <div className="flex items-center justify-between">
                                    <h5 className="font-semibold text-sm flex items-center gap-2">
                                      <Sparkles className="h-3 w-3 text-primary" />
                                      {meal.recipeName}
                                    </h5>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-5 w-5"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setSelectedRecipe(null);
                                      }}
                                    >
                                      <X className="h-3 w-3" />
                                    </Button>
                                  </div>
                                  <div className="grid grid-cols-4 gap-2 text-center">
                                    <div className="bg-orange-100 dark:bg-orange-950/50 rounded p-1.5">
                                      <p className="text-sm font-bold text-orange-600 dark:text-orange-400">
                                        {meal.calories}
                                      </p>
                                      <p className="text-[10px] text-muted-foreground">kcal</p>
                                    </div>
                                    <div className="bg-blue-100 dark:bg-blue-950/50 rounded p-1.5">
                                      <p className="text-sm font-bold text-blue-600 dark:text-blue-400">
                                        {meal.protein}g
                                      </p>
                                      <p className="text-[10px] text-muted-foreground">Protein</p>
                                    </div>
                                    <div className="bg-amber-100 dark:bg-amber-950/50 rounded p-1.5">
                                      <p className="text-sm font-bold text-amber-600 dark:text-amber-400">
                                        {meal.carbs}g
                                      </p>
                                      <p className="text-[10px] text-muted-foreground">Carbs</p>
                                    </div>
                                    <div className="bg-purple-100 dark:bg-purple-950/50 rounded p-1.5">
                                      <p className="text-sm font-bold text-purple-600 dark:text-purple-400">
                                        {meal.fats}g
                                      </p>
                                      <p className="text-[10px] text-muted-foreground">Fats</p>
                                    </div>
                                  </div>
                                  <p className="text-[10px] text-muted-foreground italic">
                                    Full recipe details available after saving.
                                  </p>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </CardContent>
                  </Card>
                ))}
                {generatedPlan.days.length > 3 && (
                  <Button
                    variant="ghost"
                    className="w-full text-sm text-muted-foreground hover:text-foreground"
                    onClick={() => setShowAllDays(!showAllDays)}
                  >
                    {showAllDays ? (
                      <>
                        <ChevronDown className="h-4 w-4 mr-2 rotate-180" />
                        Show less
                      </>
                    ) : (
                      <>
                        <ChevronDown className="h-4 w-4 mr-2" />
                        + {generatedPlan.days.length - 3} more days...
                      </>
                    )}
                  </Button>
                )}
              </div>
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
                Generate Meal Plan
              </Button>
            </>
          )}
          {step === "preview" && (
            <>
              <Button variant="outline" onClick={resetForm}>
                Generate Another
              </Button>
              <Button onClick={handleSave} disabled={createMealPlan.isPending}>
                {createMealPlan.isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Check className="mr-2 h-4 w-4" />
                )}
                Save Meal Plan
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
