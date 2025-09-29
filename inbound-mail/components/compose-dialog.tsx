"use client"

import * as React from "react"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { sendEmail, replyToEmail, type SendEmailRequest, type ReplyEmailRequest } from "@/lib/inbound"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { SendIcon, XIcon } from "lucide-react"
import { cn } from "@/lib/utils"

interface ComposeDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  mode: 'compose' | 'reply'
  replyData?: {
    emailId: string
    originalSubject?: string
    originalSender?: string
    replyAll?: boolean
  }
}

export function ComposeDialog({
  open,
  onOpenChange,
  mode,
  replyData
}: ComposeDialogProps) {
  const queryClient = useQueryClient()
  const [isHtmlMode, setIsHtmlMode] = React.useState(false)
  
  // Form state
  const [formData, setFormData] = React.useState({
    to: '',
    cc: '',
    bcc: '',
    subject: '',
    body: ''
  })

  // Reset form when dialog opens/closes or mode changes
  React.useEffect(() => {
    if (mode === 'reply' && replyData) {
      setFormData({
        to: replyData.originalSender || '',
        cc: '',
        bcc: '',
        subject: replyData.originalSubject?.startsWith('Re: ') 
          ? replyData.originalSubject 
          : `Re: ${replyData.originalSubject || 'No Subject'}`,
        body: ''
      })
    } else {
      setFormData({
        to: '',
        cc: '',
        bcc: '',
        subject: '',
        body: ''
      })
    }
  }, [mode, replyData, open])

  // Send email mutation
  const sendEmailMutation = useMutation({
    mutationFn: async (data: SendEmailRequest) => {
      return await sendEmail(data)
    },
    onSuccess: () => {
      // Invalidate threads query to refresh the list
      queryClient.invalidateQueries({ queryKey: ['threads'] })
      onOpenChange(false)
      // Reset form
      setFormData({ to: '', cc: '', bcc: '', subject: '', body: '' })
    },
    onError: (error) => {
      console.error('Failed to send email:', error)
    }
  })

  // Reply email mutation
  const replyEmailMutation = useMutation({
    mutationFn: async (data: { emailId: string; replyData: ReplyEmailRequest }) => {
      return await replyToEmail(data.emailId, data.replyData)
    },
    onSuccess: () => {
      // Invalidate both threads and specific thread queries
      queryClient.invalidateQueries({ queryKey: ['threads'] })
      if (replyData?.emailId) {
        queryClient.invalidateQueries({ queryKey: ['thread'] })
      }
      onOpenChange(false)
      // Reset form
      setFormData({ to: '', cc: '', bcc: '', subject: '', body: '' })
    },
    onError: (error) => {
      console.error('Failed to send reply:', error)
    }
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    const fromEmail = process.env.NEXT_PUBLIC_INBOUND_EMAIL || 'user@example.com'
    
    if (mode === 'reply' && replyData?.emailId) {
      const replyPayload: ReplyEmailRequest = {
        from: fromEmail,
        ...(formData.to && { to: formData.to }),
        subject: formData.subject,
        [isHtmlMode ? 'html' : 'text']: formData.body,
        replyAll: replyData.replyAll || false
      }
      
      replyEmailMutation.mutate({
        emailId: replyData.emailId,
        replyData: replyPayload
      })
    } else {
      const emailPayload: SendEmailRequest = {
        from: fromEmail,
        to: formData.to,
        subject: formData.subject,
        [isHtmlMode ? 'html' : 'text']: formData.body,
        ...(formData.cc && { cc: formData.cc }),
        ...(formData.bcc && { bcc: formData.bcc })
      }
      
      sendEmailMutation.mutate(emailPayload)
    }
  }

  const isLoading = sendEmailMutation.isPending || replyEmailMutation.isPending
  const error = sendEmailMutation.error || replyEmailMutation.error

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>
            {mode === 'reply' ? 'Reply to Email' : 'Compose New Email'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 space-y-4">
          {/* To field */}
          <div className="space-y-2">
            <Label htmlFor="to">To</Label>
            <Input
              id="to"
              type="email"
              placeholder="recipient@example.com"
              value={formData.to}
              onChange={(e) => setFormData(prev => ({ ...prev, to: e.target.value }))}
              required={mode === 'compose'}
              disabled={mode === 'reply'} // Don't allow changing recipient in reply mode
            />
          </div>

          {/* CC/BCC fields (only for compose mode) */}
          {mode === 'compose' && (
            <>
              <div className="space-y-2">
                <Label htmlFor="cc">CC (optional)</Label>
                <Input
                  id="cc"
                  type="email"
                  placeholder="cc@example.com"
                  value={formData.cc}
                  onChange={(e) => setFormData(prev => ({ ...prev, cc: e.target.value }))}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="bcc">BCC (optional)</Label>
                <Input
                  id="bcc"
                  type="email"
                  placeholder="bcc@example.com"
                  value={formData.bcc}
                  onChange={(e) => setFormData(prev => ({ ...prev, bcc: e.target.value }))}
                />
              </div>
            </>
          )}

          {/* Subject field */}
          <div className="space-y-2">
            <Label htmlFor="subject">Subject</Label>
            <Input
              id="subject"
              placeholder="Email subject"
              value={formData.subject}
              onChange={(e) => setFormData(prev => ({ ...prev, subject: e.target.value }))}
              required
            />
          </div>

          {/* Content mode toggle */}
          <div className="flex items-center space-x-2">
            <Switch
              id="html-mode"
              checked={isHtmlMode}
              onCheckedChange={setIsHtmlMode}
            />
            <Label htmlFor="html-mode" className="text-sm">
              HTML Mode
            </Label>
          </div>

          {/* Message body */}
          <div className="space-y-2 flex-1">
            <Label htmlFor="body">Message</Label>
            <Textarea
              id="body"
              placeholder={isHtmlMode ? "Enter HTML content..." : "Type your message..."}
              value={formData.body}
              onChange={(e) => setFormData(prev => ({ ...prev, body: e.target.value }))}
              required
              className="min-h-[200px] resize-none"
            />
          </div>

          {/* Error display */}
          {error && (
            <div className="text-sm text-red-500 p-2 bg-red-50 dark:bg-red-900/20 rounded">
              {error.message}
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-between pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
            >
              Cancel
            </Button>
            
            <Button
              type="submit"
              disabled={isLoading || !formData.to || !formData.subject || !formData.body}
              className="gap-2"
            >
              {isLoading ? (
                <>
                  <div className="size-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <SendIcon className="size-4" />
                  {mode === 'reply' ? 'Send Reply' : 'Send Email'}
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
