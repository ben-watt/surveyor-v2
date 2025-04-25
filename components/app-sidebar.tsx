import * as React from "react"
import {
  Award,
  Blocks,
  Grid2x2,
  Layers,
  NotebookPen,
  Settings2,
  Building2,
  ChevronDown,
  FileText,
} from "lucide-react"
import { AppIcon } from "@/app/home/components/AppIcon"

import { NavSection } from "@/components/nav-main"
import { NavUser } from "@/components/nav-user"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar"
import Link from "next/link"
import { useTenant } from "@/app/home/utils/TenantContext"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Skeleton } from "@/components/ui/skeleton"
import { Tenant } from "@/app/home/utils/tenant-utils"

const applicationNavData = {
  items: [
    {
      title: "Surveys",
      url: "/home/surveys",
      icon: NotebookPen,
      isActive: true,
    },
    {
      title: "Editor",
      url: "/home/editor",
      icon: FileText,
      isActive: true,
    }
  ]
}

const configurationNavData = {
  items: [
    {
      title: "Sections",
      url: "/home/sections",
      icon: Layers,
    },
    {
      title: "Elements",
      url: "/home/elements",
      icon: Grid2x2,
    },
    {
      title: "Components",
      url: "/home/building-components",
      icon: Blocks,
    },
    {
      title: "Conditions",
      url: "/home/conditions",
      icon: Award,
    },

    {
      title: "Settings",
      url: "/home/settings",
      icon: Settings2,
      items: [
        {
          title: "Data Management",
          url: "/home/settings",
        }
      ],
    },
  ]
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { currentTenant, tenants, loading, setCurrentTenant } = useTenant();

  const tenantsData = tenants.map((tenant: Tenant) => ({
    name: tenant.name,
    logo: Building2,
    createdAt: tenant.createdAt,
    createdBy: tenant.createdBy
  }));

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton size="lg">
                  <div className="p-2 flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                    <AppIcon color="white" />
                  </div>
                  <div className="grid flex-1 text-left text-sm leading-tight">
                    <span className="truncate font-semibold">
                      Survii - {loading ? <Skeleton className="h-4 w-24" /> : currentTenant?.name || "Personal"}
                    </span>
                    <span className="truncate text-xs">{process.env.NEXT_PUBLIC_APP_VERSION}</span>
                  </div>
                  <ChevronDown className="ml-auto h-4 w-4" />
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="start"
                className="w-[--radix-dropdown-menu-trigger-width]"
              >
                <DropdownMenuLabel>Switch Account</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className={!currentTenant ? "bg-accent text-accent-foreground" : ""}
                  onClick={() => setCurrentTenant(null)}
                >
                  <div className="flex items-center gap-2">
                    Personal Account
                  </div>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuLabel>Teams</DropdownMenuLabel>
                {tenantsData.map((tenant: Tenant) => (
                  <DropdownMenuItem
                    key={tenant.name}
                    className={
                      currentTenant?.name === tenant.name
                        ? "bg-accent text-accent-foreground"
                        : ""
                    }
                    onClick={() => setCurrentTenant(tenant)}
                  >
                    <div className="flex items-center gap-2">
                      <Building2 className="h-4 w-4" />
                      {tenant.name}
                    </div>
                  </DropdownMenuItem>
                ))}
                {tenants.length === 0 && (
                  <DropdownMenuItem disabled>
                    No teams available
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/home/tenants">Manage Teams</Link>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavSection label="Application" items={applicationNavData.items} />
        <NavSection label="Configuration" items={configurationNavData.items} />
        {/* <NavProjects projects={data.projects} /> */}
      </SidebarContent>
      <SidebarFooter>
        <NavUser />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
