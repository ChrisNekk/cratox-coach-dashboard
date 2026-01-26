"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
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
  Settings,
  LogOut,
  ChevronDown,
  Palette,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from "@/components/ui/sidebar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ClientOnly } from "@/components/client-only";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

const mainNavItems = [
  {
    title: "Dashboard",
    url: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    title: "Clients",
    url: "/clients",
    icon: Users,
  },
  {
    title: "Teams",
    url: "/teams",
    icon: UserCircle,
  },
];

const schedulingNavItems = [
  {
    title: "Bookings",
    url: "/bookings",
    icon: Calendar,
  },
  {
    title: "Packages",
    url: "/packages",
    icon: Package,
  },
];

const contentNavItems = [
  {
    title: "Workouts",
    url: "/content/workouts",
    icon: Dumbbell,
  },
  {
    title: "Recipes",
    url: "/content/recipes",
    icon: UtensilsCrossed,
  },
  {
    title: "Meal Plans",
    url: "/content/meal-plans",
    icon: ClipboardList,
  },
];

const communicationNavItems = [
  {
    title: "Messages",
    url: "/messages",
    icon: MessageSquare,
  },
  {
    title: "Notifications",
    url: "/notifications",
    icon: Bell,
  },
];

const toolsNavItems = [
  {
    title: "AI Assistant",
    url: "/ai-assistant",
    icon: Bot,
  },
  {
    title: "Reports",
    url: "/reports",
    icon: BarChart3,
  },
];

export function AppSidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();

  const isActive = (url: string) => {
    if (url === "/dashboard") {
      return pathname === "/dashboard";
    }
    return pathname.startsWith(url);
  };

  return (
    <Sidebar>
      <SidebarHeader className="border-b border-sidebar-border">
        <div className="flex items-center gap-2 px-2 py-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground font-bold">
            C
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-semibold">Cratox AI</span>
            <span className="text-xs text-muted-foreground">Coach Dashboard</span>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent>
        {/* Main Navigation */}
        <SidebarGroup>
          <SidebarGroupLabel>Main</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {mainNavItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild isActive={isActive(item.url)}>
                    <Link href={item.url}>
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Scheduling */}
        <SidebarGroup>
          <SidebarGroupLabel>Scheduling</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {schedulingNavItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild isActive={isActive(item.url)}>
                    <Link href={item.url}>
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Content Library */}
        <SidebarGroup>
          <SidebarGroupLabel>Content Library</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {contentNavItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild isActive={isActive(item.url)}>
                    <Link href={item.url}>
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Communication */}
        <SidebarGroup>
          <SidebarGroupLabel>Communication</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {communicationNavItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild isActive={isActive(item.url)}>
                    <Link href={item.url}>
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Tools */}
        <SidebarGroup>
          <SidebarGroupLabel>Tools</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {toolsNavItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild isActive={isActive(item.url)}>
                    <Link href={item.url}>
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border">
        <SidebarMenu>
          <SidebarMenuItem>
            <ClientOnly
              fallback={
                <SidebarMenuButton className="w-full" disabled>
                  <Avatar className="h-6 w-6">
                    <AvatarFallback className="text-xs">C</AvatarFallback>
                  </Avatar>
                  <span className="flex-1 text-left truncate">Coach</span>
                  <ChevronDown className="h-4 w-4" />
                </SidebarMenuButton>
              }
            >
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <SidebarMenuButton className="w-full">
                    <Avatar className="h-6 w-6">
                      <AvatarImage src={session?.user?.image || undefined} />
                      <AvatarFallback className="text-xs">
                        {session?.user?.name?.charAt(0) || "C"}
                      </AvatarFallback>
                    </Avatar>
                    <span className="flex-1 text-left truncate">
                      {session?.user?.name || "Coach"}
                    </span>
                    <ChevronDown className="h-4 w-4" />
                  </SidebarMenuButton>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  side="top"
                  align="start"
                  className="w-[--radix-popper-anchor-width]"
                >
                  <DropdownMenuItem asChild>
                    <Link href="/settings">
                      <Settings className="mr-2 h-4 w-4" />
                      Settings
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/settings/branding">
                      <Palette className="mr-2 h-4 w-4" />
                      Branding
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => signOut({ callbackUrl: "/login" })}
                    className="text-destructive"
                  >
                    <LogOut className="mr-2 h-4 w-4" />
                    Log out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </ClientOnly>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
