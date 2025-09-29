"use client"

import * as React from "react"
import { useQuery } from "@tanstack/react-query"
import { getThreads, type ThreadListItem } from "@/lib/inbound"
import { cn } from "@/lib/utils"

interface ThreadsListProps {
  selectedThreadId?: string | null
  onThreadSelect?: (threadId: string) => void
  unreadOnly?: boolean
  searchQuery?: string
}

function ThreadItem({ 
  thread, 
  isSelected, 
  onClick 
}: { 
  thread: ThreadListItem
  isSelected: boolean
  onClick: () => void
}) {
  const latestMessage = thread.latestMessage
  const messageCount = thread.messageCount
  
  // Format the date
  const formatDate = (date: Date) => {
    const now = new Date()
    const diff = now.getTime() - new Date(date).getTime()
    const days = Math.floor(diff / (1000 * 60 * 60 * 24))
    
    if (days === 0) {
      return new Date(date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    } else if (days === 1) {
      return 'Yesterday'
    } else if (days < 7) {
      return `${days} days ago`
    } else {
      return new Date(date).toLocaleDateString()
    }
  }

  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full text-left p-4 border-b hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors",
        "flex flex-col items-start gap-2 text-sm leading-tight last:border-b-0",
        isSelected && "bg-sidebar-accent text-sidebar-accent-foreground",
        thread.hasUnread && "bg-blue-50 dark:bg-blue-950/20"
      )}
    >
      <div className="flex w-full items-center gap-2">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <span className={cn(
            "truncate font-medium",
            thread.hasUnread && "font-semibold"
          )}>
            {latestMessage?.fromText || 'Unknown Sender'}
          </span>
          {messageCount > 1 && (
            <span className="text-xs bg-muted text-muted-foreground px-1.5 py-0.5 rounded-full">
              {messageCount}
            </span>
          )}
        </div>
        <span className="text-xs text-muted-foreground shrink-0">
          {formatDate(thread.lastMessageAt)}
        </span>
      </div>
      
      <div className="w-full">
        <div className={cn(
          "font-medium mb-1 truncate",
          thread.hasUnread && "font-semibold"
        )}>
          {thread.normalizedSubject || latestMessage?.subject || 'No Subject'}
        </div>
        
        {latestMessage?.textPreview && (
          <div className="text-xs text-muted-foreground line-clamp-2 w-[260px] whitespace-break-spaces">
            {latestMessage.textPreview}
          </div>
        )}
      </div>
      
      <div className="flex items-center gap-2 w-full">
        {latestMessage?.hasAttachments && (
          <span className="text-xs text-muted-foreground">📎</span>
        )}
        {thread.hasUnread && (
          <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
        )}
      </div>
    </button>
  )
}

function ThreadsListSkeleton() {
  return (
    <div className="space-y-0">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="p-4 border-b space-y-2">
          <div className="flex items-center justify-between">
            <div className="h-4 bg-muted rounded w-32 animate-pulse" />
            <div className="h-3 bg-muted rounded w-16 animate-pulse" />
          </div>
          <div className="h-4 bg-muted rounded w-48 animate-pulse" />
          <div className="h-3 bg-muted rounded w-full animate-pulse" />
        </div>
      ))}
    </div>
  )
}

function ThreadsListError({ error, onRetry }: { error: Error; onRetry: () => void }) {
  return (
    <div className="p-4 text-center space-y-2">
      <div className="text-sm text-muted-foreground">
        Failed to load threads
      </div>
      <div className="text-xs text-red-500">
        {error.message}
      </div>
      <button
        onClick={onRetry}
        className="text-xs text-primary hover:underline"
      >
        Try again
      </button>
    </div>
  )
}

export function ThreadsList({ 
  selectedThreadId, 
  onThreadSelect, 
  unreadOnly = false,
  searchQuery 
}: ThreadsListProps) {
  const { 
    data, 
    isLoading, 
    error, 
    refetch 
  } = useQuery({
    queryKey: ['threads', { unreadOnly, search: searchQuery }],
    queryFn: () => getThreads({ 
      limit: 50,
      unreadOnly,
      search: searchQuery 
    }),
    refetchInterval: 30000, // Refetch every 30 seconds
    staleTime: 10000, // Consider data stale after 10 seconds
  })

  if (isLoading) {
    return <ThreadsListSkeleton />
  }

  if (error) {
    return <ThreadsListError error={error as Error} onRetry={() => refetch()} />
  }

  if (!data?.threads || data.threads.length === 0) {
    return (
      <div className="p-4 text-center text-sm text-muted-foreground">
        {unreadOnly ? 'No unread threads' : 'No threads found'}
      </div>
    )
  }

  return (
    <div className="space-y-0">
      {data.threads.map((thread) => (
        <ThreadItem
          key={thread.id}
          thread={thread}
          isSelected={selectedThreadId === thread.id}
          onClick={() => onThreadSelect?.(thread.id)}
        />
      ))}
      
      {data.pagination.hasMore && (
        <div className="p-4 text-center">
          <button className="text-xs text-primary hover:underline">
            Load more threads
          </button>
        </div>
      )}
    </div>
  )
}
