"use client";

import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Plus,
  Copy,
  Mail,
  RefreshCw,
  Loader2,
  Users,
  ChevronDown,
  Edit,
  Eye,
  Link as LinkIcon,
  X,
  UserPlus,
  Upload,
  FileSpreadsheet,
  Download,
  AlertCircle,
} from "lucide-react";
import { toast } from "sonner";
import * as XLSX from "xlsx";

interface InviteClient {
  id: string;
  name: string;
  email: string;
  teamName?: string;
}

// Mock coach ID for generating payment links - in production this would come from auth
const MOCK_COACH_ID = "coach_abc123xyz";

// Generate default email template
const generateDefaultEmail = (clientName: string, coachName: string = "Your Coach", paymentLink: string) => `Hi ${clientName || "[Client Name]"},

I'm excited to invite you to join me on Cratox AI - the nutrition and fitness tracking app that will help us work together more effectively!

🎉 **Special Coach Discount**
As my client, you're getting exclusive access at a special discounted rate - this is lower than purchasing directly from the app store!

💪 **What You'll Get:**
• 12 months of full access to Cratox AI
• Real-time nutrition and fitness tracking
• Direct messaging with me (your coach)
• Personalized meal plans and workout routines
• Progress tracking and insights

🔗 **Get Started Now:**
Click the link below to complete your purchase and activate your account:
${paymentLink}

Once you've completed the purchase, you'll receive instructions to download the app and we can start working together right away!

Looking forward to helping you achieve your goals!

Best regards,
${coachName}`;

interface InviteClientDialogProps {
  trigger?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  onSuccess?: () => void;
}

export function InviteClientDialog({ 
  trigger, 
  open: controlledOpen, 
  onOpenChange: controlledOnOpenChange,
  onSuccess 
}: InviteClientDialogProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const [showEmailPreview, setShowEmailPreview] = useState(false);
  const [isEmailCustomized, setIsEmailCustomized] = useState(false);
  const [clientsList, setClientsList] = useState<InviteClient[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadErrors, setUploadErrors] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState("single");
  
  // Use controlled or uncontrolled state
  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : internalOpen;
  const setOpen = isControlled ? controlledOnOpenChange! : setInternalOpen;

  // Generate mock payment link for this coach
  const generatePaymentLink = (clientEmail: string) => {
    const baseUrl = "https://pay.cratox.ai";
    const encodedEmail = encodeURIComponent(clientEmail || "");
    return `${baseUrl}/subscribe?coach=${MOCK_COACH_ID}&email=${encodedEmail}&plan=annual&discount=coach20`;
  };

  const [inviteForm, setInviteForm] = useState({
    email: "",
    name: "",
    teamId: "",
    sendEmail: true,
    customMessage: "",
  });

  // Update payment link when email changes
  const paymentLink = generatePaymentLink(inviteForm.email || clientsList[0]?.email || "");
  
  // Initialize default email when form opens or name changes
  useEffect(() => {
    if (!isEmailCustomized && open) {
      const nameForEmail = clientsList.length > 0 ? "[Client Name]" : inviteForm.name;
      setInviteForm(prev => ({
        ...prev,
        customMessage: generateDefaultEmail(nameForEmail, "Your Coach", paymentLink)
      }));
    }
  }, [inviteForm.name, paymentLink, open, isEmailCustomized, clientsList.length]);

  const { data: teams } = trpc.team.getAll.useQuery();
  // NOTE: tRPC's `useUtils()` exposes a reserved `.client` helper which collides with our router named `client`.
  // Cast to avoid build-time TS issues until we rename that router (client -> clients) across the app.
  const utils = trpc.useUtils() as any;

  const createLicense = trpc.license.create.useMutation();

  const resetInviteForm = () => {
    setInviteForm({ 
      email: "", 
      name: "", 
      teamId: "",
      sendEmail: true,
      customMessage: "",
    });
    setClientsList([]);
    setIsEmailCustomized(false);
    setShowEmailPreview(false);
    setUploadErrors([]);
    setActiveTab("single");
  };

  const downloadTemplate = () => {
    const templateData = [
      { Name: "John Doe", Email: "john@example.com", Team: "Weight Loss Group" },
      { Name: "Jane Smith", Email: "jane@example.com", Team: "Fitness Beginners" },
      { Name: "Bob Wilson", Email: "bob@example.com", Team: "" },
    ];
    
    const ws = XLSX.utils.json_to_sheet(templateData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Clients");
    
    // Set column widths
    ws["!cols"] = [{ wch: 20 }, { wch: 30 }, { wch: 25 }];
    
    XLSX.writeFile(wb, "cratox_invite_template.xlsx");
    toast.success("Template downloaded!");
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    const validTypes = [
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "application/vnd.ms-excel",
      "text/csv",
    ];
    
    if (!validTypes.includes(file.type) && !file.name.match(/\.(xlsx|xls|csv)$/i)) {
      toast.error("Please upload an Excel (.xlsx, .xls) or CSV file");
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: "array" });
        
        // Get first sheet
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        
        // Convert to JSON
        const jsonData = XLSX.utils.sheet_to_json<Record<string, string>>(worksheet);
        
        if (jsonData.length === 0) {
          toast.error("The file appears to be empty");
          return;
        }

        const newClients: InviteClient[] = [];
        const errors: string[] = [];
        const existingEmails = new Set(clientsList.map(c => c.email.toLowerCase()));

        jsonData.forEach((row, index) => {
          // Try to find name and email columns (case-insensitive)
          const name = row.Name || row.name || row.NAME || row["Client Name"] || row["client name"] || "";
          const email = row.Email || row.email || row.EMAIL || row["Email Address"] || row["email address"] || "";
          const teamName = row.Team || row.team || row.TEAM || row["Team Name"] || row["team name"] || "";

          if (!name || !email) {
            errors.push(`Row ${index + 2}: Missing name or email`);
            return;
          }

          // Validate email format
          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
          if (!emailRegex.test(email)) {
            errors.push(`Row ${index + 2}: Invalid email format (${email})`);
            return;
          }

          // Check for duplicates
          if (existingEmails.has(email.toLowerCase())) {
            errors.push(`Row ${index + 2}: Duplicate email (${email})`);
            return;
          }

          existingEmails.add(email.toLowerCase());
          newClients.push({
            id: `${Date.now()}-${index}`,
            name: name.trim(),
            email: email.trim().toLowerCase(),
            teamName: teamName?.trim() || undefined,
          });
        });

        if (newClients.length > 0) {
          setClientsList(prev => [...prev, ...newClients]);
          toast.success(`${newClients.length} client${newClients.length > 1 ? 's' : ''} imported successfully!`);
        }

        if (errors.length > 0) {
          setUploadErrors(errors.slice(0, 5)); // Show first 5 errors
          if (errors.length > 5) {
            setUploadErrors(prev => [...prev, `...and ${errors.length - 5} more errors`]);
          }
        }

      } catch (error) {
        console.error("Error parsing file:", error);
        toast.error("Failed to parse the file. Please check the format.");
      }
    };

    reader.readAsArrayBuffer(file);
    
    // Reset the input so the same file can be uploaded again
    event.target.value = "";
  };

  const addClientToList = () => {
    if (!inviteForm.email || !inviteForm.name) {
      toast.error("Please fill in name and email");
      return;
    }
    
    // Check for duplicates
    if (clientsList.some(c => c.email.toLowerCase() === inviteForm.email.toLowerCase())) {
      toast.error("This email is already in the list");
      return;
    }

    const newClient: InviteClient = {
      id: Date.now().toString(),
      name: inviteForm.name,
      email: inviteForm.email,
    };

    setClientsList([...clientsList, newClient]);
    setInviteForm({ ...inviteForm, name: "", email: "" });
    toast.success(`${newClient.name} added to the list`);
  };

  const removeClientFromList = (id: string) => {
    setClientsList(clientsList.filter(c => c.id !== id));
  };

  const handleInvite = async () => {
    // Determine clients to invite based on active tab
    let clientsToInvite: InviteClient[] = [];
    
    if (activeTab === "bulk") {
      // Bulk mode: use the clients list
      clientsToInvite = clientsList;
      if (clientsToInvite.length === 0) {
        toast.error("Please upload a file or add clients to the list");
        return;
      }
    } else {
      // Single mode: use the form fields
      if (!inviteForm.email || !inviteForm.name) {
        toast.error("Please fill in the client name and email");
        return;
      }
      clientsToInvite = [{ id: "single", name: inviteForm.name, email: inviteForm.email, teamName: undefined }];
    }

    setIsSubmitting(true);
    let successCount = 0;
    let errorCount = 0;

    // Create a map of team names to IDs
    const teamNameToId = new Map<string, string>();
    teams?.forEach(team => {
      teamNameToId.set(team.name.toLowerCase(), team.id);
    });

    for (const client of clientsToInvite) {
      try {
        // Determine team ID: use client's team name from Excel if available, otherwise use selected team
        let teamId = inviteForm.teamId || undefined;
        if (client.teamName && !inviteForm.teamId) {
          const matchedTeamId = teamNameToId.get(client.teamName.toLowerCase());
          if (matchedTeamId) {
            teamId = matchedTeamId;
          }
        }

        await createLicense.mutateAsync({
          invitedEmail: client.email,
          invitedName: client.name,
          sendEmail: inviteForm.sendEmail,
          teamId: teamId,
          customMessage: inviteForm.customMessage || undefined,
          paymentLink: generatePaymentLink(client.email),
        });
        successCount++;
      } catch (error) {
        errorCount++;
        console.error(`Failed to invite ${client.email}:`, error);
      }
    }

    setIsSubmitting(false);

    if (successCount > 0) {
      utils.license.getAll.invalidate();
      utils.license.getStats.invalidate();
      utils.dashboard.getStats.invalidate();
      
      if (errorCount === 0) {
        toast.success(`${successCount} invitation${successCount > 1 ? 's' : ''} sent successfully!`);
      } else {
        toast.warning(`${successCount} sent, ${errorCount} failed`);
      }
      
      setOpen(false);
      resetInviteForm();
      onSuccess?.();
    } else {
      toast.error("Failed to send invitations");
    }
  };

  const copyPaymentLink = () => {
    navigator.clipboard.writeText(paymentLink);
    toast.success("Payment link copied to clipboard!");
  };

  return (
    <Dialog open={open} onOpenChange={(newOpen) => {
      setOpen(newOpen);
      if (!newOpen) resetInviteForm();
    }}>
      {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Invite New Client</DialogTitle>
          <DialogDescription>
            Send an invitation to join Cratox AI with a 12-month license at a special coach discount
          </DialogDescription>
        </DialogHeader>
        
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="single" className="flex items-center gap-1.5">
              <UserPlus className="h-3.5 w-3.5" />
              Single Invite
            </TabsTrigger>
            <TabsTrigger value="bulk" className="flex items-center gap-1.5">
              <FileSpreadsheet className="h-3.5 w-3.5" />
              Bulk Invite
            </TabsTrigger>
            <TabsTrigger value="email" className="flex items-center gap-1.5">
              <Mail className="h-3.5 w-3.5" />
              Email & Payment
            </TabsTrigger>
          </TabsList>
          
          {/* Single Invite Tab */}
          <TabsContent value="single" className="space-y-4 mt-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="single-name">Client Name *</Label>
                <Input
                  id="single-name"
                  placeholder="John Doe"
                  value={inviteForm.name}
                  onChange={(e) => setInviteForm({ ...inviteForm, name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="single-email">Email Address *</Label>
                <Input
                  id="single-email"
                  type="email"
                  placeholder="john@example.com"
                  value={inviteForm.email}
                  onChange={(e) => setInviteForm({ ...inviteForm, email: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="team">Add to Team (Optional)</Label>
              <Select
                value={inviteForm.teamId}
                onValueChange={(value) => setInviteForm({ ...inviteForm, teamId: value === "none" ? "" : value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a team..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">
                    <span className="text-muted-foreground">No team</span>
                  </SelectItem>
                  {teams?.map((team) => (
                    <SelectItem key={team.id} value={team.id}>
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4" />
                        {team.name}
                      </div>
                    </SelectItem>
                  ))}
                  <div className="border-t my-1" />
                  <SelectItem value="new-team">
                    <div className="flex items-center gap-2 text-primary">
                      <Plus className="h-4 w-4" />
                      Create new team...
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="bg-muted rounded-lg p-4">
              <p className="text-sm font-medium mb-2">License Details:</p>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• 12 months access to Cratox AI app</li>
                <li>• Full nutrition tracking features</li>
                <li>• Direct messaging with coach</li>
                <li>• Personalized meal plans and workouts</li>
              </ul>
            </div>
          </TabsContent>

          {/* Bulk Invite Tab */}
          <TabsContent value="bulk" className="space-y-4 mt-4">
            {/* Upload Section */}
            <div className="border-2 border-dashed rounded-lg p-6 text-center space-y-4">
              <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                <Upload className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h3 className="font-medium">Upload Client List</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Upload an Excel or CSV file with your clients&apos; information
                </p>
              </div>
              <div className="flex items-center justify-center gap-3">
                <label className="cursor-pointer">
                  <input
                    type="file"
                    accept=".xlsx,.xls,.csv"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                  <Button type="button" asChild>
                    <span>
                      <Upload className="h-4 w-4 mr-2" />
                      Choose File
                    </span>
                  </Button>
                </label>
                <Button
                  type="button"
                  variant="outline"
                  onClick={downloadTemplate}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Download Template
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Supported formats: .xlsx, .xls, .csv • Required columns: Name, Email • Optional: Team
              </p>
            </div>

            {/* Manual Add Section */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <div className="flex-1 border-t" />
                <span className="text-xs text-muted-foreground px-2">or add manually</span>
                <div className="flex-1 border-t" />
              </div>
              <div className="flex items-end gap-2">
                <div className="flex-1 grid gap-3 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="bulk-name" className="text-xs text-muted-foreground">Name</Label>
                    <Input
                      id="bulk-name"
                      placeholder="John Doe"
                      value={inviteForm.name}
                      onChange={(e) => setInviteForm({ ...inviteForm, name: e.target.value })}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          addClientToList();
                        }
                      }}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="bulk-email" className="text-xs text-muted-foreground">Email</Label>
                    <Input
                      id="bulk-email"
                      type="email"
                      placeholder="john@example.com"
                      value={inviteForm.email}
                      onChange={(e) => setInviteForm({ ...inviteForm, email: e.target.value })}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          addClientToList();
                        }
                      }}
                    />
                  </div>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={addClientToList}
                  className="shrink-0"
                  title="Add to list"
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Upload Errors */}
            {uploadErrors.length > 0 && (
              <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3">
                <div className="flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-destructive">Import Warnings</p>
                    <ul className="text-xs text-destructive/80 space-y-0.5">
                      {uploadErrors.map((error, i) => (
                        <li key={i}>{error}</li>
                      ))}
                    </ul>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setUploadErrors([])}
                      className="h-6 text-xs text-destructive hover:text-destructive"
                    >
                      Dismiss
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* Clients List */}
            {clientsList.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    Clients to Invite ({clientsList.length})
                  </Label>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setClientsList([])}
                    className="text-muted-foreground h-auto py-1 px-2"
                  >
                    Clear all
                  </Button>
                </div>
                <div className="border rounded-lg divide-y max-h-[180px] overflow-y-auto">
                  {clientsList.map((client) => (
                    <div
                      key={client.id}
                      className="flex items-center justify-between px-3 py-2 hover:bg-muted/50"
                    >
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                          <span className="text-xs font-medium text-primary">
                            {client.name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2)}
                          </span>
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-medium truncate">{client.name}</p>
                            {client.teamName && (
                              <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 shrink-0">
                                {client.teamName}
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground truncate">{client.email}</p>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeClientFromList(client.id)}
                        className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
                {clientsList.some(c => c.teamName) && !inviteForm.teamId && (
                  <p className="text-xs text-muted-foreground">
                    <strong>Note:</strong> Clients with team names from the file will be added to those teams (if they exist).
                  </p>
                )}
              </div>
            )}

            {/* Team Selection for Bulk */}
            <div className="space-y-2">
              <Label htmlFor="bulk-team">Assign All to Team (Optional)</Label>
              <Select
                value={inviteForm.teamId}
                onValueChange={(value) => setInviteForm({ ...inviteForm, teamId: value === "none" ? "" : value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a team..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">
                    <span className="text-muted-foreground">Use team from file (or no team)</span>
                  </SelectItem>
                  {teams?.map((team) => (
                    <SelectItem key={team.id} value={team.id}>
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4" />
                        {team.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                This overrides team assignments from the uploaded file
              </p>
            </div>
          </TabsContent>
          
          <TabsContent value="email" className="space-y-4 mt-4">
            {/* Payment Link Section */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <LinkIcon className="h-4 w-4" />
                Your Payment Link
              </Label>
              <div className="flex gap-2">
                <Input
                  readOnly
                  value={paymentLink}
                  className="bg-muted font-mono text-xs"
                />
                <Button variant="outline" size="icon" onClick={copyPaymentLink}>
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                This unique link is tied to your coach account. When clients purchase through this link, they'll be automatically connected to your dashboard.
              </p>
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

            {inviteForm.sendEmail && (
              <Collapsible open={showEmailPreview} onOpenChange={setShowEmailPreview}>
                <div className="flex items-center justify-between">
                  <Label>Email Message</Label>
                  <CollapsibleTrigger asChild>
                    <Button variant="ghost" size="sm">
                      {showEmailPreview ? (
                        <>
                          <Eye className="h-4 w-4 mr-2" />
                          Hide Preview
                        </>
                      ) : (
                        <>
                          <Edit className="h-4 w-4 mr-2" />
                          Customize Email
                        </>
                      )}
                      <ChevronDown className={`h-4 w-4 ml-1 transition-transform ${showEmailPreview ? "rotate-180" : ""}`} />
                    </Button>
                  </CollapsibleTrigger>
                </div>
                
                <CollapsibleContent className="space-y-3 mt-2">
                  <Textarea
                    value={inviteForm.customMessage}
                    onChange={(e) => {
                      setInviteForm({ ...inviteForm, customMessage: e.target.value });
                      setIsEmailCustomized(true);
                    }}
                    rows={12}
                    className="font-mono text-sm"
                    placeholder="Customize your invitation email..."
                  />
                  <div className="flex justify-between">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setInviteForm(prev => ({
                          ...prev,
                          customMessage: generateDefaultEmail(prev.name, "Your Coach", paymentLink)
                        }));
                        setIsEmailCustomized(false);
                      }}
                    >
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Reset to Default
                    </Button>
                    <p className="text-xs text-muted-foreground self-center">
                      Tip: The payment link is already included in the email
                    </p>
                  </div>
                </CollapsibleContent>
              </Collapsible>
            )}

            {!inviteForm.sendEmail && (
              <div className="bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
                <p className="text-sm text-amber-800 dark:text-amber-200">
                  <strong>Note:</strong> Since you're not sending an automatic email, make sure to share the payment link with your client manually.
                </p>
              </div>
            )}

            <div className="bg-muted/50 rounded-lg p-4 border">
              <p className="text-sm font-medium mb-2 flex items-center gap-2">
                <Mail className="h-4 w-4" />
                Email Preview
                {activeTab === "bulk" && clientsList.length > 0 && (
                  <Badge variant="secondary" className="ml-auto">
                    Will be sent to {clientsList.length} client{clientsList.length > 1 ? 's' : ''}
                  </Badge>
                )}
              </p>
              <div className="bg-background rounded border p-3 max-h-[200px] overflow-y-auto">
                <p className="text-xs text-muted-foreground mb-2">
                  <strong>To:</strong> {activeTab === "bulk" && clientsList.length > 0 
                    ? clientsList.length > 3
                      ? `${clientsList.slice(0, 3).map(c => c.email).join(", ")} +${clientsList.length - 3} more`
                      : clientsList.map(c => c.email).join(", ")
                    : inviteForm.email || "client@example.com"
                  }
                </p>
                <p className="text-xs text-muted-foreground mb-2">
                  <strong>Subject:</strong> You're Invited to Join Cratox AI! 🎉
                </p>
                <hr className="my-2" />
                <pre className="text-xs whitespace-pre-wrap font-sans">
                  {inviteForm.customMessage || generateDefaultEmail(
                    activeTab === "bulk" ? "[Client Name]" : inviteForm.name, 
                    "Your Coach", 
                    paymentLink
                  )}
                </pre>
              </div>
              {activeTab === "bulk" && clientsList.length > 0 && (
                <p className="text-xs text-muted-foreground mt-2">
                  Note: Each client will receive a personalized email with their name and unique payment link.
                </p>
              )}
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleInvite} disabled={isSubmitting || (activeTab === "bulk" && clientsList.length === 0)}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {activeTab === "bulk"
              ? clientsList.length > 0
                ? `Send ${clientsList.length} Invitation${clientsList.length > 1 ? 's' : ''}`
                : "Add Clients First"
              : inviteForm.sendEmail 
                ? "Send Invitation" 
                : "Create License"
            }
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
