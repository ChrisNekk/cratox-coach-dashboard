"use client";

import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "./app-sidebar";
import { Header } from "./header";
import { QuickChatWidget } from "@/components/quick-chat/quick-chat-widget";
import { ClientOnly } from "@/components/client-only";

export function DashboardLayoutWrapper({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <Header />
        <main className="flex-1 overflow-auto p-4 lg:p-6">
          {children}
        </main>
      </SidebarInset>
      <ClientOnly>
        <QuickChatWidget />
      </ClientOnly>
    </SidebarProvider>
  );
}
