"use client"

import * as React from "react"
import { Command, Inbox, PlusIcon } from "lucide-react"
import { ThreadsList } from "@/components/threads-list"
import { NavUser } from "@/components/nav-user"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarInput,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar"
import { Switch } from "@/components/ui/switch"

// User data from environment
const userData = {
  name: "User",
  email: process.env.NEXT_PUBLIC_INBOUND_EMAIL || "user@example.com",
  avatar: "/avatars/user.jpg",
}

interface AppSidebarProps extends React.ComponentProps<typeof Sidebar> {
  selectedThreadId?: string | null
  onThreadSelect?: (threadId: string) => void
  onComposeClick?: () => void
}

export function AppSidebar({ 
  selectedThreadId, 
  onThreadSelect, 
  onComposeClick,
  ...props 
}: AppSidebarProps) {
  const { setOpen } = useSidebar()
  const [showUnreadsOnly, setShowUnreadsOnly] = React.useState(false)

  return (
    <Sidebar
      collapsible="icon"
      className="overflow-hidden *:data-[sidebar=sidebar]:flex-row"
      {...props}
    >
      {/* Navigation sidebar */}
      <Sidebar
        collapsible="none"
        className="w-[calc(var(--sidebar-width-icon)+1px)]! border-r"
      >
        <SidebarHeader>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton size="lg" asChild className="md:h-8 md:p-0">
                <a href="#">
                  <div className="bg-sidebar-primary text-sidebar-primary-foreground flex aspect-square size-8 items-center justify-center rounded-lg">
                    <Command className="size-4" />
                  </div>
                  <div className="grid flex-1 text-left text-sm leading-tight">
                    <span className="truncate font-medium">Inbound Mail</span>
                    <span className="truncate text-xs">Client</span>
                  </div>
                </a>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarHeader>
        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupContent className="px-1.5 md:px-0">
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton
                    tooltip={{
                      children: "Inbox",
                      hidden: false,
                    }}
                    onClick={() => setOpen(true)}
                    isActive={true}
                    className="px-2.5 md:px-2"
                  >
                    <Inbox />
                    <span>Inbox</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
        <SidebarFooter>
          <NavUser user={userData} />
        </SidebarFooter>
      </Sidebar>

      {/* Threads list sidebar */}
      <Sidebar collapsible="none" className="hidden flex-1 md:flex">
        <SidebarHeader className="gap-3.5 border-b p-4">
          <div className="flex w-full items-center justify-between">
            <div className="text-foreground text-base font-medium">
              Inbox
            </div>
            <div className="flex items-center gap-2">
              <Label className="flex items-center gap-2 text-sm">
                <span>Unreads</span>
                <Switch 
                  className="shadow-none" 
                  checked={showUnreadsOnly}
                  onCheckedChange={setShowUnreadsOnly}
                />
              </Label>
              <Button 
                size="sm" 
                variant="outline"
                onClick={onComposeClick}
                className="gap-1"
              >
                <PlusIcon className="size-3" />
                Compose
              </Button>
            </div>
          </div>
          <SidebarInput placeholder="Search threads..." />
        </SidebarHeader>
        <SidebarContent>
          <SidebarGroup className="px-0">
            <SidebarGroupContent>
              <ThreadsList 
                selectedThreadId={selectedThreadId}
                onThreadSelect={onThreadSelect}
                unreadOnly={showUnreadsOnly}
              />
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
      </Sidebar>
    </Sidebar>
  )
}
