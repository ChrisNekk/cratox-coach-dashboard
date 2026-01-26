"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
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
  Package,
  Plus,
  MoreHorizontal,
  Edit,
  Trash2,
  DollarSign,
  Calendar,
  CheckCircle,
  Loader2,
  X,
} from "lucide-react";
import { toast } from "sonner";

export default function PackagesPage() {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [selectedPackage, setSelectedPackage] = useState<{
    id: string;
    name: string;
    description?: string | null;
    price: number;
    sessions?: number | null;
    validityDays?: number | null;
    features?: string[] | null;
    isActive: boolean;
  } | null>(null);

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    price: "",
    sessions: "",
    validityDays: "",
    features: [] as string[],
    newFeature: "",
    isActive: true,
  });

  const { data: packages, isLoading, refetch } = trpc.package.getAll.useQuery();

  const normalizeFeatures = (features: unknown): string[] => {
    if (!Array.isArray(features)) return [];
    return features.filter((f): f is string => typeof f === "string");
  };

  const createPackage = trpc.package.create.useMutation({
    onSuccess: () => {
      toast.success("Package created successfully!");
      setIsCreateOpen(false);
      resetForm();
      refetch();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to create package");
    },
  });

  const updatePackage = trpc.package.update.useMutation({
    onSuccess: () => {
      toast.success("Package updated successfully!");
      setIsEditOpen(false);
      setSelectedPackage(null);
      resetForm();
      refetch();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to update package");
    },
  });

  const deletePackage = trpc.package.delete.useMutation({
    onSuccess: () => {
      toast.success("Package deleted");
      refetch();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to delete package");
    },
  });

  const resetForm = () => {
    setFormData({
      name: "",
      description: "",
      price: "",
      sessions: "",
      validityDays: "",
      features: [],
      newFeature: "",
      isActive: true,
    });
  };

  const handleCreate = () => {
    if (!formData.name || !formData.price) {
      toast.error("Please fill in required fields");
      return;
    }
    createPackage.mutate({
      name: formData.name,
      description: formData.description || undefined,
      price: parseFloat(formData.price),
      sessions: formData.sessions ? parseInt(formData.sessions) : undefined,
      validityDays: formData.validityDays ? parseInt(formData.validityDays) : undefined,
      features: formData.features.length > 0 ? formData.features : undefined,
    });
  };

  const handleUpdate = () => {
    if (!selectedPackage || !formData.name || !formData.price) {
      toast.error("Please fill in required fields");
      return;
    }
    updatePackage.mutate({
      id: selectedPackage.id,
      name: formData.name,
      description: formData.description || undefined,
      price: parseFloat(formData.price),
      sessions: formData.sessions ? parseInt(formData.sessions) : undefined,
      validityDays: formData.validityDays ? parseInt(formData.validityDays) : undefined,
      features: formData.features.length > 0 ? formData.features : undefined,
      isActive: formData.isActive,
    });
  };

  const openEditDialog = (pkg: any) => {
    const normalized = {
      id: pkg.id as string,
      name: pkg.name as string,
      description: (pkg.description as string | null) ?? null,
      price: pkg.price as number,
      sessions: (pkg.sessions as number | null) ?? null,
      validityDays: (pkg.validityDays as number | null) ?? null,
      features: normalizeFeatures(pkg.features),
      isActive: pkg.isActive as boolean,
    };

    setSelectedPackage(normalized);
    setFormData({
      name: normalized.name,
      description: normalized.description || "",
      price: String(normalized.price),
      sessions: normalized.sessions ? String(normalized.sessions) : "",
      validityDays: normalized.validityDays ? String(normalized.validityDays) : "",
      features: normalized.features || [],
      newFeature: "",
      isActive: normalized.isActive,
    });
    setIsEditOpen(true);
  };

  const addFeature = () => {
    if (formData.newFeature.trim()) {
      setFormData({
        ...formData,
        features: [...formData.features, formData.newFeature.trim()],
        newFeature: "",
      });
    }
  };

  const removeFeature = (index: number) => {
    setFormData({
      ...formData,
      features: formData.features.filter((_, i) => i !== index),
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Packages</h2>
          <p className="text-muted-foreground">
            Create and manage coaching packages for your clients
          </p>
        </div>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => resetForm()}>
              <Plus className="mr-2 h-4 w-4" />
              Create Package
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Create New Package</DialogTitle>
              <DialogDescription>
                Design a coaching package to sell to your clients
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4 max-h-[60vh] overflow-y-auto">
              <div className="space-y-2">
                <Label htmlFor="name">Package Name *</Label>
                <Input
                  id="name"
                  placeholder="Transformation Package"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  placeholder="Complete 12-week fitness transformation..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="price">Price *</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                      $
                    </span>
                    <Input
                      id="price"
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="750"
                      className="pl-7"
                      value={formData.price}
                      onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="sessions">Sessions Included</Label>
                  <Input
                    id="sessions"
                    type="number"
                    min="0"
                    placeholder="12"
                    value={formData.sessions}
                    onChange={(e) => setFormData({ ...formData, sessions: e.target.value })}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="validityDays">Validity (Days)</Label>
                <Input
                  id="validityDays"
                  type="number"
                  min="0"
                  placeholder="90"
                  value={formData.validityDays}
                  onChange={(e) => setFormData({ ...formData, validityDays: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Features</Label>
                <div className="flex gap-2">
                  <Input
                    placeholder="Add a feature..."
                    value={formData.newFeature}
                    onChange={(e) => setFormData({ ...formData, newFeature: e.target.value })}
                    onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addFeature())}
                  />
                  <Button type="button" variant="outline" onClick={addFeature}>
                    Add
                  </Button>
                </div>
                {formData.features.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {formData.features.map((feature, index) => (
                      <Badge key={index} variant="secondary" className="gap-1">
                        {feature}
                        <button
                          type="button"
                          onClick={() => removeFeature(index)}
                          className="ml-1 hover:text-destructive"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreate} disabled={createPackage.isPending}>
                {createPackage.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Create Package
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Packages Grid */}
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
      ) : packages && packages.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {packages.map((pkg) => (
            <Card key={pkg.id} className={!pkg.isActive ? "opacity-60" : ""}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      {pkg.name}
                      {!pkg.isActive && (
                        <Badge variant="secondary" className="text-xs">
                          Inactive
                        </Badge>
                      )}
                    </CardTitle>
                    <CardDescription className="mt-1">
                      {pkg.description || "No description"}
                    </CardDescription>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => openEditDialog(pkg)}>
                        <Edit className="mr-2 h-4 w-4" />
                        Edit Package
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        className="text-destructive"
                        onClick={() => {
                          if (confirm(`Are you sure you want to delete "${pkg.name}"?`)) {
                            deletePackage.mutate({ id: pkg.id });
                          }
                        }}
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete Package
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-bold">${pkg.price}</span>
                </div>
                <div className="space-y-2 text-sm">
                  {pkg.sessions && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Calendar className="h-4 w-4" />
                      {pkg.sessions} sessions
                    </div>
                  )}
                  {pkg.validityDays && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Calendar className="h-4 w-4" />
                      Valid for {pkg.validityDays} days
                    </div>
                  )}
                </div>
                {pkg.features && Array.isArray(pkg.features) && pkg.features.length > 0 && (
                  <div className="space-y-2">
                    {(pkg.features as string[]).slice(0, 4).map((feature, index) => (
                      <div key={index} className="flex items-center gap-2 text-sm">
                        <CheckCircle className="h-4 w-4 text-green-500" />
                        {feature}
                      </div>
                    ))}
                    {(pkg.features as string[]).length > 4 && (
                      <p className="text-xs text-muted-foreground">
                        +{(pkg.features as string[]).length - 4} more features
                      </p>
                    )}
                  </div>
                )}
              </CardContent>
              <CardFooter>
                <p className="text-xs text-muted-foreground">
                  {pkg._count.bookings} bookings
                </p>
              </CardFooter>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="py-12">
            <div className="text-center">
              <Package className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
              <h3 className="text-lg font-medium mb-2">No packages yet</h3>
              <p className="text-muted-foreground mb-4">
                Create packages to offer bundled coaching services
              </p>
              <Button onClick={() => setIsCreateOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Create Your First Package
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Edit Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Package</DialogTitle>
            <DialogDescription>
              Update package details
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4 max-h-[60vh] overflow-y-auto">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Package Name *</Label>
              <Input
                id="edit-name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-description">Description</Label>
              <Textarea
                id="edit-description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-price">Price *</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                    $
                  </span>
                  <Input
                    id="edit-price"
                    type="number"
                    step="0.01"
                    min="0"
                    className="pl-7"
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-sessions">Sessions</Label>
                <Input
                  id="edit-sessions"
                  type="number"
                  min="0"
                  value={formData.sessions}
                  onChange={(e) => setFormData({ ...formData, sessions: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-validityDays">Validity (Days)</Label>
              <Input
                id="edit-validityDays"
                type="number"
                min="0"
                value={formData.validityDays}
                onChange={(e) => setFormData({ ...formData, validityDays: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Features</Label>
              <div className="flex gap-2">
                <Input
                  placeholder="Add a feature..."
                  value={formData.newFeature}
                  onChange={(e) => setFormData({ ...formData, newFeature: e.target.value })}
                  onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addFeature())}
                />
                <Button type="button" variant="outline" onClick={addFeature}>
                  Add
                </Button>
              </div>
              {formData.features.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {formData.features.map((feature, index) => (
                    <Badge key={index} variant="secondary" className="gap-1">
                      {feature}
                      <button
                        type="button"
                        onClick={() => removeFeature(index)}
                        className="ml-1 hover:text-destructive"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="edit-isActive">Package Active</Label>
              <Switch
                id="edit-isActive"
                checked={formData.isActive}
                onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpdate} disabled={updatePackage.isPending}>
              {updatePackage.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
