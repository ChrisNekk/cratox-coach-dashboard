"use client";

import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Type,
  AlignLeft,
  CircleDot,
  CheckSquare,
  Star,
  ToggleLeft,
  CheckCircle2,
  XCircle,
} from "lucide-react";

type QuestionType = "TEXT_SHORT" | "TEXT_LONG" | "SINGLE_SELECT" | "MULTI_SELECT" | "RATING_SCALE" | "YES_NO";

type Question = {
  id: string;
  type: QuestionType;
  question: string;
  required: boolean;
  options?: string[];
  ratingMax?: number;
};

interface QuestionnaireResponseDisplayProps {
  questions: Question[];
  responses: Record<string, unknown>;
}

const questionTypeIcons: Record<QuestionType, React.ReactNode> = {
  TEXT_SHORT: <Type className="h-3.5 w-3.5" />,
  TEXT_LONG: <AlignLeft className="h-3.5 w-3.5" />,
  SINGLE_SELECT: <CircleDot className="h-3.5 w-3.5" />,
  MULTI_SELECT: <CheckSquare className="h-3.5 w-3.5" />,
  RATING_SCALE: <Star className="h-3.5 w-3.5" />,
  YES_NO: <ToggleLeft className="h-3.5 w-3.5" />,
};

function RatingDisplay({ value, max }: { value: number; max: number }) {
  const percentage = (value / max) * 100;
  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-2">
        <div className="flex gap-0.5">
          {Array.from({ length: max }, (_, i) => (
            <Star
              key={i}
              className={`h-4 w-4 ${
                i < value ? "fill-amber-400 text-amber-400" : "text-muted-foreground/30"
              }`}
            />
          ))}
        </div>
        <span className="text-sm font-medium">{value}/{max}</span>
      </div>
      <Progress value={percentage} className="h-1.5" />
    </div>
  );
}

function YesNoDisplay({ value }: { value: boolean | string }) {
  const isYes = value === true || value === "yes" || value === "Yes" || value === "true";
  return (
    <div className="flex items-center gap-2">
      {isYes ? (
        <>
          <CheckCircle2 className="h-5 w-5 text-green-500" />
          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 dark:bg-green-950/30 dark:text-green-400 dark:border-green-800">
            Yes
          </Badge>
        </>
      ) : (
        <>
          <XCircle className="h-5 w-5 text-red-500" />
          <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200 dark:bg-red-950/30 dark:text-red-400 dark:border-red-800">
            No
          </Badge>
        </>
      )}
    </div>
  );
}

function MultiSelectDisplay({ values, options }: { values: string[]; options?: string[] }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {values.map((value, idx) => (
        <Badge key={idx} variant="secondary" className="text-xs">
          <CheckSquare className="h-3 w-3 mr-1" />
          {value}
        </Badge>
      ))}
      {options && options.filter(opt => !values.includes(opt)).length > 0 && (
        <span className="text-xs text-muted-foreground ml-1">
          ({values.length} of {options.length} selected)
        </span>
      )}
    </div>
  );
}

function SingleSelectDisplay({ value, options }: { value: string; options?: string[] }) {
  return (
    <div className="flex items-center gap-2">
      <Badge variant="default" className="text-xs">
        <CircleDot className="h-3 w-3 mr-1" />
        {value}
      </Badge>
      {options && options.length > 1 && (
        <span className="text-xs text-muted-foreground">
          (1 of {options.length} options)
        </span>
      )}
    </div>
  );
}

function TextDisplay({ value, isLong }: { value: string; isLong: boolean }) {
  if (isLong) {
    return (
      <div className="bg-muted/50 rounded-lg p-3 border">
        <p className="text-sm whitespace-pre-wrap">{value}</p>
      </div>
    );
  }
  return (
    <p className="text-sm font-medium text-foreground">{value}</p>
  );
}

export function QuestionnaireResponseDisplay({ questions, responses }: QuestionnaireResponseDisplayProps) {
  return (
    <div className="space-y-4">
      {questions.map((question, idx) => {
        const answer = responses[question.id];
        const hasAnswer = answer !== undefined && answer !== null && answer !== "";

        return (
          <div
            key={question.id}
            className={`rounded-lg border p-4 transition-colors ${
              hasAnswer ? "bg-card" : "bg-muted/30 border-dashed"
            }`}
          >
            <div className="flex items-start gap-3">
              <div className="flex items-center justify-center h-7 w-7 rounded-full bg-primary/10 text-primary shrink-0 mt-0.5">
                {questionTypeIcons[question.type]}
              </div>
              <div className="flex-1 min-w-0 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-medium leading-snug">
                    <span className="text-muted-foreground mr-1">{idx + 1}.</span>
                    {question.question}
                  </p>
                  {question.required && (
                    <Badge variant="outline" className="shrink-0 text-xs">Required</Badge>
                  )}
                </div>

                <div className="pt-1">
                  {hasAnswer ? (
                    <>
                      {question.type === "RATING_SCALE" && (
                        <RatingDisplay
                          value={Number(answer)}
                          max={question.ratingMax || 5}
                        />
                      )}
                      {question.type === "YES_NO" && (
                        <YesNoDisplay value={answer as boolean | string} />
                      )}
                      {question.type === "MULTI_SELECT" && Array.isArray(answer) && (
                        <MultiSelectDisplay values={answer as string[]} options={question.options} />
                      )}
                      {question.type === "SINGLE_SELECT" && (
                        <SingleSelectDisplay value={String(answer)} options={question.options} />
                      )}
                      {(question.type === "TEXT_SHORT" || question.type === "TEXT_LONG") && (
                        <TextDisplay value={String(answer)} isLong={question.type === "TEXT_LONG"} />
                      )}
                    </>
                  ) : (
                    <p className="text-sm text-muted-foreground italic">No response provided</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
