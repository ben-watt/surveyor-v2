"use client"

import * as React from "react"
import {
  BookOpen,
  Bot,
  Frame,
  GalleryVerticalEnd,
  Layers,
  MapPin,
  Settings2,
  SquareTerminal,
  Worm,
} from "lucide-react"

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
      icon: BookOpen,
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
      icon: SquareTerminal,
    },
    {
      title: "Components",
      url: "/app/building-components",
      icon: Frame,
    },
    {
      title: "Conditions",
      url: "/app/conditions",
      icon: Bot,
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
                <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                  <Worm  className="size-4" />
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-semibold">Surveyor</span>
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
