"use client"

import * as React from "react"
import { useQuery } from "@tanstack/react-query"
import { getThread, type ThreadMessage, type GetThreadResponse } from "@/lib/inbound"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { ReplyIcon, ReplyAllIcon, MoreHorizontalIcon } from "lucide-react"
import { cn } from "@/lib/utils"

interface ThreadDetailProps {
  threadId: string | null
  onReply?: (emailId: string, replyAll?: boolean) => void
}

function MessageItem({ 
  message, 
  onReply 
}: { 
  message: ThreadMessage
  onReply?: (emailId: string, replyAll?: boolean) => void
}) {
  const isInbound = message.type === 'inbound'
  
  // Format the date
  const formatDate = (date: Date) => {
    return new Date(date).toLocaleString([], {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  return (
    <div className={cn(
      "p-4 border rounded-lg space-y-3",
      isInbound ? "bg-background" : "bg-muted/30"
    )}>
      {/* Message header */}
      <div className="flex items-start justify-between">
        <div className="space-y-1 min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="font-medium text-sm">
              {isInbound ? (message.fromName || message.from) : 'You'}
            </span>
            <span className={cn(
              "text-xs px-2 py-0.5 rounded-full",
              isInbound 
                ? "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300" 
                : "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300"
            )}>
              {isInbound ? 'Received' : 'Sent'}
            </span>
          </div>
          
          <div className="text-xs text-muted-foreground">
            To: {Array.isArray(message.to) ? message.to.join(', ') : message.to}
          </div>
          
          <div className="text-xs text-muted-foreground">
            {formatDate(message.date || message.receivedAt || message.sentAt || new Date())}
          </div>
        </div>
        
        {isInbound && (
          <div className="flex items-center gap-1">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => onReply?.(message.id, false)}
              className="h-8 px-2"
            >
              <ReplyIcon className="size-3" />
              Reply
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => onReply?.(message.id, true)}
              className="h-8 px-2"
            >
              <ReplyAllIcon className="size-3" />
              Reply All
            </Button>
          </div>
        )}
      </div>

      {/* Message subject (if different from thread subject) */}
      {message.subject && (
        <div className="font-medium text-sm">
          {message.subject}
        </div>
      )}

      {/* Message content */}
      <div className="prose prose-sm max-w-none">
        {message.htmlBody ? (
          <div 
            dangerouslySetInnerHTML={{ __html: message.htmlBody }}
            className="text-sm leading-relaxed"
          />
        ) : message.textBody ? (
          <div className="text-sm leading-relaxed whitespace-pre-wrap">
            {message.textBody}
          </div>
        ) : (
          <div className="text-sm text-muted-foreground italic">
            No content available
          </div>
        )}
      </div>

      {/* Attachments */}
      {message.hasAttachments && message.attachments.length > 0 && (
        <div className="space-y-2">
          <Separator />
          <div className="text-xs font-medium text-muted-foreground">
            Attachments ({message.attachments.length})
          </div>
          <div className="flex flex-wrap gap-2">
            {message.attachments.map((attachment, index) => (
              <div
                key={index}
                className="flex items-center gap-2 p-2 bg-muted rounded text-xs"
              >
                <span>📎</span>
                <span className="font-medium">
                  {attachment.filename || 'Unnamed attachment'}
                </span>
                {attachment.size && (
                  <span className="text-muted-foreground">
                    ({Math.round(attachment.size / 1024)}KB)
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function ThreadDetailSkeleton() {
  return (
    <div className="space-y-4 p-4">
      {/* Thread header skeleton */}
      <div className="space-y-2">
        <div className="h-6 bg-muted rounded w-3/4 animate-pulse" />
        <div className="h-4 bg-muted rounded w-1/2 animate-pulse" />
      </div>
      
      <Separator />
      
      {/* Messages skeleton */}
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="p-4 border rounded-lg space-y-3">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <div className="h-4 bg-muted rounded w-32 animate-pulse" />
              <div className="h-3 bg-muted rounded w-48 animate-pulse" />
            </div>
            <div className="flex gap-1">
              <div className="h-8 bg-muted rounded w-16 animate-pulse" />
              <div className="h-8 bg-muted rounded w-20 animate-pulse" />
            </div>
          </div>
          <div className="space-y-2">
            <div className="h-4 bg-muted rounded w-full animate-pulse" />
            <div className="h-4 bg-muted rounded w-3/4 animate-pulse" />
            <div className="h-4 bg-muted rounded w-1/2 animate-pulse" />
          </div>
        </div>
      ))}
    </div>
  )
}

function ThreadDetailError({ error, onRetry }: { error: Error; onRetry: () => void }) {
  return (
    <div className="p-8 text-center space-y-4">
      <div className="text-muted-foreground">
        Failed to load thread
      </div>
      <div className="text-sm text-red-500">
        {error.message}
      </div>
      <Button onClick={onRetry} variant="outline" size="sm">
        Try again
      </Button>
    </div>
  )
}

export function ThreadDetail({ threadId, onReply }: ThreadDetailProps) {
  const { 
    data, 
    isLoading, 
    error, 
    refetch 
  } = useQuery({
    queryKey: ['thread', threadId],
    queryFn: () => getThread(threadId!),
    enabled: !!threadId,
    refetchInterval: 30000, // Refetch every 30 seconds
    staleTime: 10000, // Consider data stale after 10 seconds
  })

  if (!threadId) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground">
        Select a thread to view messages
      </div>
    )
  }

  if (isLoading) {
    return <ThreadDetailSkeleton />
  }

  if (error) {
    return <ThreadDetailError error={error as Error} onRetry={() => refetch()} />
  }

  if (!data) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground">
        Thread not found
      </div>
    )
  }

  const { thread, messages } = data

  return (
    <div className="flex flex-col h-full">
      {/* Thread header */}
      <div className="p-4 border-b space-y-2 bg-background">
        <h1 className="text-lg font-semibold">
          {thread.normalizedSubject || 'No Subject'}
        </h1>
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <span>{thread.messageCount} messages</span>
          <span>{thread.participantEmails.length} participants</span>
          <span>Last message: {new Date(thread.lastMessageAt).toLocaleDateString()}</span>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => (
          <MessageItem
            key={message.id}
            message={message}
            onReply={onReply}
          />
        ))}
      </div>
    </div>
  )
}
