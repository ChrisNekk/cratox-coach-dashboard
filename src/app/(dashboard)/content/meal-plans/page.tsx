"use client";

import { useState, useMemo } from "react";
import { useSession } from "next-auth/react";
import { trpc } from "@/lib/trpc/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Separator } from "@/components/ui/separator";
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
  Eye,
  Pencil,
  X,
  Coffee,
  Sun,
  Moon,
  Cookie,
  UtensilsCrossed,
  Clock,
  Sparkles,
  RefreshCw,
  Check,
  Copy,
  Wand2,
  Globe,
  Lock,
} from "lucide-react";
import { toast } from "sonner";
import { MealPlanGenerationDialog } from "@/components/meal-plans/meal-plan-generation-dialog";

type MealPlan = {
  id: string;
  coachId: string | null;
  title: string;
  description: string | null;
  duration: number | null;
  goalType: string | null;
  targetCalories: number | null;
  targetProtein: number | null;
  targetCarbs: number | null;
  targetFats: number | null;
  isSystem: boolean;
  isPublic: boolean;
  createdAt: Date;
  updatedAt: Date;
  _count: { assignedClients: number };
  assignedClients: Array<{
    client: { id: string; name: string };
  }>;
  coach?: { id: string; name: string | null } | null;
};

type MealPlanRecipe = {
  day: number;
  mealSlot: string;
  recipe: {
    id: string;
    title: string;
    calories: number | null;
    protein: number | null;
    carbs: number | null;
    fats: number | null;
    prepTime: number | null;
    cookTime: number | null;
    category: string | null;
  };
};

// Type for AI-generated meal plan content
type AIGeneratedContent = {
  days?: Array<{
    day: number;
    meals: Array<{
      slot: string;
      recipeName: string;
      calories: number;
      protein: number;
      carbs: number;
      fats: number;
    }>;
    totals?: {
      calories: number;
      protein: number;
      carbs: number;
      fats: number;
    };
  }>;
  dietType?: string;
  dietaryRestrictions?: string[];
  nutritionalFocus?: string[];
  excludeIngredients?: string[];
};

// Type for merged meal info from both sources
type MergedMealInfo = {
  source: 'database' | 'ai';
  recipeId?: string;
  recipeName: string;
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
  prepTime?: number | null;
  cookTime?: number | null;
};

const MEAL_SLOTS = [
  { value: "breakfast", label: "Breakfast", icon: Coffee },
  { value: "lunch", label: "Lunch", icon: Sun },
  { value: "dinner", label: "Dinner", icon: Moon },
  { value: "snack", label: "Snack", icon: Cookie },
];

// Demo alternatives for AI recipe swapping (10+ options per slot for variety)
const SWAP_ALTERNATIVES: Record<string, Array<{ name: string; calories: number; protein: number; carbs: number; fats: number }>> = {
  breakfast: [
    { name: "Protein Pancakes with Maple Syrup", calories: 420, protein: 28, carbs: 48, fats: 14 },
    { name: "Egg White Veggie Scramble", calories: 280, protein: 24, carbs: 18, fats: 12 },
    { name: "Chia Pudding with Fresh Berries", calories: 320, protein: 12, carbs: 38, fats: 16 },
    { name: "Smoked Salmon Bagel", calories: 450, protein: 26, carbs: 42, fats: 18 },
    { name: "Acai Bowl with Granola", calories: 380, protein: 10, carbs: 58, fats: 12 },
    { name: "Turkey Sausage & Egg Muffins", calories: 340, protein: 26, carbs: 12, fats: 22 },
    { name: "Banana Oat Protein Smoothie", calories: 360, protein: 24, carbs: 48, fats: 8 },
    { name: "Mediterranean Breakfast Wrap", calories: 410, protein: 20, carbs: 38, fats: 20 },
    { name: "Cottage Cheese Bowl with Fruit", calories: 290, protein: 28, carbs: 32, fats: 6 },
    { name: "Whole Grain Waffles with Peanut Butter", calories: 440, protein: 16, carbs: 52, fats: 20 },
    { name: "Shakshuka with Whole Wheat Toast", calories: 380, protein: 18, carbs: 36, fats: 18 },
    { name: "Green Power Smoothie Bowl", calories: 320, protein: 14, carbs: 48, fats: 10 },
  ],
  lunch: [
    { name: "Grilled Chicken Caesar Salad", calories: 480, protein: 38, carbs: 22, fats: 28 },
    { name: "Tuna Poke Bowl", calories: 520, protein: 34, carbs: 52, fats: 18 },
    { name: "Turkey Club Sandwich", calories: 560, protein: 32, carbs: 48, fats: 26 },
    { name: "Falafel Wrap with Hummus", calories: 490, protein: 18, carbs: 58, fats: 22 },
    { name: "Shrimp Pad Thai", calories: 540, protein: 28, carbs: 62, fats: 20 },
    { name: "Chicken Burrito Bowl", calories: 580, protein: 36, carbs: 58, fats: 22 },
    { name: "Greek Chicken Pita", calories: 460, protein: 32, carbs: 42, fats: 18 },
    { name: "Asian Sesame Salmon Salad", calories: 510, protein: 38, carbs: 28, fats: 28 },
    { name: "Black Bean & Quinoa Bowl", calories: 480, protein: 22, carbs: 68, fats: 14 },
    { name: "Caprese Chicken Sandwich", calories: 520, protein: 34, carbs: 44, fats: 22 },
    { name: "Thai Coconut Soup with Tofu", calories: 420, protein: 18, carbs: 36, fats: 24 },
    { name: "Steak & Avocado Salad", calories: 550, protein: 40, carbs: 18, fats: 36 },
  ],
  dinner: [
    { name: "Grilled Ribeye with Asparagus", calories: 620, protein: 48, carbs: 12, fats: 42 },
    { name: "Baked Cod with Quinoa Pilaf", calories: 480, protein: 42, carbs: 38, fats: 16 },
    { name: "Chicken Parmesan with Pasta", calories: 680, protein: 44, carbs: 58, fats: 28 },
    { name: "Vegetable Curry with Basmati Rice", calories: 520, protein: 16, carbs: 72, fats: 18 },
    { name: "Pork Tenderloin with Sweet Potato", calories: 550, protein: 40, carbs: 42, fats: 22 },
    { name: "Lemon Herb Roasted Chicken", calories: 520, protein: 46, carbs: 18, fats: 28 },
    { name: "Beef Stir-Fry with Vegetables", calories: 580, protein: 38, carbs: 42, fats: 28 },
    { name: "Grilled Salmon with Dill Sauce", calories: 490, protein: 44, carbs: 12, fats: 30 },
    { name: "Turkey Stuffed Bell Peppers", calories: 440, protein: 34, carbs: 38, fats: 18 },
    { name: "Shrimp Scampi with Zucchini Noodles", calories: 420, protein: 36, carbs: 18, fats: 24 },
    { name: "Lamb Chops with Mint Yogurt", calories: 580, protein: 42, carbs: 14, fats: 40 },
    { name: "Teriyaki Glazed Tofu with Bok Choy", calories: 380, protein: 22, carbs: 42, fats: 14 },
  ],
  snack: [
    { name: "Protein Shake with Banana", calories: 280, protein: 25, carbs: 32, fats: 6 },
    { name: "Trail Mix with Dark Chocolate", calories: 240, protein: 8, carbs: 22, fats: 16 },
    { name: "Rice Cakes with Almond Butter", calories: 200, protein: 6, carbs: 24, fats: 10 },
    { name: "Edamame with Sea Salt", calories: 180, protein: 16, carbs: 14, fats: 8 },
    { name: "Protein Bar", calories: 220, protein: 20, carbs: 24, fats: 8 },
    { name: "Greek Yogurt with Honey & Walnuts", calories: 250, protein: 18, carbs: 28, fats: 10 },
    { name: "Celery Sticks with Cream Cheese", calories: 150, protein: 4, carbs: 8, fats: 12 },
    { name: "Hard Boiled Eggs (2)", calories: 140, protein: 12, carbs: 2, fats: 10 },
    { name: "Apple Slices with Cinnamon", calories: 120, protein: 1, carbs: 28, fats: 1 },
    { name: "Beef Jerky", calories: 180, protein: 24, carbs: 6, fats: 6 },
    { name: "Roasted Chickpeas", calories: 200, protein: 10, carbs: 32, fats: 4 },
    { name: "Cheese & Whole Grain Crackers", calories: 220, protein: 10, carbs: 18, fats: 14 },
  ],
};

export default function MealPlansPage() {
  const { data: session } = useSession();
  const [activeTab, setActiveTab] = useState("mine");
  const [showOnlyOthers, setShowOnlyOthers] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isAssignOpen, setIsAssignOpen] = useState(false);
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [isGenerateOpen, setIsGenerateOpen] = useState(false);
  const [goalFilter, setGoalFilter] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [selectedMealPlanId, setSelectedMealPlanId] = useState<string>("");
  const [selectedClientIds, setSelectedClientIds] = useState<string[]>([]);
  const [viewingMealPlan, setViewingMealPlan] = useState<MealPlan | null>(null);

  // Swap recipe state
  const [isSwapOpen, setIsSwapOpen] = useState(false);
  const [swappingRecipe, setSwappingRecipe] = useState<{
    day: number;
    slot: string;
    currentName: string;
  } | null>(null);
  const [isSwapping, setIsSwapping] = useState(false);
  const [swapAlternatives, setSwapAlternatives] = useState<Array<{
    name: string;
    calories: number;
    protein: number;
    carbs: number;
    fats: number;
  }>>([]);
  const [showAllAlternatives, setShowAllAlternatives] = useState(false);
  const [isAdaptingRecipes, setIsAdaptingRecipes] = useState(false);
  const [isGeneratingVariation, setIsGeneratingVariation] = useState(false);

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

  const queryParams = useMemo(() => {
    switch (activeTab) {
      case "mine":
        return { onlyMine: true, includeShared: false, includeSystem: false };
      case "community":
        return { onlyMine: false, includeShared: true, includeSystem: false };
      case "assigned":
      default:
        return { onlyMine: false, includeShared: false, includeSystem: true };
    }
  }, [activeTab]);

  const { data: mealPlans, isLoading, refetch } = trpc.content.getMealPlans.useQuery({
    ...queryParams,
    goalType: goalFilter !== "all" ? (goalFilter as "WEIGHT_LOSS" | "WEIGHT_GAIN" | "MAINTAIN_WEIGHT") : undefined,
  });
  const { data: clients } = trpc.client.getAll.useQuery();

  // Fetch meal plan with recipes when viewing
  const { data: mealPlanDetails, isLoading: isLoadingDetails, refetch: refetchDetails } = trpc.content.getMealPlanWithRecipes.useQuery(
    { id: viewingMealPlan?.id || "" },
    { enabled: !!viewingMealPlan?.id && isViewOpen }
  );

  const [editFormData, setEditFormData] = useState({
    title: "",
    description: "",
    duration: "",
    goalType: "",
    targetCalories: "",
    targetProtein: "",
    targetCarbs: "",
    targetFats: "",
  });

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

  const updateMealPlan = trpc.content.updateMealPlan.useMutation({
    onSuccess: (data) => {
      toast.success("Meal plan updated!");
      setIsEditMode(false);
      // Update local state with new values
      if (viewingMealPlan) {
        setViewingMealPlan({
          ...viewingMealPlan,
          title: data.title,
          description: data.description,
          duration: data.duration,
          goalType: data.goalType,
          targetCalories: data.targetCalories,
          targetProtein: data.targetProtein,
          targetCarbs: data.targetCarbs,
          targetFats: data.targetFats,
        });
      }
      refetch();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to update meal plan");
    },
  });

  const removeRecipeFromMealPlan = trpc.content.removeRecipeFromMealPlan.useMutation({
    onSuccess: () => {
      toast.success("Recipe removed from meal plan");
    },
    onError: (error) => {
      toast.error(error.message || "Failed to remove recipe");
    },
  });

  const togglePublic = trpc.content.updateMealPlan.useMutation({
    onSuccess: (_, variables) => {
      toast.success(variables.isPublic
        ? "Meal plan shared with community!"
        : "Meal plan is now private");
      refetch();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to update meal plan");
    },
  });

  const handleTogglePublic = (mealPlan: MealPlan) => {
    togglePublic.mutate({
      id: mealPlan.id,
      isPublic: !mealPlan.isPublic,
    });
  };

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

  const openViewDialog = (mealPlan: MealPlan) => {
    setViewingMealPlan(mealPlan);
    setEditFormData({
      title: mealPlan.title,
      description: mealPlan.description || "",
      duration: mealPlan.duration?.toString() || "",
      goalType: mealPlan.goalType || "",
      targetCalories: mealPlan.targetCalories?.toString() || "",
      targetProtein: mealPlan.targetProtein?.toString() || "",
      targetCarbs: mealPlan.targetCarbs?.toString() || "",
      targetFats: mealPlan.targetFats?.toString() || "",
    });
    setIsEditMode(false);
    setIsViewOpen(true);
  };

  // Duplicate meal plan
  const handleDuplicate = (mealPlan: MealPlan) => {
    createMealPlan.mutate({
      title: `${mealPlan.title} (Copy)`,
      description: mealPlan.description || undefined,
      duration: mealPlan.duration || undefined,
      goalType: mealPlan.goalType as "WEIGHT_LOSS" | "WEIGHT_GAIN" | "MAINTAIN_WEIGHT" | undefined,
      targetCalories: mealPlan.targetCalories || undefined,
      targetProtein: mealPlan.targetProtein || undefined,
      targetCarbs: mealPlan.targetCarbs || undefined,
      targetFats: mealPlan.targetFats || undefined,
    }, {
      onSuccess: () => {
        toast.success("Meal plan duplicated!");
        refetch();
      },
    });
  };

  // Generate variation with same macros but different recipes
  const handleCreateVariation = async (mealPlan: MealPlan) => {
    setIsGeneratingVariation(true);

    // Simulate AI generation
    await new Promise(resolve => setTimeout(resolve, 1500));

    const targetCalories = mealPlan.targetCalories || 1800;
    const targetProtein = mealPlan.targetProtein || Math.round(targetCalories * 0.25 / 4);
    const targetCarbs = mealPlan.targetCarbs || Math.round(targetCalories * 0.45 / 4);
    const targetFats = mealPlan.targetFats || Math.round(targetCalories * 0.30 / 9);
    const duration = mealPlan.duration || 7;

    // Generate new recipes for each day
    const days = Array.from({ length: duration }, (_, i) => {
      const dayMeals = [];
      const slots = ["breakfast", "lunch", "dinner", "snack"];

      for (const slot of slots) {
        const mealOptions = SWAP_ALTERNATIVES[slot];
        const meal = mealOptions[Math.floor(Math.random() * mealOptions.length)];
        dayMeals.push({
          slot,
          recipeName: meal.name,
          calories: meal.calories,
          protein: meal.protein,
          carbs: meal.carbs,
          fats: meal.fats,
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

    // Create the new meal plan
    createMealPlan.mutate({
      title: `${mealPlan.title} (Variation)`,
      description: mealPlan.description || undefined,
      duration,
      goalType: mealPlan.goalType as "WEIGHT_LOSS" | "WEIGHT_GAIN" | "MAINTAIN_WEIGHT" | undefined,
      targetCalories,
      targetProtein,
      targetCarbs,
      targetFats,
      content: {
        days,
        dietType: "standard",
        dietaryRestrictions: [],
        nutritionalFocus: [],
        excludeIngredients: [],
      },
    }, {
      onSuccess: (newPlan) => {
        setIsGeneratingVariation(false);
        toast.success("Variation created! Opening for review...");
        refetch();
        // Open the new plan in edit view after a short delay
        setTimeout(() => {
          const createdPlan: MealPlan = {
            ...newPlan,
            _count: { assignedClients: 0 },
            assignedClients: [],
          };
          openViewDialog(createdPlan);
          setIsEditMode(true);
        }, 500);
      },
      onError: () => {
        setIsGeneratingVariation(false);
        toast.error("Failed to create variation");
      },
    });
  };

  const handleUpdate = async () => {
    if (!viewingMealPlan) return;
    if (!editFormData.title) {
      toast.error("Please enter a meal plan title");
      return;
    }

    const newCalories = editFormData.targetCalories ? parseInt(editFormData.targetCalories) : null;
    const newProtein = editFormData.targetProtein ? parseFloat(editFormData.targetProtein) : null;
    const newCarbs = editFormData.targetCarbs ? parseFloat(editFormData.targetCarbs) : null;
    const newFats = editFormData.targetFats ? parseFloat(editFormData.targetFats) : null;

    // Check if this meal plan has AI-generated content and if macros changed
    const currentContent = mealPlanDetails?.content as AIGeneratedContent;
    const hasMacroChanges =
      (newCalories && newCalories !== viewingMealPlan.targetCalories) ||
      (newProtein && newProtein !== viewingMealPlan.targetProtein) ||
      (newCarbs && newCarbs !== viewingMealPlan.targetCarbs) ||
      (newFats && newFats !== viewingMealPlan.targetFats);

    let updatedContent = currentContent;

    // If we have AI content and macros changed, adapt the recipes
    if (currentContent?.days && hasMacroChanges && newCalories) {
      setIsAdaptingRecipes(true);

      // Simulate AI processing
      await new Promise(resolve => setTimeout(resolve, 1200));

      // Calculate scaling factor based on calorie change
      const oldCalories = viewingMealPlan.targetCalories || 1800;
      const scaleFactor = newCalories / oldCalories;

      // Scale all recipes proportionally
      const adaptedDays = currentContent.days.map(dayData => {
        const adaptedMeals = dayData.meals.map(meal => ({
          ...meal,
          calories: Math.round(meal.calories * scaleFactor),
          protein: Math.round(meal.protein * scaleFactor),
          carbs: Math.round(meal.carbs * scaleFactor),
          fats: Math.round(meal.fats * scaleFactor),
        }));

        // Recalculate totals
        const newTotals = adaptedMeals.reduce(
          (acc, meal) => ({
            calories: acc.calories + meal.calories,
            protein: acc.protein + meal.protein,
            carbs: acc.carbs + meal.carbs,
            fats: acc.fats + meal.fats,
          }),
          { calories: 0, protein: 0, carbs: 0, fats: 0 }
        );

        return { ...dayData, meals: adaptedMeals, totals: newTotals };
      });

      updatedContent = {
        ...currentContent,
        days: adaptedDays,
      };

      setIsAdaptingRecipes(false);
      toast.success("Recipes adapted to new macro targets!");
    }

    updateMealPlan.mutate({
      id: viewingMealPlan.id,
      title: editFormData.title,
      description: editFormData.description || undefined,
      duration: editFormData.duration ? parseInt(editFormData.duration) : undefined,
      goalType: editFormData.goalType ? (editFormData.goalType as "WEIGHT_LOSS" | "WEIGHT_GAIN" | "MAINTAIN_WEIGHT") : undefined,
      targetCalories: newCalories || undefined,
      targetProtein: newProtein || undefined,
      targetCarbs: newCarbs || undefined,
      targetFats: newFats || undefined,
      ...(updatedContent !== currentContent && { content: updatedContent }),
    });
  };

  const handleRemoveRecipe = (day: number, mealSlot: string) => {
    if (!viewingMealPlan) return;
    removeRecipeFromMealPlan.mutate({
      mealPlanId: viewingMealPlan.id,
      day,
      mealSlot,
    });
  };

  // Open swap dialog with alternatives
  const openSwapDialog = (day: number, slot: string, currentName: string) => {
    setSwappingRecipe({ day, slot, currentName });
    setShowAllAlternatives(false);

    // Get all recipe names already in the meal plan
    const existingRecipeNames = new Set<string>();
    const content = mealPlanDetails?.content as AIGeneratedContent;
    if (content?.days) {
      content.days.forEach(dayData => {
        dayData.meals.forEach(meal => {
          existingRecipeNames.add(meal.recipeName);
        });
      });
    }

    // Get alternatives for this meal slot, excluding all recipes already in the plan
    const alternatives = SWAP_ALTERNATIVES[slot] || SWAP_ALTERNATIVES.snack;
    setSwapAlternatives(alternatives.filter(a => !existingRecipeNames.has(a.name)));
    setIsSwapOpen(true);
  };

  // Handle swapping a recipe
  const handleSwapRecipe = async (newRecipe: { name: string; calories: number; protein: number; carbs: number; fats: number }) => {
    if (!swappingRecipe || !viewingMealPlan || !mealPlanDetails) return;

    setIsSwapping(true);

    // Simulate AI processing
    await new Promise(resolve => setTimeout(resolve, 800));

    // Get current content
    const currentContent = mealPlanDetails.content as AIGeneratedContent;
    if (!currentContent?.days) {
      setIsSwapping(false);
      toast.error("Cannot update this meal plan");
      return;
    }

    // Update the specific meal in the content
    const updatedDays = currentContent.days.map(dayData => {
      if (dayData.day === swappingRecipe.day) {
        const updatedMeals = dayData.meals.map(meal => {
          if (meal.slot === swappingRecipe.slot) {
            return {
              ...meal,
              recipeName: newRecipe.name,
              calories: newRecipe.calories,
              protein: newRecipe.protein,
              carbs: newRecipe.carbs,
              fats: newRecipe.fats,
            };
          }
          return meal;
        });

        // Recalculate totals
        const newTotals = updatedMeals.reduce(
          (acc, meal) => ({
            calories: acc.calories + meal.calories,
            protein: acc.protein + meal.protein,
            carbs: acc.carbs + meal.carbs,
            fats: acc.fats + meal.fats,
          }),
          { calories: 0, protein: 0, carbs: 0, fats: 0 }
        );

        return { ...dayData, meals: updatedMeals, totals: newTotals };
      }
      return dayData;
    });

    // Update the meal plan with new content
    updateMealPlan.mutate({
      id: viewingMealPlan.id,
      content: {
        ...currentContent,
        days: updatedDays,
      },
    }, {
      onSuccess: () => {
        toast.success(`Swapped to "${newRecipe.name}"`);
        setIsSwapping(false);
        setIsSwapOpen(false);
        setSwappingRecipe(null);
        // Refetch to get updated data
        refetchDetails();
      },
      onError: () => {
        setIsSwapping(false);
        toast.error("Failed to swap recipe");
      },
    });
  };

  // Group recipes by day
  const getRecipesByDay = (recipes: MealPlanRecipe[]) => {
    const grouped: Record<number, MealPlanRecipe[]> = {};
    recipes.forEach((r) => {
      if (!grouped[r.day]) grouped[r.day] = [];
      grouped[r.day].push(r);
    });
    return grouped;
  };

  // Helper function to merge recipe sources (database + AI-generated content)
  const getMergedRecipes = () => {
    if (!mealPlanDetails) return { byDay: {} as Record<number, Record<string, MergedMealInfo>>, hasDatabaseRecipes: false, hasAiContent: false };

    const byDay: Record<number, Record<string, MergedMealInfo>> = {};
    let hasDatabaseRecipes = false;
    let hasAiContent = false;

    // Start with database recipes (they take priority)
    if (mealPlanDetails.recipes?.length > 0) {
      hasDatabaseRecipes = true;
      mealPlanDetails.recipes.forEach((r) => {
        const recipe = r as MealPlanRecipe;
        if (!byDay[recipe.day]) byDay[recipe.day] = {};
        byDay[recipe.day][recipe.mealSlot] = {
          source: 'database',
          recipeId: recipe.recipe.id,
          recipeName: recipe.recipe.title,
          calories: recipe.recipe.calories || 0,
          protein: recipe.recipe.protein || 0,
          carbs: recipe.recipe.carbs || 0,
          fats: recipe.recipe.fats || 0,
          prepTime: recipe.recipe.prepTime,
          cookTime: recipe.recipe.cookTime,
        };
      });
    }

    // Merge AI-generated content (only fill empty slots)
    const aiContent = mealPlanDetails.content as AIGeneratedContent;
    if (aiContent?.days) {
      hasAiContent = true;
      aiContent.days.forEach((dayData) => {
        if (!byDay[dayData.day]) byDay[dayData.day] = {};
        dayData.meals.forEach((meal) => {
          // Only add if slot is empty (database takes priority)
          if (!byDay[dayData.day][meal.slot]) {
            byDay[dayData.day][meal.slot] = {
              source: 'ai',
              recipeName: meal.recipeName,
              calories: meal.calories,
              protein: meal.protein,
              carbs: meal.carbs,
              fats: meal.fats,
            };
          }
        });
      });
    }

    return { byDay, hasDatabaseRecipes, hasAiContent };
  };

  // Calculate day totals from merged recipes
  const getDayTotals = (dayRecipes: Record<string, MergedMealInfo>) => {
    return Object.values(dayRecipes).reduce(
      (acc, meal) => ({
        calories: acc.calories + meal.calories,
        protein: acc.protein + meal.protein,
        carbs: acc.carbs + meal.carbs,
        fats: acc.fats + meal.fats,
      }),
      { calories: 0, protein: 0, carbs: 0, fats: 0 }
    );
  };

  const getMealSlotIcon = (slot: string) => {
    const found = MEAL_SLOTS.find((s) => s.value === slot);
    return found ? found.icon : UtensilsCrossed;
  };

  const filteredMealPlans = mealPlans?.filter((m) => {
    // Search filter
    const matchesSearch =
      m.title.toLowerCase().includes(search.toLowerCase()) ||
      m.description?.toLowerCase().includes(search.toLowerCase());

    if (!matchesSearch) return false;

    // Tab filter
    if (activeTab === "assigned") {
      return m._count.assignedClients > 0;
    }

    // Community tab - filter out own meal plans if showOnlyOthers is enabled
    if (activeTab === "community" && showOnlyOthers) {
      return m.coachId !== session?.user?.id;
    }

    return true;
  });

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
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setIsGenerateOpen(true)}>
            <Sparkles className="mr-2 h-4 w-4" />
            Generate with AI
          </Button>
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
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="mine">My Meal Plans</TabsTrigger>
          <TabsTrigger value="assigned">Assigned</TabsTrigger>
          <TabsTrigger value="community">
            <Globe className="mr-1.5 h-4 w-4" />
            Community
          </TabsTrigger>
        </TabsList>

        {/* Filters */}
        <Card className="mt-4">
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
              {activeTab === "community" && (
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="showOnlyOthers"
                    checked={showOnlyOthers}
                    onCheckedChange={(checked) => setShowOnlyOthers(checked === true)}
                  />
                  <label
                    htmlFor="showOnlyOthers"
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 whitespace-nowrap"
                  >
                    Hide my own
                  </label>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Meal Plans Grid */}
        <TabsContent value={activeTab} className="mt-4">
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
            <Card
              key={mealPlan.id}
              className="cursor-pointer hover:border-primary/50 transition-colors"
              onClick={() => openViewDialog(mealPlan)}
            >
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
                      {mealPlan.isPublic && !mealPlan.isSystem && activeTab !== "community" && (
                        <Badge variant="secondary" className="text-xs">
                          <Globe className="mr-1 h-3 w-3" />
                          Shared
                        </Badge>
                      )}
                      {activeTab === "community" && mealPlan.coachId === session?.user?.id && (
                        <Badge variant="default" className="text-xs">
                          Yours
                        </Badge>
                      )}
                    </CardTitle>
                    <CardDescription className="mt-1">
                      {mealPlan.description || "No description"}
                    </CardDescription>
                    {activeTab === "community" && mealPlan.coach?.name && mealPlan.coachId !== session?.user?.id && (
                      <p className="text-xs text-muted-foreground mt-1">
                        by {mealPlan.coach.name}
                      </p>
                    )}
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                      <DropdownMenuItem onClick={() => openViewDialog(mealPlan)}>
                        <Eye className="mr-2 h-4 w-4" />
                        View Details
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => openAssignDialog(mealPlan.id)}>
                        <UserPlus className="mr-2 h-4 w-4" />
                        Assign to Clients
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => handleDuplicate(mealPlan)}>
                        <Copy className="mr-2 h-4 w-4" />
                        Duplicate
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => handleCreateVariation(mealPlan)}
                        disabled={isGeneratingVariation}
                      >
                        {isGeneratingVariation ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                          <Wand2 className="mr-2 h-4 w-4" />
                        )}
                        Create Variation
                      </DropdownMenuItem>
                      {!mealPlan.isSystem && mealPlan.coachId && (
                        <>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={(e) => {
                              e.stopPropagation();
                              handleTogglePublic(mealPlan);
                            }}
                          >
                            {mealPlan.isPublic ? (
                              <>
                                <Lock className="mr-2 h-4 w-4" />
                                Make Private
                              </>
                            ) : (
                              <>
                                <Globe className="mr-2 h-4 w-4" />
                                Share with Community
                              </>
                            )}
                          </DropdownMenuItem>
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
                        </>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
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
                  {mealPlan._count.assignedClients === 0 ? (
                    "Not assigned"
                  ) : mealPlan._count.assignedClients <= 3 ? (
                    mealPlan.assignedClients.map((ac) => ac.client.name).join(", ")
                  ) : (
                    <>
                      {mealPlan.assignedClients.slice(0, 2).map((ac) => ac.client.name).join(", ")}
                      {" and "}
                      {mealPlan._count.assignedClients - 2} more
                    </>
                  )}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={(e) => {
                    e.stopPropagation();
                    openAssignDialog(mealPlan.id);
                  }}
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
                {activeTab === "mine"
                  ? "Create your first meal plan"
                  : activeTab === "assigned"
                  ? "No meal plans have been assigned to clients yet"
                  : activeTab === "community"
                  ? "No coaches have shared meal plans yet"
                  : "Create your first meal plan to assign to clients"}
              </p>
              <Button onClick={() => setIsCreateOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Create Meal Plan
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
              Assign Meal Plan to Clients
            </DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground mt-1">
              Select clients to assign this meal plan to
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
            <Button onClick={handleAssign} disabled={assignMealPlan.isPending} className="h-10 px-5 gap-2">
              {assignMealPlan.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <UserPlus className="h-4 w-4" />
              )}
              Assign ({selectedClientIds.length})
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* View/Edit Meal Plan Dialog */}
      <Dialog open={isViewOpen} onOpenChange={setIsViewOpen}>
        <DialogContent className="max-w-3xl max-h-[85vh] flex flex-col p-0">
          {viewingMealPlan ? (
            <>
              <DialogHeader className="px-6 pt-6 pb-4 border-b flex-shrink-0">
                <div className="space-y-1">
                  {isEditMode ? (
                    <>
                      <DialogTitle className="sr-only">Edit Meal Plan</DialogTitle>
                      <Input
                        value={editFormData.title}
                        onChange={(e) => setEditFormData({ ...editFormData, title: e.target.value })}
                        className="text-xl font-semibold"
                        placeholder="Meal plan title"
                      />
                    </>
                  ) : (
                    <DialogTitle className="text-xl flex items-center gap-2">
                      {viewingMealPlan.title}
                      {viewingMealPlan.isSystem && (
                        <Badge variant="outline" className="text-xs">System</Badge>
                      )}
                      {!viewingMealPlan.isSystem && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setIsEditMode(!isEditMode)}
                          className="h-7 w-7"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                      )}
                    </DialogTitle>
                  )}
                  {isEditMode ? (
                    <div className="flex items-center gap-2">
                      <Textarea
                        value={editFormData.description}
                        onChange={(e) => setEditFormData({ ...editFormData, description: e.target.value })}
                        placeholder="Description"
                        rows={2}
                        className="flex-1"
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setIsEditMode(false)}
                        className="h-8 w-8 flex-shrink-0"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <DialogDescription>
                      {viewingMealPlan.description || "No description"}
                    </DialogDescription>
                  )}
                </div>

                {/* Quick Info Badges */}
                <div className="flex flex-wrap gap-2 mt-3">
                  {isEditMode ? (
                    <>
                      <Select
                        value={editFormData.goalType}
                        onValueChange={(value) => setEditFormData({ ...editFormData, goalType: value })}
                      >
                        <SelectTrigger className="w-[150px]">
                          <SelectValue placeholder="Goal type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="WEIGHT_LOSS">Weight Loss</SelectItem>
                          <SelectItem value="WEIGHT_GAIN">Weight Gain</SelectItem>
                          <SelectItem value="MAINTAIN_WEIGHT">Maintain Weight</SelectItem>
                        </SelectContent>
                      </Select>
                      <Input
                        value={editFormData.duration}
                        onChange={(e) => setEditFormData({ ...editFormData, duration: e.target.value })}
                        type="number"
                        placeholder="Days"
                        className="w-[100px]"
                      />
                    </>
                  ) : (
                    <>
                      {viewingMealPlan.goalType && getGoalBadge(viewingMealPlan.goalType)}
                      {viewingMealPlan.duration && (
                        <Badge variant="outline">
                          <Calendar className="mr-1 h-3 w-3" />
                          {viewingMealPlan.duration} days
                        </Badge>
                      )}
                      <Badge variant="outline">
                        <Users className="mr-1 h-3 w-3" />
                        {viewingMealPlan._count.assignedClients} assigned
                      </Badge>
                    </>
                  )}
                </div>
              </DialogHeader>

              <div className="flex-1 overflow-y-auto min-h-0">
                <div className="px-6 py-4 space-y-6">
                  {/* Daily Targets */}
                  <div>
                    <h4 className="font-medium mb-3 flex items-center gap-2">
                      <Target className="h-4 w-4" />
                      Daily Targets
                    </h4>
                    {isEditMode ? (
                      <div className="grid grid-cols-4 gap-3">
                        <div className="space-y-1">
                          <Label className="text-xs text-muted-foreground">Calories</Label>
                          <Input
                            value={editFormData.targetCalories}
                            onChange={(e) => setEditFormData({ ...editFormData, targetCalories: e.target.value })}
                            type="number"
                            placeholder="1600"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs text-muted-foreground">Protein (g)</Label>
                          <Input
                            value={editFormData.targetProtein}
                            onChange={(e) => setEditFormData({ ...editFormData, targetProtein: e.target.value })}
                            type="number"
                            placeholder="120"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs text-muted-foreground">Carbs (g)</Label>
                          <Input
                            value={editFormData.targetCarbs}
                            onChange={(e) => setEditFormData({ ...editFormData, targetCarbs: e.target.value })}
                            type="number"
                            placeholder="160"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs text-muted-foreground">Fats (g)</Label>
                          <Input
                            value={editFormData.targetFats}
                            onChange={(e) => setEditFormData({ ...editFormData, targetFats: e.target.value })}
                            type="number"
                            placeholder="53"
                          />
                        </div>
                      </div>
                    ) : (
                      <div className="grid grid-cols-4 gap-3">
                        <div className="bg-orange-50 dark:bg-orange-950/30 rounded-lg p-3 text-center">
                          <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                            {viewingMealPlan.targetCalories || "-"}
                          </p>
                          <p className="text-xs text-muted-foreground">Calories</p>
                        </div>
                        <div className="bg-blue-50 dark:bg-blue-950/30 rounded-lg p-3 text-center">
                          <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                            {viewingMealPlan.targetProtein || "-"}g
                          </p>
                          <p className="text-xs text-muted-foreground">Protein</p>
                        </div>
                        <div className="bg-amber-50 dark:bg-amber-950/30 rounded-lg p-3 text-center">
                          <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">
                            {viewingMealPlan.targetCarbs || "-"}g
                          </p>
                          <p className="text-xs text-muted-foreground">Carbs</p>
                        </div>
                        <div className="bg-purple-50 dark:bg-purple-950/30 rounded-lg p-3 text-center">
                          <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                            {viewingMealPlan.targetFats || "-"}g
                          </p>
                          <p className="text-xs text-muted-foreground">Fats</p>
                        </div>
                      </div>
                    )}
                  </div>

                  <Separator />

                  {/* Recipes by Day - Merged View */}
                  <div>
                    <h4 className="font-medium mb-3 flex items-center gap-2">
                      <UtensilsCrossed className="h-4 w-4" />
                      Meal Schedule
                    </h4>
                    {isLoadingDetails ? (
                      <div className="space-y-4">
                        {[1, 2, 3].map((i) => (
                          <Skeleton key={i} className="h-24 w-full" />
                        ))}
                      </div>
                    ) : (() => {
                      const { byDay, hasDatabaseRecipes, hasAiContent } = getMergedRecipes();
                      const sortedDays = Object.keys(byDay).map(Number).sort((a, b) => a - b);

                      if (sortedDays.length === 0) {
                        return (
                          <div className="text-center py-8 text-muted-foreground">
                            <UtensilsCrossed className="h-12 w-12 mx-auto mb-3 opacity-50" />
                            <p>No recipes added yet</p>
                            <p className="text-sm">Add recipes from the Recipes page</p>
                          </div>
                        );
                      }

                      return (
                        <div className="space-y-4">
                          {/* Show indicator if meal plan has mixed sources */}
                          {hasDatabaseRecipes && hasAiContent && (
                            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                              <Sparkles className="h-4 w-4 text-primary" />
                              <span>Combined view: AI-generated + custom recipes</span>
                            </div>
                          )}
                          {!hasDatabaseRecipes && hasAiContent && (
                            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                              <Sparkles className="h-4 w-4 text-primary" />
                              <span>AI-generated meal plan</span>
                            </div>
                          )}
                          {sortedDays.map((day) => {
                            const dayRecipes = byDay[day];
                            const slots = Object.keys(dayRecipes).sort((a, b) => {
                              const order = ['breakfast', 'lunch', 'dinner', 'snack'];
                              return order.indexOf(a) - order.indexOf(b);
                            });
                            const totals = getDayTotals(dayRecipes);

                            return (
                              <div key={day} className="border rounded-lg p-4">
                                <div className="flex items-center justify-between mb-3">
                                  <h5 className="font-medium flex items-center gap-2">
                                    <Calendar className="h-4 w-4" />
                                    Day {day}
                                  </h5>
                                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                    <Flame className="h-3 w-3" />
                                    {totals.calories} kcal
                                    <span>|</span>
                                    P: {totals.protein}g
                                    <span>|</span>
                                    C: {totals.carbs}g
                                    <span>|</span>
                                    F: {totals.fats}g
                                  </div>
                                </div>
                                <div className="grid gap-2">
                                  {slots.map((slot) => {
                                    const meal = dayRecipes[slot];
                                    const SlotIcon = getMealSlotIcon(slot);
                                    return (
                                      <div
                                        key={`${day}-${slot}`}
                                        className="flex items-center justify-between bg-muted/50 rounded-lg p-3"
                                      >
                                        <div className="flex items-center gap-3">
                                          <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10">
                                            <SlotIcon className="h-4 w-4 text-primary" />
                                          </div>
                                          <div>
                                            <div className="flex items-center gap-2">
                                              <p className="font-medium text-sm">{meal.recipeName}</p>
                                              {meal.source === 'database' && hasAiContent && (
                                                <Badge variant="outline" className="text-xs h-5 px-1.5">
                                                  Custom
                                                </Badge>
                                              )}
                                              {meal.source === 'ai' && hasDatabaseRecipes && (
                                                <Badge variant="secondary" className="text-xs h-5 px-1.5 gap-0.5">
                                                  <Sparkles className="h-2.5 w-2.5" />
                                                  AI
                                                </Badge>
                                              )}
                                            </div>
                                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                              <span className="capitalize">{slot}</span>
                                              <span>•</span>
                                              <span className="flex items-center gap-1">
                                                <Flame className="h-3 w-3" />
                                                {meal.calories} kcal
                                              </span>
                                              <span>•</span>
                                              <span>P: {meal.protein}g | C: {meal.carbs}g | F: {meal.fats}g</span>
                                              {meal.source === 'database' && (meal.prepTime || meal.cookTime) && (
                                                <>
                                                  <span>•</span>
                                                  <span className="flex items-center gap-1">
                                                    <Clock className="h-3 w-3" />
                                                    {(meal.prepTime || 0) + (meal.cookTime || 0)} min
                                                  </span>
                                                </>
                                              )}
                                            </div>
                                          </div>
                                        </div>
                                        <div className="flex items-center gap-1">
                                          {meal.source === 'ai' && (
                                            <Button
                                              variant="ghost"
                                              size="sm"
                                              className="h-8 gap-1.5 text-muted-foreground hover:text-primary"
                                              onClick={() => openSwapDialog(day, slot, meal.recipeName)}
                                            >
                                              <RefreshCw className="h-3.5 w-3.5" />
                                              <span className="text-xs">Swap</span>
                                            </Button>
                                          )}
                                          {!viewingMealPlan.isSystem && meal.source === 'database' && (
                                            <Button
                                              variant="ghost"
                                              size="icon"
                                              className="h-8 w-8 text-muted-foreground hover:text-destructive"
                                              onClick={() => handleRemoveRecipe(day, slot)}
                                            >
                                              <X className="h-4 w-4" />
                                            </Button>
                                          )}
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      );
                    })()}
                  </div>

                  {/* Assigned Clients */}
                  {mealPlanDetails?.assignedClients && mealPlanDetails.assignedClients.length > 0 && (
                    <>
                      <Separator />
                      <div>
                        <h4 className="font-medium mb-3 flex items-center gap-2">
                          <Users className="h-4 w-4" />
                          Assigned Clients
                        </h4>
                        <div className="flex flex-wrap gap-2">
                          {mealPlanDetails.assignedClients.map((ac) => (
                            <Badge key={ac.client.id} variant="secondary">
                              {ac.client.name}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>

              <DialogFooter className="px-6 py-4 border-t flex-shrink-0">
                {isEditMode ? (
                  <>
                    <Button variant="outline" onClick={() => setIsEditMode(false)} disabled={isAdaptingRecipes}>
                      Cancel
                    </Button>
                    <Button onClick={handleUpdate} disabled={updateMealPlan.isPending || isAdaptingRecipes}>
                      {(updateMealPlan.isPending || isAdaptingRecipes) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      {isAdaptingRecipes ? "Adapting Recipes..." : "Save Changes"}
                    </Button>
                  </>
                ) : (
                  <>
                    <Button variant="outline" onClick={() => setIsViewOpen(false)}>
                      Close
                    </Button>
                    <Button
                      onClick={() => {
                        setIsViewOpen(false);
                        openAssignDialog(viewingMealPlan.id);
                      }}
                    >
                      <UserPlus className="mr-2 h-4 w-4" />
                      Assign to Clients
                    </Button>
                  </>
                )}
              </DialogFooter>
            </>
          ) : (
            <DialogHeader>
              <DialogTitle>Meal Plan</DialogTitle>
            </DialogHeader>
          )}
        </DialogContent>
      </Dialog>

      {/* AI Generation Dialog */}
      <MealPlanGenerationDialog
        open={isGenerateOpen}
        onOpenChange={setIsGenerateOpen}
        onSuccess={() => refetch()}
      />

      {/* Swap Recipe Dialog */}
      <Dialog open={isSwapOpen} onOpenChange={setIsSwapOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              Swap Recipe with AI
            </DialogTitle>
            <DialogDescription>
              {swappingRecipe && (
                <>
                  Replace <span className="font-medium text-foreground">{swappingRecipe.currentName}</span> with one of these AI-suggested alternatives:
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 max-h-[400px] overflow-y-auto py-2">
            {(showAllAlternatives ? swapAlternatives : swapAlternatives.slice(0, 4)).map((alt, index) => {
              const SlotIcon = swappingRecipe ? getMealSlotIcon(swappingRecipe.slot) : Coffee;
              return (
                <div
                  key={index}
                  className="flex items-center justify-between p-3 rounded-lg border hover:border-primary hover:bg-primary/5 cursor-pointer transition-colors group"
                  onClick={() => !isSwapping && handleSwapRecipe(alt)}
                >
                  <div className="flex items-center gap-3">
                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 group-hover:bg-primary/20">
                      <SlotIcon className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium text-sm">{alt.name}</p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Flame className="h-3 w-3" />
                          {alt.calories} kcal
                        </span>
                        <span>•</span>
                        <span>P: {alt.protein}g | C: {alt.carbs}g | F: {alt.fats}g</span>
                      </div>
                    </div>
                  </div>
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                    {isSwapping ? (
                      <Loader2 className="h-4 w-4 animate-spin text-primary" />
                    ) : (
                      <Check className="h-4 w-4 text-primary" />
                    )}
                  </div>
                </div>
              );
            })}
            {!showAllAlternatives && swapAlternatives.length > 4 && (
              <Button
                variant="ghost"
                className="w-full text-sm text-muted-foreground hover:text-foreground"
                onClick={() => setShowAllAlternatives(true)}
              >
                <Plus className="h-4 w-4 mr-2" />
                Load more ({swapAlternatives.length - 4} more options)
              </Button>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsSwapOpen(false)} disabled={isSwapping}>
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
