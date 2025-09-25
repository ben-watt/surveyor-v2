import * as React from "react"
import {
  NotebookPen,
  Settings2,
  Building2,
  ChevronDown,
  FileText,
  Settings,
  RefreshCw,
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
      title: "Configuration",
      url: "/home/configuration",
      icon: Settings,
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
  const { currentTenant, tenants, loading, setCurrentTenant, refreshTenants, isServingStaleData, error } = useTenant();
  const [isRefreshing, setIsRefreshing] = React.useState(false);

  const tenantsData = tenants.map((tenant: Tenant) => ({
    name: tenant.name,
    logo: Building2,
    createdAt: tenant.createdAt,
    createdBy: tenant.createdBy
  }));

  const handleRefreshTenants = async () => {
    setIsRefreshing(true);
    try {
      await refreshTenants();
    } catch (err) {
      console.error('Failed to refresh tenants:', err);
    } finally {
      setIsRefreshing(false);
    }
  };

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton size="lg">
                  <div className="p-2 flex aspect-square size-8 items-center justify-center rounded-lg bg-gradient-to-br from-gray-900 to-purple-800 text-white shadow-sm">
                    <AppIcon color="white" />
                  </div>
                  <div className="grid flex-1 text-left text-sm leading-tight">
                    <span className="truncate font-semibold bg-gradient-to-r from-gray-900 to-blue-800 bg-clip-text text-transparent">
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
                <DropdownMenuLabel className="flex items-center justify-between">
                  <span>Switch Account</span>
                  <button
                    onClick={handleRefreshTenants}
                    disabled={isRefreshing || loading}
                    className="p-1 rounded-sm hover:bg-accent hover:text-accent-foreground disabled:opacity-50"
                    title="Refresh organizations"
                  >
                    <RefreshCw className={`h-3 w-3 ${isRefreshing ? 'animate-spin' : ''}`} />
                  </button>
                </DropdownMenuLabel>
                {(isServingStaleData || error) && (
                  <div className="px-2 py-1 text-xs text-muted-foreground border-b">
                    {error ? error : "Showing cached data"}
                  </div>
                )}
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
                {tenants.length === 0 && !loading && (
                  <DropdownMenuItem disabled>
                    {error ? "Unable to load teams" : "No teams available"}
                  </DropdownMenuItem>
                )}
                {loading && (
                  <DropdownMenuItem disabled>
                    <div className="flex items-center gap-2">
                      <RefreshCw className="h-3 w-3 animate-spin" />
                      Loading teams...
                    </div>
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
