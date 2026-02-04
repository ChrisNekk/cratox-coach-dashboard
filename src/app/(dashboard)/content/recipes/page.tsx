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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { MultiSelect } from "@/components/ui/multi-select";
import { Separator } from "@/components/ui/separator";
import { RecipeGenerationDialog } from "@/components/recipes/recipe-generation-dialog";
import { RecipeAdjustmentDialog } from "@/components/recipes/recipe-adjustment-dialog";
import {
  UtensilsCrossed,
  Plus,
  MoreHorizontal,
  Trash2,
  Clock,
  Users,
  Search,
  Loader2,
  UserPlus,
  Flame,
  Sparkles,
  Filter,
  ChevronDown,
  Wand2,
  ArrowUpDown,
  Link2,
  Eye,
  ChefHat,
  Utensils,
  Leaf,
  Droplets,
  Zap,
  Wine,
  X,
} from "lucide-react";
import { toast } from "sonner";

const DIETARY_TAGS = [
  { value: "vegan", label: "Vegan" },
  { value: "vegetarian", label: "Vegetarian" },
  { value: "keto", label: "Keto" },
  { value: "paleo", label: "Paleo" },
  { value: "gluten-free", label: "Gluten-Free" },
  { value: "dairy-free", label: "Dairy-Free" },
  { value: "halal", label: "Halal" },
  { value: "kosher", label: "Kosher" },
  { value: "low-carb", label: "Low-Carb" },
  { value: "high-protein", label: "High-Protein" },
];

const CATEGORIES = [
  { value: "all", label: "All Categories" },
  { value: "breakfast", label: "Breakfast" },
  { value: "lunch", label: "Lunch" },
  { value: "dinner", label: "Dinner" },
  { value: "snack", label: "Snack" },
  { value: "dessert", label: "Dessert" },
];

const SORT_OPTIONS = [
  { value: "createdAt-desc", label: "Newest First" },
  { value: "createdAt-asc", label: "Oldest First" },
  { value: "usageCount-desc", label: "Most Popular" },
  { value: "calories-asc", label: "Calories (Low to High)" },
  { value: "calories-desc", label: "Calories (High to Low)" },
  { value: "protein-desc", label: "Protein (High to Low)" },
];

type Recipe = {
  id: string;
  coachId: string | null;
  title: string;
  description: string | null;
  category: string | null;
  cuisine: string | null;
  calories: number | null;
  protein: number | null;
  carbs: number | null;
  fats: number | null;
  fiber: number | null;
  saturatedFat: number | null;
  unsaturatedFat: number | null;
  sugar: number | null;
  sodium: number | null;
  caffeine: number | null;
  alcohol: number | null;
  prepTime: number | null;
  cookTime: number | null;
  servings: number | null;
  ingredients: unknown;
  instructions: unknown;
  dietaryTags: unknown;
  imageUrl: string | null;
  isSystem: boolean;
  isPublic: boolean;
  usageCount: number;
  source: string;
  adaptedFromId: string | null;
  createdAt: Date;
  updatedAt: Date;
  _count: { assignedClients: number };
  adaptedFrom?: { id: string; title: string } | null;
};

export default function RecipesPage() {
  const [activeTab, setActiveTab] = useState("all");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isAssignOpen, setIsAssignOpen] = useState(false);
  const [isGenerateOpen, setIsGenerateOpen] = useState(false);
  const [isAdjustOpen, setIsAdjustOpen] = useState(false);
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);
  const [selectedRecipeId, setSelectedRecipeId] = useState<string>("");
  const [selectedClientIds, setSelectedClientIds] = useState<string[]>([]);

  // Filters
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [dietaryTagsFilter, setDietaryTagsFilter] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState("createdAt-desc");
  const [calorieMin, setCalorieMin] = useState("");
  const [calorieMax, setCalorieMax] = useState("");
  const [proteinMin, setProteinMin] = useState("");
  const [proteinMax, setProteinMax] = useState("");

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    category: "",
    calories: "",
    protein: "",
    carbs: "",
    fats: "",
    fiber: "",
    saturatedFat: "",
    unsaturatedFat: "",
    sugar: "",
    sodium: "",
    caffeine: "",
    alcohol: "",
    prepTime: "",
    cookTime: "",
    servings: "",
    ingredients: "",
  });

  // Parse sort option
  const [sortField, sortOrder] = sortBy.split("-") as [string, "asc" | "desc"];

  // Build query params based on active tab
  const getQueryParams = () => {
    const params: Record<string, unknown> = {
      category: categoryFilter !== "all" ? categoryFilter : undefined,
      dietaryTags: dietaryTagsFilter.length > 0 ? dietaryTagsFilter : undefined,
      search: search || undefined,
      sortBy: sortField as "createdAt" | "usageCount" | "calories" | "protein",
      sortOrder: sortOrder,
      calorieRange:
        calorieMin || calorieMax
          ? { min: parseInt(calorieMin) || 0, max: parseInt(calorieMax) || 10000 }
          : undefined,
      proteinRange:
        proteinMin || proteinMax
          ? { min: parseInt(proteinMin) || 0, max: parseInt(proteinMax) || 500 }
          : undefined,
    };

    if (activeTab === "mine") {
      params.onlyMine = true;
      params.includeShared = false;
      params.includeSystem = false;
    } else if (activeTab === "shared") {
      params.onlyMine = false;
      params.includeShared = true;
      params.includeSystem = true;
    } else if (activeTab === "ai") {
      params.source = "AI_GENERATED";
    }

    return params;
  };

  const { data: recipes, isLoading, refetch } = trpc.content.getRecipes.useQuery(getQueryParams());
  const { data: clients } = trpc.client.getAll.useQuery();

  const createRecipe = trpc.content.createRecipe.useMutation({
    onSuccess: () => {
      toast.success("Recipe created!");
      setIsCreateOpen(false);
      resetForm();
      refetch();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to create recipe");
    },
  });

  const deleteRecipe = trpc.content.deleteRecipe.useMutation({
    onSuccess: () => {
      toast.success("Recipe deleted");
      refetch();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to delete recipe");
    },
  });

  const assignRecipe = trpc.content.assignRecipe.useMutation({
    onSuccess: () => {
      toast.success("Recipe assigned to clients!");
      setIsAssignOpen(false);
      setSelectedClientIds([]);
      refetch();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to assign recipe");
    },
  });

  const resetForm = () => {
    setFormData({
      title: "",
      description: "",
      category: "",
      calories: "",
      protein: "",
      carbs: "",
      fats: "",
      fiber: "",
      saturatedFat: "",
      unsaturatedFat: "",
      sugar: "",
      sodium: "",
      caffeine: "",
      alcohol: "",
      prepTime: "",
      cookTime: "",
      servings: "",
      ingredients: "",
    });
  };

  const handleCreate = () => {
    if (!formData.title) {
      toast.error("Please enter a recipe title");
      return;
    }
    createRecipe.mutate({
      title: formData.title,
      description: formData.description || undefined,
      category: formData.category || undefined,
      calories: formData.calories ? parseInt(formData.calories) : undefined,
      protein: formData.protein ? parseFloat(formData.protein) : undefined,
      carbs: formData.carbs ? parseFloat(formData.carbs) : undefined,
      fats: formData.fats ? parseFloat(formData.fats) : undefined,
      fiber: formData.fiber ? parseFloat(formData.fiber) : undefined,
      saturatedFat: formData.saturatedFat ? parseFloat(formData.saturatedFat) : undefined,
      unsaturatedFat: formData.unsaturatedFat ? parseFloat(formData.unsaturatedFat) : undefined,
      sugar: formData.sugar ? parseFloat(formData.sugar) : undefined,
      sodium: formData.sodium ? parseFloat(formData.sodium) : undefined,
      caffeine: formData.caffeine ? parseFloat(formData.caffeine) : undefined,
      alcohol: formData.alcohol ? parseFloat(formData.alcohol) : undefined,
      prepTime: formData.prepTime ? parseInt(formData.prepTime) : undefined,
      cookTime: formData.cookTime ? parseInt(formData.cookTime) : undefined,
      servings: formData.servings ? parseInt(formData.servings) : undefined,
    });
  };

  const calculateNutrition = trpc.recipeAi.calculateNutrition.useMutation({
    onSuccess: (data) => {
      setFormData((prev) => ({
        ...prev,
        calories: String(data.nutrition.calories),
        protein: String(data.nutrition.protein),
        carbs: String(data.nutrition.carbs),
        fats: String(data.nutrition.fats),
        fiber: String(data.nutrition.fiber),
        saturatedFat: String(data.nutrition.saturatedFat),
        unsaturatedFat: String(data.nutrition.unsaturatedFat),
        sugar: String(data.nutrition.sugar),
        sodium: String(data.nutrition.sodium),
        caffeine: String(data.nutrition.caffeine),
        alcohol: String(data.nutrition.alcohol),
      }));
      toast.success("Macros calculated with AI!");
    },
    onError: (error) => {
      toast.error(error.message || "Failed to calculate macros");
    },
  });

  const handleCalculateMacros = () => {
    if (!formData.title) {
      toast.error("Please enter a recipe title first");
      return;
    }
    calculateNutrition.mutate({
      title: formData.title,
      description: formData.description || undefined,
      ingredients: formData.ingredients || undefined,
      servings: formData.servings ? parseInt(formData.servings) : 1,
    });
  };

  const handleAssign = () => {
    if (selectedClientIds.length === 0) {
      toast.error("Please select at least one client");
      return;
    }
    assignRecipe.mutate({
      recipeId: selectedRecipeId,
      clientIds: selectedClientIds,
    });
  };

  const openAssignDialog = (recipeId: string) => {
    setSelectedRecipeId(recipeId);
    setIsAssignOpen(true);
  };

  const openAdjustDialog = (recipe: Recipe) => {
    setSelectedRecipe(recipe);
    setIsAdjustOpen(true);
  };

  const openViewDialog = (recipe: Recipe) => {
    setSelectedRecipe(recipe);
    setIsViewOpen(true);
  };

  const toggleClientSelection = (clientId: string) => {
    setSelectedClientIds((prev) =>
      prev.includes(clientId)
        ? prev.filter((id) => id !== clientId)
        : [...prev, clientId]
    );
  };

  const clearFilters = () => {
    setCategoryFilter("all");
    setDietaryTagsFilter([]);
    setCalorieMin("");
    setCalorieMax("");
    setProteinMin("");
    setProteinMax("");
    setSearch("");
  };

  const hasActiveFilters =
    categoryFilter !== "all" ||
    dietaryTagsFilter.length > 0 ||
    calorieMin ||
    calorieMax ||
    proteinMin ||
    proteinMax;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Recipes</h2>
          <p className="text-muted-foreground">
            Manage and share healthy recipes with your clients
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
                Create Recipe
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Create New Recipe</DialogTitle>
                <DialogDescription>
                  Add a healthy recipe for your clients
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4 max-h-[60vh] overflow-y-auto">
                <div className="space-y-2">
                  <Label htmlFor="title">Recipe Title *</Label>
                  <Input
                    id="title"
                    placeholder="High Protein Breakfast Bowl"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    placeholder="A delicious and nutritious..."
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ingredients">Ingredients (for AI calculation)</Label>
                  <Textarea
                    id="ingredients"
                    placeholder="200g Greek yogurt, 100g mixed berries, 40g granola..."
                    value={formData.ingredients}
                    onChange={(e) => setFormData({ ...formData, ingredients: e.target.value })}
                    rows={3}
                  />
                  <p className="text-xs text-muted-foreground">
                    List ingredients to help AI calculate accurate macros
                  </p>
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
                        <SelectItem value="breakfast">Breakfast</SelectItem>
                        <SelectItem value="lunch">Lunch</SelectItem>
                        <SelectItem value="dinner">Dinner</SelectItem>
                        <SelectItem value="snack">Snack</SelectItem>
                        <SelectItem value="dessert">Dessert</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="servings">Servings</Label>
                    <Input
                      id="servings"
                      type="number"
                      min="1"
                      placeholder="2"
                      value={formData.servings}
                      onChange={(e) => setFormData({ ...formData, servings: e.target.value })}
                    />
                  </div>
                </div>

                {/* AI Calculate Button */}
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={handleCalculateMacros}
                  disabled={calculateNutrition.isPending || !formData.title}
                >
                  {calculateNutrition.isPending ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Sparkles className="mr-2 h-4 w-4" />
                  )}
                  Calculate Macros with AI
                </Button>

                {/* Main Macros */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Main Macros (per serving)</Label>
                  <div className="grid grid-cols-4 gap-3">
                    <div className="space-y-1">
                      <Label htmlFor="calories" className="text-xs text-muted-foreground">Calories</Label>
                      <Input
                        id="calories"
                        type="number"
                        min="0"
                        placeholder="450"
                        value={formData.calories}
                        onChange={(e) => setFormData({ ...formData, calories: e.target.value })}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="protein" className="text-xs text-muted-foreground">Protein (g)</Label>
                      <Input
                        id="protein"
                        type="number"
                        min="0"
                        placeholder="35"
                        value={formData.protein}
                        onChange={(e) => setFormData({ ...formData, protein: e.target.value })}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="carbs" className="text-xs text-muted-foreground">Carbs (g)</Label>
                      <Input
                        id="carbs"
                        type="number"
                        min="0"
                        placeholder="45"
                        value={formData.carbs}
                        onChange={(e) => setFormData({ ...formData, carbs: e.target.value })}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="fats" className="text-xs text-muted-foreground">Fats (g)</Label>
                      <Input
                        id="fats"
                        type="number"
                        min="0"
                        placeholder="15"
                        value={formData.fats}
                        onChange={(e) => setFormData({ ...formData, fats: e.target.value })}
                      />
                    </div>
                  </div>
                </div>

                {/* Detailed Macros */}
                <Collapsible>
                  <CollapsibleTrigger asChild>
                    <Button variant="ghost" size="sm" className="w-full justify-between">
                      <span className="text-sm">Detailed Nutrition</span>
                      <ChevronDown className="h-4 w-4" />
                    </Button>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="space-y-3 pt-2">
                    <div className="grid grid-cols-4 gap-3">
                      <div className="space-y-1">
                        <Label htmlFor="fiber" className="text-xs text-muted-foreground">Fiber (g)</Label>
                        <Input
                          id="fiber"
                          type="number"
                          min="0"
                          placeholder="4"
                          value={formData.fiber}
                          onChange={(e) => setFormData({ ...formData, fiber: e.target.value })}
                        />
                      </div>
                      <div className="space-y-1">
                        <Label htmlFor="sugar" className="text-xs text-muted-foreground">Sugar (g)</Label>
                        <Input
                          id="sugar"
                          type="number"
                          min="0"
                          placeholder="8"
                          value={formData.sugar}
                          onChange={(e) => setFormData({ ...formData, sugar: e.target.value })}
                        />
                      </div>
                      <div className="space-y-1">
                        <Label htmlFor="saturatedFat" className="text-xs text-muted-foreground">Sat. Fat (g)</Label>
                        <Input
                          id="saturatedFat"
                          type="number"
                          min="0"
                          placeholder="4"
                          value={formData.saturatedFat}
                          onChange={(e) => setFormData({ ...formData, saturatedFat: e.target.value })}
                        />
                      </div>
                      <div className="space-y-1">
                        <Label htmlFor="unsaturatedFat" className="text-xs text-muted-foreground">Unsat. Fat (g)</Label>
                        <Input
                          id="unsaturatedFat"
                          type="number"
                          min="0"
                          placeholder="9"
                          value={formData.unsaturatedFat}
                          onChange={(e) => setFormData({ ...formData, unsaturatedFat: e.target.value })}
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                      <div className="space-y-1">
                        <Label htmlFor="sodium" className="text-xs text-muted-foreground">Sodium (mg)</Label>
                        <Input
                          id="sodium"
                          type="number"
                          min="0"
                          placeholder="450"
                          value={formData.sodium}
                          onChange={(e) => setFormData({ ...formData, sodium: e.target.value })}
                        />
                      </div>
                      <div className="space-y-1">
                        <Label htmlFor="caffeine" className="text-xs text-muted-foreground">Caffeine (mg)</Label>
                        <Input
                          id="caffeine"
                          type="number"
                          min="0"
                          placeholder="0"
                          value={formData.caffeine}
                          onChange={(e) => setFormData({ ...formData, caffeine: e.target.value })}
                        />
                      </div>
                      <div className="space-y-1">
                        <Label htmlFor="alcohol" className="text-xs text-muted-foreground">Alcohol (g)</Label>
                        <Input
                          id="alcohol"
                          type="number"
                          min="0"
                          placeholder="0"
                          value={formData.alcohol}
                          onChange={(e) => setFormData({ ...formData, alcohol: e.target.value })}
                        />
                      </div>
                    </div>
                  </CollapsibleContent>
                </Collapsible>

                {/* Time */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="prepTime">Prep Time (min)</Label>
                    <Input
                      id="prepTime"
                      type="number"
                      min="0"
                      placeholder="10"
                      value={formData.prepTime}
                      onChange={(e) => setFormData({ ...formData, prepTime: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="cookTime">Cook Time (min)</Label>
                    <Input
                      id="cookTime"
                      type="number"
                      min="0"
                      placeholder="15"
                      value={formData.cookTime}
                      onChange={(e) => setFormData({ ...formData, cookTime: e.target.value })}
                    />
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleCreate} disabled={createRecipe.isPending}>
                  {createRecipe.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Create Recipe
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="all">All Recipes</TabsTrigger>
          <TabsTrigger value="mine">My Recipes</TabsTrigger>
          <TabsTrigger value="shared">Shared Library</TabsTrigger>
          <TabsTrigger value="ai">AI Generated</TabsTrigger>
        </TabsList>

        {/* Filters */}
        <Card className="mt-4">
          <CardContent className="pt-6">
            <div className="flex flex-col gap-4">
              {/* Search and Quick Filters */}
              <div className="flex flex-col gap-4 md:flex-row">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Search recipes..."
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
                    {CATEGORIES.map((cat) => (
                      <SelectItem key={cat.value} value={cat.value}>
                        {cat.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={sortBy} onValueChange={setSortBy}>
                  <SelectTrigger className="w-full md:w-[200px]">
                    <ArrowUpDown className="mr-2 h-4 w-4" />
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SORT_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Collapsible open={isFiltersOpen} onOpenChange={setIsFiltersOpen}>
                  <CollapsibleTrigger asChild>
                    <Button variant="outline" className="gap-2">
                      <Filter className="h-4 w-4" />
                      Filters
                      {hasActiveFilters && (
                        <Badge variant="secondary" className="ml-1">
                          {
                            [
                              categoryFilter !== "all" ? 1 : 0,
                              dietaryTagsFilter.length > 0 ? 1 : 0,
                              calorieMin || calorieMax ? 1 : 0,
                              proteinMin || proteinMax ? 1 : 0,
                            ].reduce((a, b) => a + b, 0)
                          }
                        </Badge>
                      )}
                      <ChevronDown
                        className={`h-4 w-4 transition-transform ${isFiltersOpen ? "rotate-180" : ""}`}
                      />
                    </Button>
                  </CollapsibleTrigger>
                </Collapsible>
              </div>

              {/* Advanced Filters */}
              <Collapsible open={isFiltersOpen} onOpenChange={setIsFiltersOpen}>
                <CollapsibleContent className="space-y-4 pt-4 border-t">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label>Dietary Requirements</Label>
                      <MultiSelect
                        options={DIETARY_TAGS}
                        selected={dietaryTagsFilter}
                        onChange={setDietaryTagsFilter}
                        placeholder="Any dietary tags..."
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Calorie Range</Label>
                      <div className="flex items-center gap-2">
                        <Input
                          type="number"
                          placeholder="Min"
                          value={calorieMin}
                          onChange={(e) => setCalorieMin(e.target.value)}
                        />
                        <span className="text-muted-foreground">-</span>
                        <Input
                          type="number"
                          placeholder="Max"
                          value={calorieMax}
                          onChange={(e) => setCalorieMax(e.target.value)}
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Protein Range (g)</Label>
                      <div className="flex items-center gap-2">
                        <Input
                          type="number"
                          placeholder="Min"
                          value={proteinMin}
                          onChange={(e) => setProteinMin(e.target.value)}
                        />
                        <span className="text-muted-foreground">-</span>
                        <Input
                          type="number"
                          placeholder="Max"
                          value={proteinMax}
                          onChange={(e) => setProteinMax(e.target.value)}
                        />
                      </div>
                    </div>
                  </div>
                  {hasActiveFilters && (
                    <div className="flex justify-end">
                      <Button variant="ghost" size="sm" onClick={clearFilters}>
                        Clear all filters
                      </Button>
                    </div>
                  )}
                </CollapsibleContent>
              </Collapsible>
            </div>
          </CardContent>
        </Card>

        {/* Recipe Grid */}
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
          ) : recipes && recipes.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {recipes.map((recipe) => (
                <Card
                  key={recipe.id}
                  className="cursor-pointer hover:border-primary/50 transition-colors"
                  onClick={() => openViewDialog(recipe)}
                >
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <CardTitle className="flex items-center gap-2 text-base">
                          {recipe.title}
                          {recipe.isSystem && (
                            <Badge variant="outline" className="text-xs">
                              System
                            </Badge>
                          )}
                          {recipe.source === "AI_GENERATED" && (
                            <Badge variant="secondary" className="text-xs gap-1">
                              <Sparkles className="h-3 w-3" />
                              AI
                            </Badge>
                          )}
                        </CardTitle>
                        <CardDescription className="line-clamp-1">
                          {recipe.description || "No description"}
                        </CardDescription>
                        {recipe.adaptedFrom && (
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Link2 className="h-3 w-3" />
                            Adapted from: {recipe.adaptedFrom.title}
                          </div>
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
                          <DropdownMenuItem onClick={() => openViewDialog(recipe)}>
                            <Eye className="mr-2 h-4 w-4" />
                            View Details
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => openAssignDialog(recipe.id)}>
                            <UserPlus className="mr-2 h-4 w-4" />
                            Assign to Clients
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => openAdjustDialog(recipe)}>
                            <Wand2 className="mr-2 h-4 w-4" />
                            Adjust Macros
                          </DropdownMenuItem>
                          {!recipe.isSystem && (
                            <>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                className="text-destructive"
                                onClick={() => {
                                  if (confirm("Delete this recipe?")) {
                                    deleteRecipe.mutate({ id: recipe.id });
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
                    {/* Dietary Tags */}
                    {recipe.dietaryTags && (recipe.dietaryTags as string[]).length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {(recipe.dietaryTags as string[]).slice(0, 3).map((tag) => (
                          <Badge key={tag} variant="outline" className="text-xs">
                            {tag}
                          </Badge>
                        ))}
                        {(recipe.dietaryTags as string[]).length > 3 && (
                          <Badge variant="outline" className="text-xs">
                            +{(recipe.dietaryTags as string[]).length - 3}
                          </Badge>
                        )}
                      </div>
                    )}

                    {/* Category */}
                    <div className="flex flex-wrap gap-2">
                      {recipe.category && (
                        <Badge variant="secondary" className="capitalize">
                          {recipe.category}
                        </Badge>
                      )}
                    </div>

                    {/* Macros */}
                    {recipe.calories && (
                      <div className="flex items-center gap-4 text-sm">
                        <div className="flex items-center gap-1 text-orange-500">
                          <Flame className="h-4 w-4" />
                          {recipe.calories} kcal
                        </div>
                        {recipe.protein && (
                          <span className="text-muted-foreground">P: {recipe.protein}g</span>
                        )}
                        {recipe.carbs && (
                          <span className="text-muted-foreground">C: {recipe.carbs}g</span>
                        )}
                        {recipe.fats && (
                          <span className="text-muted-foreground">F: {recipe.fats}g</span>
                        )}
                      </div>
                    )}

                    {/* Time & Usage */}
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      {(recipe.prepTime || recipe.cookTime) && (
                        <div className="flex items-center gap-1">
                          <Clock className="h-4 w-4" />
                          {(recipe.prepTime || 0) + (recipe.cookTime || 0)} min
                        </div>
                      )}
                      <div className="flex items-center gap-1">
                        <Users className="h-4 w-4" />
                        {recipe._count.assignedClients} assigned
                      </div>
                      {recipe.usageCount > 0 && (
                        <span>{recipe.usageCount} uses</span>
                      )}
                    </div>

                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full"
                      onClick={(e) => {
                        e.stopPropagation();
                        openAssignDialog(recipe.id);
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
                  <UtensilsCrossed className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                  <h3 className="text-lg font-medium mb-2">No recipes found</h3>
                  <p className="text-muted-foreground mb-4">
                    {hasActiveFilters
                      ? "Try adjusting your filters"
                      : "Create your first recipe or generate one with AI"}
                  </p>
                  <div className="flex justify-center gap-2">
                    {hasActiveFilters && (
                      <Button variant="outline" onClick={clearFilters}>
                        Clear Filters
                      </Button>
                    )}
                    <Button variant="outline" onClick={() => setIsGenerateOpen(true)}>
                      <Sparkles className="mr-2 h-4 w-4" />
                      Generate with AI
                    </Button>
                    <Button onClick={() => setIsCreateOpen(true)}>
                      <Plus className="mr-2 h-4 w-4" />
                      Create Recipe
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* Assign Dialog */}
      <Dialog open={isAssignOpen} onOpenChange={setIsAssignOpen}>
        <DialogContent className="sm:max-w-[500px] p-0 gap-0 overflow-hidden">
          <div className="px-6 py-5 border-b">
            <DialogTitle className="flex items-center gap-2.5 text-lg font-semibold">
              <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary/10">
                <UserPlus className="h-4 w-4 text-primary" />
              </div>
              Assign Recipe to Clients
            </DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground mt-1">
              Select clients to share this recipe with
            </DialogDescription>
          </div>

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
                  <div
                    className={`flex-shrink-0 h-5 w-5 rounded-md border-2 flex items-center justify-center transition-all ${
                      selectedClientIds.includes(client.id)
                        ? "bg-primary border-primary"
                        : "border-gray-300 dark:border-gray-600"
                    }`}
                  >
                    {selectedClientIds.includes(client.id) && (
                      <svg
                        className="h-3 w-3 text-white"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={3}
                      >
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

          <div className="px-6 py-4 border-t bg-muted/30 flex items-center justify-end gap-3">
            <Button variant="outline" onClick={() => setIsAssignOpen(false)} className="h-10 px-5">
              Cancel
            </Button>
            <Button
              onClick={handleAssign}
              disabled={assignRecipe.isPending}
              className="h-10 px-5 gap-2"
            >
              {assignRecipe.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <UserPlus className="h-4 w-4" />
              )}
              Assign ({selectedClientIds.length})
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* AI Generation Dialog */}
      <RecipeGenerationDialog
        open={isGenerateOpen}
        onOpenChange={setIsGenerateOpen}
        onSuccess={() => refetch()}
      />

      {/* Recipe Adjustment Dialog */}
      <RecipeAdjustmentDialog
        open={isAdjustOpen}
        onOpenChange={setIsAdjustOpen}
        recipe={selectedRecipe}
        onSuccess={() => refetch()}
      />

      {/* Recipe Detail Dialog */}
      <Dialog open={isViewOpen} onOpenChange={setIsViewOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col p-0">
          {selectedRecipe && (
            <>
              <DialogHeader className="px-6 pt-6 pb-4 border-b flex-shrink-0">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <DialogTitle className="text-xl flex items-center gap-2">
                      {selectedRecipe.title}
                      {selectedRecipe.source === "AI_GENERATED" && (
                        <Badge variant="secondary" className="text-xs gap-1">
                          <Sparkles className="h-3 w-3" />
                          AI Generated
                        </Badge>
                      )}
                    </DialogTitle>
                    <DialogDescription className="text-sm">
                      {selectedRecipe.description || "No description available"}
                    </DialogDescription>
                  </div>
                </div>
                {/* Category & Time badges */}
                <div className="flex flex-wrap gap-2 mt-3">
                  {selectedRecipe.category && (
                    <Badge variant="secondary" className="capitalize">
                      <ChefHat className="mr-1 h-3 w-3" />
                      {selectedRecipe.category}
                    </Badge>
                  )}
                  {selectedRecipe.cuisine && (
                    <Badge variant="outline" className="capitalize">
                      {selectedRecipe.cuisine}
                    </Badge>
                  )}
                  {(selectedRecipe.prepTime || selectedRecipe.cookTime) && (
                    <Badge variant="outline">
                      <Clock className="mr-1 h-3 w-3" />
                      {(selectedRecipe.prepTime || 0) + (selectedRecipe.cookTime || 0)} min total
                    </Badge>
                  )}
                  {selectedRecipe.servings && (
                    <Badge variant="outline">
                      <Users className="mr-1 h-3 w-3" />
                      {selectedRecipe.servings} servings
                    </Badge>
                  )}
                </div>
                {/* Dietary Tags */}
                {Array.isArray(selectedRecipe.dietaryTags) && (selectedRecipe.dietaryTags as string[]).length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {(selectedRecipe.dietaryTags as string[]).map((tag) => (
                      <Badge key={tag} variant="outline" className="text-xs bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/30">
                        <Leaf className="mr-1 h-3 w-3" />
                        {tag}
                      </Badge>
                    ))}
                  </div>
                )}
              </DialogHeader>

              <div className="flex-1 overflow-y-auto min-h-0 px-6 py-4">
                <div className="space-y-6">
                  {/* Nutrition Grid */}
                  {selectedRecipe.calories && (
                    <div>
                      <h4 className="font-medium mb-3 flex items-center gap-2">
                        <Flame className="h-4 w-4 text-orange-500" />
                        Nutrition (per serving)
                      </h4>
                      <div className="grid grid-cols-4 gap-3">
                        <div className="bg-orange-50 dark:bg-orange-950/30 rounded-lg p-3 text-center">
                          <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">{selectedRecipe.calories}</p>
                          <p className="text-xs text-muted-foreground">Calories</p>
                        </div>
                        <div className="bg-blue-50 dark:bg-blue-950/30 rounded-lg p-3 text-center">
                          <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{selectedRecipe.protein || 0}g</p>
                          <p className="text-xs text-muted-foreground">Protein</p>
                        </div>
                        <div className="bg-amber-50 dark:bg-amber-950/30 rounded-lg p-3 text-center">
                          <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">{selectedRecipe.carbs || 0}g</p>
                          <p className="text-xs text-muted-foreground">Carbs</p>
                        </div>
                        <div className="bg-purple-50 dark:bg-purple-950/30 rounded-lg p-3 text-center">
                          <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">{selectedRecipe.fats || 0}g</p>
                          <p className="text-xs text-muted-foreground">Fats</p>
                        </div>
                      </div>
                      {/* Extended nutrition */}
                      {(selectedRecipe.fiber || selectedRecipe.sugar || selectedRecipe.sodium ||
                        selectedRecipe.saturatedFat || selectedRecipe.unsaturatedFat ||
                        selectedRecipe.caffeine || selectedRecipe.alcohol) && (
                        <div className="grid grid-cols-4 gap-3 mt-3">
                          {selectedRecipe.fiber !== null && selectedRecipe.fiber !== undefined && (
                            <div className="bg-muted/50 rounded-lg p-2 text-center">
                              <p className="font-semibold">{selectedRecipe.fiber}g</p>
                              <p className="text-xs text-muted-foreground">Fiber</p>
                            </div>
                          )}
                          {selectedRecipe.sugar !== null && selectedRecipe.sugar !== undefined && (
                            <div className="bg-muted/50 rounded-lg p-2 text-center">
                              <p className="font-semibold">{selectedRecipe.sugar}g</p>
                              <p className="text-xs text-muted-foreground">Sugar</p>
                            </div>
                          )}
                          {selectedRecipe.sodium !== null && selectedRecipe.sodium !== undefined && (
                            <div className="bg-muted/50 rounded-lg p-2 text-center">
                              <p className="font-semibold">{selectedRecipe.sodium}mg</p>
                              <p className="text-xs text-muted-foreground">Sodium</p>
                            </div>
                          )}
                          {selectedRecipe.saturatedFat !== null && selectedRecipe.saturatedFat !== undefined && (
                            <div className="bg-muted/50 rounded-lg p-2 text-center">
                              <p className="font-semibold">{selectedRecipe.saturatedFat}g</p>
                              <p className="text-xs text-muted-foreground">Sat. Fat</p>
                            </div>
                          )}
                          {selectedRecipe.unsaturatedFat !== null && selectedRecipe.unsaturatedFat !== undefined && (
                            <div className="bg-muted/50 rounded-lg p-2 text-center">
                              <p className="font-semibold">{selectedRecipe.unsaturatedFat}g</p>
                              <p className="text-xs text-muted-foreground">Unsat. Fat</p>
                            </div>
                          )}
                          {selectedRecipe.caffeine !== null && selectedRecipe.caffeine !== undefined && (
                            <div className="bg-muted/50 rounded-lg p-2 text-center">
                              <p className="font-semibold">{selectedRecipe.caffeine}mg</p>
                              <p className="text-xs text-muted-foreground">Caffeine</p>
                            </div>
                          )}
                          {selectedRecipe.alcohol !== null && selectedRecipe.alcohol !== undefined && (
                            <div className="bg-muted/50 rounded-lg p-2 text-center">
                              <p className="font-semibold">{selectedRecipe.alcohol}g</p>
                              <p className="text-xs text-muted-foreground">Alcohol</p>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  <Separator />

                  {/* Time breakdown */}
                  {(selectedRecipe.prepTime || selectedRecipe.cookTime) && (
                    <div>
                      <h4 className="font-medium mb-3 flex items-center gap-2">
                        <Clock className="h-4 w-4" />
                        Time
                      </h4>
                      <div className="grid grid-cols-3 gap-3">
                        {selectedRecipe.prepTime && (
                          <div className="bg-muted/50 rounded-lg p-3 text-center">
                            <p className="text-xl font-semibold">{selectedRecipe.prepTime} min</p>
                            <p className="text-xs text-muted-foreground">Prep Time</p>
                          </div>
                        )}
                        {selectedRecipe.cookTime && (
                          <div className="bg-muted/50 rounded-lg p-3 text-center">
                            <p className="text-xl font-semibold">{selectedRecipe.cookTime} min</p>
                            <p className="text-xs text-muted-foreground">Cook Time</p>
                          </div>
                        )}
                        <div className="bg-primary/10 rounded-lg p-3 text-center">
                          <p className="text-xl font-semibold text-primary">
                            {(selectedRecipe.prepTime || 0) + (selectedRecipe.cookTime || 0)} min
                          </p>
                          <p className="text-xs text-muted-foreground">Total</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Ingredients */}
                  {Array.isArray(selectedRecipe.ingredients) && (selectedRecipe.ingredients as Array<{name: string; amount: number; unit: string; notes?: string}>).length > 0 && (
                    <>
                      <Separator />
                      <div>
                        <h4 className="font-medium mb-3 flex items-center gap-2">
                          <Utensils className="h-4 w-4" />
                          Ingredients
                        </h4>
                        <ul className="space-y-2">
                          {(selectedRecipe.ingredients as Array<{name: string; amount: number; unit: string; notes?: string}>).map((ing, i) => (
                            <li key={i} className="flex items-start gap-2 text-sm">
                              <span className="text-primary mt-1">•</span>
                              <span>
                                <strong>{ing.amount} {ing.unit}</strong> {ing.name}
                                {ing.notes && <span className="text-muted-foreground"> ({ing.notes})</span>}
                              </span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </>
                  )}

                  {/* Instructions */}
                  {Array.isArray(selectedRecipe.instructions) && (selectedRecipe.instructions as Array<{step: number; instruction: string; duration?: number}>).length > 0 && (
                    <>
                      <Separator />
                      <div>
                        <h4 className="font-medium mb-3 flex items-center gap-2">
                          <ChefHat className="h-4 w-4" />
                          Instructions
                        </h4>
                        <ol className="space-y-3">
                          {(selectedRecipe.instructions as Array<{step: number; instruction: string; duration?: number}>).map((inst) => (
                            <li key={inst.step} className="flex gap-3 text-sm">
                              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-medium">
                                {inst.step}
                              </span>
                              <div>
                                <p>{inst.instruction}</p>
                                {inst.duration && (
                                  <p className="text-xs text-muted-foreground mt-1">
                                    <Clock className="inline h-3 w-3 mr-1" />
                                    {inst.duration} min
                                  </p>
                                )}
                              </div>
                            </li>
                          ))}
                        </ol>
                      </div>
                    </>
                  )}

                  {/* Adapted from */}
                  {selectedRecipe.adaptedFrom && (
                    <>
                      <Separator />
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Link2 className="h-4 w-4" />
                        Adapted from: <span className="font-medium">{selectedRecipe.adaptedFrom.title}</span>
                      </div>
                    </>
                  )}
                </div>
              </div>

              <DialogFooter className="px-6 py-4 border-t flex-shrink-0">
                <Button variant="outline" onClick={() => setIsViewOpen(false)}>
                  Close
                </Button>
                <Button
                  onClick={() => {
                    setIsViewOpen(false);
                    openAssignDialog(selectedRecipe.id);
                  }}
                >
                  <UserPlus className="mr-2 h-4 w-4" />
                  Assign to Clients
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
