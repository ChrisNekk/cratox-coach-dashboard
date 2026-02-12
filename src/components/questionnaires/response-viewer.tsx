"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  ArrowLeft,
  Clock,
  CheckCircle,
  AlertCircle,
  Send,
  Eye,
  User,
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";

type Question = {
  id: string;
  type: string;
  question: string;
  required: boolean;
  options?: string[];
  ratingMax?: number;
};

type ClientQuestionnaireStatus = "DRAFT" | "SENT" | "IN_PROGRESS" | "COMPLETED";

type ClientQuestionnaireWithClient = {
  id: string;
  status: ClientQuestionnaireStatus;
  sentAt: Date | null;
  completedAt: Date | null;
  client: {
    name: string;
    email: string;
  };
};

interface ResponseViewerProps {
  questionnaireId: string;
  onBack: () => void;
}

const statusConfig: Record<ClientQuestionnaireStatus, { label: string; icon: React.ReactNode; variant: "default" | "secondary" | "outline" | "destructive" }> = {
  DRAFT: { label: "Draft", icon: <Clock className="h-3 w-3" />, variant: "outline" },
  SENT: { label: "Sent", icon: <Send className="h-3 w-3" />, variant: "secondary" },
  IN_PROGRESS: { label: "In Progress", icon: <AlertCircle className="h-3 w-3" />, variant: "default" },
  COMPLETED: { label: "Completed", icon: <CheckCircle className="h-3 w-3" />, variant: "default" },
};

export function ResponseViewer({ questionnaireId, onBack }: ResponseViewerProps) {
  const [selectedResponse, setSelectedResponse] = useState<string | null>(null);

  const { data: questionnaire, isLoading } = trpc.questionnaire.getById.useQuery({
    id: questionnaireId,
  });

  const { data: clientResponse } = trpc.questionnaire.getClientResponse.useQuery(
    { clientQuestionnaireId: selectedResponse! },
    { enabled: !!selectedResponse }
  );

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-32" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  if (!questionnaire) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Questionnaire not found</p>
        <Button variant="outline" onClick={onBack} className="mt-4">
          Go Back
        </Button>
      </div>
    );
  }

  const questions = questionnaire.questions as Question[];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={onBack}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h3 className="text-lg font-semibold">{questionnaire.title}</h3>
          <p className="text-sm text-muted-foreground">
            {questionnaire.clientQuestionnaires.length} response(s)
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Responses</CardTitle>
          <CardDescription>
            View all client responses for this questionnaire
          </CardDescription>
        </CardHeader>
        <CardContent>
          {questionnaire.clientQuestionnaires.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>No responses yet. Send this questionnaire to clients to collect responses.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {questionnaire.clientQuestionnaires.map((cq: ClientQuestionnaireWithClient) => {
                const status = cq.status;
                const config = statusConfig[status];
                return (
                  <div
                    key={cq.id}
                    className="flex items-center gap-4 p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                      <User className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h4 className="font-medium truncate">{cq.client.name}</h4>
                        <Badge variant={config.variant} className="gap-1 shrink-0">
                          {config.icon}
                          {config.label}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {cq.client.email}
                        {cq.sentAt && (
                          <> &bull; Sent {formatDistanceToNow(new Date(cq.sentAt), { addSuffix: true })}</>
                        )}
                        {cq.completedAt && (
                          <> &bull; Completed {formatDistanceToNow(new Date(cq.completedAt), { addSuffix: true })}</>
                        )}
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedResponse(cq.id)}
                      disabled={status === "DRAFT" || status === "SENT"}
                    >
                      <Eye className="mr-2 h-4 w-4" />
                      View
                    </Button>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Response Detail Dialog */}
      <Dialog open={!!selectedResponse} onOpenChange={(open) => !open && setSelectedResponse(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>
              {clientResponse?.client.name}&apos;s Response
            </DialogTitle>
            <DialogDescription>
              {clientResponse?.completedAt
                ? `Completed on ${format(new Date(clientResponse.completedAt), "PPP 'at' p")}`
                : "Response in progress"}
            </DialogDescription>
          </DialogHeader>

          <ScrollArea className="flex-1">
            <div className="space-y-6 p-1">
              {questions.map((question, index) => {
                const responses = clientResponse?.responses as Record<string, unknown> | null;
                const answer = responses?.[question.id];

                return (
                  <div key={question.id} className="space-y-2">
                    <div className="flex items-start gap-2">
                      <span className="text-sm font-medium text-muted-foreground">
                        Q{index + 1}.
                      </span>
                      <div className="flex-1">
                        <p className="font-medium">
                          {question.question}
                          {question.required && (
                            <span className="text-destructive ml-1">*</span>
                          )}
                        </p>
                        <div className="mt-2 p-3 bg-muted rounded-lg">
                          {answer !== undefined && answer !== null && answer !== "" ? (
                            <ResponseDisplay
                              type={question.type}
                              answer={answer}
                              options={question.options}
                              ratingMax={question.ratingMax}
                            />
                          ) : (
                            <p className="text-sm text-muted-foreground italic">
                              No response
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ResponseDisplay({
  type,
  answer,
  options,
  ratingMax,
}: {
  type: string;
  answer: unknown;
  options?: string[];
  ratingMax?: number;
}) {
  switch (type) {
    case "TEXT_SHORT":
    case "TEXT_LONG":
      return <p className="text-sm whitespace-pre-wrap">{String(answer)}</p>;

    case "SINGLE_SELECT":
      return <p className="text-sm">{String(answer)}</p>;

    case "MULTI_SELECT":
      const selected = answer as string[];
      return (
        <div className="flex flex-wrap gap-1">
          {selected.map((item, i) => (
            <Badge key={i} variant="secondary">
              {item}
            </Badge>
          ))}
        </div>
      );

    case "RATING_SCALE":
      const rating = Number(answer);
      const max = ratingMax || 5;
      return (
        <div className="flex items-center gap-2">
          <span className="text-lg font-semibold">{rating}</span>
          <span className="text-muted-foreground">/ {max}</span>
          <div className="flex gap-0.5 ml-2">
            {Array.from({ length: max }).map((_, i) => (
              <div
                key={i}
                className={`h-2 w-4 rounded ${
                  i < rating ? "bg-primary" : "bg-muted-foreground/20"
                }`}
              />
            ))}
          </div>
        </div>
      );

    case "YES_NO":
      const isYes = answer === true || answer === "yes" || answer === "Yes";
      return (
        <Badge variant={isYes ? "default" : "secondary"}>
          {isYes ? "Yes" : "No"}
        </Badge>
      );

    default:
      return <p className="text-sm">{JSON.stringify(answer)}</p>;
  }
}
