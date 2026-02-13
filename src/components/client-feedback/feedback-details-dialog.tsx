"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Star,
  MessageSquare,
  ThumbsUp,
  Lightbulb,
  User,
  Calendar,
} from "lucide-react";
import { format } from "date-fns";

type FeedbackRequestWithDetails = {
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

interface FeedbackDetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  feedbackRequest: FeedbackRequestWithDetails;
}

function RatingDisplay({ label, value, icon }: { label: string; value: number; icon: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between p-3 border rounded-lg">
      <div className="flex items-center gap-2">
        {icon}
        <span className="text-sm">{label}</span>
      </div>
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`h-4 w-4 ${
              star <= value ? "fill-amber-400 text-amber-400" : "text-muted-foreground/30"
            }`}
          />
        ))}
        <span className="ml-2 text-sm font-medium">{value}/5</span>
      </div>
    </div>
  );
}

export function FeedbackDetailsDialog({
  open,
  onOpenChange,
  feedbackRequest,
}: FeedbackDetailsDialogProps) {
  const { client, feedback } = feedbackRequest;

  if (!feedback) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Star className="h-5 w-5 text-amber-500" />
            Feedback from {client.name}
          </DialogTitle>
          <DialogDescription>
            Submitted on {format(new Date(feedback.createdAt), "PPP")}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Client Info */}
          <div className="flex items-center gap-4 p-4 border rounded-lg bg-muted/50">
            <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
              <User className="h-6 w-6 text-primary" />
            </div>
            <div className="flex-1">
              <Link
                href={`/clients/${client.id}`}
                className="font-medium hover:underline"
              >
                {client.name}
              </Link>
              <p className="text-sm text-muted-foreground">{client.email}</p>
            </div>
            <Badge variant="default" className="bg-green-500">
              Completed
            </Badge>
          </div>

          {/* Overall Rating */}
          <div className="text-center p-6 border rounded-lg bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/30">
            <p className="text-sm text-muted-foreground mb-2">Overall Experience</p>
            <div className="flex items-center justify-center gap-1 mb-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <Star
                  key={star}
                  className={`h-8 w-8 ${
                    star <= feedback.overallRating
                      ? "fill-amber-400 text-amber-400"
                      : "text-muted-foreground/30"
                  }`}
                />
              ))}
            </div>
            <p className="text-2xl font-bold">{feedback.overallRating} out of 5</p>
          </div>

          {/* Rating Dimensions */}
          <div className="space-y-3">
            <h4 className="text-sm font-medium">Rating Breakdown</h4>
            <RatingDisplay
              label="Coaching Quality"
              value={feedback.coachingQuality}
              icon={<Star className="h-4 w-4 text-blue-500" />}
            />
            <RatingDisplay
              label="Communication"
              value={feedback.communication}
              icon={<MessageSquare className="h-4 w-4 text-green-500" />}
            />
            <RatingDisplay
              label="Progress Support"
              value={feedback.progressSupport}
              icon={<ThumbsUp className="h-4 w-4 text-purple-500" />}
            />
          </div>

          {/* Written Feedback */}
          <div className="space-y-4">
            {feedback.whatWentWell && (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <ThumbsUp className="h-4 w-4 text-green-500" />
                  <h4 className="text-sm font-medium">What Went Well</h4>
                </div>
                <div className="p-4 border rounded-lg bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-900">
                  <p className="text-sm text-green-800 dark:text-green-300">
                    {feedback.whatWentWell}
                  </p>
                </div>
              </div>
            )}

            {feedback.whatCouldImprove && (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Lightbulb className="h-4 w-4 text-amber-500" />
                  <h4 className="text-sm font-medium">What Could Improve</h4>
                </div>
                <div className="p-4 border rounded-lg bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-900">
                  <p className="text-sm text-amber-800 dark:text-amber-300">
                    {feedback.whatCouldImprove}
                  </p>
                </div>
              </div>
            )}

            {feedback.additionalComments && (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <MessageSquare className="h-4 w-4 text-blue-500" />
                  <h4 className="text-sm font-medium">Additional Comments</h4>
                </div>
                <div className="p-4 border rounded-lg bg-muted/50">
                  <p className="text-sm">{feedback.additionalComments}</p>
                </div>
              </div>
            )}

            {!feedback.whatWentWell && !feedback.whatCouldImprove && !feedback.additionalComments && (
              <p className="text-sm text-muted-foreground text-center py-4">
                No written feedback provided
              </p>
            )}
          </div>

          {/* Timeline */}
          <div className="space-y-2 pt-4 border-t">
            <h4 className="text-sm font-medium">Timeline</h4>
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                <span>Sent: {format(new Date(feedbackRequest.sentAt), "PPP")}</span>
              </div>
              {feedbackRequest.dueDate && (
                <div className="flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  <span>Due: {format(new Date(feedbackRequest.dueDate), "PPP")}</span>
                </div>
              )}
              <div className="flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                <span>Completed: {format(new Date(feedback.createdAt), "PPP")}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end pt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
