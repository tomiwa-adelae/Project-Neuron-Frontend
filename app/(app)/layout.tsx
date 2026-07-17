import { AppSidebar } from "@/components/app-sidebar"
import { SiteHeader } from "@/components/site-header"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"

import { AuthProvider } from "./_components/auth-provider"
import { OfflineSync } from "@/lib/offline/offline-sync"

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <OfflineSync />
      <SidebarProvider
        style={
          {
            "--sidebar-width": "calc(var(--spacing) * 72)",
            "--header-height": "calc(var(--spacing) * 12)",
          } as React.CSSProperties
        }
      >
        <AppSidebar variant="inset" />
        <SidebarInset>
          <SiteHeader />
          <div className="flex flex-1 flex-col">
            <div className="@container/main flex flex-1 flex-col gap-2">
              <div className="px-4 py-4 md:py-6 lg:px-6">{children}</div>
            </div>
          </div>
        </SidebarInset>
      </SidebarProvider>
    </AuthProvider>
  )
}
