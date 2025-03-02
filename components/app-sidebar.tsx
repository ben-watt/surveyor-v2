"use client"

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
} from "lucide-react"
import { AppIcon } from "@/app/app/components/AppIcon"

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
import { useTenant } from "@/app/app/contexts/TenantContext"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Skeleton } from "@/components/ui/skeleton"

const applicationNavData = {
  items: [
    {
      title: "Surveys",
      url: "/app/surveys",
      icon: NotebookPen,
      isActive: true,
    },
    {
      title: "Tenants",
      url: "/app/tenants",
      icon: Building2,
    },
  ]
}

const configurationNavData = {
  items: [
    {
      title: "Sections",
      url: "/app/sections",
      icon: Layers,
    },
    {
      title: "Elements",
      url: "/app/elements",
      icon: Grid2x2,
    },
    {
      title: "Components",
      url: "/app/building-components",
      icon: Blocks,
    },
    {
      title: "Conditions",
      url: "/app/conditions",
      icon: Award,
    },

    {
      title: "Settings",
      url: "/app/settings",
      icon: Settings2,
      items: [
        {
          title: "Data Management",
          url: "/app/settings",
        }
      ],
    },
  ]
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { currentTenant, tenants, loading, setCurrentTenant } = useTenant();

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <Link href="/">
                <div className="p-2 flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                  <AppIcon color="white" />
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-semibold">Survii</span>
                  <span className="truncate text-xs">v0.0.1</span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
          
          {/* Tenant Selector */}
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton size="lg" className="mt-2">
                  <div className="p-2 flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-accent text-sidebar-accent-foreground">
                    <Building2 className="h-4 w-4" />
                  </div>
                  <div className="grid flex-1 text-left text-sm leading-tight">
                    {loading ? (
                      <Skeleton className="h-4 w-24" />
                    ) : (
                      <>
                        <span className="truncate font-semibold">
                          {currentTenant?.name || "No Tenant"}
                        </span>
                        <span className="truncate text-xs">
                          {tenants.length} {tenants.length === 1 ? "tenant" : "tenants"}
                        </span>
                      </>
                    )}
                  </div>
                  <ChevronDown className="ml-auto h-4 w-4" />
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="start"
                className="w-[--radix-dropdown-menu-trigger-width]"
              >
                <DropdownMenuLabel>Switch Tenant</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {tenants.map((tenant) => (
                  <DropdownMenuItem
                    key={tenant.id}
                    className={
                      currentTenant?.id === tenant.id
                        ? "bg-accent text-accent-foreground"
                        : ""
                    }
                    onClick={() => setCurrentTenant(tenant)}
                  >
                    {tenant.name}
                  </DropdownMenuItem>
                ))}
                {tenants.length === 0 && (
                  <DropdownMenuItem disabled>
                    No tenants available
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/app/tenants">Manage Tenants</Link>
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
