"use client";

import { useState } from "react";
import Link from "next/link";
import { trpc } from "@/lib/trpc/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider,
} from "@/components/ui/tooltip";
import { Check, X, Minus, ChevronLeft, ChevronRight, Target } from "lucide-react";

export function WeeklyGoalsGrid() {
  const [weekOffset, setWeekOffset] = useState(0);
  const { data, isLoading } = trpc.dashboard.getWeeklyGoalsSummary.useQuery({ weekOffset });

  const goToPreviousWeek = () => setWeekOffset((prev) => prev - 1);
  const goToNextWeek = () => setWeekOffset((prev) => prev + 1);
  const goToCurrentWeek = () => setWeekOffset(0);

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <Skeleton className="h-5 w-36" />
          <Skeleton className="h-4 w-48" />
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex items-center gap-2">
                <Skeleton className="h-8 w-8 rounded-full" />
                <Skeleton className="h-4 w-20" />
                <div className="flex gap-1 ml-auto">
                  {[1, 2, 3, 4, 5, 6, 7].map((j) => (
                    <Skeleton key={j} className="h-6 w-6 rounded" />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!data || data.clients.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Weekly Goals</CardTitle>
          <CardDescription>Track your clients&apos; daily goal achievements</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <Target className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No active clients with goals</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Weekly Goals</CardTitle>
            <CardDescription>{data.weekRange}</CardDescription>
          </div>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={goToPreviousWeek}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            {weekOffset !== 0 && (
              <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={goToCurrentWeek}>
                Today
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={goToNextWeek}
              disabled={weekOffset >= 0}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <TooltipProvider delayDuration={100}>
          {/* Table layout for tight spacing */}
          <table className="w-full">
            <thead>
              <tr className="border-b">
                <th className="text-left py-2 pr-2 w-8"></th>
                <th className="text-left py-2 text-xs font-medium text-muted-foreground">Client</th>
                {data.days.map((day) => (
                  <th
                    key={day.dateStr}
                    className="text-center py-2 px-1 text-xs font-medium text-muted-foreground w-8"
                  >
                    {day.dayName.charAt(0)}
                  </th>
                ))}
                <th className="text-center py-2 pl-2 text-xs font-medium text-muted-foreground w-12">Score</th>
              </tr>
            </thead>
            <tbody>
              {data.clients.map((client) => (
                <tr key={client.id} className="hover:bg-muted/50 transition-colors">
                  <td className="py-1.5 pr-2">
                    <Link href={`/clients/${client.id}`}>
                      <Avatar className="h-7 w-7">
                        <AvatarFallback className="text-xs">
                          {client.name.split(" ").map((n) => n[0]).join("")}
                        </AvatarFallback>
                      </Avatar>
                    </Link>
                  </td>
                  <td className="py-1.5">
                    <Link
                      href={`/clients/${client.id}`}
                      className="text-sm font-medium hover:underline truncate block max-w-[140px]"
                    >
                      {client.name}
                    </Link>
                  </td>
                  {client.weeklyGoals.map((day) => (
                    <td key={day.date} className="py-1.5 px-1 text-center">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div
                            className={`w-7 h-7 rounded flex items-center justify-center cursor-help transition-all hover:scale-105 mx-auto ${
                              !day.hasData
                                ? "bg-muted text-muted-foreground"
                                : day.isHit
                                ? "bg-green-500 text-white"
                                : "bg-red-500 text-white"
                            }`}
                          >
                            {!day.hasData ? (
                              <Minus className="h-3 w-3" />
                            ) : day.isHit ? (
                              <Check className="h-4 w-4" />
                            ) : (
                              <X className="h-4 w-4" />
                            )}
                          </div>
                        </TooltipTrigger>
                        <TooltipContent side="top" className="p-0 w-64">
                          <div className="p-2 border-b bg-muted/30">
                            <p className="font-semibold text-sm">{day.dayName}, {day.date}</p>
                            {!day.hasData ? (
                              <p className="text-xs text-muted-foreground">No data logged</p>
                            ) : (
                              <p className={`text-xs font-medium ${day.isHit ? "text-green-600" : "text-red-600"}`}>
                                {day.isHit ? "Goals achieved" : "Goals not met"}
                              </p>
                            )}
                          </div>
                          {day.hasData && day.goals && (
                            <div className="p-2 space-y-1 text-xs">
                              {day.goals.calories && (
                                <div className="flex justify-between">
                                  <span className="text-muted-foreground">Calories</span>
                                  <span className={day.goals.calories.hit ? "text-green-600" : "text-red-600"}>
                                    {day.goals.calories.current} / {day.goals.calories.target}
                                  </span>
                                </div>
                              )}
                              {day.goals.protein && (
                                <div className="flex justify-between">
                                  <span className="text-muted-foreground">Protein</span>
                                  <span className={day.goals.protein.hit ? "text-green-600" : "text-red-600"}>
                                    {day.goals.protein.current}g / {day.goals.protein.target}g
                                  </span>
                                </div>
                              )}
                              {day.goals.carbs && (
                                <div className="flex justify-between">
                                  <span className="text-muted-foreground">Carbs</span>
                                  <span className={day.goals.carbs.hit ? "text-green-600" : "text-red-600"}>
                                    {day.goals.carbs.current}g / {day.goals.carbs.target}g
                                  </span>
                                </div>
                              )}
                              {day.goals.fats && (
                                <div className="flex justify-between">
                                  <span className="text-muted-foreground">Fats</span>
                                  <span className={day.goals.fats.hit ? "text-green-600" : "text-red-600"}>
                                    {day.goals.fats.current}g / {day.goals.fats.target}g
                                  </span>
                                </div>
                              )}
                              {day.goals.exercise && (
                                <div className="flex justify-between">
                                  <span className="text-muted-foreground">Exercise</span>
                                  <span className={day.goals.exercise.hit ? "text-green-600" : "text-red-600"}>
                                    {day.goals.exercise.current} / {day.goals.exercise.target} min
                                  </span>
                                </div>
                              )}
                            </div>
                          )}
                        </TooltipContent>
                      </Tooltip>
                    </td>
                  ))}
                  <td className="py-1.5 pl-2 text-center">
                    <span className={`text-sm font-medium ${
                      client.daysHit >= 5 ? "text-green-600" :
                      client.daysHit >= 3 ? "text-amber-600" :
                      "text-red-600"
                    }`}>
                      {client.daysHit}/{client.daysWithData}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </TooltipProvider>
      </CardContent>
    </Card>
  );
}
