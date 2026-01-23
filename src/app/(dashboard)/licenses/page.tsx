"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Key,
  Plus,
  MoreHorizontal,
  Copy,
  Mail,
  Ban,
  RefreshCw,
  CheckCircle,
  Clock,
  XCircle,
  AlertTriangle,
  Loader2,
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { toast } from "sonner";

export default function LicensesPage() {
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [inviteForm, setInviteForm] = useState({
    email: "",
    name: "",
    sendEmail: true,
  });

  const { data: licenses, isLoading, refetch } = trpc.license.getAll.useQuery({
    status: statusFilter !== "all" ? (statusFilter as "PENDING" | "ACTIVE" | "EXPIRED" | "REVOKED") : undefined,
  });
  const { data: stats } = trpc.license.getStats.useQuery();

  const createLicense = trpc.license.create.useMutation({
    onSuccess: () => {
      toast.success("Invitation sent successfully!");
      setIsInviteOpen(false);
      setInviteForm({ email: "", name: "", sendEmail: true });
      refetch();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to create invitation");
    },
  });

  const resendInvite = trpc.license.resendInvite.useMutation({
    onSuccess: () => {
      toast.success("Invitation resent!");
      refetch();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to resend invitation");
    },
  });

  const revokeLicense = trpc.license.revoke.useMutation({
    onSuccess: () => {
      toast.success("License revoked");
      refetch();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to revoke license");
    },
  });

  const handleInvite = () => {
    if (!inviteForm.email || !inviteForm.name) {
      toast.error("Please fill in all fields");
      return;
    }
    createLicense.mutate({
      invitedEmail: inviteForm.email,
      invitedName: inviteForm.name,
      sendEmail: inviteForm.sendEmail,
    });
  };

  const copyInviteLink = (link: string) => {
    navigator.clipboard.writeText(link);
    toast.success("Invite link copied to clipboard!");
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Licenses</h2>
          <p className="text-muted-foreground">
            Manage client licenses and send invitations
          </p>
        </div>
        <Dialog open={isInviteOpen} onOpenChange={setIsInviteOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Invite Client
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Invite New Client</DialogTitle>
              <DialogDescription>
                Send an invitation to join Cratox AI with a 12-month license
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">Client Name</Label>
                <Input
                  id="name"
                  placeholder="John Doe"
                  value={inviteForm.name}
                  onChange={(e) => setInviteForm({ ...inviteForm, name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="john@example.com"
                  value={inviteForm.email}
                  onChange={(e) => setInviteForm({ ...inviteForm, email: e.target.value })}
                />
              </div>
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="sendEmail"
                  checked={inviteForm.sendEmail}
                  onChange={(e) => setInviteForm({ ...inviteForm, sendEmail: e.target.checked })}
                  className="rounded border-gray-300"
                />
                <Label htmlFor="sendEmail" className="text-sm font-normal">
                  Send invitation email automatically
                </Label>
              </div>
              <div className="bg-muted rounded-lg p-4">
                <p className="text-sm text-muted-foreground">
                  <strong>License Details:</strong>
                </p>
                <ul className="text-sm text-muted-foreground mt-2 space-y-1">
                  <li>• 12 months access to Cratox AI app</li>
                  <li>• Full nutrition tracking features</li>
                  <li>• Direct messaging with coach</li>
                  <li>• Personalized meal plans and workouts</li>
                </ul>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsInviteOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleInvite} disabled={createLicense.isPending}>
                {createLicense.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Send Invitation
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-5">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total</p>
                <p className="text-2xl font-bold">{stats?.total || 0}</p>
              </div>
              <Key className="h-8 w-8 text-muted-foreground/50" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Active</p>
                <p className="text-2xl font-bold text-green-600">{stats?.active || 0}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-500/50" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Pending</p>
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
                <p className="text-sm text-muted-foreground">Revoked</p>
                <p className="text-2xl font-bold text-red-600">{stats?.revoked || 0}</p>
              </div>
              <XCircle className="h-8 w-8 text-red-500/50" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Licenses Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Key className="h-5 w-5" />
                All Licenses
              </CardTitle>
              <CardDescription>
                Manage and track all client licenses
              </CardDescription>
            </div>
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
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
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
          ) : licenses && licenses.length > 0 ? (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Client</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Invite Link</TableHead>
                    <TableHead>Sent At</TableHead>
                    <TableHead>Activated</TableHead>
                    <TableHead>Expires</TableHead>
                    <TableHead className="w-[50px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {licenses.map((license) => (
                    <TableRow key={license.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">
                            {license.client?.name || license.invitedName}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {license.client?.email || license.invitedEmail}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={getStatusVariant(license.status)} className="gap-1">
                          {getStatusIcon(license.status)}
                          {license.status.toLowerCase()}
                        </Badge>
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
                      <TableCell className="text-sm text-muted-foreground">
                        {license.inviteSentAt
                          ? formatDistanceToNow(new Date(license.inviteSentAt), { addSuffix: true })
                          : "—"}
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
                                onClick={() => resendInvite.mutate({ id: license.id })}
                              >
                                <Mail className="mr-2 h-4 w-4" />
                                Resend Invitation
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuSeparator />
                            {license.status !== "REVOKED" && (
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
              <Key className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
              <h3 className="text-lg font-medium mb-2">No licenses yet</h3>
              <p className="text-muted-foreground mb-4">
                Invite your first client to get started
              </p>
              <Button onClick={() => setIsInviteOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Invite Client
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
