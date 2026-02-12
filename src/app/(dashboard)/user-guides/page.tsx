"use client";

import { useState } from "react";
import {
  LayoutDashboard,
  Users,
  UserCircle,
  Calendar,
  Package,
  Dumbbell,
  UtensilsCrossed,
  ClipboardList,
  MessageSquare,
  Bell,
  Bot,
  BarChart3,
  ChevronDown,
  BookOpen,
  CheckCircle2,
  Lightbulb,
  ArrowRight,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";

interface GuideSection {
  id: string;
  title: string;
  icon: React.ElementType;
  description: string;
  category: "main" | "scheduling" | "content" | "communication" | "tools";
  steps: string[];
  tips: string[];
}

const guides: GuideSection[] = [
  {
    id: "dashboard",
    title: "Dashboard",
    icon: LayoutDashboard,
    description: "Your central hub for monitoring your coaching business at a glance.",
    category: "main",
    steps: [
      "View key metrics including total clients, active licenses, and upcoming sessions",
      "Check unread messages count to stay on top of client communication",
      "Monitor upcoming sessions in the calendar preview",
      "Use the AI Coach Assistant to get insights about your clients",
      "Access quick actions like 'Invite Client' and 'New Booking' directly",
    ],
    tips: [
      "Click on any stat card icon to navigate directly to that section",
      "Use the AI Assistant to analyze client nutrition patterns and get coaching suggestions",
      "The calendar shows your scheduled bookings for the current week",
    ],
  },
  {
    id: "clients",
    title: "Clients",
    icon: Users,
    description: "Manage your client roster, track progress, and view detailed profiles.",
    category: "main",
    steps: [
      "View all clients in card or list view using the toggle buttons",
      "Search clients by name and filter by team, goal type, or status",
      "Click on a client card to see their detailed profile",
      "Track client goals, weight progress, and daily activity from the cards",
      "Use the 'Invite Client' button to send new client invitations",
      "Quick-edit meal plans and workouts directly from the client cards",
    ],
    tips: [
      "Switch between Active, Pending, and Revoked tabs to manage different client states",
      "Use the AI button on client cards to chat about specific client needs",
      "The progress indicator shows if a client is on track with their weight goal",
    ],
  },
  {
    id: "teams",
    title: "Teams",
    icon: UserCircle,
    description: "Organize clients into groups for easier management and bulk actions.",
    category: "main",
    steps: [
      "Create teams to group clients with similar goals or programs",
      "Assign custom colors to teams for easy visual identification",
      "View the number of clients in each team at a glance",
      "Move clients between teams from the client management page",
      "Use team filters when viewing clients to focus on specific groups",
    ],
    tips: [
      "Create teams based on program type (e.g., 'Weight Loss Program', 'Strength Training')",
      "Team colors appear on client cards making it easy to identify group membership",
      "Filter clients by team to quickly review progress of specific groups",
    ],
  },
  {
    id: "bookings",
    title: "Bookings",
    icon: Calendar,
    description: "Schedule and manage coaching sessions, consultations, and check-ins.",
    category: "scheduling",
    steps: [
      "View all bookings in calendar or list view using the tabs",
      "Click on the calendar to create new bookings or use 'New Booking' button",
      "Set booking type, duration, price, and add meeting links for virtual sessions",
      "Track booking status: Scheduled, Completed, Cancelled, or No Show",
      "Copy payment links to share with clients for session payments",
    ],
    tips: [
      "Use the status dropdown to filter and focus on specific booking states",
      "Add meeting links (Zoom, Google Meet) directly in the booking for easy client access",
      "Track revenue by period using the revenue filter (week, month, year, all time)",
    ],
  },
  {
    id: "packages",
    title: "Packages & Payments",
    icon: Package,
    description: "Create coaching packages and track client payments.",
    category: "scheduling",
    steps: [
      "Create coaching packages with custom pricing and descriptions",
      "Define what's included in each package (sessions, features)",
      "Assign packages to clients when sending invitations",
      "Track payment status for each booking",
      "Generate and copy payment links to share with clients",
    ],
    tips: [
      "Create different package tiers to accommodate various client budgets",
      "Include clear descriptions of what's included in each package",
      "Payment links can be copied and shared via messages or email",
    ],
  },
  {
    id: "workouts",
    title: "Workouts",
    icon: Dumbbell,
    description: "Create, manage, and assign workout programs to your clients.",
    category: "content",
    steps: [
      "Browse the exercise library with 200+ exercises across all muscle groups",
      "Create custom workouts by selecting exercises and setting sets/reps/weight",
      "Use 'Generate with AI' to create personalized workout plans automatically",
      "Organize workouts into single-day or multi-day programs",
      "Assign workouts to clients from the workout page or client profiles",
      "Click 'How to perform' on exercises to see detailed instructions",
    ],
    tips: [
      "Use the AI generator and specify client goals for tailored workouts",
      "Add rest times between exercises to guide client pacing",
      "Include notes on exercises for form cues or modifications",
    ],
  },
  {
    id: "recipes",
    title: "Recipes",
    icon: UtensilsCrossed,
    description: "Build a recipe library with nutritional information for meal planning.",
    category: "content",
    steps: [
      "Add recipes with ingredients, instructions, and nutritional information",
      "Use 'Calculate with AI' to automatically estimate macros from ingredients",
      "Filter recipes by category (breakfast, lunch, dinner, snack, dessert)",
      "Use 'Generate with AI' to create new recipes based on nutritional targets",
      "Add recipes to meal plans or assign directly to clients",
      "Use 'Adjust Recipe' to modify recipes for different macro targets",
    ],
    tips: [
      "Tag recipes with dietary labels (vegan, keto, gluten-free) for easy filtering",
      "Use the multi-select dietary filter to find recipes matching client restrictions",
      "Sort recipes by calories, protein, or popularity to find the right fit",
    ],
  },
  {
    id: "meal-plans",
    title: "Meal Plans",
    icon: ClipboardList,
    description: "Create structured meal plans combining your recipes for clients.",
    category: "content",
    steps: [
      "Create meal plans with daily calorie and macro targets",
      "Add recipes to specific meal slots (breakfast, lunch, dinner, snacks)",
      "Use AI to generate complete meal plans based on nutritional goals",
      "View day-by-day breakdown of nutrition totals",
      "Assign meal plans to clients with optional start and end dates",
    ],
    tips: [
      "Set target macros when creating a meal plan to track daily totals",
      "The system alerts you when replacing a recipe would significantly change macros",
      "Create base meal plans that you can copy and customize for different clients",
    ],
  },
  {
    id: "messages",
    title: "Messages",
    icon: MessageSquare,
    description: "Communicate directly with your clients through in-app messaging.",
    category: "communication",
    steps: [
      "View all client conversations in a unified inbox",
      "Click on a conversation to view message history and send replies",
      "Start new conversations with any active client",
      "Search conversations by client name or email",
      "Use 'AI Outreach' to generate and send personalized messages to multiple clients at once",
      "Select message type (check-in, motivation, progress, reminder, or custom) for AI-generated messages",
    ],
    tips: [
      "The unread badge shows total unread messages across all conversations",
      "AI Outreach lets you send personalized messages to multiple clients efficiently",
      "Review and edit AI-generated messages before sending for a personal touch",
    ],
  },
  {
    id: "notifications",
    title: "Notifications",
    icon: Bell,
    description: "Stay informed about client activity and important updates.",
    category: "communication",
    steps: [
      "View all notifications in chronological order",
      "See notifications for new messages, bookings, and client activity",
      "Click on notifications to navigate to the relevant section",
      "Mark notifications as read to keep your inbox organized",
      "Track important events like new client sign-ups and completed sessions",
    ],
    tips: [
      "Check notifications regularly to respond quickly to client needs",
      "Unread message notifications link directly to the conversation",
      "Use notifications to track when clients complete bookings or sign up",
    ],
  },
  {
    id: "ai-assistant",
    title: "AI Assistant",
    icon: Bot,
    description: "Leverage AI to help create content and answer coaching questions.",
    category: "tools",
    steps: [
      "Access the AI Assistant from the sidebar or client cards",
      "Ask questions about nutrition, training, or coaching strategies",
      "Generate workout programs tailored to specific client needs",
      "Create recipes that match specific calorie and macro requirements",
      "Get AI-calculated nutritional information for recipes",
    ],
    tips: [
      "Be specific with your prompts - include goals, restrictions, and preferences",
      "Always review AI-generated content before assigning to clients",
      "Use AI chat on client cards to get insights specific to that client",
    ],
  },
  {
    id: "reports",
    title: "Reports",
    icon: BarChart3,
    description: "Analyze your business performance and client progress with detailed reports.",
    category: "tools",
    steps: [
      "View booking and revenue statistics over different time periods",
      "Track client progress through nutrition and weight data",
      "Analyze trends in client activity and engagement",
      "Filter reports by date range to focus on specific periods",
      "Use charts to visualize data patterns over time",
    ],
    tips: [
      "Review client nutrition reports before check-in sessions",
      "Use the date filters to compare performance across different periods",
      "Track booking completion rates to identify scheduling patterns",
    ],
  },
];

const categoryLabels = {
  main: "Main Navigation",
  scheduling: "Scheduling",
  content: "Content Library",
  communication: "Communication",
  tools: "Tools",
};

const categoryColors = {
  main: "bg-blue-500/10 text-blue-600 border-blue-500/20",
  scheduling: "bg-purple-500/10 text-purple-600 border-purple-500/20",
  content: "bg-green-500/10 text-green-600 border-green-500/20",
  communication: "bg-orange-500/10 text-orange-600 border-orange-500/20",
  tools: "bg-pink-500/10 text-pink-600 border-pink-500/20",
};

export default function UserGuidesPage() {
  const [openGuides, setOpenGuides] = useState<string[]>([]);

  const toggleGuide = (id: string) => {
    setOpenGuides((prev) =>
      prev.includes(id) ? prev.filter((g) => g !== id) : [...prev, id]
    );
  };

  const expandAll = () => {
    setOpenGuides(guides.map((g) => g.id));
  };

  const collapseAll = () => {
    setOpenGuides([]);
  };

  const groupedGuides = guides.reduce((acc, guide) => {
    if (!acc[guide.category]) {
      acc[guide.category] = [];
    }
    acc[guide.category].push(guide);
    return acc;
  }, {} as Record<string, GuideSection[]>);

  return (
    <div className="container max-w-5xl py-8 px-4 md:px-8">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 bg-primary/10 rounded-lg">
            <BookOpen className="h-6 w-6 text-primary" />
          </div>
          <h1 className="text-3xl font-bold">User Guides</h1>
        </div>
        <p className="text-muted-foreground text-lg">
          Learn how to use each section of your Coach Dashboard effectively.
        </p>
      </div>

      <div className="flex gap-2 mb-6">
        <Button variant="outline" size="sm" onClick={expandAll}>
          Expand All
        </Button>
        <Button variant="outline" size="sm" onClick={collapseAll}>
          Collapse All
        </Button>
      </div>

      <div className="space-y-8">
        {Object.entries(groupedGuides).map(([category, categoryGuides]) => (
          <div key={category}>
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Badge variant="outline" className={categoryColors[category as keyof typeof categoryColors]}>
                {categoryLabels[category as keyof typeof categoryLabels]}
              </Badge>
            </h2>
            <div className="space-y-3">
              {categoryGuides.map((guide) => (
                <Card key={guide.id} className="overflow-hidden">
                  <Collapsible
                    open={openGuides.includes(guide.id)}
                    onOpenChange={() => toggleGuide(guide.id)}
                  >
                    <CollapsibleTrigger asChild>
                      <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                        <div className="flex items-start justify-between">
                          <div className="flex items-start gap-3">
                            <div className="p-2 bg-muted rounded-lg mt-0.5">
                              <guide.icon className="h-5 w-5 text-muted-foreground" />
                            </div>
                            <div>
                              <CardTitle className="text-lg">{guide.title}</CardTitle>
                              <CardDescription className="mt-1">
                                {guide.description}
                              </CardDescription>
                            </div>
                          </div>
                          <ChevronDown
                            className={`h-5 w-5 text-muted-foreground transition-transform ${
                              openGuides.includes(guide.id) ? "rotate-180" : ""
                            }`}
                          />
                        </div>
                      </CardHeader>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <CardContent className="pt-0 pb-6">
                        <div className="grid md:grid-cols-2 gap-6">
                          <div>
                            <h4 className="font-medium mb-3 flex items-center gap-2">
                              <ArrowRight className="h-4 w-4 text-primary" />
                              How to Use
                            </h4>
                            <ul className="space-y-2">
                              {guide.steps.map((step, index) => (
                                <li key={index} className="flex items-start gap-2 text-sm">
                                  <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                                  <span className="text-muted-foreground">{step}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                          <div>
                            <h4 className="font-medium mb-3 flex items-center gap-2">
                              <Lightbulb className="h-4 w-4 text-yellow-500" />
                              Pro Tips
                            </h4>
                            <ul className="space-y-2">
                              {guide.tips.map((tip, index) => (
                                <li key={index} className="flex items-start gap-2 text-sm">
                                  <span className="text-yellow-500 mt-0.5 shrink-0">•</span>
                                  <span className="text-muted-foreground">{tip}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        </div>
                      </CardContent>
                    </CollapsibleContent>
                  </Collapsible>
                </Card>
              ))}
            </div>
          </div>
        ))}
      </div>

      <Card className="mt-8 bg-muted/50">
        <CardContent className="py-6">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-primary/10 rounded-lg">
              <MessageSquare className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold mb-1">Need More Help?</h3>
              <p className="text-sm text-muted-foreground">
                If you have questions that aren't covered in these guides, feel free to reach out
                to our support team or use the AI Assistant for quick answers.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
