"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Loader2,
  Sparkles,
  Clock,
  Flame,
  UserPlus,
  AlertCircle,
  Target,
} from "lucide-react";
import { toast } from "sonner";
import { RecipeGenerationDialog } from "./recipe-generation-dialog";

interface ClientRecipeRecommendationsProps {
  clientId?: string;
  onAssign?: (recipeId: string, clientId: string) => void;
}

const MEAL_TYPES = [
  { value: "all", label: "All Meals" },
  { value: "breakfast", label: "Breakfast" },
  { value: "lunch", label: "Lunch" },
  { value: "dinner", label: "Dinner" },
  { value: "snack", label: "Snack" },
];

export function ClientRecipeRecommendations({
  clientId: initialClientId,
  onAssign,
}: ClientRecipeRecommendationsProps) {
  const [selectedClientId, setSelectedClientId] = useState(initialClientId || "");
  const [mealType, setMealType] = useState("all");
  const [isGenerateOpen, setIsGenerateOpen] = useState(false);

  const { data: clients, isLoading: isLoadingClients } = trpc.client.getAll.useQuery();

  const {
    data: recommendations,
    isLoading: isLoadingRecommendations,
    refetch,
  } = trpc.recipeAi.getClientRecommendations.useQuery(
    {
      clientId: selectedClientId,
      mealType: mealType !== "all" ? mealType : undefined,
      limit: 10,
      tolerance: 0.1,
    },
    {
      enabled: !!selectedClientId,
    }
  );

  const assignRecipe = trpc.content.assignRecipe.useMutation({
    onSuccess: () => {
      toast.success("Recipe assigned to client!");
      onAssign?.(selectedClientId, selectedClientId);
    },
    onError: (error) => {
      toast.error(error.message || "Failed to assign recipe");
    },
  });

  const handleAssign = (recipeId: string) => {
    if (!selectedClientId) return;
    assignRecipe.mutate({
      recipeId,
      clientIds: [selectedClientId],
    });
  };

  const selectedClient = clients?.find((c) => c.id === selectedClientId);

  return (
    <div className="space-y-6">
      {/* Client Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Recipe Recommendations
          </CardTitle>
          <CardDescription>
            Find recipes that match your client's nutritional targets
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Select Client</label>
              {isLoadingClients ? (
                <Skeleton className="h-10 w-full" />
              ) : (
                <Select value={selectedClientId} onValueChange={setSelectedClientId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a client" />
                  </SelectTrigger>
                  <SelectContent>
                    {clients?.map((client) => (
                      <SelectItem key={client.id} value={client.id}>
                        {client.name}
                        {client.todayProgress?.calories?.target && (
                          <span className="text-muted-foreground ml-2">
                            ({client.todayProgress.calories.target} kcal/day)
                          </span>
                        )}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Meal Type</label>
              <Select value={mealType} onValueChange={setMealType}>
                <SelectTrigger>
                  <SelectValue />
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
          </div>

          {/* Client Macro Targets */}
          {selectedClient && recommendations?.client && (
            <div className="p-4 bg-muted rounded-lg">
              <h4 className="font-medium mb-2">{selectedClient.name}'s Daily Targets</h4>
              <div className="grid grid-cols-4 gap-4 text-center">
                <div>
                  <p className="text-lg font-semibold">
                    {recommendations.client.targetCalories || "—"}
                  </p>
                  <p className="text-xs text-muted-foreground">Calories</p>
                </div>
                <div>
                  <p className="text-lg font-semibold">
                    {recommendations.client.proteinTarget || "—"}g
                  </p>
                  <p className="text-xs text-muted-foreground">Protein</p>
                </div>
                <div>
                  <p className="text-lg font-semibold">
                    {recommendations.client.carbsTarget || "—"}g
                  </p>
                  <p className="text-xs text-muted-foreground">Carbs</p>
                </div>
                <div>
                  <p className="text-lg font-semibold">
                    {recommendations.client.fatsTarget || "—"}g
                  </p>
                  <p className="text-xs text-muted-foreground">Fats</p>
                </div>
              </div>
              {recommendations.client.mealTargets && (
                <div className="mt-3 pt-3 border-t border-border">
                  <p className="text-xs text-muted-foreground mb-2">Per-meal targets (÷3):</p>
                  <div className="flex gap-4 text-sm">
                    <span>{recommendations.client.mealTargets.calories} kcal</span>
                    <span>{recommendations.client.mealTargets.protein}g protein</span>
                    <span>{recommendations.client.mealTargets.carbs}g carbs</span>
                    <span>{recommendations.client.mealTargets.fats}g fats</span>
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recommendations */}
      {selectedClientId && (
        <>
          {isLoadingRecommendations ? (
            <div className="grid gap-4 md:grid-cols-2">
              {[1, 2, 3, 4].map((i) => (
                <Card key={i}>
                  <CardHeader>
                    <Skeleton className="h-5 w-48" />
                    <Skeleton className="h-4 w-32" />
                  </CardHeader>
                  <CardContent>
                    <Skeleton className="h-16 w-full" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : recommendations?.message ? (
            <Card>
              <CardContent className="py-12">
                <div className="text-center">
                  <AlertCircle className="h-12 w-12 mx-auto text-amber-500 mb-4" />
                  <h3 className="text-lg font-medium mb-2">No Targets Set</h3>
                  <p className="text-muted-foreground mb-4">{recommendations.message}</p>
                  <p className="text-sm text-muted-foreground">
                    Set calorie and macro targets for this client to get personalized recommendations.
                  </p>
                </div>
              </CardContent>
            </Card>
          ) : recommendations?.recommendations.length === 0 ? (
            <Card>
              <CardContent className="py-12">
                <div className="text-center">
                  <Sparkles className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                  <h3 className="text-lg font-medium mb-2">No Matching Recipes</h3>
                  <p className="text-muted-foreground mb-4">
                    No recipes in the library match this client's targets (±10%)
                  </p>
                  <Button onClick={() => setIsGenerateOpen(true)}>
                    <Sparkles className="mr-2 h-4 w-4" />
                    Generate Recipe with AI
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <>
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium">
                  {recommendations?.recommendations.length} Matching Recipes
                </h3>
                <Button variant="outline" onClick={() => setIsGenerateOpen(true)}>
                  <Sparkles className="mr-2 h-4 w-4" />
                  Generate New
                </Button>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                {recommendations?.recommendations.map((recipe) => (
                  <Card key={recipe.id} className="relative">
                    <CardHeader className="pb-2">
                      <div className="flex items-start justify-between">
                        <div>
                          <CardTitle className="text-base">{recipe.title}</CardTitle>
                          <CardDescription className="line-clamp-1">
                            {recipe.description || "No description"}
                          </CardDescription>
                        </div>
                        <Badge
                          variant={recipe.matchScore >= 80 ? "default" : "secondary"}
                          className="ml-2"
                        >
                          {recipe.matchScore}% match
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {/* Macros */}
                      <div className="flex items-center gap-4 text-sm">
                        <div className="flex items-center gap-1 text-orange-500">
                          <Flame className="h-4 w-4" />
                          {recipe.calories} kcal
                        </div>
                        <span className="text-muted-foreground">P: {recipe.protein}g</span>
                        <span className="text-muted-foreground">C: {recipe.carbs}g</span>
                        <span className="text-muted-foreground">F: {recipe.fats}g</span>
                      </div>

                      {/* Category & Time */}
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        {recipe.category && (
                          <Badge variant="outline" className="capitalize">
                            {recipe.category}
                          </Badge>
                        )}
                        {(recipe.prepTime || recipe.cookTime) && (
                          <div className="flex items-center gap-1">
                            <Clock className="h-4 w-4" />
                            {(recipe.prepTime || 0) + (recipe.cookTime || 0)} min
                          </div>
                        )}
                      </div>

                      {/* Actions */}
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full"
                        onClick={() => handleAssign(recipe.id)}
                        disabled={assignRecipe.isPending}
                      >
                        {assignRecipe.isPending ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                          <UserPlus className="mr-2 h-4 w-4" />
                        )}
                        Assign to {selectedClient?.name}
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {recommendations?.hasMore && (
                <p className="text-center text-sm text-muted-foreground">
                  Showing top 10 matches. Refine filters for more specific results.
                </p>
              )}
            </>
          )}
        </>
      )}

      {/* Generate Recipe Dialog */}
      <RecipeGenerationDialog
        open={isGenerateOpen}
        onOpenChange={setIsGenerateOpen}
        onSuccess={() => {
          refetch();
        }}
      />
    </div>
  );
}
