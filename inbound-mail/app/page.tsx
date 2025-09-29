"use client"

import * as React from "react"
import { AppSidebar } from "@/components/app-sidebar"
import { ThreadDetail } from "@/components/thread-detail"
import { ComposeDialog } from "@/components/compose-dialog"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { Separator } from "@/components/ui/separator"
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar"

export default function Page() {
  const [selectedThreadId, setSelectedThreadId] = React.useState<string | null>(null)
  const [composeDialogOpen, setComposeDialogOpen] = React.useState(false)
  const [replyData, setReplyData] = React.useState<{
    emailId: string
    originalSubject?: string
    originalSender?: string
    replyAll?: boolean
  } | null>(null)

  // Handle thread selection
  const handleThreadSelect = (threadId: string) => {
    setSelectedThreadId(threadId)
  }

  // Handle compose new email
  const handleComposeClick = () => {
    setReplyData(null)
    setComposeDialogOpen(true)
  }

  // Handle reply to email
  const handleReply = (emailId: string, replyAll: boolean = false) => {
    // TODO: Get original email data for proper reply context
    setReplyData({
      emailId,
      replyAll
    })
    setComposeDialogOpen(true)
  }

  return (
    <SidebarProvider
      style={
        {
          "--sidebar-width": "350px",
        } as React.CSSProperties
      }
    >
      <AppSidebar 
        selectedThreadId={selectedThreadId}
        onThreadSelect={handleThreadSelect}
        onComposeClick={handleComposeClick}
      />
      <SidebarInset>
        <header className="bg-background sticky top-0 flex shrink-0 items-center gap-2 border-b p-4 z-10">
          <SidebarTrigger className="-ml-1" />
          <Separator
            orientation="vertical"
            className="mr-2 data-[orientation=vertical]:h-4"
          />
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem className="hidden md:block">
                <BreadcrumbLink href="#">Inbound Mail</BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator className="hidden md:block" />
              <BreadcrumbItem>
                <BreadcrumbPage>
                  {selectedThreadId ? 'Thread' : 'Inbox'}
                </BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </header>
        
        <div className="flex-1 overflow-hidden">
          <ThreadDetail 
            threadId={selectedThreadId}
            onReply={handleReply}
          />
        </div>
      </SidebarInset>

      {/* Compose/Reply Dialog */}
      <ComposeDialog
        open={composeDialogOpen}
        onOpenChange={setComposeDialogOpen}
        mode={replyData ? 'reply' : 'compose'}
        replyData={replyData || undefined}
      />
    </SidebarProvider>
  )
}
