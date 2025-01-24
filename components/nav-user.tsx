"use client"

import {
  BadgeCheck,
  Bell,
  ChevronsUpDown,
  CreditCard,
  LogOut,
  Router,
  Sparkles,
  UserRoundPen,
} from "lucide-react"

import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar"
import { useEffect, useState } from "react"
import { fetchUserAttributes, signOut } from "aws-amplify/auth"
import { getUrl } from "aws-amplify/storage"
import Link from "next/link"
import { useRouter } from "next/navigation"


export function NavUser() {
  const { isMobile } = useSidebar()
  const [profileHref, setProfileHref] = useState<string | undefined>()
  const [userAttributes, setUserAttributes] = useState<{
    name: string
    email: string
  }>({ name: "User", email: "user@example.com" })
  const router = useRouter()
  useEffect(() => {
    async function getProfilePic() {
      try {
        const attributes = await fetchUserAttributes()
        setUserAttributes({
          name: attributes.name || "User",
          email: attributes.email || "user@example.com"
        })
        
        const pPic = attributes?.profile
        if (pPic) {
          const presignedUrl = await getUrl({
            path: pPic,
          })
          setProfileHref(presignedUrl.url.href)
        }
      } catch (error) {
        console.error("Failed to fetch user profile picture", error)
      }
    }

    getProfilePic()
  }, [])

  const handleSignOut = () => {
    signOut()
    router.push("/")
  }

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
            >
              <Avatar className="h-8 w-8 rounded-lg">
                <AvatarImage src={profileHref} alt={userAttributes.name} />
                <AvatarFallback className="rounded-lg">
                  {userAttributes.name.substring(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-semibold">{userAttributes.name}</span>
                <span className="truncate text-xs">{userAttributes.email}</span>
              </div>
              <ChevronsUpDown className="ml-auto size-4" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-lg"
            side={isMobile ? "bottom" : "right"}
            align="end"
            sideOffset={4}
          >
            <DropdownMenuLabel className="p-0 font-normal">
              <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                <Avatar className="h-8 w-8 rounded-lg">
                  <AvatarImage src={profileHref} alt={userAttributes.name} />
                  <AvatarFallback className="rounded-lg">
                    {userAttributes.name.substring(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-semibold">{userAttributes.name}</span>
                  <span className="truncate text-xs">{userAttributes.email}</span>
                </div>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuItem disabled>
                <Sparkles className="mr-2 h-4 w-4" />
                Upgrade to Pro
              </DropdownMenuItem>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuItem disabled>
                <BadgeCheck className="mr-2 h-4 w-4" />
                Account
              </DropdownMenuItem>
              <DropdownMenuItem disabled>
                <CreditCard className="mr-2 h-4 w-4" />
                Billing
              </DropdownMenuItem>
              <DropdownMenuItem disabled>
                <Bell className="mr-2 h-4 w-4" />
                Notifications
              </DropdownMenuItem>
              <Link href="/app/profile">
                <DropdownMenuItem>
                  <UserRoundPen  className="mr-2 h-4 w-4" />
                  Profile
                </DropdownMenuItem>
              </Link>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleSignOut}>
                <LogOut className="mr-2 h-4 w-4" />
                Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}
