"use client";

import { usePathname } from "next/navigation";
import { Bell, Search, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { ClientOnly } from "@/components/client-only";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Separator } from "@/components/ui/separator";

const pageTitles: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/clients": "Clients",
  "/teams": "Teams",
  "/bookings": "Bookings",
  "/packages": "Packages",
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

export function Header() {
  const pathname = usePathname();
  const { theme, setTheme } = useTheme();
  const pageTitle = getPageTitle(pathname);

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
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-destructive text-[10px] font-medium text-destructive-foreground flex items-center justify-center">
            3
          </span>
        </Button>

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
