/**
 * Inbound Email API Client
 * Handles all interactions with the Inbound v2 API
 */

// Base configuration
const API_BASE_URL = 'https://inbound.new/api/v2'
const API_KEY = process.env.NEXT_PUBLIC_INBOUND_API_KEY || ''

if (!API_KEY) {
  console.warn('⚠️ INBOUND_API_KEY not configured. API calls will fail.')
}

// Types based on v2 API specifications
export interface ThreadListItem {
  id: string
  rootMessageId: string
  normalizedSubject: string | null
  participantEmails: string[]
  messageCount: number
  lastMessageAt: Date
  createdAt: Date
  
  latestMessage: {
    id: string
    type: 'inbound' | 'outbound'
    subject: string | null
    fromText: string
    textPreview: string | null
    isRead: boolean
    hasAttachments: boolean
    date: Date | null
  } | null
  
  hasUnread: boolean
  isArchived: boolean
}

export interface ThreadsListResponse {
  threads: ThreadListItem[]
  pagination: {
    page: number
    limit: number
    total: number
    hasMore: boolean
  }
  filters: {
    search?: string
    unreadOnly?: boolean
    archivedOnly?: boolean
  }
}

export interface ThreadMessage {
  id: string
  messageId: string | null
  type: 'inbound' | 'outbound'
  threadPosition: number
  
  // Message content
  subject: string | null
  textBody: string | null
  htmlBody: string | null
  
  // Sender/recipient info
  from: string
  fromName: string | null
  fromAddress: string | null
  to: string[]
  cc: string[]
  bcc: string[]
  
  // Timestamps
  date: Date | null
  receivedAt: Date | null
  sentAt: Date | null
  
  // Message metadata
  isRead: boolean
  readAt: Date | null
  hasAttachments: boolean
  attachments: Array<{
    filename?: string
    contentType?: string
    size?: number
    contentId?: string
    contentDisposition?: string
  }>
  
  // Threading metadata
  inReplyTo: string | null
  references: string[]
  
  // Headers and tags
  headers: Record<string, any>
  tags: Array<{ name: string; value: string }>
  
  // Status (for sent emails)
  status?: 'pending' | 'sent' | 'failed'
  failureReason?: string | null
}

export interface ThreadDetails {
  id: string
  rootMessageId: string
  normalizedSubject: string | null
  participantEmails: string[]
  messageCount: number
  lastMessageAt: Date
  createdAt: Date
  updatedAt: Date
}

export interface GetThreadResponse {
  thread: ThreadDetails
  messages: ThreadMessage[]
  totalCount: number
}

export interface SendEmailRequest {
  from: string
  to: string | string[]
  subject: string
  text?: string
  html?: string
  cc?: string | string[]
  bcc?: string | string[]
  replyTo?: string | string[]
  headers?: Record<string, string>
  tags?: Array<{ name: string; value: string }>
}

export interface SendEmailResponse {
  id: string
  messageId: string
}

export interface ReplyEmailRequest {
  from: string
  to?: string | string[]
  subject?: string
  text?: string
  html?: string
  headers?: Record<string, string>
  replyAll?: boolean
  tags?: Array<{ name: string; value: string }>
}

export interface ReplyEmailResponse {
  id: string
  messageId: string
  awsMessageId: string
  repliedToEmailId: string
  repliedToThreadId?: string
  isThreadReply: boolean
}

export interface ThreadActionRequest {
  action: 'mark_as_read' | 'mark_as_unread' | 'archive' | 'unarchive'
}

export interface ThreadActionResponse {
  success: boolean
  action: string
  threadId: string
  affectedMessages?: number
  message?: string
}

/**
 * Main Inbound API Client Class
 */
export class InboundClient {
  private apiKey: string
  private baseUrl: string

  constructor(apiKey?: string, baseUrl?: string) {
    this.apiKey = apiKey || API_KEY
    this.baseUrl = baseUrl || API_BASE_URL
    
    if (!this.apiKey) {
      throw new Error('Inbound API key is required')
    }
  }

  /**
   * Make authenticated API request
   */
  private async makeRequest<T>(
    endpoint: string, 
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`
    
    const response = await fetch(url, {
      ...options,
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
        ...options.headers,
      },
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Unknown error' }))
      throw new Error(error.error || `HTTP ${response.status}: ${response.statusText}`)
    }

    return response.json()
  }

  // Threads API
  
  /**
   * Get list of email threads
   */
  async getThreads(params: {
    page?: number
    limit?: number
    search?: string
    unreadOnly?: boolean
    archivedOnly?: boolean
  } = {}): Promise<ThreadsListResponse> {
    const searchParams = new URLSearchParams()
    
    if (params.page) searchParams.set('page', params.page.toString())
    if (params.limit) searchParams.set('limit', params.limit.toString())
    if (params.search) searchParams.set('search', params.search)
    if (params.unreadOnly) searchParams.set('unread_only', 'true')
    if (params.archivedOnly) searchParams.set('archived_only', 'true')

    const query = searchParams.toString()
    const endpoint = `/threads${query ? `?${query}` : ''}`
    
    return this.makeRequest<ThreadsListResponse>(endpoint)
  }

  /**
   * Get specific thread with all messages
   */
  async getThread(threadId: string): Promise<GetThreadResponse> {
    return this.makeRequest<GetThreadResponse>(`/threads/${threadId}`)
  }

  /**
   * Perform action on a thread (mark as read, archive, etc.)
   */
  async performThreadAction(
    threadId: string, 
    action: ThreadActionRequest['action']
  ): Promise<ThreadActionResponse> {
    return this.makeRequest<ThreadActionResponse>(`/threads/${threadId}/actions`, {
      method: 'POST',
      body: JSON.stringify({ action })
    })
  }

  // Email Sending API

  /**
   * Send a new email
   */
  async sendEmail(emailData: SendEmailRequest): Promise<SendEmailResponse> {
    return this.makeRequest<SendEmailResponse>('/emails', {
      method: 'POST',
      body: JSON.stringify(emailData)
    })
  }

  /**
   * Reply to an email or thread
   */
  async replyToEmail(
    emailId: string, 
    replyData: ReplyEmailRequest
  ): Promise<ReplyEmailResponse> {
    return this.makeRequest<ReplyEmailResponse>(`/emails/${emailId}/reply-new`, {
      method: 'POST',
      body: JSON.stringify(replyData)
    })
  }

  // Utility Methods

  /**
   * Check if the client is properly configured
   */
  isConfigured(): boolean {
    return !!(this.apiKey && this.baseUrl)
  }

  /**
   * Get configuration info (for debugging)
   */
  getConfig() {
    return {
      hasApiKey: !!this.apiKey,
      baseUrl: this.baseUrl
    }
  }
}

// Export a default instance
export const inboundClient = new InboundClient()

// Export individual functions for convenience
export const getThreads = (params?: Parameters<typeof inboundClient.getThreads>[0]) => 
  inboundClient.getThreads(params)

export const getThread = (threadId: string) => 
  inboundClient.getThread(threadId)

export const sendEmail = (emailData: SendEmailRequest) => 
  inboundClient.sendEmail(emailData)

export const replyToEmail = (emailId: string, replyData: ReplyEmailRequest) => 
  inboundClient.replyToEmail(emailId, replyData)

export const performThreadAction = (threadId: string, action: ThreadActionRequest['action']) => 
  inboundClient.performThreadAction(threadId, action)
