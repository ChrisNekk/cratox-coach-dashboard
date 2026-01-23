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
} from "lucide-react";
import { toast } from "sonner";

export default function RecipesPage() {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isAssignOpen, setIsAssignOpen] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [selectedRecipeId, setSelectedRecipeId] = useState<string>("");
  const [selectedClientIds, setSelectedClientIds] = useState<string[]>([]);

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    category: "",
    calories: "",
    protein: "",
    carbs: "",
    fats: "",
    prepTime: "",
    cookTime: "",
    servings: "",
  });

  const { data: recipes, isLoading, refetch } = trpc.content.getRecipes.useQuery({
    category: categoryFilter !== "all" ? categoryFilter : undefined,
  });
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
      prepTime: "",
      cookTime: "",
      servings: "",
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
      prepTime: formData.prepTime ? parseInt(formData.prepTime) : undefined,
      cookTime: formData.cookTime ? parseInt(formData.cookTime) : undefined,
      servings: formData.servings ? parseInt(formData.servings) : undefined,
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

  const toggleClientSelection = (clientId: string) => {
    setSelectedClientIds((prev) =>
      prev.includes(clientId)
        ? prev.filter((id) => id !== clientId)
        : [...prev, clientId]
    );
  };

  const filteredRecipes = recipes?.filter(
    (r) =>
      r.title.toLowerCase().includes(search.toLowerCase()) ||
      r.description?.toLowerCase().includes(search.toLowerCase())
  );

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
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="calories">Calories</Label>
                  <Input
                    id="calories"
                    type="number"
                    min="0"
                    placeholder="450"
                    value={formData.calories}
                    onChange={(e) => setFormData({ ...formData, calories: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="protein">Protein (g)</Label>
                  <Input
                    id="protein"
                    type="number"
                    min="0"
                    placeholder="35"
                    value={formData.protein}
                    onChange={(e) => setFormData({ ...formData, protein: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="carbs">Carbs (g)</Label>
                  <Input
                    id="carbs"
                    type="number"
                    min="0"
                    placeholder="45"
                    value={formData.carbs}
                    onChange={(e) => setFormData({ ...formData, carbs: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="fats">Fats (g)</Label>
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
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="prepTime">Prep (min)</Label>
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
                  <Label htmlFor="cookTime">Cook (min)</Label>
                  <Input
                    id="cookTime"
                    type="number"
                    min="0"
                    placeholder="15"
                    value={formData.cookTime}
                    onChange={(e) => setFormData({ ...formData, cookTime: e.target.value })}
                  />
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

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
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
                <SelectItem value="all">All Categories</SelectItem>
                <SelectItem value="breakfast">Breakfast</SelectItem>
                <SelectItem value="lunch">Lunch</SelectItem>
                <SelectItem value="dinner">Dinner</SelectItem>
                <SelectItem value="snack">Snack</SelectItem>
                <SelectItem value="dessert">Dessert</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Recipes Grid */}
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
      ) : filteredRecipes && filteredRecipes.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredRecipes.map((recipe) => (
            <Card key={recipe.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      {recipe.title}
                      {recipe.isSystem && (
                        <Badge variant="outline" className="text-xs">
                          System
                        </Badge>
                      )}
                    </CardTitle>
                    <CardDescription className="mt-1">
                      {recipe.description || "No description"}
                    </CardDescription>
                  </div>
                  {!recipe.isSystem && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => openAssignDialog(recipe.id)}>
                          <UserPlus className="mr-2 h-4 w-4" />
                          Assign to Clients
                        </DropdownMenuItem>
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
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex flex-wrap gap-2">
                  {recipe.category && (
                    <Badge variant="secondary" className="capitalize">
                      {recipe.category}
                    </Badge>
                  )}
                </div>
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
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={() => openAssignDialog(recipe.id)}
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
                Create your first recipe to share with clients
              </p>
              <Button onClick={() => setIsCreateOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Create Recipe
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Assign Dialog */}
      <Dialog open={isAssignOpen} onOpenChange={setIsAssignOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign Recipe to Clients</DialogTitle>
            <DialogDescription>
              Select clients to share this recipe with
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 max-h-[300px] overflow-y-auto">
            {clients?.map((client) => (
              <div
                key={client.id}
                className={`flex items-center justify-between p-3 rounded-lg cursor-pointer transition-colors ${
                  selectedClientIds.includes(client.id)
                    ? "bg-primary/10 border border-primary"
                    : "hover:bg-muted"
                }`}
                onClick={() => toggleClientSelection(client.id)}
              >
                <div>
                  <p className="font-medium">{client.name}</p>
                  <p className="text-sm text-muted-foreground">{client.email}</p>
                </div>
                {selectedClientIds.includes(client.id) && (
                  <Badge>Selected</Badge>
                )}
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAssignOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAssign} disabled={assignRecipe.isPending}>
              {assignRecipe.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Assign ({selectedClientIds.length})
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
