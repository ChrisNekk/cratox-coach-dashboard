"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { trpc } from "@/lib/trpc/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { InviteClientDialog } from "@/components/invite-client-dialog";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  Users,
  TrendingUp,
  TrendingDown,
  Minus,
  Check,
  CheckCircle,
  Clock,
  AlertTriangle,
  XCircle,
  Copy,
  Mail,
  Ban,
  UserCheck,
  UserX,
  Info,
  LayoutList,
  LayoutGrid,
  Dumbbell,
  Footprints,
  Droplets,
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { format, formatDistanceToNow } from "date-fns";
import { toast } from "sonner";

type ResendLicense = {
  id: string;
  invitedEmail: string;
  invitedName: string | null;
  inviteLink: string | null;
};

export default function ClientsPage() {
  const [search, setSearch] = useState("");
  const [teamFilter, setTeamFilter] = useState<string>("all");
  const [goalFilter, setGoalFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [activeTab, setActiveTab] = useState("active");
  const [viewMode, setViewMode] = useState<"list" | "cards">("cards");
  const [resendDialogOpen, setResendDialogOpen] = useState(false);
  const [resendLicense, setResendLicense] = useState<ResendLicense | null>(null);
  const [resendSubject, setResendSubject] = useState("");
  const [resendMessage, setResendMessage] = useState("");

  // Fetch active clients
  const { data: clients, isLoading: clientsLoading, refetch: refetchClients } = trpc.client.getAll.useQuery({
    search: search || undefined,
    teamId: teamFilter !== "all" ? teamFilter : undefined,
    goalType: goalFilter !== "all" ? (goalFilter as "WEIGHT_LOSS" | "WEIGHT_GAIN" | "MAINTAIN_WEIGHT") : undefined,
  });
  const clientsById = useMemo(() => new Map((clients ?? []).map((c) => [c.id, c])), [clients]);

  // Fetch all licenses (for pending invitations)
  const { data: licenses, isLoading: licensesLoading, refetch: refetchLicenses } = trpc.license.getAll.useQuery({
    status: statusFilter !== "all" ? (statusFilter as "PENDING" | "ACTIVE" | "EXPIRED" | "REVOKED") : undefined,
  });

  // Fetch license stats
  const { data: stats } = trpc.license.getStats.useQuery();

  const { data: teams } = trpc.team.getAll.useQuery();
  const teamsById = useMemo(() => new Map((teams ?? []).map((t) => [t.id, t])), [teams]);

  // License mutations
  const resendInvite = trpc.license.resendInvite.useMutation({
    onSuccess: () => {
      toast.success("Invitation resent!");
      setResendDialogOpen(false);
      setResendLicense(null);
      refetchLicenses();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to resend invitation");
    },
  });

  const revokeLicense = trpc.license.revoke.useMutation({
    onSuccess: () => {
      toast.success("License revoked");
      refetchLicenses();
      refetchClients();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to revoke license");
    },
  });

  const copyInviteLink = (link: string) => {
    navigator.clipboard.writeText(link);
    toast.success("Invite link copied!");
  };

  const refetchAll = () => {
    refetchClients();
    refetchLicenses();
  };

  const applyTemplate = (
    template: string,
    values: { clientName: string; inviteLink: string; coachName: string }
  ) => {
    return template
      .replaceAll("{{clientName}}", values.clientName)
      .replaceAll("{{inviteLink}}", values.inviteLink)
      .replaceAll("{{coachName}}", values.coachName);
  };

  const openResendInviteDialog = (license: ResendLicense) => {
    setResendLicense(license);
    setResendSubject("You're invited to Cratox AI");
    setResendMessage(
      `Hi {{clientName}},\n\n` +
        `Your coach has invited you to Cratox AI.\n\n` +
        `Invite link:\n{{inviteLink}}\n\n` +
        `If you have any questions, reply to this email.\n\n` +
        `— {{coachName}}`
    );
    setResendDialogOpen(true);
  };

  // Filter pending licenses (not yet activated)
  const pendingLicenses = licenses?.filter(l => l.status === "PENDING") || [];
  const allLicenses = licenses || [];

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

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "ACTIVE":
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case "PENDING":
        return <Clock className="h-4 w-4 text-amber-500" />;
      case "EXPIRED":
        return <AlertTriangle className="h-4 w-4 text-orange-500" />;
      case "REVOKED":
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return null;
    }
  };

  const getStatusVariant = (status: string) => {
    switch (status) {
      case "ACTIVE":
        return "default" as const;
      case "PENDING":
        return "secondary" as const;
      case "EXPIRED":
        return "outline" as const;
      case "REVOKED":
        return "destructive" as const;
      default:
        return "outline" as const;
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
            Manage your clients and license invitations
          </p>
        </div>
        <InviteClientDialog
          onSuccess={refetchAll}
          trigger={
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Invite Client
            </Button>
          }
        />
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Active Clients</p>
                <p className="text-2xl font-bold text-green-600">{stats?.active || 0}</p>
              </div>
              <UserCheck className="h-8 w-8 text-green-500/50" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Pending Invites</p>
                <p className="text-2xl font-bold text-amber-600">{stats?.pending || 0}</p>
              </div>
              <Clock className="h-8 w-8 text-amber-500/50" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Expired</p>
                <p className="text-2xl font-bold text-orange-600">{stats?.expired || 0}</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-orange-500/50" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Licenses</p>
                <p className="text-2xl font-bold">{stats?.total || 0}</p>
              </div>
              <Users className="h-8 w-8 text-muted-foreground/50" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content with Tabs */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <CardTitle>Client Management</CardTitle>
              <CardDescription>
                View active clients and manage pending invitations
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between mb-4">
              <TabsList>
                <TabsTrigger value="active" className="gap-2">
                  <UserCheck className="h-4 w-4" />
                  Active Clients
                  {clients && clients.length > 0 && (
                    <Badge variant="secondary" className="ml-1">
                      {clients.length}
                    </Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger value="pending" className="gap-2">
                  <Clock className="h-4 w-4" />
                  Pending Invites
                  {pendingLicenses.length > 0 && (
                    <Badge variant="secondary" className="ml-1">
                      {pendingLicenses.length}
                    </Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger value="all" className="gap-2">
                  <Users className="h-4 w-4" />
                  All Licenses
                </TabsTrigger>
              </TabsList>

              {/* Filters */}
              <div className="flex flex-wrap items-center gap-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Search..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-9 w-[200px]"
                  />
                </div>
                {activeTab === "active" && (
                  <>
                    <Select value={teamFilter} onValueChange={setTeamFilter}>
                      <SelectTrigger className="w-[150px]">
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
                      <SelectTrigger className="w-[150px]">
                        <SelectValue placeholder="All Goals" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Goals</SelectItem>
                        <SelectItem value="WEIGHT_LOSS">Weight Loss</SelectItem>
                        <SelectItem value="WEIGHT_GAIN">Weight Gain</SelectItem>
                        <SelectItem value="MAINTAIN_WEIGHT">Maintain</SelectItem>
                      </SelectContent>
                    </Select>
                    
                    {/* View Toggle */}
                    <div className="flex items-center border rounded-lg p-1 ml-auto">
                      <Button
                        variant={viewMode === "list" ? "secondary" : "ghost"}
                        size="sm"
                        className="h-8 px-2"
                        onClick={() => setViewMode("list")}
                      >
                        <LayoutList className="h-4 w-4" />
                      </Button>
                      <Button
                        variant={viewMode === "cards" ? "secondary" : "ghost"}
                        size="sm"
                        className="h-8 px-2"
                        onClick={() => setViewMode("cards")}
                      >
                        <LayoutGrid className="h-4 w-4" />
                      </Button>
                    </div>
                  </>
                )}
                {activeTab === "all" && (
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-[150px]">
                      <SelectValue placeholder="All Statuses" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Statuses</SelectItem>
                      <SelectItem value="ACTIVE">Active</SelectItem>
                      <SelectItem value="PENDING">Pending</SelectItem>
                      <SelectItem value="EXPIRED">Expired</SelectItem>
                      <SelectItem value="REVOKED">Revoked</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              </div>
            </div>

            {/* Active Clients Tab */}
            <TabsContent value="active" className="mt-0">
              {clientsLoading ? (
                <div className="space-y-4 py-4">
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
                viewMode === "list" ? (
                  /* List View */
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Client</TableHead>
                          <TableHead>Goal</TableHead>
                          <TableHead>Progress</TableHead>
                          <TableHead>
                            <div className="flex items-center gap-1">
                              Goals Hit
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                                  </TooltipTrigger>
                                  <TooltipContent className="max-w-xs p-3">
                                    <p className="font-medium mb-1">Weekly Goal Achievement</p>
                                    <p className="text-xs text-muted-foreground mb-2">
                                      Shows the % of days in the last 7 days where the client hit their daily goals.
                                    </p>
                                    <p className="text-xs text-muted-foreground mb-1"><strong>Goals tracked:</strong></p>
                                    <ul className="text-xs text-muted-foreground list-disc pl-4 space-y-0.5">
                                      <li>Calories (within ±10% of target)</li>
                                      <li>Protein (at least 90% of target)</li>
                                      <li>Carbs (within ±10% of target)</li>
                                      <li>Fats (within ±10% of target)</li>
                                      <li>Exercise minutes (at least 90% of goal)</li>
                                    </ul>
                                    <p className="text-xs text-muted-foreground mt-2">
                                      A day counts as &quot;hit&quot; if 80%+ of tracked goals are met.
                                    </p>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            </div>
                          </TableHead>
                          <TableHead>Team</TableHead>
                          <TableHead>License</TableHead>
                          <TableHead>Started</TableHead>
                          <TableHead>Expires</TableHead>
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
                                {client.goalAchievementPercent !== null ? (
                                  <TooltipProvider>
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <div className="flex items-center gap-2 cursor-help">
                                          <div className="w-12 h-2 bg-muted rounded-full overflow-hidden">
                                            <div
                                              className={`h-full rounded-full transition-all ${
                                                client.goalAchievementPercent >= 70
                                                  ? "bg-green-500"
                                                  : client.goalAchievementPercent >= 40
                                                  ? "bg-amber-500"
                                                  : "bg-red-500"
                                              }`}
                                              style={{ width: `${client.goalAchievementPercent}%` }}
                                            />
                                          </div>
                                          <span className="text-sm text-muted-foreground">
                                            {client.goalAchievementPercent}%
                                          </span>
                                        </div>
                                      </TooltipTrigger>
                                      <TooltipContent>
                                        <p className="text-xs">
                                          {Math.round((client.goalAchievementPercent / 100) * 7)}/7 days goals achieved
                                        </p>
                                      </TooltipContent>
                                    </Tooltip>
                                  </TooltipProvider>
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
                                  <Badge variant={getStatusVariant(client.license.status)} className="gap-1">
                                    {getStatusIcon(client.license.status)}
                                    {client.license.status.toLowerCase()}
                                  </Badge>
                                ) : (
                                  <Badge variant="outline">No license</Badge>
                                )}
                              </TableCell>
                              <TableCell className="text-sm text-muted-foreground">
                                {client.license?.activatedAt
                                  ? format(new Date(client.license.activatedAt), "MMM d, yyyy")
                                  : "—"}
                              </TableCell>
                              <TableCell className="text-sm text-muted-foreground">
                                {client.license?.expiresAt
                                  ? format(new Date(client.license.expiresAt), "MMM d, yyyy")
                                  : "—"}
                              </TableCell>
                              <TableCell className="text-sm text-muted-foreground" suppressHydrationWarning>
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
                                    {client.license && client.license.status !== "REVOKED" && (
                                      <>
                                        <DropdownMenuSeparator />
                                        <DropdownMenuItem
                                          className="text-destructive"
                                          onClick={() => {
                                            if (confirm("Are you sure you want to revoke this license?")) {
                                              revokeLicense.mutate({ id: client.license!.id });
                                            }
                                          }}
                                        >
                                          <Ban className="mr-2 h-4 w-4" />
                                          Revoke License
                                        </DropdownMenuItem>
                                      </>
                                    )}
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
                  /* Card View */
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4" suppressHydrationWarning>
                    {clients.map((client) => {
                      const progress = calculateProgress(
                        client.startWeight,
                        client.currentWeight,
                        client.targetWeight
                      );
                      const weightChange = client.currentWeight && client.startWeight 
                        ? (client.currentWeight - client.startWeight).toFixed(1)
                        : null;
                      const isPositiveChange = weightChange ? parseFloat(weightChange) > 0 : false;

                      return (
                        <Link key={client.id} href={`/clients/${client.id}`}>
                          <Card className="h-full hover:border-primary transition-colors cursor-pointer">
                            <CardContent className="pt-5">
                              {/* Header */}
                              <div className="flex items-start justify-between mb-4">
                                <div className="flex items-center gap-3">
                                  <Avatar className="h-12 w-12">
                                    <AvatarFallback className="text-sm font-medium">
                                      {client.name
                                        .split(" ")
                                        .map((n) => n[0])
                                        .join("")}
                                    </AvatarFallback>
                                  </Avatar>
                                  <div>
                                    <p className="font-semibold">{client.name}</p>
                                    <div className="flex items-center gap-2 mt-0.5">
                                      {client.team ? (
                                        <div className="flex items-center gap-1.5">
                                          <div
                                            className="h-2 w-2 rounded-full"
                                            style={{ backgroundColor: client.team.color }}
                                          />
                                          <span className="text-xs text-muted-foreground">{client.team.name}</span>
                                        </div>
                                      ) : (
                                        <span className="text-xs text-muted-foreground">Unassigned</span>
                                      )}
                                    </div>
                                  </div>
                                </div>
                                <Badge variant={getGoalVariant(client.goalType)} className="gap-1 text-[10px]">
                                  {getGoalIcon(client.goalType)}
                                  {client.goalType.replace("_", " ")}
                                </Badge>
                              </div>

                              {/* Weight Progress */}
                              <div className="space-y-3 mb-4">
                                <div className="flex items-center justify-between text-sm">
                                  <span className="text-muted-foreground">Weight Progress</span>
                                  <div className="flex items-center gap-1.5">
                                    {weightChange && (
                                      <span className={`text-xs font-medium ${
                                        client.goalType === "WEIGHT_LOSS" 
                                          ? isPositiveChange ? "text-red-500" : "text-green-500"
                                          : client.goalType === "WEIGHT_GAIN"
                                          ? isPositiveChange ? "text-green-500" : "text-red-500"
                                          : "text-muted-foreground"
                                      }`}>
                                        {isPositiveChange ? "+" : ""}{weightChange} kg
                                      </span>
                                    )}
                                    <span className="font-medium">{progress !== null ? `${progress}%` : "N/A"}</span>
                                  </div>
                                </div>
                                {progress !== null && (
                                  <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                                    <div
                                      className="h-full bg-primary rounded-full transition-all"
                                      style={{ width: `${Math.max(0, Math.min(100, progress))}%` }}
                                    />
                                  </div>
                                )}
                              </div>

                              {/* Weekly Goals */}
                              <div className="flex items-center justify-between text-sm mb-4">
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <span className="text-muted-foreground flex items-center gap-1 cursor-help">
                                        Weekly Goals
                                        <Info className="h-3 w-3" />
                                      </span>
                                    </TooltipTrigger>
                                    <TooltipContent className="max-w-xs p-3">
                                      <p className="font-medium mb-1">Weekly Goal Achievement</p>
                                      <p className="text-xs text-muted-foreground mb-2">
                                        Shows the % of days in the last 7 days where the client hit their daily goals.
                                      </p>
                                      <p className="text-xs text-muted-foreground mb-1"><strong>Goals tracked:</strong></p>
                                      <ul className="text-xs text-muted-foreground list-disc pl-4 space-y-0.5">
                                        <li>Calories (within ±10% of target)</li>
                                        <li>Protein (at least 90% of target)</li>
                                        <li>Carbs (within ±10% of target)</li>
                                        <li>Fats (within ±10% of target)</li>
                                        <li>Exercise minutes (at least 90% of goal)</li>
                                      </ul>
                                      <p className="text-xs text-muted-foreground mt-2">
                                        A day counts as &quot;hit&quot; if 80%+ of tracked goals are met.
                                      </p>
                                    </TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                                {client.goalAchievementPercent !== null && client.weeklyGoalsBreakdown ? (
                                  <TooltipProvider>
                                    <Tooltip delayDuration={200}>
                                      <TooltipTrigger asChild>
                                        <div className="flex items-center gap-2 cursor-help">
                                          <div className="w-16 h-2 bg-muted rounded-full overflow-hidden">
                                            <div
                                              className={`h-full rounded-full transition-all ${
                                                client.goalAchievementPercent >= 70
                                                  ? "bg-green-500"
                                                  : client.goalAchievementPercent >= 40
                                                  ? "bg-amber-500"
                                                  : "bg-red-500"
                                              }`}
                                              style={{ width: `${client.goalAchievementPercent}%` }}
                                            />
                                          </div>
                                          <span className="font-medium text-xs">
                                            {client.weeklyGoalsBreakdown.filter(d => d.isHit).length}/7 days
                                          </span>
                                        </div>
                                      </TooltipTrigger>
                                      <TooltipContent side="left" className="p-0 w-96">
                                        <div className="p-3 border-b">
                                          <p className="font-semibold text-sm">Weekly Goals Summary</p>
                                          <p className="text-xs text-muted-foreground">Last 7 days breakdown</p>
                                        </div>
                                        <div className="p-2 space-y-1">
                                          {client.weeklyGoalsBreakdown.map((day, idx) => (
                                            <div key={idx} className={`flex items-center gap-2 p-1.5 rounded text-xs ${day.isHit ? 'bg-green-500/10' : 'bg-muted/50'}`}>
                                              <div className={`w-5 h-5 min-w-[20px] rounded-full flex items-center justify-center ${day.isHit ? 'bg-green-500 text-white' : 'bg-muted-foreground/20 text-muted-foreground'}`}>
                                                {day.isHit ? <Check className="w-3 h-3" /> : <Minus className="w-3 h-3" />}
                                              </div>
                                              <span className="font-medium w-9 shrink-0">{day.dayName}</span>
                                              <div className="flex-1 flex items-center gap-1.5 text-[10px]">
                                                {day.goals.calories && (
                                                  <span className={`px-1 py-0.5 rounded ${day.goals.calories.hit ? 'bg-green-500/20 text-green-700 dark:text-green-400' : 'bg-red-500/20 text-red-700 dark:text-red-400'}`}>
                                                    🔥{day.goals.calories.percent}%
                                                  </span>
                                                )}
                                                {day.goals.protein && (
                                                  <span className={`px-1 py-0.5 rounded ${day.goals.protein.hit ? 'bg-green-500/20 text-green-700 dark:text-green-400' : 'bg-red-500/20 text-red-700 dark:text-red-400'}`}>
                                                    🥩{day.goals.protein.percent}%
                                                  </span>
                                                )}
                                                {day.goals.carbs && (
                                                  <span className={`px-1 py-0.5 rounded ${day.goals.carbs.hit ? 'bg-green-500/20 text-green-700 dark:text-green-400' : 'bg-red-500/20 text-red-700 dark:text-red-400'}`}>
                                                    🌾{day.goals.carbs.percent}%
                                                  </span>
                                                )}
                                                {day.goals.fats && (
                                                  <span className={`px-1 py-0.5 rounded ${day.goals.fats.hit ? 'bg-green-500/20 text-green-700 dark:text-green-400' : 'bg-red-500/20 text-red-700 dark:text-red-400'}`}>
                                                    🥑{day.goals.fats.percent}%
                                                  </span>
                                                )}
                                                {day.goals.exercise && (
                                                  <span className={`px-1 py-0.5 rounded ${day.goals.exercise.hit ? 'bg-green-500/20 text-green-700 dark:text-green-400' : 'bg-red-500/20 text-red-700 dark:text-red-400'}`}>
                                                    🏋️{day.goals.exercise.percent}%
                                                  </span>
                                                )}
                                                {day.goals.steps && (
                                                  <span className={`px-1 py-0.5 rounded ${day.goals.steps.hit ? 'bg-green-500/20 text-green-700 dark:text-green-400' : 'bg-red-500/20 text-red-700 dark:text-red-400'}`}>
                                                    👣{day.goals.steps.percent}%
                                                  </span>
                                                )}
                                                {!day.goals.calories && !day.goals.protein && !day.goals.carbs && !day.goals.fats && !day.goals.exercise && !day.goals.steps && (
                                                  <span className="text-muted-foreground">No data logged</span>
                                                )}
                                              </div>
                                            </div>
                                          ))}
                                        </div>
                                        <div className="p-2 pt-0 text-[10px] text-muted-foreground border-t mt-1">
                                          <span className="text-green-600 dark:text-green-400">Green</span> = goal hit • <span className="text-red-600 dark:text-red-400">Red</span> = missed
                                        </div>
                                      </TooltipContent>
                                    </Tooltip>
                                  </TooltipProvider>
                                ) : (
                                  <span className="text-muted-foreground text-xs">No data</span>
                                )}
                              </div>

                              {/* Today's Progress */}
                              {client.todayProgress ? (
                                <div className="pt-3 border-t space-y-2">
                                  <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">Today&apos;s Progress</p>
                                  <div className="grid grid-cols-2 gap-x-3 gap-y-1.5">
                                    {/* Calories */}
                                    {client.todayProgress.calories.target && (
                                      <div className="space-y-0.5">
                                        <div className="flex items-center justify-between">
                                          <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                                            <span className="text-[10px]">🔥</span>
                                            Calories
                                          </span>
                                          <span className="text-[10px] font-medium">
                                            {Math.round((client.todayProgress.calories.current || 0) / client.todayProgress.calories.target * 100)}%
                                          </span>
                                        </div>
                                        <div className="w-full h-1 bg-muted rounded-full overflow-hidden">
                                          <div
                                            className="h-full bg-orange-500 rounded-full"
                                            style={{ width: `${Math.min(100, Math.round((client.todayProgress.calories.current || 0) / client.todayProgress.calories.target * 100))}%` }}
                                          />
                                        </div>
                                      </div>
                                    )}
                                    {/* Protein */}
                                    {client.todayProgress.protein.target && (
                                      <div className="space-y-0.5">
                                        <div className="flex items-center justify-between">
                                          <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                                            <span className="text-[10px]">🥩</span>
                                            Protein
                                          </span>
                                          <span className="text-[10px] font-medium">
                                            {Math.round((client.todayProgress.protein.current || 0) / client.todayProgress.protein.target * 100)}%
                                          </span>
                                        </div>
                                        <div className="w-full h-1 bg-muted rounded-full overflow-hidden">
                                          <div
                                            className="h-full bg-red-500 rounded-full"
                                            style={{ width: `${Math.min(100, Math.round((client.todayProgress.protein.current || 0) / client.todayProgress.protein.target * 100))}%` }}
                                          />
                                        </div>
                                      </div>
                                    )}
                                    {/* Carbs */}
                                    {client.todayProgress.carbs.target && (
                                      <div className="space-y-0.5">
                                        <div className="flex items-center justify-between">
                                          <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                                            <span className="text-[10px]">🌾</span>
                                            Carbs
                                          </span>
                                          <span className="text-[10px] font-medium">
                                            {Math.round((client.todayProgress.carbs.current || 0) / client.todayProgress.carbs.target * 100)}%
                                          </span>
                                        </div>
                                        <div className="w-full h-1 bg-muted rounded-full overflow-hidden">
                                          <div
                                            className="h-full bg-blue-500 rounded-full"
                                            style={{ width: `${Math.min(100, Math.round((client.todayProgress.carbs.current || 0) / client.todayProgress.carbs.target * 100))}%` }}
                                          />
                                        </div>
                                      </div>
                                    )}
                                    {/* Fats */}
                                    {client.todayProgress.fats.target && (
                                      <div className="space-y-0.5">
                                        <div className="flex items-center justify-between">
                                          <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                                            <span className="text-[10px]">🥑</span>
                                            Fats
                                          </span>
                                          <span className="text-[10px] font-medium">
                                            {Math.round((client.todayProgress.fats.current || 0) / client.todayProgress.fats.target * 100)}%
                                          </span>
                                        </div>
                                        <div className="w-full h-1 bg-muted rounded-full overflow-hidden">
                                          <div
                                            className="h-full bg-yellow-500 rounded-full"
                                            style={{ width: `${Math.min(100, Math.round((client.todayProgress.fats.current || 0) / client.todayProgress.fats.target * 100))}%` }}
                                          />
                                        </div>
                                      </div>
                                    )}
                                    {/* Water */}
                                    {client.todayProgress.water.target && (
                                      <div className="space-y-0.5">
                                        <div className="flex items-center justify-between">
                                          <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                                            <Droplets className="h-2.5 w-2.5 text-cyan-500" />
                                            Water
                                          </span>
                                          <span className="text-[10px] font-medium">
                                            {client.todayProgress.water.current || 0}/{client.todayProgress.water.target}
                                          </span>
                                        </div>
                                        <div className="w-full h-1 bg-muted rounded-full overflow-hidden">
                                          <div
                                            className="h-full bg-cyan-500 rounded-full"
                                            style={{ width: `${Math.min(100, Math.round((client.todayProgress.water.current || 0) / client.todayProgress.water.target * 100))}%` }}
                                          />
                                        </div>
                                      </div>
                                    )}
                                    {/* Exercise */}
                                    {client.todayProgress.exercise.target && (
                                      <div className="space-y-0.5">
                                        <div className="flex items-center justify-between">
                                          <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                                            <Dumbbell className="h-2.5 w-2.5 text-purple-500" />
                                            Exercise
                                          </span>
                                          <span className="text-[10px] font-medium">
                                            {client.todayProgress.exercise.current || 0}/{client.todayProgress.exercise.target}m
                                          </span>
                                        </div>
                                        <div className="w-full h-1 bg-muted rounded-full overflow-hidden">
                                          <div
                                            className="h-full bg-purple-500 rounded-full"
                                            style={{ width: `${Math.min(100, Math.round((client.todayProgress.exercise.current || 0) / client.todayProgress.exercise.target * 100))}%` }}
                                          />
                                        </div>
                                      </div>
                                    )}
                                    {/* Steps */}
                                    {client.todayProgress.steps.target && (
                                      <div className="space-y-0.5">
                                        <div className="flex items-center justify-between">
                                          <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                                            <Footprints className="h-2.5 w-2.5 text-green-500" />
                                            Steps
                                          </span>
                                          <span className="text-[10px] font-medium">
                                            {((client.todayProgress.steps.current || 0) / 1000).toFixed(1)}k
                                          </span>
                                        </div>
                                        <div className="w-full h-1 bg-muted rounded-full overflow-hidden">
                                          <div
                                            className="h-full bg-green-500 rounded-full"
                                            style={{ width: `${Math.min(100, Math.round((client.todayProgress.steps.current || 0) / client.todayProgress.steps.target * 100))}%` }}
                                          />
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              ) : (
                                <div className="pt-3 border-t">
                                  <p className="text-[10px] text-muted-foreground text-center py-2">No activity logged today</p>
                                </div>
                              )}
                            </CardContent>
                          </Card>
                        </Link>
                      );
                    })}
                  </div>
                )
              ) : (
                <div className="text-center py-12">
                  <Users className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                  <h3 className="text-lg font-medium mb-2">No active clients yet</h3>
                  <p className="text-muted-foreground mb-4">
                    Invite clients and they&apos;ll appear here once they activate their license
                  </p>
                  <InviteClientDialog
                    onSuccess={refetchAll}
                    trigger={
                      <Button>
                        <Plus className="mr-2 h-4 w-4" />
                        Invite Client
                      </Button>
                    }
                  />
                </div>
              )}
            </TabsContent>

            {/* Pending Invites Tab */}
            <TabsContent value="pending" className="mt-0">
              {licensesLoading ? (
                <div className="space-y-4 py-4">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="flex items-center gap-4">
                      <Skeleton className="h-10 w-10 rounded" />
                      <div className="flex-1 space-y-2">
                        <Skeleton className="h-4 w-32" />
                        <Skeleton className="h-3 w-48" />
                      </div>
                      <Skeleton className="h-6 w-20" />
                    </div>
                  ))}
                </div>
              ) : pendingLicenses.length > 0 ? (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Invited Client</TableHead>
                        <TableHead>Team</TableHead>
                        <TableHead>Invite Link</TableHead>
                        <TableHead>Sent</TableHead>
                        <TableHead className="w-[50px]"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {pendingLicenses.map((license) => (
                        <TableRow key={license.id}>
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <Avatar className="h-9 w-9">
                                <AvatarFallback className="text-xs bg-amber-100 text-amber-700">
                                  {license.invitedName
                                    ?.split(" ")
                                    .map((n) => n[0])
                                    .join("") || "?"}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <p className="font-medium">{license.invitedName}</p>
                                <p className="text-xs text-muted-foreground">
                                  {license.invitedEmail}
                                </p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            {(() => {
                              const anyLicense = license as any;
                              const team =
                                anyLicense?.team ??
                                (anyLicense?.teamId ? teamsById.get(anyLicense.teamId as string) : undefined);

                              if (!team) return <span className="text-sm text-muted-foreground">—</span>;

                              return (
                                <div className="flex items-center gap-2">
                                  <div className="h-2 w-2 rounded-full" style={{ backgroundColor: team.color }} />
                                  <span className="text-sm">{team.name}</span>
                                </div>
                              );
                            })()}
                          </TableCell>
                          <TableCell>
                            {license.inviteLink && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 gap-2"
                                onClick={() => copyInviteLink(license.inviteLink!)}
                              >
                                <Copy className="h-3 w-3" />
                                Copy Link
                              </Button>
                            )}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground" suppressHydrationWarning>
                            {license.inviteSentAt
                              ? formatDistanceToNow(new Date(license.inviteSentAt), { addSuffix: true })
                              : "—"}
                          </TableCell>
                          <TableCell>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                {license.inviteLink && (
                                  <DropdownMenuItem
                                    onClick={() => copyInviteLink(license.inviteLink!)}
                                  >
                                    <Copy className="mr-2 h-4 w-4" />
                                    Copy Invite Link
                                  </DropdownMenuItem>
                                )}
                                <DropdownMenuItem
                                  onClick={() => openResendInviteDialog(license as unknown as ResendLicense)}
                                >
                                  <Mail className="mr-2 h-4 w-4" />
                                  Resend Invitation
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  className="text-destructive"
                                  onClick={() => {
                                    if (confirm("Are you sure you want to cancel this invitation?")) {
                                      revokeLicense.mutate({ id: license.id });
                                    }
                                  }}
                                >
                                  <UserX className="mr-2 h-4 w-4" />
                                  Cancel Invitation
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="text-center py-12">
                  <Clock className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                  <h3 className="text-lg font-medium mb-2">No pending invitations</h3>
                  <p className="text-muted-foreground mb-4">
                    All your invitations have been accepted or cancelled
                  </p>
                  <InviteClientDialog
                    onSuccess={refetchAll}
                    trigger={
                      <Button>
                        <Plus className="mr-2 h-4 w-4" />
                        Invite New Client
                      </Button>
                    }
                  />
                </div>
              )}
            </TabsContent>

            {/* All Licenses Tab */}
            <TabsContent value="all" className="mt-0">
              {licensesLoading ? (
                <div className="space-y-4 py-4">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <div key={i} className="flex items-center gap-4">
                      <Skeleton className="h-10 w-10 rounded" />
                      <div className="flex-1 space-y-2">
                        <Skeleton className="h-4 w-32" />
                        <Skeleton className="h-3 w-48" />
                      </div>
                      <Skeleton className="h-6 w-20" />
                    </div>
                  ))}
                </div>
              ) : allLicenses.length > 0 ? (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Client</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Team</TableHead>
                        <TableHead>Activated</TableHead>
                        <TableHead>Expires</TableHead>
                        <TableHead className="w-[50px]"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {allLicenses.map((license) => (
                        <TableRow key={license.id}>
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <Avatar className="h-9 w-9">
                                <AvatarFallback className="text-xs">
                                  {(() => {
                                    const anyLicense = license as any;
                                    const client = anyLicense?.clientId
                                      ? clientsById.get(anyLicense.clientId as string)
                                      : undefined;
                                    const name = client?.name ?? anyLicense?.invitedName ?? "?";
                                    return name
                                      .split(" ")
                                      .map((n: string) => n[0])
                                      .join("");
                                  })()}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <p className="font-medium">
                                  {(() => {
                                    const anyLicense = license as any;
                                    const client = anyLicense?.clientId
                                      ? clientsById.get(anyLicense.clientId as string)
                                      : undefined;
                                    return client?.name ?? anyLicense?.invitedName ?? "—";
                                  })()}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {(() => {
                                    const anyLicense = license as any;
                                    const client = anyLicense?.clientId
                                      ? clientsById.get(anyLicense.clientId as string)
                                      : undefined;
                                    return client?.email ?? anyLicense?.invitedEmail ?? "—";
                                  })()}
                                </p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant={getStatusVariant(license.status)} className="gap-1">
                              {getStatusIcon(license.status)}
                              {license.status.toLowerCase()}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {(() => {
                              const anyLicense = license as any;
                              const team =
                                anyLicense?.team ??
                                (anyLicense?.teamId ? teamsById.get(anyLicense.teamId as string) : undefined);

                              if (!team) return <span className="text-sm text-muted-foreground">—</span>;

                              return (
                                <div className="flex items-center gap-2">
                                  <div className="h-2 w-2 rounded-full" style={{ backgroundColor: team.color }} />
                                  <span className="text-sm">{team.name}</span>
                                </div>
                              );
                            })()}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {license.activatedAt
                              ? format(new Date(license.activatedAt), "MMM d, yyyy")
                              : "—"}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {license.expiresAt
                              ? format(new Date(license.expiresAt), "MMM d, yyyy")
                              : "—"}
                          </TableCell>
                          <TableCell>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                {(() => {
                                  const anyLicense = license as any;
                                  const client = anyLicense?.clientId
                                    ? clientsById.get(anyLicense.clientId as string)
                                    : undefined;
                                  if (!client) return null;
                                  return (
                                    <DropdownMenuItem asChild>
                                      <Link href={`/clients/${client.id}`}>
                                        <Eye className="mr-2 h-4 w-4" />
                                        View Profile
                                      </Link>
                                    </DropdownMenuItem>
                                  );
                                })()}
                                {license.inviteLink && (
                                  <DropdownMenuItem
                                    onClick={() => copyInviteLink(license.inviteLink!)}
                                  >
                                    <Copy className="mr-2 h-4 w-4" />
                                    Copy Invite Link
                                  </DropdownMenuItem>
                                )}
                                {license.status === "PENDING" && (
                                  <DropdownMenuItem
                                    onClick={() => openResendInviteDialog(license as unknown as ResendLicense)}
                                  >
                                    <Mail className="mr-2 h-4 w-4" />
                                    Resend Invitation
                                  </DropdownMenuItem>
                                )}
                                {license.status !== "REVOKED" && (
                                  <>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem
                                      className="text-destructive"
                                      onClick={() => {
                                        if (confirm("Are you sure you want to revoke this license?")) {
                                          revokeLicense.mutate({ id: license.id });
                                        }
                                      }}
                                    >
                                      <Ban className="mr-2 h-4 w-4" />
                                      Revoke License
                                    </DropdownMenuItem>
                                  </>
                                )}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="text-center py-12">
                  <Users className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                  <h3 className="text-lg font-medium mb-2">No licenses yet</h3>
                  <p className="text-muted-foreground mb-4">
                    Invite your first client to get started
                  </p>
                  <InviteClientDialog
                    onSuccess={refetchAll}
                    trigger={
                      <Button>
                        <Plus className="mr-2 h-4 w-4" />
                        Invite Client
                      </Button>
                    }
                  />
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Resend Invitation - Email Editor */}
      <Dialog open={resendDialogOpen} onOpenChange={setResendDialogOpen}>
        <DialogContent className="sm:max-w-[600px] p-0 gap-0 overflow-hidden">
          {/* Header */}
          <div className="px-6 py-5 border-b">
            <DialogTitle className="flex items-center gap-2.5 text-lg font-semibold">
              <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary/10">
                <Mail className="h-4 w-4 text-primary" />
              </div>
              Resend Invitation
            </DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground mt-1">
              Edit the email that will be sent to the client
            </DialogDescription>
          </div>

          {/* Content */}
          <div className="px-6 py-5 space-y-4 max-h-[calc(90vh-180px)] overflow-y-auto">
            <div className="space-y-2">
              <Label className="text-sm font-medium">To</Label>
              <Input value={resendLicense?.invitedEmail ?? ""} readOnly className="h-11 bg-muted/50" />
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium">Subject</Label>
              <Input
                value={resendSubject}
                onChange={(e) => setResendSubject(e.target.value)}
                placeholder="Subject"
                className="h-11"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium">Message</Label>
              <Textarea
                value={resendMessage}
                onChange={(e) => setResendMessage(e.target.value)}
                className="min-h-[180px] text-sm"
                placeholder="Message"
              />
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm text-muted-foreground">Insert variable:</span>
                {["{{clientName}}", "{{inviteLink}}", "{{coachName}}"].map((variable) => (
                  <button
                    key={variable}
                    type="button"
                    className="inline-flex items-center h-7 px-2.5 text-xs font-mono rounded-md border bg-muted/50 hover:bg-muted text-foreground transition-colors"
                    onClick={() => setResendMessage(prev => prev + variable)}
                  >
                    {variable}
                  </button>
                ))}
              </div>
            </div>

            {/* Tip Box */}
            <div className="rounded-xl bg-cyan-50 dark:bg-cyan-950/30 border border-cyan-200 dark:border-cyan-800 px-4 py-3.5">
              <p className="text-sm text-cyan-700 dark:text-cyan-300 leading-relaxed">
                <span className="font-semibold text-cyan-800 dark:text-cyan-200">Tip:</span> Variables like{" "}
                <code className="rounded-md bg-cyan-100 dark:bg-cyan-900/50 px-1.5 py-0.5 font-mono text-xs text-cyan-800 dark:text-cyan-200">
                  {"{{clientName}}"}
                </code>{" "}
                will be replaced with actual data when sent.
              </p>
            </div>

            <div className="rounded-xl border bg-muted/30 p-4">
              <p className="text-sm font-medium text-muted-foreground mb-3">Preview</p>
              {(() => {
                const clientName = resendLicense?.invitedName || "there";
                const inviteLink = resendLicense?.inviteLink || "";
                const coachName = "Your coach";
                const subject = applyTemplate(resendSubject || "", { clientName, inviteLink, coachName });
                const body = applyTemplate(resendMessage || "", { clientName, inviteLink, coachName });
                return (
                  <div className="space-y-2 text-sm">
                    <div>
                      <span className="text-muted-foreground">Subject:</span>{" "}
                      <span className="font-medium">{subject || "—"}</span>
                    </div>
                    <pre className="whitespace-pre-wrap text-sm leading-relaxed bg-background rounded-lg p-3 border">{body || "—"}</pre>
                  </div>
                );
              })()}
            </div>
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t bg-muted/30 flex items-center justify-end gap-3">
            <Button variant="outline" onClick={() => setResendDialogOpen(false)} className="h-10 px-5">
              Cancel
            </Button>
            <Button
              className="h-10 px-5 gap-2"
              onClick={() => {
                if (!resendLicense?.id) return;
                const clientName = resendLicense.invitedName || "there";
                const inviteLink = resendLicense.inviteLink || "";
                const coachName = "Your coach";
                resendInvite.mutate({
                  id: resendLicense.id,
                  subject: applyTemplate(resendSubject, { clientName, inviteLink, coachName }),
                  message: applyTemplate(resendMessage, { clientName, inviteLink, coachName }),
                });
              }}
              disabled={!resendLicense?.id || resendInvite.isPending}
            >
              <Mail className="h-4 w-4" />
              {resendInvite.isPending ? "Sending..." : "Send Email"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
