"use client";

import { usePathname, useRouter } from "next/navigation";
import { Bell, Search, Moon, Sun, MessageSquare, Calendar, Key, UserPlus } from "lucide-react";
import { useTheme } from "next-themes";
import { formatDistanceToNow } from "date-fns";
import { trpc } from "@/lib/trpc/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { ClientOnly } from "@/components/client-only";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import { Separator } from "@/components/ui/separator";

const pageTitles: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/clients": "Clients",
  "/teams": "Teams",
  "/bookings": "Bookings",
  "/packages": "Packages & Payments",
  "/content/workouts": "Workouts",
  "/content/recipes": "Recipes",
  "/content/meal-plans": "Meal Plans",
  "/messages": "Messages",
  "/notifications": "Notifications",
  "/ai-assistant": "AI Assistant",
  "/reports": "Reports",
  "/settings": "Settings",
  "/settings/branding": "Branding",
};

function getPageTitle(pathname: string): string {
  // Check for exact match first
  if (pageTitles[pathname]) {
    return pageTitles[pathname];
  }
  
  // Check for dynamic routes
  if (pathname.startsWith("/clients/")) {
    return "Client Profile";
  }
  if (pathname.startsWith("/messages/")) {
    return "Conversation";
  }
  if (pathname.startsWith("/reports/")) {
    return "Report";
  }
  if (pathname.startsWith("/bookings/")) {
    return "Booking";
  }
  
  // Find closest parent match
  for (const [path, title] of Object.entries(pageTitles)) {
    if (pathname.startsWith(path)) {
      return title;
    }
  }
  
  return "Dashboard";
}

const notificationIcons = {
  message: MessageSquare,
  booking: Calendar,
  license: Key,
  new_client: UserPlus,
} as const;

export function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const { setTheme } = useTheme();
  const pageTitle = getPageTitle(pathname);

  const { data: notificationsData } = trpc.dashboard.getCoachNotifications.useQuery(undefined, {
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  const notifications = notificationsData?.notifications ?? [];
  const unreadCount = notificationsData?.unreadCount ?? 0;

  const handleNotificationClick = (link: string) => {
    router.push(link);
  };

  return (
    <header className="flex h-14 items-center gap-4 border-b bg-background px-4 lg:px-6">
      <SidebarTrigger className="-ml-1" />
      <Separator orientation="vertical" className="h-6" />
      
      <h1 className="text-lg font-semibold">{pageTitle}</h1>

      <div className="flex-1" />

      <div className="flex items-center gap-2">
        {/* Search (placeholder) */}
        <div className="hidden lg:flex relative">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search..."
            className="w-64 pl-8"
          />
        </div>

        {/* Notifications */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="relative">
              <Bell className="h-5 w-5" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-destructive text-[10px] font-medium text-destructive-foreground flex items-center justify-center">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-80">
            <DropdownMenuLabel className="flex items-center justify-between">
              <span>Notifications</span>
              {unreadCount > 0 && (
                <span className="text-xs font-normal text-muted-foreground">
                  {unreadCount} unread
                </span>
              )}
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <ScrollArea className="h-[300px]">
              {notifications.length > 0 ? (
                notifications.map((notification) => {
                  const Icon = notificationIcons[notification.type];
                  return (
                    <DropdownMenuItem
                      key={notification.id}
                      className="flex items-start gap-3 p-3 cursor-pointer"
                      onClick={() => handleNotificationClick(notification.link)}
                    >
                      <div className={`mt-0.5 rounded-full p-2 ${
                        notification.type === "message" ? "bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-300" :
                        notification.type === "booking" ? "bg-green-100 text-green-600 dark:bg-green-900 dark:text-green-300" :
                        notification.type === "license" ? "bg-amber-100 text-amber-600 dark:bg-amber-900 dark:text-amber-300" :
                        "bg-purple-100 text-purple-600 dark:bg-purple-900 dark:text-purple-300"
                      }`}>
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className={`text-sm font-medium truncate ${!notification.read ? "text-foreground" : "text-muted-foreground"}`}>
                            {notification.title}
                          </p>
                          {!notification.read && (
                            <span className="h-2 w-2 rounded-full bg-primary shrink-0" />
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground truncate">
                          {notification.description}
                        </p>
                        <p className="text-[11px] text-muted-foreground mt-1">
                          {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
                        </p>
                      </div>
                    </DropdownMenuItem>
                  );
                })
              ) : (
                <div className="p-6 text-center text-sm text-muted-foreground">
                  <Bell className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>No notifications yet</p>
                </div>
              )}
            </ScrollArea>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="justify-center text-sm text-primary cursor-pointer"
              onClick={() => router.push("/notifications")}
            >
              View all notifications
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Theme Toggle */}
        <ClientOnly
          fallback={
            <Button variant="ghost" size="icon" disabled>
              <Sun className="h-5 w-5" />
              <span className="sr-only">Toggle theme</span>
            </Button>
          }
        >
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <Sun className="h-5 w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
                <Moon className="absolute h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
                <span className="sr-only">Toggle theme</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setTheme("light")}>
                Light
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setTheme("dark")}>
                Dark
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setTheme("system")}>
                System
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </ClientOnly>
      </div>
    </header>
  );
}
