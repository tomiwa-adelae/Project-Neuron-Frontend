"use client"

import { usePathname } from "next/navigation"

import { Separator } from "@/components/ui/separator"
import { SidebarTrigger } from "@/components/ui/sidebar"

// Route → header title. Longest matching prefix wins, so "/admin/users/123"
// still resolves to "Users". Keep in sync with the sidebar nav in app-sidebar.tsx.
const TITLES: { prefix: string; title: string }[] = [
  { prefix: "/admin/approvals", title: "Approvals" },
  { prefix: "/admin/submissions", title: "Submissions" },
  { prefix: "/admin/risk", title: "Risk overview" },
  { prefix: "/admin/users", title: "Users" },
  { prefix: "/admin/sessions", title: "Sessions" },
  { prefix: "/admin/schools", title: "School registry" },
  { prefix: "/admin/audit", title: "Audit log" },
  { prefix: "/schools", title: "Schools" },
  { prefix: "/captures", title: "My captures" },
]

function titleFor(pathname: string): string {
  if (pathname === "/") return "Dashboard"
  const match = TITLES.filter((t) => pathname.startsWith(t.prefix)).sort(
    (a, b) => b.prefix.length - a.prefix.length,
  )[0]
  return match?.title ?? "Dashboard"
}

export function SiteHeader() {
  const pathname = usePathname()
  const title = titleFor(pathname)

  return (
    <header className="flex h-(--header-height) shrink-0 items-center gap-2 border-b transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-(--header-height)">
      <div className="flex w-full items-center gap-1 px-4 lg:gap-2 lg:px-6">
        <SidebarTrigger className="-ml-1" />
        <Separator
          orientation="vertical"
          className="mx-2 data-[orientation=vertical]:h-4"
        />
        <h1 className="text-base font-medium">{title}</h1>
      </div>
    </header>
  )
}
