"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { trpc } from "@/lib/trpc/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ArrowLeft,
  Palette,
  Upload,
  Loader2,
  Check,
} from "lucide-react";
import { toast } from "sonner";

const colorPresets = [
  { name: "Indigo", primary: "#6366f1", accent: "#8b5cf6" },
  { name: "Blue", primary: "#3b82f6", accent: "#06b6d4" },
  { name: "Green", primary: "#22c55e", accent: "#14b8a6" },
  { name: "Red", primary: "#ef4444", accent: "#f97316" },
  { name: "Purple", primary: "#a855f7", accent: "#ec4899" },
  { name: "Amber", primary: "#f59e0b", accent: "#eab308" },
];

export default function BrandingPage() {
  const { data: profile, isLoading, refetch } = trpc.settings.getProfile.useQuery();

  const [formData, setFormData] = useState({
    logoUrl: "",
    primaryColor: "#6366f1",
    accentColor: "#8b5cf6",
  });

  useEffect(() => {
    if (profile) {
      setFormData({
        logoUrl: profile.logoUrl || "",
        primaryColor: profile.primaryColor || "#6366f1",
        accentColor: profile.accentColor || "#8b5cf6",
      });
    }
  }, [profile]);

  const updateBranding = trpc.settings.updateBranding.useMutation({
    onSuccess: () => {
      toast.success("Branding updated successfully!");
      refetch();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to update branding");
    },
  });

  const handleSave = () => {
    updateBranding.mutate({
      logoUrl: formData.logoUrl || undefined,
      primaryColor: formData.primaryColor,
      accentColor: formData.accentColor,
    });
  };

  const applyPreset = (preset: { primary: string; accent: string }) => {
    setFormData({
      ...formData,
      primaryColor: preset.primary,
      accentColor: preset.accent,
    });
  };

  if (isLoading) {
    return (
      <div className="space-y-6 max-w-2xl">
        <Skeleton className="h-8 w-48" />
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-32" />
          </CardHeader>
          <CardContent className="space-y-4">
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-10 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/settings">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Branding</h2>
          <p className="text-muted-foreground">
            Customize your dashboard appearance
          </p>
        </div>
      </div>

      {/* Logo Upload */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Logo</CardTitle>
          <CardDescription>
            Upload your business logo
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-6">
            <div className="h-24 w-24 rounded-lg border-2 border-dashed flex items-center justify-center bg-muted/50">
              {formData.logoUrl ? (
                <img
                  src={formData.logoUrl}
                  alt="Logo"
                  className="h-full w-full object-contain rounded-lg"
                />
              ) : (
                <Upload className="h-8 w-8 text-muted-foreground/50" />
              )}
            </div>
            <div className="flex-1 space-y-2">
              <Label htmlFor="logoUrl">Logo URL</Label>
              <Input
                id="logoUrl"
                placeholder="https://example.com/logo.png"
                value={formData.logoUrl}
                onChange={(e) => setFormData({ ...formData, logoUrl: e.target.value })}
              />
              <p className="text-xs text-muted-foreground">
                Enter a URL to your logo image. Recommended size: 200x200px
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Color Presets */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Color Presets</CardTitle>
          <CardDescription>
            Choose from pre-designed color schemes
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-3">
            {colorPresets.map((preset) => (
              <button
                key={preset.name}
                className={`p-3 rounded-lg border-2 transition-all ${
                  formData.primaryColor === preset.primary
                    ? "border-foreground"
                    : "border-transparent hover:border-muted-foreground/30"
                }`}
                onClick={() => applyPreset(preset)}
              >
                <div className="flex items-center gap-2 mb-2">
                  <div
                    className="h-6 w-6 rounded-full"
                    style={{ backgroundColor: preset.primary }}
                  />
                  <div
                    className="h-6 w-6 rounded-full"
                    style={{ backgroundColor: preset.accent }}
                  />
                  {formData.primaryColor === preset.primary && (
                    <Check className="h-4 w-4 ml-auto" />
                  )}
                </div>
                <p className="text-sm font-medium">{preset.name}</p>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Custom Colors */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Custom Colors</CardTitle>
          <CardDescription>
            Fine-tune your brand colors
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="primaryColor">Primary Color</Label>
              <div className="flex gap-2">
                <div
                  className="h-10 w-10 rounded-md border"
                  style={{ backgroundColor: formData.primaryColor }}
                />
                <Input
                  id="primaryColor"
                  type="text"
                  value={formData.primaryColor}
                  onChange={(e) => setFormData({ ...formData, primaryColor: e.target.value })}
                  className="flex-1"
                />
                <Input
                  type="color"
                  value={formData.primaryColor}
                  onChange={(e) => setFormData({ ...formData, primaryColor: e.target.value })}
                  className="w-10 h-10 p-1 cursor-pointer"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="accentColor">Accent Color</Label>
              <div className="flex gap-2">
                <div
                  className="h-10 w-10 rounded-md border"
                  style={{ backgroundColor: formData.accentColor }}
                />
                <Input
                  id="accentColor"
                  type="text"
                  value={formData.accentColor}
                  onChange={(e) => setFormData({ ...formData, accentColor: e.target.value })}
                  className="flex-1"
                />
                <Input
                  type="color"
                  value={formData.accentColor}
                  onChange={(e) => setFormData({ ...formData, accentColor: e.target.value })}
                  className="w-10 h-10 p-1 cursor-pointer"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Preview */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Preview</CardTitle>
          <CardDescription>
            See how your branding will look
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="p-6 rounded-lg border bg-background">
            <div className="flex items-center gap-4 mb-6">
              {formData.logoUrl ? (
                <img
                  src={formData.logoUrl}
                  alt="Logo preview"
                  className="h-10 w-10 object-contain"
                />
              ) : (
                <div
                  className="h-10 w-10 rounded-lg flex items-center justify-center text-white font-bold"
                  style={{ backgroundColor: formData.primaryColor }}
                >
                  C
                </div>
              )}
              <div>
                <p className="font-semibold">{profile?.businessName || "Your Business"}</p>
                <p className="text-sm text-muted-foreground">Coach Dashboard</p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex gap-2">
                <button
                  className="px-4 py-2 rounded-md text-white text-sm font-medium"
                  style={{ backgroundColor: formData.primaryColor }}
                >
                  Primary Button
                </button>
                <button
                  className="px-4 py-2 rounded-md text-white text-sm font-medium"
                  style={{ backgroundColor: formData.accentColor }}
                >
                  Accent Button
                </button>
                <button className="px-4 py-2 rounded-md border text-sm font-medium">
                  Outline Button
                </button>
              </div>

              <div className="flex items-center gap-4">
                <div
                  className="h-2 w-32 rounded-full"
                  style={{ backgroundColor: `${formData.primaryColor}30` }}
                >
                  <div
                    className="h-full w-3/4 rounded-full"
                    style={{ backgroundColor: formData.primaryColor }}
                  />
                </div>
                <span className="text-sm text-muted-foreground">Progress: 75%</span>
              </div>

              <div className="flex gap-2">
                <span
                  className="px-2 py-1 rounded-md text-xs font-medium text-white"
                  style={{ backgroundColor: formData.primaryColor }}
                >
                  Primary Badge
                </span>
                <span
                  className="px-2 py-1 rounded-md text-xs font-medium"
                  style={{
                    backgroundColor: `${formData.accentColor}20`,
                    color: formData.accentColor,
                  }}
                >
                  Accent Badge
                </span>
              </div>
            </div>
          </div>
        </CardContent>
        <CardFooter>
          <Button onClick={handleSave} disabled={updateBranding.isPending}>
            {updateBranding.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save Branding
          </Button>
        </CardFooter>
      </Card>

      {/* Info */}
      <Card>
        <CardContent className="pt-6">
          <p className="text-sm text-muted-foreground text-center">
            Note: Branding changes will be applied across your dashboard. 
            Some changes may require a page refresh to take effect.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
