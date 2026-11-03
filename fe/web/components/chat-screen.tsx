'use client'

import { useEffect, useRef, useState } from 'react'
import {
  Send,
  Phone,
  MoreVertical,
  Check,
  CheckCheck,
  Wallet,
  Clock,
} from 'lucide-react'
import { useApp } from './app-store'
import { formatVND, QUICK_REPLIES } from '@/lib/utils'
import { Avatar, CtaButton } from './shared'
import type { ChatMessage, Role } from '@/lib/types'
import { cn } from '@/lib/utils'

export function ChatScreen() {
  const { chat, sendMessage, role } = useApp()
  const [draft, setDraft] = useState('')
  const [accepted, setAccepted] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  const partner =
    role === 'customer'
      ? { name: 'Thợ dịch vụ', initials: 'TH', sub: 'Thường phản hồi sau 5 phút' }
      : { name: 'Khách hàng', initials: 'KH', sub: 'Khách hàng · TP.HCM' }

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: 'smooth',
    })
  }, [chat])

  const submit = () => {
    const text = draft.trim()
    if (!text) return
    sendMessage(text)
    setDraft('')
  }

  return (
    <div className="flex h-full flex-col">
      {/* Chat header */}
      <div className="flex items-center gap-3 border-b border-border bg-card px-4 py-3">
        <Avatar
          initials={partner.initials}
          className="size-10"
          color="bg-secondary text-secondary-foreground"
        />
        <div className="flex-1">
          <p className="text-sm font-bold">{partner.name}</p>
          <p className="flex items-center gap-1 text-xs text-brand">
            <span className="size-1.5 rounded-full bg-brand" />
            {partner.sub}
          </p>
        </div>
        <button className="flex size-9 items-center justify-center rounded-xl text-muted-foreground hover:bg-muted">
          <Phone className="size-4" />
        </button>
        <button className="flex size-9 items-center justify-center rounded-xl text-muted-foreground hover:bg-muted">
          <MoreVertical className="size-4" />
        </button>
      </div>

      {/* Messages */}
      <div
        ref={scrollRef}
        className="flex-1 space-y-3 overflow-y-auto bg-muted/30 px-4 py-4"
      >
        <p className="mx-auto w-fit rounded-full bg-muted px-3 py-1 text-[10px] font-medium text-muted-foreground">
          Today
        </p>
        {chat.map((m) => (
          <MessageBubble
            key={m.id}
            message={m}
            role={role}
            accepted={accepted}
            onAccept={() => setAccepted(true)}
          />
        ))}
      </div>

      {/* Quick replies */}
      <div className="flex gap-2 overflow-x-auto no-scrollbar border-t border-border bg-card px-4 py-2.5">
        {QUICK_REPLIES.map((q) => (
          <button
            key={q}
            onClick={() => sendMessage(q)}
            className="shrink-0 rounded-full border border-border bg-background px-3 py-1.5 text-xs font-semibold text-foreground transition-colors hover:border-brand hover:text-brand"
          >
            {q}
          </button>
        ))}
      </div>

      {/* Composer */}
      <div className="flex items-center gap-2 border-t border-border bg-card px-3 py-2.5">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (
              e.key === 'Enter' &&
              !e.nativeEvent.isComposing &&
              e.keyCode !== 229
            ) {
              e.preventDefault()
              submit()
            }
          }}
          placeholder="Type a message..."
          className="flex-1 rounded-full border border-border bg-background px-4 py-2.5 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
        />
        <button
          onClick={submit}
          disabled={!draft.trim()}
          aria-label="Send"
          className="flex size-10 shrink-0 items-center justify-center rounded-full bg-brand text-brand-foreground transition-transform active:scale-95 disabled:opacity-40"
        >
          <Send className="size-4" />
        </button>
      </div>
    </div>
  )
}

function MessageBubble({
  message,
  role,
  accepted,
  onAccept,
}: {
  message: ChatMessage
  role: Role
  accepted: boolean
  onAccept: () => void
}) {
  const mine = message.from === 'me'

  return (
    <div className={cn('flex', mine ? 'justify-end' : 'justify-start')}>
      <div
        className={cn(
          'max-w-[78%] rounded-2xl px-3.5 py-2.5 text-sm shadow-sm',
          mine
            ? 'rounded-br-md bg-brand text-brand-foreground'
            : 'rounded-bl-md bg-card text-card-foreground',
        )}
      >
        <p className="leading-snug">{message.text}</p>
        <div
          className={cn(
            'mt-1 flex items-center justify-end gap-0.5 text-[10px]',
            mine ? 'text-brand-foreground/70' : 'text-muted-foreground',
          )}
        >
          {message.time}
          {mine && <CheckCheck className="size-3" />}
        </div>
      </div>
    </div>
  )
}
