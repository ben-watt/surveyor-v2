"use client"

import * as React from "react"
import {
  Award,
  Blocks,
  Grid2x2,
  Layers,
  NotebookPen,
  Settings2,
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

const applicationNavData = {
  items: [
    {
      title: "Surveys",
      url: "/app/surveys",
      icon: NotebookPen,
      isActive: true,
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
