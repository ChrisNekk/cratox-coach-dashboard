"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Plus,
  MoreHorizontal,
  Edit,
  Copy,
  Trash2,
  Send,
  ClipboardList,
  FileText,
  Eye,
  Loader2,
  BarChart3,
} from "lucide-react";
import { toast } from "sonner";
import { QuestionnaireBuilderDialog } from "./questionnaire-builder-dialog";
import { SendQuestionnaireDialog } from "./send-questionnaire-dialog";
import { ResponseViewer } from "./response-viewer";
import { QuestionnaireAnalytics } from "./questionnaire-analytics";
import { formatDistanceToNow } from "date-fns";

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
  createdAt: Date;
  _count: {
    clientQuestionnaires: number;
  };
};

export function QuestionnaireList() {
  const [builderOpen, setBuilderOpen] = useState(false);
  const [editingQuestionnaire, setEditingQuestionnaire] = useState<QuestionnaireFromQuery | null>(null);
  const [sendDialogOpen, setSendDialogOpen] = useState(false);
  const [selectedQuestionnaire, setSelectedQuestionnaire] = useState<QuestionnaireFromQuery | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [questionnaireToDelete, setQuestionnaireToDelete] = useState<QuestionnaireFromQuery | null>(null);
  const [viewingResponses, setViewingResponses] = useState<string | null>(null);
  const [viewingAnalytics, setViewingAnalytics] = useState<string | null>(null);

  const { data: questionnaires, isLoading, refetch } = trpc.questionnaire.getAll.useQuery();
  const { data: stats } = trpc.questionnaire.getStats.useQuery();

  const copyTemplate = trpc.questionnaire.copyTemplate.useMutation({
    onSuccess: () => {
      toast.success("Template copied to your questionnaires!");
      refetch();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to copy template");
    },
  });

  const deleteQuestionnaire = trpc.questionnaire.delete.useMutation({
    onSuccess: () => {
      toast.success("Questionnaire deleted");
      setDeleteDialogOpen(false);
      setQuestionnaireToDelete(null);
      refetch();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to delete questionnaire");
    },
  });

  const duplicateQuestionnaire = trpc.questionnaire.duplicate.useMutation({
    onSuccess: () => {
      toast.success("Questionnaire duplicated!");
      refetch();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to duplicate questionnaire");
    },
  });

  const handleEdit = (questionnaire: QuestionnaireFromQuery) => {
    setEditingQuestionnaire(questionnaire);
    setBuilderOpen(true);
  };

  const handleSend = (questionnaire: QuestionnaireFromQuery) => {
    setSelectedQuestionnaire(questionnaire);
    setSendDialogOpen(true);
  };

  const handleDelete = (questionnaire: QuestionnaireFromQuery) => {
    setQuestionnaireToDelete(questionnaire);
    setDeleteDialogOpen(true);
  };

  const handleCopyTemplate = (id: string) => {
    copyTemplate.mutate({ id });
  };

  const handleBuilderClose = () => {
    setBuilderOpen(false);
    setEditingQuestionnaire(null);
    refetch();
  };

  if (viewingAnalytics) {
    return (
      <QuestionnaireAnalytics
        questionnaireId={viewingAnalytics}
        onBack={() => setViewingAnalytics(null)}
      />
    );
  }

  if (viewingResponses) {
    return (
      <ResponseViewer
        questionnaireId={viewingResponses}
        onBack={() => setViewingResponses(null)}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">My Templates</p>
                <p className="text-2xl font-bold">{stats?.total || 0}</p>
              </div>
              <FileText className="h-8 w-8 text-muted-foreground/50" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Sent</p>
                <p className="text-2xl font-bold text-blue-600">{stats?.sent || 0}</p>
              </div>
              <Send className="h-8 w-8 text-blue-500/50" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">In Progress</p>
                <p className="text-2xl font-bold text-amber-600">{stats?.inProgress || 0}</p>
              </div>
              <ClipboardList className="h-8 w-8 text-amber-500/50" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Completed</p>
                <p className="text-2xl font-bold text-green-600">{stats?.completed || 0}</p>
              </div>
              <ClipboardList className="h-8 w-8 text-green-500/50" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Questionnaires</CardTitle>
              <CardDescription>
                Create and manage questionnaires to gather information from your clients
              </CardDescription>
            </div>
            <Button onClick={() => setBuilderOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Create Questionnaire
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center gap-4 p-4 border rounded-lg">
                  <Skeleton className="h-10 w-10 rounded" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-48" />
                    <Skeleton className="h-3 w-32" />
                  </div>
                  <Skeleton className="h-8 w-8" />
                </div>
              ))}
            </div>
          ) : questionnaires && questionnaires.length > 0 ? (
            <div className="space-y-3">
              {questionnaires.map((q: QuestionnaireFromQuery) => {
                const questionnaire = q;
                const questions = questionnaire.questions as Question[];
                return (
                  <div
                    key={questionnaire.id}
                    className="flex items-center gap-4 p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className="h-10 w-10 rounded bg-primary/10 flex items-center justify-center">
                      <ClipboardList className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h4 className="font-medium truncate">{questionnaire.title}</h4>
                        {questionnaire.isSystem && (
                          <Badge variant="secondary" className="shrink-0">
                            System Template
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {questions.length} questions
                        {questionnaire._count.clientQuestionnaires > 0 && (
                          <> &bull; Sent to {questionnaire._count.clientQuestionnaires} client{questionnaire._count.clientQuestionnaires !== 1 ? "s" : ""}</>
                        )}
                        {!questionnaire.isSystem && (
                          <> &bull; Created {formatDistanceToNow(new Date(questionnaire.createdAt), { addSuffix: true })}</>
                        )}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {!questionnaire.isSystem && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(questionnaire)}
                        >
                          <Edit className="mr-2 h-4 w-4" />
                          Edit
                        </Button>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleSend(questionnaire)}
                      >
                        <Send className="mr-2 h-4 w-4" />
                        Send
                      </Button>
                      {questionnaire._count.clientQuestionnaires > 0 && (
                        <>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setViewingResponses(questionnaire.id)}
                          >
                            <Eye className="mr-2 h-4 w-4" />
                            Responses
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setViewingAnalytics(questionnaire.id)}
                          >
                            <BarChart3 className="mr-2 h-4 w-4" />
                            Analytics
                          </Button>
                        </>
                      )}
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {questionnaire.isSystem ? (
                            <>
                              <DropdownMenuItem
                                onClick={() => handleCopyTemplate(questionnaire.id)}
                                disabled={copyTemplate.isPending}
                              >
                                {copyTemplate.isPending ? (
                                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                ) : (
                                  <Copy className="mr-2 h-4 w-4" />
                                )}
                                Copy to My Templates
                              </DropdownMenuItem>
                              <p className="px-2 py-1.5 text-xs text-muted-foreground">
                                System templates cannot be edited
                              </p>
                            </>
                          ) : (
                            <>
                              <DropdownMenuItem onClick={() => handleEdit(questionnaire)}>
                                <Edit className="mr-2 h-4 w-4" />
                                Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => duplicateQuestionnaire.mutate({ id: questionnaire.id })}
                                disabled={duplicateQuestionnaire.isPending}
                              >
                                {duplicateQuestionnaire.isPending ? (
                                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                ) : (
                                  <Copy className="mr-2 h-4 w-4" />
                                )}
                                Duplicate
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() => handleDelete(questionnaire)}
                                className="text-destructive"
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Delete
                              </DropdownMenuItem>
                            </>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-12">
              <ClipboardList className="mx-auto h-12 w-12 text-muted-foreground/50" />
              <h3 className="mt-4 text-lg font-semibold">No questionnaires yet</h3>
              <p className="text-muted-foreground mt-2">
                Create your first questionnaire to start gathering information from clients.
              </p>
              <Button className="mt-4" onClick={() => setBuilderOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Create Questionnaire
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Builder Dialog */}
      <QuestionnaireBuilderDialog
        open={builderOpen}
        onOpenChange={(open) => {
          if (!open) handleBuilderClose();
          else setBuilderOpen(open);
        }}
        questionnaire={editingQuestionnaire}
      />

      {/* Send Dialog */}
      {selectedQuestionnaire && (
        <SendQuestionnaireDialog
          open={sendDialogOpen}
          onOpenChange={setSendDialogOpen}
          questionnaire={selectedQuestionnaire}
          onSuccess={() => {
            setSendDialogOpen(false);
            setSelectedQuestionnaire(null);
            refetch();
          }}
        />
      )}

      {/* Delete Confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Questionnaire</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &quot;{questionnaireToDelete?.title}&quot;? This action cannot be undone.
              {questionnaireToDelete?._count.clientQuestionnaires && questionnaireToDelete._count.clientQuestionnaires > 0 && (
                <span className="block mt-2 text-amber-600">
                  Warning: This questionnaire has been sent to {questionnaireToDelete._count.clientQuestionnaires} client(s). Their responses will also be deleted.
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => questionnaireToDelete && deleteQuestionnaire.mutate({ id: questionnaireToDelete.id })}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteQuestionnaire.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
