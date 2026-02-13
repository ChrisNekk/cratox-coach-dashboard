"use client";

import { useState, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { trpc } from "@/lib/trpc/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
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
  Trash2,
  Send,
  Star,
  Eye,
  Loader2,
  BarChart3,
  Clock,
  CheckCircle,
  MessageSquare,
  Settings,
} from "lucide-react";
import { toast } from "sonner";
import { RequestFeedbackDialog } from "./request-feedback-dialog";
import { FeedbackAnalytics } from "./feedback-analytics";
import { FeedbackDetailsDialog } from "./feedback-details-dialog";
import { FeedbackSettingsDialog } from "./feedback-settings-dialog";
import { formatDistanceToNow } from "date-fns";

type FeedbackRequestFromQuery = {
  id: string;
  status: "PENDING" | "IN_PROGRESS" | "COMPLETED";
  sentAt: Date;
  completedAt: Date | null;
  dueDate: Date | null;
  client: {
    id: string;
    name: string;
    email: string;
  };
  feedback: {
    id: string;
    coachingQuality: number;
    communication: number;
    progressSupport: number;
    overallRating: number;
    whatWentWell: string | null;
    whatCouldImprove: string | null;
    additionalComments: string | null;
    createdAt: Date;
  } | null;
};

export function FeedbackList() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [requestDialogOpen, setRequestDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [settingsDialogOpen, setSettingsDialogOpen] = useState(false);
  const [feedbackToDelete, setFeedbackToDelete] = useState<FeedbackRequestFromQuery | null>(null);
  const [viewingFeedback, setViewingFeedback] = useState<FeedbackRequestFromQuery | null>(null);

  // Get analytics view from URL
  const viewingAnalytics = searchParams.get("feedback-analytics") === "true";

  // Update URL when viewing analytics
  const setViewingAnalytics = useCallback((show: boolean) => {
    const params = new URLSearchParams(searchParams.toString());
    if (show) {
      params.set("feedback-analytics", "true");
    } else {
      params.delete("feedback-analytics");
    }
    router.push(`/clients?${params.toString()}`, { scroll: false });
  }, [searchParams, router]);

  const { data: feedbackRequests, isLoading, refetch } = trpc.feedback.getAll.useQuery();
  const { data: stats } = trpc.feedback.getStats.useQuery();

  const deleteFeedback = trpc.feedback.delete.useMutation({
    onSuccess: () => {
      toast.success("Feedback request deleted");
      setDeleteDialogOpen(false);
      setFeedbackToDelete(null);
      refetch();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to delete feedback request");
    },
  });

  const handleDelete = (feedback: FeedbackRequestFromQuery) => {
    setFeedbackToDelete(feedback);
    setDeleteDialogOpen(true);
  };

  const handleRequestDialogClose = () => {
    setRequestDialogOpen(false);
    refetch();
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "COMPLETED":
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case "IN_PROGRESS":
        return <Clock className="h-4 w-4 text-amber-500" />;
      case "PENDING":
        return <Send className="h-4 w-4 text-blue-500" />;
      default:
        return null;
    }
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case "COMPLETED":
        return "default" as const;
      case "IN_PROGRESS":
        return "secondary" as const;
      case "PENDING":
        return "outline" as const;
      default:
        return "outline" as const;
    }
  };

  const renderStars = (rating: number) => {
    return (
      <div className="flex gap-0.5">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`h-4 w-4 ${
              star <= rating ? "fill-amber-400 text-amber-400" : "text-muted-foreground/30"
            }`}
          />
        ))}
      </div>
    );
  };

  if (viewingAnalytics) {
    return <FeedbackAnalytics onBack={() => setViewingAnalytics(false)} />;
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid gap-4 grid-cols-2 md:grid-cols-5">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Requests</p>
                <p className="text-2xl font-bold">{stats?.total || 0}</p>
              </div>
              <MessageSquare className="h-8 w-8 text-muted-foreground/50" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Pending</p>
                <p className="text-2xl font-bold text-blue-600">{stats?.pending || 0}</p>
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
              <Clock className="h-8 w-8 text-amber-500/50" />
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
              <CheckCircle className="h-8 w-8 text-green-500/50" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Avg Rating</p>
                <div className="flex items-center gap-2">
                  <p className="text-2xl font-bold">{stats?.averageRatings.overall || "-"}</p>
                  {stats?.averageRatings.overall ? (
                    <Star className="h-5 w-5 fill-amber-400 text-amber-400" />
                  ) : null}
                </div>
              </div>
              <Star className="h-8 w-8 text-amber-400/50" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Client Feedback</CardTitle>
              <CardDescription>
                Request and view feedback from your clients to improve your coaching
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="icon" onClick={() => setSettingsDialogOpen(true)} title="Customize Questions">
                <Settings className="h-4 w-4" />
              </Button>
              {stats && stats.completed > 0 && (
                <Button variant="outline" onClick={() => setViewingAnalytics(true)}>
                  <BarChart3 className="mr-2 h-4 w-4" />
                  View Analytics
                </Button>
              )}
              <Button onClick={() => setRequestDialogOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Request Feedback
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center gap-4 p-4 border rounded-lg">
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-48" />
                    <Skeleton className="h-3 w-32" />
                  </div>
                  <Skeleton className="h-8 w-8" />
                </div>
              ))}
            </div>
          ) : feedbackRequests && feedbackRequests.length > 0 ? (
            <div className="space-y-3">
              {feedbackRequests.map((request) => (
                <div
                  key={request.id}
                  className="flex items-center gap-4 p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                    {request.status === "COMPLETED" && request.feedback ? (
                      <Star className="h-5 w-5 text-amber-500" />
                    ) : (
                      <MessageSquare className="h-5 w-5 text-primary" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h4 className="font-medium truncate">{request.client.name}</h4>
                      <Badge variant={getStatusBadgeVariant(request.status)} className="shrink-0">
                        {getStatusIcon(request.status)}
                        <span className="ml-1">{request.status.replace("_", " ")}</span>
                      </Badge>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {request.status === "COMPLETED" && request.feedback ? (
                        <span className="flex items-center gap-2">
                          {renderStars(request.feedback.overallRating)}
                          <span className="text-muted-foreground">
                            &bull; Completed {formatDistanceToNow(new Date(request.feedback.createdAt), { addSuffix: true })}
                          </span>
                        </span>
                      ) : (
                        <>
                          Sent {formatDistanceToNow(new Date(request.sentAt), { addSuffix: true })}
                          {request.dueDate && (
                            <> &bull; Due {formatDistanceToNow(new Date(request.dueDate), { addSuffix: true })}</>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {request.status === "COMPLETED" && request.feedback && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setViewingFeedback(request)}
                      >
                        <Eye className="mr-2 h-4 w-4" />
                        View
                      </Button>
                    )}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {request.status === "COMPLETED" && request.feedback && (
                          <DropdownMenuItem onClick={() => setViewingFeedback(request)}>
                            <Eye className="mr-2 h-4 w-4" />
                            View Feedback
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem
                          onClick={() => handleDelete(request)}
                          className="text-destructive"
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <Star className="mx-auto h-12 w-12 text-muted-foreground/50" />
              <h3 className="mt-4 text-lg font-semibold">No feedback requests yet</h3>
              <p className="text-muted-foreground mt-2">
                Start gathering feedback from your clients to improve your coaching.
              </p>
              <Button className="mt-4" onClick={() => setRequestDialogOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Request Feedback
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Request Dialog */}
      <RequestFeedbackDialog
        open={requestDialogOpen}
        onOpenChange={(open) => {
          if (!open) handleRequestDialogClose();
          else setRequestDialogOpen(open);
        }}
      />

      {/* Details Dialog */}
      {viewingFeedback && (
        <FeedbackDetailsDialog
          open={!!viewingFeedback}
          onOpenChange={(open) => !open && setViewingFeedback(null)}
          feedbackRequest={viewingFeedback}
        />
      )}

      {/* Delete Confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Feedback Request</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this feedback request for {feedbackToDelete?.client.name}?
              {feedbackToDelete?.status === "COMPLETED" && " This will also delete their submitted feedback."}
              {" "}This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => feedbackToDelete && deleteFeedback.mutate({ id: feedbackToDelete.id })}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteFeedback.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Settings Dialog */}
      <FeedbackSettingsDialog
        open={settingsDialogOpen}
        onOpenChange={setSettingsDialogOpen}
      />
    </div>
  );
}
