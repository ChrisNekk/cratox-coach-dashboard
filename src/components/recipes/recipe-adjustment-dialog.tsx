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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, ArrowRight, Check, Wand2 } from "lucide-react";
import { toast } from "sonner";

interface Recipe {
  id: string;
  title: string;
  description?: string | null;
  calories?: number | null;
  protein?: number | null;
  carbs?: number | null;
  fats?: number | null;
  servings?: number | null;
  ingredients?: unknown;
  instructions?: unknown;
  dietaryTags?: unknown;
}

interface TargetRecipeInfo {
  title: string;
  calories: number | null;
  protein: number | null;
  carbs: number | null;
  fats: number | null;
}

interface RecipeAdjustmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  recipe: Recipe | null;
  onSuccess?: () => void;
  clientId?: string;
  /** The recipe being replaced - used to show target macros to match */
  targetRecipe?: TargetRecipeInfo | null;
}

export function RecipeAdjustmentDialog({
  open,
  onOpenChange,
  recipe,
  onSuccess,
  clientId,
  targetRecipe,
}: RecipeAdjustmentDialogProps) {
  const [step, setStep] = useState<"form" | "preview">("form");
  const [targetMacros, setTargetMacros] = useState({
    calories: "",
    protein: "",
    carbs: "",
    fats: "",
  });
  const [targetServings, setTargetServings] = useState("");
  const [useClientTargets, setUseClientTargets] = useState(false);
  const [useReplacedRecipeTargets, setUseReplacedRecipeTargets] = useState(false);

  // Pre-fill target macros when targetRecipe is provided and dialog opens
  const handleUseReplacedRecipeTargets = () => {
    if (targetRecipe) {
      setTargetMacros({
        calories: targetRecipe.calories?.toString() || "",
        protein: targetRecipe.protein?.toString() || "",
        carbs: targetRecipe.carbs?.toString() || "",
        fats: targetRecipe.fats?.toString() || "",
      });
      setUseReplacedRecipeTargets(true);
      setUseClientTargets(false);
    }
  };

  const [adjustedRecipe, setAdjustedRecipe] = useState<{
    title: string;
    description: string;
    ingredients: Array<{ name: string; amount: number; unit: string; notes?: string }>;
    instructions: Array<{ step: number; instruction: string; duration?: number }>;
    nutrition: {
      calories: number;
      protein: number;
      carbs: number;
      fats: number;
    };
    prepTime: number;
    cookTime: number;
    servings: number;
    dietaryTags: string[];
  } | null>(null);

  // Fetch client data if clientId is provided
  const { data: clients } = trpc.clients.getAll.useQuery();
  const selectedClient = clients?.find((c) => c.id === clientId);

  const adjustRecipe = trpc.recipeAi.adjustRecipe.useMutation({
    onSuccess: (data) => {
      setAdjustedRecipe(data.recipe);
      setStep("preview");
      if (data.savedRecipe) {
        toast.success("Recipe adjusted and saved!");
        onSuccess?.();
      }
    },
    onError: (error) => {
      toast.error(error.message || "Failed to adjust recipe");
    },
  });

  const resetForm = () => {
    setTargetMacros({ calories: "", protein: "", carbs: "", fats: "" });
    setTargetServings("");
    setAdjustedRecipe(null);
    setStep("form");
    setUseClientTargets(false);
    setUseReplacedRecipeTargets(false);
  };

  const handleClose = () => {
    resetForm();
    onOpenChange(false);
  };

  const handleUseClientTargets = (clientIdValue: string) => {
    const client = clients?.find((c) => c.id === clientIdValue);
    if (client) {
      // Calculate per-meal targets (divide daily by 3)
      const mealsPerDay = 3;
      const targets = client.todayProgress;
      setTargetMacros({
        calories: targets?.calories?.target ? String(Math.round(targets.calories.target / mealsPerDay)) : "",
        protein: targets?.protein?.target ? String(Math.round(targets.protein.target / mealsPerDay)) : "",
        carbs: targets?.carbs?.target ? String(Math.round(targets.carbs.target / mealsPerDay)) : "",
        fats: targets?.fats?.target ? String(Math.round(targets.fats.target / mealsPerDay)) : "",
      });
      setUseClientTargets(true);
    }
  };

  const handleAdjust = () => {
    if (!recipe) return;

    const macros: Record<string, number> = {};
    if (targetMacros.calories) macros.calories = parseInt(targetMacros.calories);
    if (targetMacros.protein) macros.protein = parseInt(targetMacros.protein);
    if (targetMacros.carbs) macros.carbs = parseInt(targetMacros.carbs);
    if (targetMacros.fats) macros.fats = parseInt(targetMacros.fats);

    if (Object.keys(macros).length === 0) {
      toast.error("Please specify at least one target macro");
      return;
    }

    adjustRecipe.mutate({
      recipeId: recipe.id,
      targetMacros: macros,
      servings: targetServings ? parseInt(targetServings) : undefined,
      saveAsNew: true,
    });
  };

  if (!recipe) return null;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wand2 className="h-5 w-5 text-primary" />
            {step === "form" ? "Adjust Recipe Macros" : "Adjusted Recipe"}
          </DialogTitle>
          <DialogDescription>
            {step === "form"
              ? `Modify "${recipe.title}" to meet new nutritional targets`
              : "Review the adjusted recipe"}
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1 pr-4">
          {step === "form" && (
            <div className="space-y-6 py-4">
              {/* Current Recipe Info */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Current Recipe</CardTitle>
                </CardHeader>
                <CardContent>
                  <h4 className="font-medium">{recipe.title}</h4>
                  <div className="grid grid-cols-4 gap-4 mt-3 text-center">
                    <div>
                      <p className="text-lg font-semibold">{recipe.calories || "—"}</p>
                      <p className="text-xs text-muted-foreground">Calories</p>
                    </div>
                    <div>
                      <p className="text-lg font-semibold">{recipe.protein || "—"}g</p>
                      <p className="text-xs text-muted-foreground">Protein</p>
                    </div>
                    <div>
                      <p className="text-lg font-semibold">{recipe.carbs || "—"}g</p>
                      <p className="text-xs text-muted-foreground">Carbs</p>
                    </div>
                    <div>
                      <p className="text-lg font-semibold">{recipe.fats || "—"}g</p>
                      <p className="text-xs text-muted-foreground">Fats</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Recipe Being Replaced - Target to Match */}
              {targetRecipe && (
                <Card className="border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-950/20">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center justify-between">
                      <span className="text-amber-700 dark:text-amber-400">Recipe Being Replaced (Target)</span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleUseReplacedRecipeTargets}
                        className={useReplacedRecipeTargets ? "bg-amber-100 dark:bg-amber-900" : ""}
                      >
                        {useReplacedRecipeTargets ? <Check className="mr-1 h-3 w-3" /> : null}
                        Use These Values
                      </Button>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <h4 className="font-medium text-amber-800 dark:text-amber-300">{targetRecipe.title}</h4>
                    <div className="grid grid-cols-4 gap-4 mt-3 text-center">
                      <div>
                        <p className="text-lg font-semibold text-amber-700 dark:text-amber-400">{targetRecipe.calories || "—"}</p>
                        <p className="text-xs text-muted-foreground">Calories</p>
                      </div>
                      <div>
                        <p className="text-lg font-semibold text-amber-700 dark:text-amber-400">{targetRecipe.protein || "—"}g</p>
                        <p className="text-xs text-muted-foreground">Protein</p>
                      </div>
                      <div>
                        <p className="text-lg font-semibold text-amber-700 dark:text-amber-400">{targetRecipe.carbs || "—"}g</p>
                        <p className="text-xs text-muted-foreground">Carbs</p>
                      </div>
                      <div>
                        <p className="text-lg font-semibold text-amber-700 dark:text-amber-400">{targetRecipe.fats || "—"}g</p>
                        <p className="text-xs text-muted-foreground">Fats</p>
                      </div>
                    </div>
                    <p className="text-xs text-amber-600 dark:text-amber-500 mt-3">
                      Adjust your recipe to match these macros to minimize impact on the meal plan.
                    </p>
                  </CardContent>
                </Card>
              )}

              {/* Use Client Targets */}
              {clients && clients.length > 0 && (
                <div className="space-y-2">
                  <Label>Use Client Targets (Optional)</Label>
                  <Select onValueChange={handleUseClientTargets}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a client to use their targets" />
                    </SelectTrigger>
                    <SelectContent>
                      {clients
                        .filter((c) => c.todayProgress?.calories?.target)
                        .map((client) => (
                          <SelectItem key={client.id} value={client.id}>
                            {client.name} ({client.todayProgress?.calories?.target} kcal/day)
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                  {useClientTargets && (
                    <p className="text-xs text-muted-foreground">
                      Targets calculated per meal (daily ÷ 3)
                    </p>
                  )}
                </div>
              )}

              {/* Target Macros */}
              <div className="space-y-4">
                <Label className="text-base font-medium">Target Nutritional Values (per serving)</Label>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-sm text-muted-foreground">Calories (kcal)</Label>
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground w-12">{recipe.calories || "—"}</span>
                      <ArrowRight className="h-4 w-4 text-muted-foreground" />
                      <Input
                        type="number"
                        placeholder="Target"
                        value={targetMacros.calories}
                        onChange={(e) => setTargetMacros({ ...targetMacros, calories: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm text-muted-foreground">Protein (g)</Label>
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground w-12">{recipe.protein || "—"}</span>
                      <ArrowRight className="h-4 w-4 text-muted-foreground" />
                      <Input
                        type="number"
                        placeholder="Target"
                        value={targetMacros.protein}
                        onChange={(e) => setTargetMacros({ ...targetMacros, protein: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm text-muted-foreground">Carbs (g)</Label>
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground w-12">{recipe.carbs || "—"}</span>
                      <ArrowRight className="h-4 w-4 text-muted-foreground" />
                      <Input
                        type="number"
                        placeholder="Target"
                        value={targetMacros.carbs}
                        onChange={(e) => setTargetMacros({ ...targetMacros, carbs: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm text-muted-foreground">Fats (g)</Label>
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground w-12">{recipe.fats || "—"}</span>
                      <ArrowRight className="h-4 w-4 text-muted-foreground" />
                      <Input
                        type="number"
                        placeholder="Target"
                        value={targetMacros.fats}
                        onChange={(e) => setTargetMacros({ ...targetMacros, fats: e.target.value })}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Target Servings */}
              <div className="space-y-2">
                <Label>Target Servings (Optional)</Label>
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground w-12">{recipe.servings || "—"}</span>
                  <ArrowRight className="h-4 w-4 text-muted-foreground" />
                  <Input
                    type="number"
                    placeholder="Same as original"
                    value={targetServings}
                    onChange={(e) => setTargetServings(e.target.value)}
                    className="w-32"
                  />
                </div>
              </div>
            </div>
          )}

          {step === "preview" && adjustedRecipe && (
            <div className="space-y-6 py-4">
              <div>
                <h3 className="text-xl font-semibold">{adjustedRecipe.title}</h3>
                <p className="text-muted-foreground mt-1">{adjustedRecipe.description}</p>
                <Badge variant="secondary" className="mt-2">
                  Adapted from: {recipe.title}
                </Badge>
              </div>

              {/* Nutrition Comparison */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Nutrition Comparison (per serving)</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-4 gap-4 text-center">
                    <div>
                      <p className="text-sm text-muted-foreground line-through">{recipe.calories}</p>
                      <p className="text-2xl font-bold">{adjustedRecipe.nutrition.calories}</p>
                      <p className="text-xs text-muted-foreground">Calories</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground line-through">{recipe.protein}g</p>
                      <p className="text-2xl font-bold">{adjustedRecipe.nutrition.protein}g</p>
                      <p className="text-xs text-muted-foreground">Protein</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground line-through">{recipe.carbs}g</p>
                      <p className="text-2xl font-bold">{adjustedRecipe.nutrition.carbs}g</p>
                      <p className="text-xs text-muted-foreground">Carbs</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground line-through">{recipe.fats}g</p>
                      <p className="text-2xl font-bold">{adjustedRecipe.nutrition.fats}g</p>
                      <p className="text-xs text-muted-foreground">Fats</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Ingredients */}
              <div>
                <h4 className="font-medium mb-2">Adjusted Ingredients ({adjustedRecipe.servings} servings)</h4>
                <ul className="space-y-1">
                  {adjustedRecipe.ingredients.map((ing, i) => (
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
                  {adjustedRecipe.instructions.map((inst) => (
                    <li key={inst.step} className="text-sm">
                      <span className="font-medium">{inst.step}.</span> {inst.instruction}
                    </li>
                  ))}
                </ol>
              </div>

              {/* Time */}
              <div className="flex gap-4 text-sm text-muted-foreground">
                <span>Prep: {adjustedRecipe.prepTime} min</span>
                <span>Cook: {adjustedRecipe.cookTime} min</span>
                <span>Total: {adjustedRecipe.prepTime + adjustedRecipe.cookTime} min</span>
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
              <Button onClick={handleAdjust} disabled={adjustRecipe.isPending}>
                {adjustRecipe.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                <Wand2 className="mr-2 h-4 w-4" />
                Adjust Recipe
              </Button>
            </>
          )}
          {step === "preview" && (
            <>
              <Button variant="outline" onClick={resetForm}>
                Adjust Again
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
