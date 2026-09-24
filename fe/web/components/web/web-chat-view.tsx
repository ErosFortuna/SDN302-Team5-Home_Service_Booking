'use client'

import { useEffect, useRef, useState } from 'react'
import {
  Send,
  Phone,
  Search,
  Check,
  CheckCheck,
  Wallet,
  Clock,
  ShieldCheck,
  MessageSquare,
  Sparkles,
  Info,
} from 'lucide-react'
import { useApp } from '../app-store'
import { formatVND, QUICK_REPLIES } from '@/lib/data'
import { Avatar, CtaButton } from '../shared'
import type { ChatMessage } from '@/lib/types'
import { cn } from '@/lib/utils'

export function WebChatView() {
  const { chat, sendMessage, role } = useApp()
  const [draft, setDraft] = useState('')
  const [accepted, setAccepted] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  const partner =
    role === 'customer'
      ? {
          name: 'AquaFix Plumbing',
          initials: 'AF',
          category: 'Điện nước',
          sub: 'Phản hồi trong vòng 5 phút',
          phone: '0908 123 456',
        }
      : {
          name: 'Alex Tran',
          initials: 'AT',
          category: 'Khách hàng',
          sub: 'Quận 1, TP.HCM',
          phone: '0912 987 654',
        }

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
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      <div className="overflow-hidden rounded-3xl border border-border bg-card shadow-lg flex flex-col md:flex-row h-[720px] max-h-[82vh]">
        {/* Left Column: Conversations List */}
        <div className="w-full md:w-80 lg:w-96 border-b md:border-b-0 md:border-r border-border bg-card/60 flex flex-col shrink-0">
          <div className="p-4 border-b border-border">
            <h2 className="text-lg font-black tracking-tight">Hộp thư tin nhắn</h2>
            <div className="mt-3 flex items-center gap-2 rounded-xl border border-border bg-background px-3 py-2 text-xs">
              <Search className="size-4 text-muted-foreground" />
              <input
                placeholder="Tìm đoạn hội thoại..."
                className="w-full bg-transparent outline-none placeholder:text-muted-foreground"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-border/60">
            {/* Active conversation */}
            <div className="flex items-start gap-3 p-4 bg-secondary/70 transition-colors cursor-pointer">
              <Avatar
                initials={partner.initials}
                className="size-11 shrink-0"
                color="bg-brand text-brand-foreground shadow-xs"
              />
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between">
                  <p className="truncate text-sm font-bold flex items-center gap-1">
                    {partner.name}
                    <ShieldCheck className="size-3.5 text-brand" />
                  </p>
                  <span className="text-[10px] text-muted-foreground">Vừa xong</span>
                </div>
                <p className="truncate text-xs text-muted-foreground mt-0.5">
                  {chat[chat.length - 1]?.text || 'Đã gửi báo giá dịch vụ'}
                </p>
                <div className="mt-1.5 flex items-center gap-1.5">
                  <span className="rounded-md bg-brand/10 px-1.5 py-0.5 text-[10px] font-bold text-brand">
                    {partner.category}
                  </span>
                  <span className="flex size-2 rounded-full bg-emerald-500" />
                  <span className="text-[10px] text-muted-foreground">Đang online</span>
                </div>
              </div>
            </div>

            {/* Inactive demo conversation 2 */}
            <div className="flex items-start gap-3 p-4 hover:bg-muted/40 transition-colors cursor-pointer opacity-70">
              <Avatar
                initials="BS"
                className="size-11 shrink-0"
                color="bg-secondary text-secondary-foreground"
              />
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between">
                  <p className="truncate text-sm font-bold">Bright Spark Electric</p>
                  <span className="text-[10px] text-muted-foreground">Hôm qua</span>
                </div>
                <p className="truncate text-xs text-muted-foreground mt-0.5">
                  Tôi có thể qua kiểm tra ổ cắm điện lúc 14:00 nhé.
                </p>
                <span className="mt-1.5 inline-block rounded-md bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                  Điện gia dụng
                </span>
              </div>
            </div>

            {/* Inactive demo conversation 3 */}
            <div className="flex items-start gap-3 p-4 hover:bg-muted/40 transition-colors cursor-pointer opacity-70">
              <Avatar
                initials="CB"
                className="size-11 shrink-0"
                color="bg-secondary text-secondary-foreground"
              />
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between">
                  <p className="truncate text-sm font-bold">CoolBreeze AC Care</p>
                  <span className="text-[10px] text-muted-foreground">3 ngày trước</span>
                </div>
                <p className="truncate text-xs text-muted-foreground mt-0.5">
                  Đã hoàn tất nạp gas và vệ sinh cục lạnh máy điều hòa.
                </p>
                <span className="mt-1.5 inline-block rounded-md bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                  Điện lạnh
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Active Chat Stream */}
        <div className="flex-1 flex flex-col min-w-0 bg-background">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-border bg-card/80 px-6 py-3.5 backdrop-blur-xs">
            <div className="flex items-center gap-3">
              <Avatar
                initials={partner.initials}
                className="size-10"
                color="bg-brand text-brand-foreground"
              />
              <div>
                <div className="flex items-center gap-1.5">
                  <h3 className="text-sm font-bold">{partner.name}</h3>
                  <ShieldCheck className="size-4 text-brand" />
                </div>
                <p className="text-xs text-brand font-medium flex items-center gap-1">
                  <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  {partner.sub}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <a
                href={`tel:${partner.phone}`}
                className="flex items-center gap-1.5 rounded-xl border border-border px-3 py-1.5 text-xs font-bold text-foreground hover:bg-muted transition-colors"
              >
                <Phone className="size-3.5 text-brand" />
                <span className="hidden sm:inline">{partner.phone}</span>
              </a>
            </div>
          </div>

          {/* Messages */}
          <div
            ref={scrollRef}
            className="flex-1 space-y-4 overflow-y-auto bg-muted/20 p-6"
          >
            <div className="flex justify-center">
              <span className="rounded-full bg-muted/80 px-3.5 py-1 text-[11px] font-medium text-muted-foreground">
                Hôm nay · Mã đơn: #BK-2026-09
              </span>
            </div>

            {chat.map((m) => (
              <WebChatMessageBubble
                key={m.id}
                message={m}
                role={role}
                accepted={accepted}
                onAccept={() => setAccepted(true)}
              />
            ))}
          </div>

          {/* Quick replies */}
          <div className="flex gap-2 overflow-x-auto no-scrollbar border-t border-border bg-card/60 px-5 py-2.5">
            {QUICK_REPLIES.map((q) => (
              <button
                key={q}
                onClick={() => sendMessage(q)}
                className="shrink-0 rounded-full border border-border bg-background px-3.5 py-1.5 text-xs font-semibold text-foreground transition-all hover:border-brand hover:text-brand hover:shadow-xs"
              >
                {q}
              </button>
            ))}
          </div>

          {/* Input Composer */}
          <div className="flex items-center gap-3 border-t border-border bg-card p-4">
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
              placeholder="Nhập tin nhắn trao đổi với thợ..."
              className="flex-1 rounded-2xl border border-border bg-background px-4 py-3 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/20 transition-all"
            />
            <button
              onClick={submit}
              disabled={!draft.trim()}
              aria-label="Gửi tin nhắn"
              className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-brand text-brand-foreground shadow-sm transition-transform active:scale-95 disabled:opacity-40 hover:brightness-110"
            >
              <Send className="size-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function WebChatMessageBubble({
  message,
  role,
  accepted,
  onAccept,
}: {
  message: ChatMessage
  role: 'customer' | 'provider'
  accepted: boolean
  onAccept: () => void
}) {
  const isMine = message.from === 'me'

  if (message.quote) {
    const total = message.quote.laborFee + message.quote.materialFee
    return (
      <div className={cn('flex', isMine ? 'justify-end' : 'justify-start')}>
        <div className="w-full max-w-md overflow-hidden rounded-3xl border border-border bg-card shadow-md">
          <div className="flex items-center justify-between bg-gradient-to-r from-brand to-teal-500 px-4 py-2.5 text-white">
            <div className="flex items-center gap-1.5 text-xs font-bold">
              <Wallet className="size-4" />
              Báo giá chi tiết từ Thợ
            </div>
            <span className="rounded-full bg-white/20 px-2 py-0.5 text-[10px] font-semibold">
              Chính thức
            </span>
          </div>

          <div className="p-4 space-y-3">
            <div className="grid grid-cols-2 gap-2 rounded-2xl bg-muted/50 p-3 text-xs">
              <div>
                <span className="text-muted-foreground block">Tiền công thợ</span>
                <span className="font-bold text-foreground">
                  {formatVND(message.quote.laborFee)}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground block">Chi phí vật tư</span>
                <span className="font-bold text-foreground">
                  {formatVND(message.quote.materialFee)}
                </span>
              </div>
            </div>

            <div className="flex items-center justify-between border-t border-border pt-2">
              <span className="text-sm font-bold">Tổng thanh toán:</span>
              <span className="text-xl font-black text-brand">
                {formatVND(total)}
              </span>
            </div>

            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Clock className="size-3.5 text-brand" />
              Thời gian có mặt:{' '}
              <span className="font-bold text-foreground">
                {message.quote.arrival}
              </span>
            </div>

            {role === 'customer' &&
              (accepted ? (
                <div className="flex items-center justify-center gap-1.5 rounded-2xl bg-brand/15 py-2.5 text-xs font-bold text-brand">
                  <Check className="size-4" /> Bạn đã chấp nhận báo giá này
                </div>
              ) : (
                <CtaButton onClick={onAccept} className="w-full py-2.5 rounded-2xl">
                  Chấp nhận báo giá này
                </CtaButton>
              ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={cn('flex', isMine ? 'justify-end' : 'justify-start')}>
      <div
        className={cn(
          'max-w-[70%] rounded-3xl px-4 py-3 text-sm shadow-xs leading-relaxed',
          isMine
            ? 'rounded-br-sm bg-brand text-brand-foreground'
            : 'rounded-bl-sm border border-border bg-card text-foreground',
        )}
      >
        <p>{message.text}</p>
        <div
          className={cn(
            'mt-1.5 flex items-center justify-end gap-1 text-[10px]',
            isMine ? 'text-brand-foreground/75' : 'text-muted-foreground',
          )}
        >
          {message.time}
          {isMine && <CheckCheck className="size-3.5" />}
        </div>
      </div>
    </div>
  )
}
