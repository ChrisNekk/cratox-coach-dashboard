"use client";

import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Star, MessageSquare, GripVertical, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

interface FeedbackSettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface RatingQuestion {
  id: string;
  label: string;
  description: string;
  enabled: boolean;
}

interface TextQuestion {
  id: string;
  label: string;
  placeholder: string;
  enabled: boolean;
}

const DEFAULT_RATING_QUESTIONS: RatingQuestion[] = [
  { id: "coachingQuality", label: "Coaching Quality", description: "How effective is the coaching?", enabled: true },
  { id: "communication", label: "Communication", description: "How well does the coach communicate?", enabled: true },
  { id: "progressSupport", label: "Progress Support", description: "How well does the coach support your progress?", enabled: true },
  { id: "overallRating", label: "Overall Experience", description: "Overall coaching experience", enabled: true },
];

const DEFAULT_TEXT_QUESTIONS: TextQuestion[] = [
  { id: "whatWentWell", label: "What went well?", placeholder: "Share what you enjoyed about your coaching experience...", enabled: true },
  { id: "whatCouldImprove", label: "What could improve?", placeholder: "Share any suggestions for improvement...", enabled: true },
  { id: "additionalComments", label: "Additional comments", placeholder: "Any other feedback you'd like to share...", enabled: true },
];

export function FeedbackSettingsDialog({
  open,
  onOpenChange,
}: FeedbackSettingsDialogProps) {
  const [ratingQuestions, setRatingQuestions] = useState<RatingQuestion[]>(DEFAULT_RATING_QUESTIONS);
  const [textQuestions, setTextQuestions] = useState<TextQuestion[]>(DEFAULT_TEXT_QUESTIONS);
  const [hasChanges, setHasChanges] = useState(false);

  const { data: settings, isLoading, error } = trpc.feedback.getSettings.useQuery(undefined, {
    enabled: open,
  });

  const utils = trpc.useUtils();

  const updateSettingsMutation = trpc.feedback.updateSettings.useMutation({
    onSuccess: () => {
      toast.success("Feedback settings saved successfully");
      utils.feedback.getSettings.invalidate();
      setHasChanges(false);
      onOpenChange(false);
    },
    onError: (error: { message: string }) => {
      toast.error(`Failed to save settings: ${error.message}`);
    },
  });

  // Reset to defaults when dialog opens, then update with fetched settings
  useEffect(() => {
    if (open && !settings) {
      setRatingQuestions(DEFAULT_RATING_QUESTIONS);
      setTextQuestions(DEFAULT_TEXT_QUESTIONS);
      setHasChanges(false);
    }
  }, [open, settings]);

  useEffect(() => {
    if (settings) {
      setRatingQuestions(settings.ratingQuestions);
      setTextQuestions(settings.textQuestions);
      setHasChanges(false);
    }
  }, [settings]);

  const handleRatingQuestionChange = (
    index: number,
    field: keyof RatingQuestion,
    value: string | boolean
  ) => {
    setRatingQuestions((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
    setHasChanges(true);
  };

  const handleTextQuestionChange = (
    index: number,
    field: keyof TextQuestion,
    value: string | boolean
  ) => {
    setTextQuestions((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
    setHasChanges(true);
  };

  const addRatingQuestion = () => {
    const newId = `rating_${Date.now()}`;
    setRatingQuestions((prev) => [
      ...prev,
      { id: newId, label: "New Rating Question", description: "Description for this question", enabled: true },
    ]);
    setHasChanges(true);
  };

  const removeRatingQuestion = (index: number) => {
    setRatingQuestions((prev) => prev.filter((_, i) => i !== index));
    setHasChanges(true);
  };

  const addTextQuestion = () => {
    const newId = `text_${Date.now()}`;
    setTextQuestions((prev) => [
      ...prev,
      { id: newId, label: "New Text Question", placeholder: "Enter your response...", enabled: true },
    ]);
    setHasChanges(true);
  };

  const removeTextQuestion = (index: number) => {
    setTextQuestions((prev) => prev.filter((_, i) => i !== index));
    setHasChanges(true);
  };

  const handleSave = () => {
    updateSettingsMutation.mutate({
      ratingQuestions,
      textQuestions,
    });
  };

  const handleReset = () => {
    if (settings) {
      setRatingQuestions(settings.ratingQuestions);
      setTextQuestions(settings.textQuestions);
      setHasChanges(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Customize Feedback Questions</DialogTitle>
          <DialogDescription>
            Configure the questions that will be asked when clients provide feedback.
            Changes apply to all future feedback requests.
          </DialogDescription>
        </DialogHeader>

        {error && (
          <div className="mb-4 p-3 bg-destructive/10 text-destructive rounded-lg text-sm">
            Failed to load settings: {error.message}. Showing defaults.
          </div>
        )}

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-6">
            {/* Rating Questions */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Star className="h-4 w-4" />
                  Rating Questions (1-5 stars)
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {ratingQuestions.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No rating questions. Click "Add Question" below to create one.
                  </p>
                ) : (
                  ratingQuestions.map((question, index) => (
                    <div
                      key={question.id}
                      className="flex items-start gap-3 p-3 rounded-lg border bg-muted/30"
                    >
                      <GripVertical className="h-5 w-5 text-muted-foreground mt-1 flex-shrink-0" />
                      <div className="flex-1 space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="space-y-1 flex-1 mr-4">
                            <Label htmlFor={`rating-label-${index}`} className="text-xs text-muted-foreground">
                              Question Label
                            </Label>
                            <Input
                              id={`rating-label-${index}`}
                              value={question.label}
                              onChange={(e) =>
                                handleRatingQuestionChange(index, "label", e.target.value)
                              }
                              className="h-8"
                            />
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="flex items-center gap-2">
                              <Label htmlFor={`rating-enabled-${index}`} className="text-xs text-muted-foreground">
                                Enabled
                              </Label>
                              <Switch
                                id={`rating-enabled-${index}`}
                                checked={question.enabled}
                                onCheckedChange={(checked) =>
                                  handleRatingQuestionChange(index, "enabled", checked)
                                }
                              />
                            </div>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-muted-foreground hover:text-destructive"
                              onClick={() => removeRatingQuestion(index)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                        <div className="space-y-1">
                          <Label htmlFor={`rating-desc-${index}`} className="text-xs text-muted-foreground">
                            Description (shown to clients)
                          </Label>
                          <Input
                            id={`rating-desc-${index}`}
                            value={question.description}
                            onChange={(e) =>
                              handleRatingQuestionChange(index, "description", e.target.value)
                            }
                            className="h-8"
                          />
                        </div>
                      </div>
                    </div>
                  ))
                )}
                <Button
                  variant="outline"
                  className="w-full mt-2"
                  onClick={addRatingQuestion}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Rating Question
                </Button>
              </CardContent>
            </Card>

            {/* Text Questions */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <MessageSquare className="h-4 w-4" />
                  Text Questions
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {textQuestions.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No text questions. Click "Add Text Question" below to create one.
                  </p>
                ) : (
                  textQuestions.map((question, index) => (
                    <div
                      key={question.id}
                      className="flex items-start gap-3 p-3 rounded-lg border bg-muted/30"
                    >
                      <GripVertical className="h-5 w-5 text-muted-foreground mt-1 flex-shrink-0" />
                      <div className="flex-1 space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="space-y-1 flex-1 mr-4">
                            <Label htmlFor={`text-label-${index}`} className="text-xs text-muted-foreground">
                              Question Label
                            </Label>
                            <Input
                              id={`text-label-${index}`}
                              value={question.label}
                              onChange={(e) =>
                                handleTextQuestionChange(index, "label", e.target.value)
                              }
                              className="h-8"
                            />
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="flex items-center gap-2">
                              <Label htmlFor={`text-enabled-${index}`} className="text-xs text-muted-foreground">
                                Enabled
                              </Label>
                              <Switch
                                id={`text-enabled-${index}`}
                                checked={question.enabled}
                                onCheckedChange={(checked) =>
                                  handleTextQuestionChange(index, "enabled", checked)
                                }
                              />
                            </div>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-muted-foreground hover:text-destructive"
                              onClick={() => removeTextQuestion(index)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                        <div className="space-y-1">
                          <Label htmlFor={`text-placeholder-${index}`} className="text-xs text-muted-foreground">
                            Placeholder Text
                          </Label>
                          <Input
                            id={`text-placeholder-${index}`}
                            value={question.placeholder}
                            onChange={(e) =>
                              handleTextQuestionChange(index, "placeholder", e.target.value)
                            }
                            className="h-8"
                          />
                        </div>
                      </div>
                    </div>
                  ))
                )}
                <Button
                  variant="outline"
                  className="w-full mt-2"
                  onClick={addTextQuestion}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Text Question
                </Button>
              </CardContent>
            </Card>
          </div>
        )}

        <DialogFooter className="gap-2 sm:gap-0">
          {hasChanges && (
            <Button variant="ghost" onClick={handleReset}>
              Reset Changes
            </Button>
          )}
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={!hasChanges || updateSettingsMutation.isPending}
          >
            {updateSettingsMutation.isPending && (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            )}
            Save Settings
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
