"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  LayoutDashboardIcon,
  SchoolIcon,
  ClipboardListIcon,
  ClipboardCheckIcon,
  ShieldAlertIcon,
  CalendarDaysIcon,
  ScrollTextIcon,
  UserCheckIcon,
  UsersIcon,
  StarIcon,
} from "lucide-react"

import { NavUser } from "@/components/nav-user"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import { useAuth } from "@/app/(app)/_components/auth-provider"
import {
  isAdmin,
  canViewAdminDashboard,
  canVerify,
  canViewRisk,
  isCaptureRole,
} from "@/lib/access"

type NavItem = { title: string; url: string; icon: React.ElementType }

// Each role sees only what it can reach. SYS_ADMIN → full console; supervisors /
// leadership → oversight subset; LIE → capture nav; others → minimal.
function navFor(role: string): NavItem[] {
  if (isAdmin(role)) {
    return [
      { title: "Dashboard", url: "/", icon: LayoutDashboardIcon },
      { title: "Approvals", url: "/admin/approvals", icon: UserCheckIcon },
      { title: "Submissions", url: "/admin/submissions", icon: ClipboardCheckIcon },
      { title: "Risk overview", url: "/admin/risk", icon: ShieldAlertIcon },
      { title: "Users", url: "/admin/users", icon: UsersIcon },
      { title: "Sessions", url: "/admin/sessions", icon: CalendarDaysIcon },
      { title: "School registry", url: "/admin/schools", icon: SchoolIcon },
      { title: "Audit log", url: "/admin/audit", icon: ScrollTextIcon },
    ]
  }

  // Supervisors (ZONAL/EMIS/HOD) and leadership (EXEC_VIEW).
  if (canViewAdminDashboard(role)) {
    const items: NavItem[] = [
      { title: "Dashboard", url: "/", icon: LayoutDashboardIcon },
    ]
    if (canVerify(role)) {
      items.push({ title: "Submissions", url: "/admin/submissions", icon: ClipboardCheckIcon })
    }
    if (canViewRisk(role)) {
      items.push({ title: "Risk overview", url: "/admin/risk", icon: ShieldAlertIcon })
    }
    return items
  }

  // LIE field inspectors.
  if (isCaptureRole(role)) {
    return [
      { title: "Dashboard", url: "/", icon: LayoutDashboardIcon },
      { title: "Schools", url: "/schools", icon: SchoolIcon },
      { title: "My captures", url: "/captures", icon: ClipboardListIcon },
    ]
  }

  // Roles without a configured workspace yet (e.g. INSPECT_OFFICER).
  return [{ title: "Dashboard", url: "/", icon: LayoutDashboardIcon }]
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const user = useAuth()
  const pathname = usePathname()
  const items = navFor(user.role)

  const navUser = {
    name: `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim() || user.email,
    email: user.email,
    avatar: "",
  }

  return (
    <Sidebar collapsible="offcanvas" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              className="data-[slot=sidebar-menu-button]:p-1.5!"
            >
              <Link href="/">
                <StarIcon className="size-5! fill-[#caa44a] text-[#caa44a]" />
                <span className="text-base font-semibold tracking-[0.2em]">
                  NEURON
                </span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent className="flex flex-col gap-2">
            <SidebarMenu>
              {items.map((item) => {
                const active =
                  item.url === "/"
                    ? pathname === "/"
                    : pathname.startsWith(item.url)
                const Icon = item.icon
                return (
                  <SidebarMenuItem key={item.url}>
                    <SidebarMenuButton asChild tooltip={item.title} isActive={active}>
                      <Link href={item.url}>
                        <Icon />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={navUser} />
      </SidebarFooter>
    </Sidebar>
  )
}
