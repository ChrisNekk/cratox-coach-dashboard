"use client";

import Link from "next/link";
import { trpc } from "@/lib/trpc/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft,
  BarChart3,
  Star,
  CheckCircle2,
  XCircle,
  Type,
  AlignLeft,
  CircleDot,
  CheckSquare,
  ToggleLeft,
  Users,
  TrendingUp,
  MessageSquare,
  Sparkles,
  AlertTriangle,
  Lightbulb,
  RefreshCw,
} from "lucide-react";

type QuestionType = "TEXT_SHORT" | "TEXT_LONG" | "SINGLE_SELECT" | "MULTI_SELECT" | "RATING_SCALE" | "YES_NO";

const questionTypeIcons: Record<QuestionType, React.ReactNode> = {
  TEXT_SHORT: <Type className="h-4 w-4" />,
  TEXT_LONG: <AlignLeft className="h-4 w-4" />,
  SINGLE_SELECT: <CircleDot className="h-4 w-4" />,
  MULTI_SELECT: <CheckSquare className="h-4 w-4" />,
  RATING_SCALE: <Star className="h-4 w-4" />,
  YES_NO: <ToggleLeft className="h-4 w-4" />,
};

interface QuestionnaireAnalyticsProps {
  questionnaireId: string;
  onBack: () => void;
}

function RatingAnalytics({
  average,
  max,
  distribution,
  responseCount,
}: {
  average: number;
  max: number;
  distribution: Record<number, number>;
  responseCount: number;
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <div className="flex gap-0.5">
            {Array.from({ length: max }, (_, i) => (
              <Star
                key={i}
                className={`h-5 w-5 ${
                  i < Math.round(average) ? "fill-amber-400 text-amber-400" : "text-muted-foreground/30"
                }`}
              />
            ))}
          </div>
          <span className="text-2xl font-bold">{average}</span>
          <span className="text-muted-foreground">/ {max}</span>
        </div>
        <Badge variant="secondary">{responseCount} responses</Badge>
      </div>
      <div className="space-y-1.5">
        {Object.entries(distribution)
          .sort(([a], [b]) => Number(b) - Number(a))
          .map(([rating, count]) => {
            const percentage = responseCount > 0 ? (count / responseCount) * 100 : 0;
            return (
              <div key={rating} className="flex items-center gap-2">
                <span className="w-6 text-sm text-muted-foreground text-right">{rating}</span>
                <Star className="h-3.5 w-3.5 text-amber-400" />
                <Progress value={percentage} className="flex-1 h-2" />
                <span className="w-12 text-xs text-muted-foreground text-right">
                  {count} ({Math.round(percentage)}%)
                </span>
              </div>
            );
          })}
      </div>
    </div>
  );
}

function YesNoAnalytics({
  yesCount,
  noCount,
  yesPercentage,
}: {
  yesCount: number;
  noCount: number;
  yesPercentage: number;
}) {
  return (
    <div className="space-y-3">
      <div className="flex gap-4">
        <div className="flex items-center gap-2 flex-1 p-3 rounded-lg bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800">
          <CheckCircle2 className="h-5 w-5 text-green-500" />
          <div>
            <p className="text-2xl font-bold text-green-700 dark:text-green-400">{yesCount}</p>
            <p className="text-xs text-green-600 dark:text-green-500">Yes ({Math.round(yesPercentage)}%)</p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-1 p-3 rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800">
          <XCircle className="h-5 w-5 text-red-500" />
          <div>
            <p className="text-2xl font-bold text-red-700 dark:text-red-400">{noCount}</p>
            <p className="text-xs text-red-600 dark:text-red-500">No ({Math.round(100 - yesPercentage)}%)</p>
          </div>
        </div>
      </div>
      <Progress value={yesPercentage} className="h-2" />
    </div>
  );
}

function SelectAnalytics({
  optionCounts,
  options,
  responseCount,
  isMulti,
}: {
  optionCounts: Record<string, number>;
  options?: string[];
  responseCount: number;
  isMulti: boolean;
}) {
  const sortedOptions = (options || Object.keys(optionCounts)).sort(
    (a, b) => (optionCounts[b] || 0) - (optionCounts[a] || 0)
  );

  const totalSelections = Object.values(optionCounts).reduce((a, b) => a + b, 0);

  return (
    <div className="space-y-2">
      {isMulti && (
        <p className="text-xs text-muted-foreground mb-2">
          Multiple selections allowed - {totalSelections} total selections from {responseCount} responses
        </p>
      )}
      {sortedOptions.map((option) => {
        const count = optionCounts[option] || 0;
        const percentage = isMulti
          ? responseCount > 0
            ? (count / responseCount) * 100
            : 0
          : responseCount > 0
          ? (count / responseCount) * 100
          : 0;

        return (
          <div key={option} className="flex items-center gap-2">
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm truncate">{option}</span>
                <span className="text-xs text-muted-foreground shrink-0 ml-2">
                  {count} ({Math.round(percentage)}%)
                </span>
              </div>
              <Progress value={percentage} className="h-2" />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function TextAnalytics({ sampleResponses }: { sampleResponses: string[] }) {
  if (sampleResponses.length === 0) {
    return <p className="text-sm text-muted-foreground italic">No responses yet</p>;
  }

  return (
    <div className="space-y-2">
      <p className="text-xs text-muted-foreground">Sample responses:</p>
      <div className="space-y-2">
        {sampleResponses.map((response, idx) => (
          <div key={idx} className="p-2 rounded bg-muted/50 border">
            <p className="text-sm line-clamp-3">{response}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function AIAnalysisSummary({ questionnaireId }: { questionnaireId: string }) {
  const { data, isLoading, error, refetch } = trpc.questionnaire.getAIAnalysis.useQuery(
    { questionnaireId },
    { staleTime: 5 * 60 * 1000 } // Cache for 5 minutes
  );

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
          <Button
            variant="ghost"
            size="sm"
            onClick={() => refetch()}
            className="h-8 px-2"
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
        <CardDescription>
          Automated insights and recommendations based on all responses
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Executive Summary */}
        <div className="p-4 rounded-lg bg-background/60 border">
          <p className="text-sm leading-relaxed">{analysis.summary}</p>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {/* Key Insights */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Lightbulb className="h-4 w-4 text-amber-500" />
              Key Insights
            </div>
            <ul className="space-y-1.5">
              {analysis.keyInsights.map((insight, idx) => (
                <li key={idx} className="text-sm text-muted-foreground flex gap-2">
                  <span className="text-primary shrink-0">•</span>
                  <span>{insight}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Red Flags */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium">
              <AlertTriangle className="h-4 w-4 text-red-500" />
              Red Flags & Attention Needed
            </div>
            {analysis.redFlags.length > 0 ? (
              <ul className="space-y-1.5">
                {analysis.redFlags.map((flag, idx) => (
                  <li
                    key={idx}
                    className="text-sm p-2 rounded bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900"
                  >
                    <div className="flex gap-2">
                      <span className="text-red-500 shrink-0">!</span>
                      <span className="text-red-700 dark:text-red-400">{flag.message}</span>
                    </div>
                    {flag.clients && flag.clients.length > 0 && (
                      <div className="mt-1.5 pl-4 flex flex-wrap gap-1.5">
                        {flag.clients.map((client) => (
                          <Link
                            key={client.clientId}
                            href={`/clients/${client.clientId}`}
                            className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 dark:bg-red-900/50 text-red-800 dark:text-red-300 hover:bg-red-200 dark:hover:bg-red-900 transition-colors"
                          >
                            {client.clientName}
                          </Link>
                        ))}
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-green-600 dark:text-green-400 flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4" />
                No major concerns detected
              </p>
            )}
          </div>
        </div>

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

export function QuestionnaireAnalytics({ questionnaireId, onBack }: QuestionnaireAnalyticsProps) {
  const { data: analytics, isLoading } = trpc.questionnaire.getAggregateAnalytics.useQuery({
    questionnaireId,
  });

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

  const avgResponseRate =
    analytics.questionAnalytics.length > 0
      ? analytics.questionAnalytics.reduce((sum, q) => sum + (q.responseRate as number), 0) /
        analytics.questionAnalytics.length
      : 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={onBack}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h2 className="text-xl font-semibold">{analytics.title}</h2>
          <p className="text-sm text-muted-foreground">Aggregate analytics from all responses</p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 grid-cols-2 md:grid-cols-3">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Responses</p>
                <p className="text-2xl font-bold">{analytics.totalResponses}</p>
              </div>
              <Users className="h-8 w-8 text-muted-foreground/50" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Questions</p>
                <p className="text-2xl font-bold">{analytics.questionAnalytics.length}</p>
              </div>
              <MessageSquare className="h-8 w-8 text-muted-foreground/50" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Avg Response Rate</p>
                <p className="text-2xl font-bold">{Math.round(avgResponseRate)}%</p>
              </div>
              <TrendingUp className="h-8 w-8 text-muted-foreground/50" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* AI Analysis Summary */}
      {analytics.totalResponses > 0 && (
        <AIAnalysisSummary questionnaireId={questionnaireId} />
      )}

      {/* Question Analytics */}
      {analytics.totalResponses === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <BarChart3 className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-medium">No completed responses yet</h3>
            <p className="text-sm text-muted-foreground mt-2">
              Analytics will appear here once clients complete this questionnaire
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          <h3 className="font-medium">Question Breakdown</h3>
          {analytics.questionAnalytics.map((qa, idx) => (
            <Card key={qa.questionId as string}>
              <CardHeader className="pb-3">
                <div className="flex items-start gap-3">
                  <div className="flex items-center justify-center h-8 w-8 rounded-full bg-primary/10 text-primary shrink-0">
                    {questionTypeIcons[qa.type as QuestionType]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <CardTitle className="text-base">
                      <span className="text-muted-foreground mr-1">{idx + 1}.</span>
                      {qa.question as string}
                    </CardTitle>
                    <CardDescription className="mt-1">
                      {qa.responseCount as number} of {qa.totalResponses as number} answered (
                      {Math.round(qa.responseRate as number)}%)
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {qa.type === "RATING_SCALE" && (
                  <RatingAnalytics
                    average={qa.average as number}
                    max={qa.max as number}
                    distribution={qa.distribution as Record<number, number>}
                    responseCount={qa.responseCount as number}
                  />
                )}
                {qa.type === "YES_NO" && (
                  <YesNoAnalytics
                    yesCount={qa.yesCount as number}
                    noCount={qa.noCount as number}
                    yesPercentage={qa.yesPercentage as number}
                  />
                )}
                {(qa.type === "SINGLE_SELECT" || qa.type === "MULTI_SELECT") && (
                  <SelectAnalytics
                    optionCounts={qa.optionCounts as Record<string, number>}
                    options={qa.options as string[] | undefined}
                    responseCount={qa.responseCount as number}
                    isMulti={qa.type === "MULTI_SELECT"}
                  />
                )}
                {(qa.type === "TEXT_SHORT" || qa.type === "TEXT_LONG") && (
                  <TextAnalytics sampleResponses={qa.sampleResponses as string[]} />
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
