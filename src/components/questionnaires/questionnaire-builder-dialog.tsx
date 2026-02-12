"use client";

import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Plus,
  Trash2,
  GripVertical,
  Loader2,
  Type,
  AlignLeft,
  CircleDot,
  CheckSquare,
  Star,
  ToggleLeft,
  X,
} from "lucide-react";
import { toast } from "sonner";

type QuestionType = "TEXT_SHORT" | "TEXT_LONG" | "SINGLE_SELECT" | "MULTI_SELECT" | "RATING_SCALE" | "YES_NO";

type Question = {
  id: string;
  type: QuestionType;
  question: string;
  required: boolean;
  options?: string[];
  ratingMax?: number;
};

type QuestionnaireFromQuery = {
  id: string;
  title: string;
  description: string | null;
  questions: unknown;
  isSystem: boolean;
};

interface QuestionnaireBuilderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  questionnaire?: QuestionnaireFromQuery | null;
}

const questionTypeIcons: Record<QuestionType, React.ReactNode> = {
  TEXT_SHORT: <Type className="h-4 w-4" />,
  TEXT_LONG: <AlignLeft className="h-4 w-4" />,
  SINGLE_SELECT: <CircleDot className="h-4 w-4" />,
  MULTI_SELECT: <CheckSquare className="h-4 w-4" />,
  RATING_SCALE: <Star className="h-4 w-4" />,
  YES_NO: <ToggleLeft className="h-4 w-4" />,
};

const questionTypeLabels: Record<QuestionType, string> = {
  TEXT_SHORT: "Short Text",
  TEXT_LONG: "Long Text",
  SINGLE_SELECT: "Single Choice",
  MULTI_SELECT: "Multiple Choice",
  RATING_SCALE: "Rating Scale",
  YES_NO: "Yes/No",
};

const generateId = () => `q_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

function AddQuestionButton({ onAdd, variant = "default" }: { onAdd: (type: QuestionType) => void; variant?: "default" | "inline" }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        {variant === "inline" ? (
          <Button variant="ghost" size="sm" className="w-full border-dashed border-2 text-muted-foreground hover:text-foreground">
            <Plus className="mr-2 h-4 w-4" />
            Add Question
          </Button>
        ) : (
          <Button variant="outline" size="sm">
            <Plus className="mr-2 h-4 w-4" />
            Add Question
          </Button>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="center" className="w-48">
        {(Object.keys(questionTypeLabels) as QuestionType[]).map((type) => (
          <DropdownMenuItem key={type} onClick={() => onAdd(type)} className="gap-2">
            {questionTypeIcons[type]}
            {questionTypeLabels[type]}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function QuestionnaireBuilderDialog({
  open,
  onOpenChange,
  questionnaire,
}: QuestionnaireBuilderDialogProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [questions, setQuestions] = useState<Question[]>([]);

  const createMutation = trpc.questionnaire.create.useMutation({
    onSuccess: () => {
      toast.success("Questionnaire created!");
      onOpenChange(false);
      resetForm();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to create questionnaire");
    },
  });

  const updateMutation = trpc.questionnaire.update.useMutation({
    onSuccess: () => {
      toast.success("Questionnaire updated!");
      onOpenChange(false);
      resetForm();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to update questionnaire");
    },
  });

  const isEditing = !!questionnaire && !questionnaire.isSystem;
  const isPending = createMutation.isPending || updateMutation.isPending;

  useEffect(() => {
    if (open && questionnaire) {
      setTitle(questionnaire.title);
      setDescription(questionnaire.description || "");
      const parsedQuestions = questionnaire.questions as Question[];
      setQuestions(parsedQuestions);
    } else if (open && !questionnaire) {
      resetForm();
    }
  }, [open, questionnaire]);

  const resetForm = () => {
    setTitle("");
    setDescription("");
    setQuestions([]);
  };

  const addQuestion = (type: QuestionType, afterIndex?: number) => {
    const newQuestion: Question = {
      id: generateId(),
      type,
      question: "",
      required: true,
      ...(type === "SINGLE_SELECT" || type === "MULTI_SELECT"
        ? { options: ["Option 1", "Option 2"] }
        : {}),
      ...(type === "RATING_SCALE" ? { ratingMax: 5 } : {}),
    };

    if (afterIndex !== undefined) {
      const newQuestions = [...questions];
      newQuestions.splice(afterIndex + 1, 0, newQuestion);
      setQuestions(newQuestions);
    } else {
      setQuestions([...questions, newQuestion]);
    }
  };

  const updateQuestion = (id: string, updates: Partial<Question>) => {
    setQuestions(questions.map((q) => (q.id === id ? { ...q, ...updates } : q)));
  };

  const removeQuestion = (id: string) => {
    setQuestions(questions.filter((q) => q.id !== id));
  };

  const addOption = (questionId: string) => {
    setQuestions(
      questions.map((q) => {
        if (q.id === questionId && q.options) {
          return { ...q, options: [...q.options, `Option ${q.options.length + 1}`] };
        }
        return q;
      })
    );
  };

  const updateOption = (questionId: string, optionIndex: number, value: string) => {
    setQuestions(
      questions.map((q) => {
        if (q.id === questionId && q.options) {
          const newOptions = [...q.options];
          newOptions[optionIndex] = value;
          return { ...q, options: newOptions };
        }
        return q;
      })
    );
  };

  const removeOption = (questionId: string, optionIndex: number) => {
    setQuestions(
      questions.map((q) => {
        if (q.id === questionId && q.options && q.options.length > 2) {
          const newOptions = q.options.filter((_, i) => i !== optionIndex);
          return { ...q, options: newOptions };
        }
        return q;
      })
    );
  };

  const handleSubmit = () => {
    if (!title.trim()) {
      toast.error("Please enter a title");
      return;
    }

    if (questions.length === 0) {
      toast.error("Please add at least one question");
      return;
    }

    const emptyQuestions = questions.filter((q) => !q.question.trim());
    if (emptyQuestions.length > 0) {
      toast.error("Please fill in all question texts");
      return;
    }

    const data = {
      title: title.trim(),
      description: description.trim() || undefined,
      questions,
    };

    if (isEditing) {
      updateMutation.mutate({ id: questionnaire!.id, ...data });
    } else {
      createMutation.mutate(data);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Edit Questionnaire" : "Create Questionnaire"}
          </DialogTitle>
          <DialogDescription>
            Build a questionnaire to gather information from your clients.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-hidden flex flex-col gap-4 min-h-0">
          <div className="space-y-4 shrink-0">
            <div className="grid gap-2">
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                placeholder="e.g., New Client Intake Form"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="description">Description (optional)</Label>
              <Textarea
                id="description"
                placeholder="Brief description of this questionnaire..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
              />
            </div>
          </div>

          <div className="flex items-center justify-between shrink-0">
            <Label>Questions ({questions.length})</Label>
            <AddQuestionButton onAdd={(type) => addQuestion(type)} />
          </div>

          <div className="flex-1 min-h-0 border rounded-lg overflow-auto">
            <div className="p-4 space-y-3">
              {questions.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Plus className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p className="text-lg font-medium mb-2">No questions yet</p>
                  <p className="text-sm mb-4">Click the button below to add your first question</p>
                  <AddQuestionButton onAdd={(type) => addQuestion(type)} />
                </div>
              ) : (
                <>
                  {questions.map((question, index) => (
                    <div key={question.id} className="space-y-2">
                      <div className="border rounded-lg p-4 space-y-3 bg-card">
                        <div className="flex items-start gap-3">
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <GripVertical className="h-4 w-4 cursor-grab" />
                            <span className="text-sm font-medium">Q{index + 1}</span>
                          </div>
                          <div className="flex-1 space-y-3">
                            <div className="flex items-center gap-2">
                              <Badge variant="secondary" className="gap-1">
                                {questionTypeIcons[question.type]}
                                {questionTypeLabels[question.type]}
                              </Badge>
                              <div className="flex items-center gap-2 ml-auto">
                                <Label htmlFor={`required-${question.id}`} className="text-sm">
                                  Required
                                </Label>
                                <Switch
                                  id={`required-${question.id}`}
                                  checked={question.required}
                                  onCheckedChange={(checked) =>
                                    updateQuestion(question.id, { required: checked })
                                  }
                                />
                              </div>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => removeQuestion(question.id)}
                                className="h-8 w-8 text-destructive hover:text-destructive"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                            <Input
                              placeholder="Enter your question..."
                              value={question.question}
                              onChange={(e) =>
                                updateQuestion(question.id, { question: e.target.value })
                              }
                            />

                            {/* Options for select types */}
                            {(question.type === "SINGLE_SELECT" || question.type === "MULTI_SELECT") &&
                              question.options && (
                                <div className="space-y-2 pl-4 border-l-2">
                                  <Label className="text-sm text-muted-foreground">Options</Label>
                                  {question.options.map((option, optIndex) => (
                                    <div key={optIndex} className="flex items-center gap-2">
                                      <Input
                                        value={option}
                                        onChange={(e) =>
                                          updateOption(question.id, optIndex, e.target.value)
                                        }
                                        placeholder={`Option ${optIndex + 1}`}
                                        className="flex-1"
                                      />
                                      {question.options!.length > 2 && (
                                        <Button
                                          variant="ghost"
                                          size="icon"
                                          onClick={() => removeOption(question.id, optIndex)}
                                          className="h-8 w-8"
                                        >
                                          <X className="h-4 w-4" />
                                        </Button>
                                      )}
                                    </div>
                                  ))}
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => addOption(question.id)}
                                  >
                                    <Plus className="mr-1 h-3 w-3" />
                                    Add Option
                                  </Button>
                                </div>
                              )}

                            {/* Rating scale options */}
                            {question.type === "RATING_SCALE" && (
                              <div className="flex items-center gap-2 pl-4 border-l-2">
                                <Label className="text-sm text-muted-foreground">Scale:</Label>
                                <Select
                                  value={String(question.ratingMax || 5)}
                                  onValueChange={(value) =>
                                    updateQuestion(question.id, { ratingMax: Number(value) })
                                  }
                                >
                                  <SelectTrigger className="w-24">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="5">1 - 5</SelectItem>
                                    <SelectItem value="10">1 - 10</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Add question button after each question */}
                      <div className="flex justify-center py-1">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 px-3 text-xs text-muted-foreground hover:text-foreground"
                            >
                              <Plus className="h-3 w-3 mr-1" />
                              Add question here
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="center" className="w-48">
                            {(Object.keys(questionTypeLabels) as QuestionType[]).map((type) => (
                              <DropdownMenuItem
                                key={type}
                                onClick={() => addQuestion(type, index)}
                                className="gap-2"
                              >
                                {questionTypeIcons[type]}
                                {questionTypeLabels[type]}
                              </DropdownMenuItem>
                            ))}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  ))}
                </>
              )}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isPending}>
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isEditing ? "Save Changes" : "Create Questionnaire"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
