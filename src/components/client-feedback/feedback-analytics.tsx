"use client";

import Link from "next/link";
import { trpc } from "@/lib/trpc/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft,
  Star,
  Users,
  Sparkles,
  AlertTriangle,
  Lightbulb,
  RefreshCw,
  ThumbsUp,
  TrendingUp,
  Info,
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { formatDistanceToNow } from "date-fns";

interface FeedbackAnalyticsProps {
  onBack: () => void;
}

function AIAnalysisSummary() {
  const { data, isLoading, error, refetch } = trpc.feedback.getAIInsights.useQuery(undefined, {
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });

  if (isLoading) {
    return (
      <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary animate-pulse" />
            <CardTitle className="text-lg">AI Analysis</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-16 w-full" />
          <div className="grid gap-4 md:grid-cols-2">
            <Skeleton className="h-32" />
            <Skeleton className="h-32" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error || !data?.analysis) {
    return (
      <Card className="border-muted">
        <CardContent className="py-6 text-center text-muted-foreground">
          <Sparkles className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p>{data?.message || "Unable to generate AI analysis"}</p>
        </CardContent>
      </Card>
    );
  }

  const { analysis } = data;

  return (
    <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg">AI Analysis Summary</CardTitle>
          </div>
          <Button variant="ghost" size="sm" onClick={() => refetch()} className="h-8 px-2">
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
        <CardDescription>
          Automated insights and recommendations based on all feedback
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* AI Score */}
        <div className="flex items-center gap-4 p-4 rounded-lg bg-gradient-to-r from-primary/10 to-primary/5 border border-primary/20">
          <div className="flex items-center justify-center h-16 w-16 rounded-full bg-primary/20">
            <span className="text-2xl font-bold text-primary">{analysis.aiScore}</span>
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <span className="font-semibold">Client Feedback Score</span>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button className="text-muted-foreground hover:text-foreground">
                    <Info className="h-4 w-4" />
                  </button>
                </TooltipTrigger>
                <TooltipContent className="max-w-xs">
                  <p className="font-medium mb-1">How this score is calculated:</p>
                  <p>{analysis.scoreExplanation}</p>
                </TooltipContent>
              </Tooltip>
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              {analysis.aiScore >= 85
                ? "Excellent - Your clients love your coaching!"
                : analysis.aiScore >= 70
                ? "Good - Solid performance with room for growth"
                : analysis.aiScore >= 50
                ? "Needs Improvement - Review feedback for insights"
                : "Requires Attention - Consider reaching out to clients"}
            </p>
            <div className="mt-2 h-2 bg-muted rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${
                  analysis.aiScore >= 85
                    ? "bg-green-500"
                    : analysis.aiScore >= 70
                    ? "bg-blue-500"
                    : analysis.aiScore >= 50
                    ? "bg-amber-500"
                    : "bg-red-500"
                }`}
                style={{ width: `${analysis.aiScore}%` }}
              />
            </div>
          </div>
        </div>

        {/* Executive Summary */}
        <div className="p-4 rounded-lg bg-background/60 border">
          <p className="text-sm leading-relaxed">{analysis.summary}</p>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {/* Strengths */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium">
              <ThumbsUp className="h-4 w-4 text-green-500" />
              Your Strengths
            </div>
            <ul className="space-y-1.5">
              {analysis.strengths.map((strength, idx) => (
                <li key={idx} className="text-sm text-muted-foreground flex gap-2">
                  <span className="text-green-500 shrink-0">+</span>
                  <span>{strength}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Areas for Improvement */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Lightbulb className="h-4 w-4 text-amber-500" />
              Areas for Improvement
            </div>
            <ul className="space-y-1.5">
              {analysis.areasForImprovement.map((area, idx) => (
                <li key={idx} className="text-sm text-muted-foreground flex gap-2">
                  <span className="text-amber-500 shrink-0">*</span>
                  <span>{area}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Clients Needing Attention */}
        {analysis.clientsNeedingAttention.length > 0 && (
          <div className="space-y-2 pt-2 border-t">
            <div className="flex items-center gap-2 text-sm font-medium">
              <AlertTriangle className="h-4 w-4 text-red-500" />
              Clients Needing Attention
            </div>
            <ul className="space-y-1.5">
              {analysis.clientsNeedingAttention.map((client, idx) => (
                <li
                  key={idx}
                  className="text-sm p-2 rounded bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900"
                >
                  <div className="flex items-center justify-between">
                    <Link
                      href={`/clients/${client.clientId}`}
                      className="font-medium text-red-700 dark:text-red-400 hover:underline"
                    >
                      {client.clientName}
                    </Link>
                  </div>
                  <p className="text-xs text-red-600 dark:text-red-500 mt-1">{client.reason}</p>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Recommendations */}
        <div className="space-y-2 pt-2 border-t">
          <div className="flex items-center gap-2 text-sm font-medium">
            <TrendingUp className="h-4 w-4 text-green-500" />
            Recommendations
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            {analysis.recommendations.map((rec, idx) => (
              <div
                key={idx}
                className="text-sm p-2 rounded bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-900"
              >
                <span className="text-green-700 dark:text-green-400">{rec}</span>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function FeedbackAnalytics({ onBack }: FeedbackAnalyticsProps) {
  const { data: analytics, isLoading } = trpc.feedback.getAnalytics.useQuery();

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Skeleton className="h-8 w-8" />
          <Skeleton className="h-8 w-64" />
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
        </div>
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Could not load analytics</p>
        <Button variant="outline" onClick={onBack} className="mt-4">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={onBack}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h2 className="text-xl font-semibold">Feedback Analytics</h2>
          <p className="text-sm text-muted-foreground">
            Insights from {analytics.totalResponses} client feedback responses
          </p>
        </div>
      </div>

      {/* Summary Card */}
      <Card className="w-fit">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Total Responses</p>
              <p className="text-2xl font-bold">{analytics.totalResponses}</p>
            </div>
            <Users className="h-8 w-8 text-muted-foreground/50" />
          </div>
        </CardContent>
      </Card>

      {/* AI Analysis Summary */}
      {analytics.totalResponses > 0 && <AIAnalysisSummary />}

      {/* Rating Details */}
      {analytics.totalResponses === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Star className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-medium">No feedback responses yet</h3>
            <p className="text-sm text-muted-foreground mt-2">
              Analytics will appear here once clients complete feedback requests
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2">
          {/* What Went Well */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <ThumbsUp className="h-4 w-4 text-green-500" />
                What Went Well
              </CardTitle>
              <CardDescription>Recent positive feedback</CardDescription>
            </CardHeader>
            <CardContent>
              {analytics.textFeedback.whatWentWell.length > 0 ? (
                <div className="space-y-3">
                  {analytics.textFeedback.whatWentWell.map((item, idx) => (
                    <div key={idx} className="p-3 rounded-lg bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-900">
                      <p className="text-sm text-green-800 dark:text-green-300">&quot;{item.text}&quot;</p>
                      <p className="text-xs text-green-600 dark:text-green-500 mt-1">
                        — {item.clientName}, {formatDistanceToNow(new Date(item.date), { addSuffix: true })}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No written feedback yet
                </p>
              )}
            </CardContent>
          </Card>

          {/* What Could Improve */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Lightbulb className="h-4 w-4 text-amber-500" />
                What Could Improve
              </CardTitle>
              <CardDescription>Constructive feedback</CardDescription>
            </CardHeader>
            <CardContent>
              {analytics.textFeedback.whatCouldImprove.length > 0 ? (
                <div className="space-y-3">
                  {analytics.textFeedback.whatCouldImprove.map((item, idx) => (
                    <div key={idx} className="p-3 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900">
                      <p className="text-sm text-amber-800 dark:text-amber-300">&quot;{item.text}&quot;</p>
                      <p className="text-xs text-amber-600 dark:text-amber-500 mt-1">
                        — {item.clientName}, {formatDistanceToNow(new Date(item.date), { addSuffix: true })}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No improvement suggestions yet
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Recent Feedback */}
      {analytics.recentFeedback.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Recent Feedback</CardTitle>
            <CardDescription>Latest responses from clients</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {analytics.recentFeedback.map((feedback) => (
                <div
                  key={feedback.id}
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                      <Star className="h-4 w-4 text-amber-500" />
                    </div>
                    <div>
                      <Link
                        href={`/clients/${feedback.clientId}`}
                        className="font-medium hover:underline"
                      >
                        {feedback.clientName}
                      </Link>
                      <p className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(feedback.createdAt), { addSuffix: true })}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star
                        key={star}
                        className={`h-4 w-4 ${
                          star <= feedback.overallRating
                            ? "fill-amber-400 text-amber-400"
                            : "text-muted-foreground/30"
                        }`}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
