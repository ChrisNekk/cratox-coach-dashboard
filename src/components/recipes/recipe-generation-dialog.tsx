"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
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
import { MultiSelect } from "@/components/ui/multi-select";
import { Sparkles, Loader2, X, Plus, AlertCircle, Check } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";

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

const MEAL_TYPES = [
  { value: "breakfast", label: "Breakfast" },
  { value: "lunch", label: "Lunch" },
  { value: "dinner", label: "Dinner" },
  { value: "snack", label: "Snack" },
];

const CUISINES = [
  { value: "italian", label: "Italian" },
  { value: "mexican", label: "Mexican" },
  { value: "asian", label: "Asian" },
  { value: "mediterranean", label: "Mediterranean" },
  { value: "american", label: "American" },
  { value: "indian", label: "Indian" },
  { value: "french", label: "French" },
  { value: "japanese", label: "Japanese" },
  { value: "chinese", label: "Chinese" },
  { value: "thai", label: "Thai" },
  { value: "middle-eastern", label: "Middle Eastern" },
  { value: "greek", label: "Greek" },
];

interface RecipeGenerationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function RecipeGenerationDialog({
  open,
  onOpenChange,
  onSuccess,
}: RecipeGenerationDialogProps) {
  const [step, setStep] = useState<"form" | "similar" | "preview">("form");
  const [includeIngredient, setIncludeIngredient] = useState("");
  const [excludeIngredient, setExcludeIngredient] = useState("");

  const [formData, setFormData] = useState({
    includeIngredients: [] as string[],
    excludeIngredients: [] as string[],
    dietaryTags: [] as string[],
    mealType: "",
    cuisine: "",
    servings: 2,
    caloriesMin: "",
    caloriesMax: "",
    proteinMin: "",
    proteinMax: "",
    carbsMin: "",
    carbsMax: "",
    fatsMin: "",
    fatsMax: "",
  });

  const [generatedRecipe, setGeneratedRecipe] = useState<{
    title: string;
    description: string;
    ingredients: Array<{ name: string; amount: number; unit: string; notes?: string }>;
    instructions: Array<{ step: number; instruction: string; duration?: number }>;
    nutrition: {
      calories: number;
      protein: number;
      carbs: number;
      fats: number;
      fiber?: number;
      sugar?: number;
      sodium?: number;
    };
    prepTime: number;
    cookTime: number;
    servings: number;
    dietaryTags: string[];
  } | null>(null);

  // Check for similar recipes
  const { data: similarRecipes, isLoading: isLoadingSimilar } =
    trpc.recipeAi.findSimilarRecipes.useQuery(
      {
        targetCalories: formData.caloriesMin
          ? (parseInt(formData.caloriesMin) + parseInt(formData.caloriesMax || formData.caloriesMin)) / 2
          : 500,
        targetProtein: formData.proteinMin ? parseInt(formData.proteinMin) : undefined,
        targetCarbs: formData.carbsMin ? parseInt(formData.carbsMin) : undefined,
        targetFats: formData.fatsMin ? parseInt(formData.fatsMin) : undefined,
        dietaryTags: formData.dietaryTags.length > 0 ? formData.dietaryTags : undefined,
        mealType: formData.mealType || undefined,
        tolerance: 0.15,
      },
      {
        enabled: step === "similar" && !!formData.caloriesMin,
      }
    );

  const generateRecipe = trpc.recipeAi.generateRecipe.useMutation({
    onSuccess: (data) => {
      setGeneratedRecipe(data.recipe);
      setStep("preview");
      if (data.savedRecipe) {
        toast.success("Recipe generated and saved!");
        onSuccess?.();
      }
    },
    onError: (error) => {
      toast.error(error.message || "Failed to generate recipe");
    },
  });

  const resetForm = () => {
    setFormData({
      includeIngredients: [],
      excludeIngredients: [],
      dietaryTags: [],
      mealType: "",
      cuisine: "",
      servings: 2,
      caloriesMin: "",
      caloriesMax: "",
      proteinMin: "",
      proteinMax: "",
      carbsMin: "",
      carbsMax: "",
      fatsMin: "",
      fatsMax: "",
    });
    setGeneratedRecipe(null);
    setStep("form");
  };

  const handleClose = () => {
    resetForm();
    onOpenChange(false);
  };

  const addIncludeIngredient = () => {
    if (includeIngredient.trim() && !formData.includeIngredients.includes(includeIngredient.trim())) {
      setFormData({
        ...formData,
        includeIngredients: [...formData.includeIngredients, includeIngredient.trim()],
      });
      setIncludeIngredient("");
    }
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

  const handleCheckSimilar = () => {
    if (!formData.caloriesMin) {
      toast.error("Please specify target calories");
      return;
    }
    setStep("similar");
  };

  const handleGenerate = () => {
    const targetMacros: Record<string, { min: number; max: number }> = {};

    if (formData.caloriesMin) {
      targetMacros.calories = {
        min: parseInt(formData.caloriesMin),
        max: parseInt(formData.caloriesMax || formData.caloriesMin),
      };
    }
    if (formData.proteinMin) {
      targetMacros.protein = {
        min: parseInt(formData.proteinMin),
        max: parseInt(formData.proteinMax || formData.proteinMin),
      };
    }
    if (formData.carbsMin) {
      targetMacros.carbs = {
        min: parseInt(formData.carbsMin),
        max: parseInt(formData.carbsMax || formData.carbsMin),
      };
    }
    if (formData.fatsMin) {
      targetMacros.fats = {
        min: parseInt(formData.fatsMin),
        max: parseInt(formData.fatsMax || formData.fatsMin),
      };
    }

    generateRecipe.mutate({
      includeIngredients: formData.includeIngredients.length > 0 ? formData.includeIngredients : undefined,
      excludeIngredients: formData.excludeIngredients.length > 0 ? formData.excludeIngredients : undefined,
      dietaryTags: formData.dietaryTags.length > 0 ? formData.dietaryTags as ("vegan" | "vegetarian" | "keto" | "paleo" | "gluten-free" | "dairy-free" | "halal" | "kosher" | "low-carb" | "high-protein")[] : undefined,
      targetMacros: Object.keys(targetMacros).length > 0 ? targetMacros : undefined,
      mealType: formData.mealType as "breakfast" | "lunch" | "dinner" | "snack" | undefined,
      cuisine: formData.cuisine || undefined,
      servings: formData.servings,
      autoSave: true,
    });
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            {step === "form" && "Generate Recipe with AI"}
            {step === "similar" && "Similar Recipes Found"}
            {step === "preview" && "Generated Recipe"}
          </DialogTitle>
          <DialogDescription>
            {step === "form" && "Describe your ideal recipe and let AI create it for you"}
            {step === "similar" && "We found some existing recipes that match your criteria"}
            {step === "preview" && "Review your AI-generated recipe"}
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1 pr-4">
          {step === "form" && (
            <div className="space-y-6 py-4">
              {/* Dietary Tags */}
              <div className="space-y-2">
                <Label>Dietary Requirements</Label>
                <MultiSelect
                  options={DIETARY_TAGS}
                  selected={formData.dietaryTags}
                  onChange={(tags) => setFormData({ ...formData, dietaryTags: tags })}
                  placeholder="Select dietary requirements..."
                />
              </div>

              {/* Meal Type & Cuisine */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Meal Type</Label>
                  <Select
                    value={formData.mealType}
                    onValueChange={(value) => setFormData({ ...formData, mealType: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select meal type" />
                    </SelectTrigger>
                    <SelectContent>
                      {MEAL_TYPES.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Cuisine (Optional)</Label>
                  <Select
                    value={formData.cuisine}
                    onValueChange={(value) => setFormData({ ...formData, cuisine: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Any cuisine" />
                    </SelectTrigger>
                    <SelectContent>
                      {CUISINES.map((cuisine) => (
                        <SelectItem key={cuisine.value} value={cuisine.value}>
                          {cuisine.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Servings */}
              <div className="space-y-2">
                <Label>Servings</Label>
                <Input
                  type="number"
                  min={1}
                  max={20}
                  value={formData.servings}
                  onChange={(e) => setFormData({ ...formData, servings: parseInt(e.target.value) || 2 })}
                />
              </div>

              {/* Include Ingredients */}
              <div className="space-y-2">
                <Label>Include Ingredients (Optional)</Label>
                <div className="flex gap-2">
                  <Input
                    placeholder="e.g., chicken, spinach"
                    value={includeIngredient}
                    onChange={(e) => setIncludeIngredient(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addIncludeIngredient())}
                  />
                  <Button type="button" variant="outline" size="icon" onClick={addIncludeIngredient}>
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                {formData.includeIngredients.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {formData.includeIngredients.map((ing) => (
                      <Badge key={ing} variant="secondary" className="gap-1">
                        {ing}
                        <button
                          onClick={() =>
                            setFormData({
                              ...formData,
                              includeIngredients: formData.includeIngredients.filter((i) => i !== ing),
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

              {/* Exclude Ingredients */}
              <div className="space-y-2">
                <Label>Exclude Ingredients (Optional)</Label>
                <div className="flex gap-2">
                  <Input
                    placeholder="e.g., nuts, shellfish"
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

              {/* Macro Targets */}
              <div className="space-y-4">
                <Label className="text-base font-medium">Nutritional Targets (per serving)</Label>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-sm text-muted-foreground">Calories (kcal)</Label>
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        placeholder="Min"
                        value={formData.caloriesMin}
                        onChange={(e) => setFormData({ ...formData, caloriesMin: e.target.value })}
                      />
                      <span className="text-muted-foreground">-</span>
                      <Input
                        type="number"
                        placeholder="Max"
                        value={formData.caloriesMax}
                        onChange={(e) => setFormData({ ...formData, caloriesMax: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm text-muted-foreground">Protein (g)</Label>
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        placeholder="Min"
                        value={formData.proteinMin}
                        onChange={(e) => setFormData({ ...formData, proteinMin: e.target.value })}
                      />
                      <span className="text-muted-foreground">-</span>
                      <Input
                        type="number"
                        placeholder="Max"
                        value={formData.proteinMax}
                        onChange={(e) => setFormData({ ...formData, proteinMax: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm text-muted-foreground">Carbs (g)</Label>
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        placeholder="Min"
                        value={formData.carbsMin}
                        onChange={(e) => setFormData({ ...formData, carbsMin: e.target.value })}
                      />
                      <span className="text-muted-foreground">-</span>
                      <Input
                        type="number"
                        placeholder="Max"
                        value={formData.carbsMax}
                        onChange={(e) => setFormData({ ...formData, carbsMax: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm text-muted-foreground">Fats (g)</Label>
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        placeholder="Min"
                        value={formData.fatsMin}
                        onChange={(e) => setFormData({ ...formData, fatsMin: e.target.value })}
                      />
                      <span className="text-muted-foreground">-</span>
                      <Input
                        type="number"
                        placeholder="Max"
                        value={formData.fatsMax}
                        onChange={(e) => setFormData({ ...formData, fatsMax: e.target.value })}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {step === "similar" && (
            <div className="space-y-4 py-4">
              {isLoadingSimilar ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin" />
                </div>
              ) : similarRecipes && similarRecipes.length > 0 ? (
                <>
                  <div className="flex items-center gap-2 p-3 bg-amber-50 dark:bg-amber-950/30 rounded-lg border border-amber-200 dark:border-amber-900">
                    <AlertCircle className="h-5 w-5 text-amber-600" />
                    <p className="text-sm text-amber-800 dark:text-amber-200">
                      Found {similarRecipes.length} similar recipe(s). You can use one of these or generate a new one.
                    </p>
                  </div>
                  <div className="space-y-3">
                    {similarRecipes.slice(0, 5).map((recipe) => (
                      <Card key={recipe.id} className="cursor-pointer hover:border-primary transition-colors">
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between">
                            <div>
                              <h4 className="font-medium">{recipe.title}</h4>
                              <p className="text-sm text-muted-foreground line-clamp-1">
                                {recipe.description || "No description"}
                              </p>
                              <div className="flex items-center gap-3 mt-2 text-sm">
                                <span>{recipe.calories} kcal</span>
                                <span>P: {recipe.protein}g</span>
                                <span>C: {recipe.carbs}g</span>
                                <span>F: {recipe.fats}g</span>
                              </div>
                            </div>
                            <Badge variant="secondary">{recipe.matchScore}% match</Badge>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </>
              ) : (
                <div className="text-center py-8">
                  <Check className="h-12 w-12 mx-auto text-green-500 mb-3" />
                  <p className="text-muted-foreground">No similar recipes found. Generate a new one!</p>
                </div>
              )}
            </div>
          )}

          {step === "preview" && generatedRecipe && (
            <div className="space-y-6 py-4">
              <div>
                <h3 className="text-xl font-semibold">{generatedRecipe.title}</h3>
                <p className="text-muted-foreground mt-1">{generatedRecipe.description}</p>
              </div>

              {/* Dietary Tags */}
              {generatedRecipe.dietaryTags.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {generatedRecipe.dietaryTags.map((tag) => (
                    <Badge key={tag} variant="outline">
                      {tag}
                    </Badge>
                  ))}
                </div>
              )}

              {/* Nutrition */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Nutrition (per serving)</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-4 gap-4 text-center">
                    <div>
                      <p className="text-2xl font-bold">{generatedRecipe.nutrition.calories}</p>
                      <p className="text-xs text-muted-foreground">Calories</p>
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{generatedRecipe.nutrition.protein}g</p>
                      <p className="text-xs text-muted-foreground">Protein</p>
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{generatedRecipe.nutrition.carbs}g</p>
                      <p className="text-xs text-muted-foreground">Carbs</p>
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{generatedRecipe.nutrition.fats}g</p>
                      <p className="text-xs text-muted-foreground">Fats</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Ingredients */}
              <div>
                <h4 className="font-medium mb-2">Ingredients ({generatedRecipe.servings} servings)</h4>
                <ul className="space-y-1">
                  {generatedRecipe.ingredients.map((ing, i) => (
                    <li key={i} className="text-sm">
                      {ing.amount} {ing.unit} {ing.name}
                      {ing.notes && <span className="text-muted-foreground"> ({ing.notes})</span>}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Instructions */}
              <div>
                <h4 className="font-medium mb-2">Instructions</h4>
                <ol className="space-y-2">
                  {generatedRecipe.instructions.map((inst) => (
                    <li key={inst.step} className="text-sm">
                      <span className="font-medium">{inst.step}.</span> {inst.instruction}
                      {inst.duration && (
                        <span className="text-muted-foreground"> ({inst.duration} min)</span>
                      )}
                    </li>
                  ))}
                </ol>
              </div>

              {/* Time */}
              <div className="flex gap-4 text-sm text-muted-foreground">
                <span>Prep: {generatedRecipe.prepTime} min</span>
                <span>Cook: {generatedRecipe.cookTime} min</span>
                <span>Total: {generatedRecipe.prepTime + generatedRecipe.cookTime} min</span>
              </div>
            </div>
          )}
        </ScrollArea>

        <DialogFooter className="gap-2">
          {step === "form" && (
            <>
              <Button variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button variant="secondary" onClick={handleCheckSimilar}>
                Check Similar Recipes
              </Button>
              <Button onClick={handleGenerate} disabled={generateRecipe.isPending}>
                {generateRecipe.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                <Sparkles className="mr-2 h-4 w-4" />
                Generate Recipe
              </Button>
            </>
          )}
          {step === "similar" && (
            <>
              <Button variant="outline" onClick={() => setStep("form")}>
                Back
              </Button>
              <Button onClick={handleGenerate} disabled={generateRecipe.isPending}>
                {generateRecipe.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                <Sparkles className="mr-2 h-4 w-4" />
                Generate New Recipe Anyway
              </Button>
            </>
          )}
          {step === "preview" && (
            <>
              <Button variant="outline" onClick={resetForm}>
                Generate Another
              </Button>
              <Button onClick={handleClose}>
                <Check className="mr-2 h-4 w-4" />
                Done
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
