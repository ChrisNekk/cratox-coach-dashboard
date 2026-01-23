"use client";

import { useState } from "react";
import Link from "next/link";
import { trpc } from "@/lib/trpc/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Search,
  Plus,
  MoreHorizontal,
  Eye,
  MessageSquare,
  Edit,
  Trash2,
  Users,
  TrendingUp,
  TrendingDown,
  Minus,
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";

export default function ClientsPage() {
  const [search, setSearch] = useState("");
  const [teamFilter, setTeamFilter] = useState<string>("all");
  const [goalFilter, setGoalFilter] = useState<string>("all");

  const { data: clients, isLoading } = trpc.client.getAll.useQuery({
    search: search || undefined,
    teamId: teamFilter !== "all" ? teamFilter : undefined,
    goalType: goalFilter !== "all" ? (goalFilter as "WEIGHT_LOSS" | "WEIGHT_GAIN" | "MAINTAIN_WEIGHT") : undefined,
  });

  const { data: teams } = trpc.team.getAll.useQuery();

  const getGoalIcon = (goalType: string) => {
    switch (goalType) {
      case "WEIGHT_LOSS":
        return <TrendingDown className="h-3 w-3" />;
      case "WEIGHT_GAIN":
        return <TrendingUp className="h-3 w-3" />;
      default:
        return <Minus className="h-3 w-3" />;
    }
  };

  const getGoalVariant = (goalType: string) => {
    switch (goalType) {
      case "WEIGHT_LOSS":
        return "destructive" as const;
      case "WEIGHT_GAIN":
        return "default" as const;
      default:
        return "secondary" as const;
    }
  };

  const calculateProgress = (start?: number | null, current?: number | null, target?: number | null) => {
    if (!start || !current || !target || start === target) return null;
    return Math.round(((start - current) / (start - target)) * 100);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Clients</h2>
          <p className="text-muted-foreground">
            Manage and monitor your clients&apos; progress
          </p>
        </div>
        <Button asChild>
          <Link href="/licenses">
            <Plus className="mr-2 h-4 w-4" />
            Invite Client
          </Link>
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col gap-4 md:flex-row">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search clients..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={teamFilter} onValueChange={setTeamFilter}>
              <SelectTrigger className="w-full md:w-[180px]">
                <SelectValue placeholder="All Teams" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Teams</SelectItem>
                {teams?.map((team) => (
                  <SelectItem key={team.id} value={team.id}>
                    <div className="flex items-center gap-2">
                      <div
                        className="h-2 w-2 rounded-full"
                        style={{ backgroundColor: team.color }}
                      />
                      {team.name}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={goalFilter} onValueChange={setGoalFilter}>
              <SelectTrigger className="w-full md:w-[180px]">
                <SelectValue placeholder="All Goals" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Goals</SelectItem>
                <SelectItem value="WEIGHT_LOSS">Weight Loss</SelectItem>
                <SelectItem value="WEIGHT_GAIN">Weight Gain</SelectItem>
                <SelectItem value="MAINTAIN_WEIGHT">Maintain Weight</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Clients Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            All Clients
            {clients && (
              <Badge variant="secondary" className="ml-2">
                {clients.length}
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="flex items-center gap-4">
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-48" />
                  </div>
                  <Skeleton className="h-6 w-20" />
                </div>
              ))}
            </div>
          ) : clients && clients.length > 0 ? (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Client</TableHead>
                    <TableHead>Goal</TableHead>
                    <TableHead>Progress</TableHead>
                    <TableHead>Team</TableHead>
                    <TableHead>License</TableHead>
                    <TableHead>Last Active</TableHead>
                    <TableHead className="w-[50px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {clients.map((client) => {
                    const progress = calculateProgress(
                      client.startWeight,
                      client.currentWeight,
                      client.targetWeight
                    );

                    return (
                      <TableRow key={client.id}>
                        <TableCell>
                          <Link
                            href={`/clients/${client.id}`}
                            className="flex items-center gap-3 hover:underline"
                          >
                            <Avatar className="h-9 w-9">
                              <AvatarFallback className="text-xs">
                                {client.name
                                  .split(" ")
                                  .map((n) => n[0])
                                  .join("")}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-medium">{client.name}</p>
                              <p className="text-xs text-muted-foreground">
                                {client.email}
                              </p>
                            </div>
                          </Link>
                        </TableCell>
                        <TableCell>
                          <Badge variant={getGoalVariant(client.goalType)} className="gap-1">
                            {getGoalIcon(client.goalType)}
                            {client.goalType.replace("_", " ")}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {progress !== null ? (
                            <div className="flex items-center gap-2">
                              <div className="w-16 h-2 bg-muted rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-primary rounded-full transition-all"
                                  style={{ width: `${Math.max(0, Math.min(100, progress))}%` }}
                                />
                              </div>
                              <span className="text-sm text-muted-foreground">
                                {progress}%
                              </span>
                            </div>
                          ) : (
                            <span className="text-sm text-muted-foreground">N/A</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {client.team ? (
                            <div className="flex items-center gap-2">
                              <div
                                className="h-2 w-2 rounded-full"
                                style={{ backgroundColor: client.team.color }}
                              />
                              <span className="text-sm">{client.team.name}</span>
                            </div>
                          ) : (
                            <span className="text-sm text-muted-foreground">
                              Unassigned
                            </span>
                          )}
                        </TableCell>
                        <TableCell>
                          {client.license ? (
                            <Badge
                              variant={
                                client.license.status === "ACTIVE"
                                  ? "default"
                                  : client.license.status === "PENDING"
                                  ? "secondary"
                                  : "destructive"
                              }
                            >
                              {client.license.status.toLowerCase()}
                            </Badge>
                          ) : (
                            <Badge variant="outline">No license</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {client.lastActivityAt
                            ? formatDistanceToNow(new Date(client.lastActivityAt), {
                                addSuffix: true,
                              })
                            : "Never"}
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem asChild>
                                <Link href={`/clients/${client.id}`}>
                                  <Eye className="mr-2 h-4 w-4" />
                                  View Profile
                                </Link>
                              </DropdownMenuItem>
                              <DropdownMenuItem asChild>
                                <Link href={`/messages?client=${client.id}`}>
                                  <MessageSquare className="mr-2 h-4 w-4" />
                                  Send Message
                                </Link>
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem asChild>
                                <Link href={`/clients/${client.id}?edit=true`}>
                                  <Edit className="mr-2 h-4 w-4" />
                                  Edit Goals
                                </Link>
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-12">
              <Users className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
              <h3 className="text-lg font-medium mb-2">No clients yet</h3>
              <p className="text-muted-foreground mb-4">
                Invite your first client to get started
              </p>
              <Button asChild>
                <Link href="/licenses">
                  <Plus className="mr-2 h-4 w-4" />
                  Invite Client
                </Link>
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
