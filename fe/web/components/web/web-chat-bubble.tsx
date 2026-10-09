'use client'

import { useEffect, useRef, useState } from 'react'
import {
  MessageCircle,
  X,
  Send,
  Phone,
  Search,
  Check,
  CheckCheck,
  Wallet,
  Clock,
  ShieldCheck,
  Maximize2,
  Minimize2,
  Minus,
  Sparkles,
  ChevronDown,
  Layers,
  ArrowLeft,
  Wrench,
  Zap,
  Wind,
} from 'lucide-react'
import { useApp } from '../app-store'
import { formatVND, QUICK_REPLIES } from '@/lib/data'
import { Avatar, CtaButton } from '../shared'
import type { ChatMessage, Role } from '@/lib/types'
import { cn } from '@/lib/utils'

interface ChatPartner {
  id: string
  name: string
  initials: string
  category: string
  sub: string
  phone: string
  icon: typeof Wrench
  color: string
  lastMessage: string
  lastTime: string
  online: boolean
}

export function WebChatBubble() {
  const {
    chat,
    sendMessage,
    role,
    chatBubbleOpen,
    setChatBubbleOpen,
    toggleChatBubble,
    activePartnerId,
    setActivePartnerId,
    chatBubbleExpanded,
    setChatBubbleExpanded,
  } = useApp()

  const [draft, setDraft] = useState('')
  const [accepted, setAccepted] = useState(false)
  const [showCallout, setShowCallout] = useState(true)
  const [showConversationsList, setShowConversationsList] = useState(false)
  const [searchConv, setSearchConv] = useState('')
  const scrollRef = useRef<HTMLDivElement>(null)

  const partners: ChatPartner[] =
    role === 'customer'
      ? [
          {
            id: 'aquafix',
            name: 'AquaFix Plumbing',
            initials: 'AF',
            category: 'Điện nước',
            sub: 'Phản hồi trong vòng 5 phút',
            phone: '0908 123 456',
            icon: Wrench,
            color: 'bg-brand text-brand-foreground',
            lastMessage:
              chat[chat.length - 1]?.text || 'Đã gửi báo giá dịch vụ #BK-2026-09',
            lastTime: 'Vừa xong',
            online: true,
          },
          {
            id: 'brightspark',
            name: 'Bright Spark Electric',
            initials: 'BS',
            category: 'Điện gia dụng',
            sub: 'Đang online',
            phone: '0933 456 789',
            icon: Zap,
            color: 'bg-amber-500 text-white',
            lastMessage: 'Tôi có thể qua kiểm tra ổ cắm điện lúc 14:00 nhé.',
            lastTime: 'Hôm qua',
            online: true,
          },
          {
            id: 'coolbreeze',
            name: 'CoolBreeze AC Care',
            initials: 'CB',
            category: 'Điện lạnh',
            sub: 'Hoạt động 3h trước',
            phone: '0918 789 012',
            icon: Wind,
            color: 'bg-blue-500 text-white',
            lastMessage: 'Đã hoàn tất nạp gas và vệ sinh cục lạnh máy điều hòa.',
            lastTime: '3 ngày trước',
            online: false,
          },
        ]
      : [
          {
            id: 'alex',
            name: 'Alex Tran',
            initials: 'AT',
            category: 'Khách hàng',
            sub: 'Quận 1, TP.HCM',
            phone: '0912 987 654',
            icon: ShieldCheck,
            color: 'bg-brand text-brand-foreground',
            lastMessage:
              chat[chat.length - 1]?.text || 'Cần thợ kiểm tra gấp trong chiều nay',
            lastTime: 'Vừa xong',
            online: true,
          },
        ]

  const currentPartner =
    partners.find((p) => p.id === activePartnerId) || partners[0]

  useEffect(() => {
    if (chatBubbleOpen && !showConversationsList) {
      scrollRef.current?.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior: 'smooth',
      })
    }
  }, [chat, chatBubbleOpen, showConversationsList])

  const submit = () => {
    const text = draft.trim()
    if (!text) return
    sendMessage(text)
    setDraft('')
  }

  const filteredPartners = partners.filter((p) =>
    p.name.toLowerCase().includes(searchConv.toLowerCase()) ||
    p.category.toLowerCase().includes(searchConv.toLowerCase()),
  )

  const vietnameseQuickReplies = [
    'Đồng ý báo giá!',
    'Mấy giờ thợ có thể đến?',
    'Giá này đã gồm linh kiện chưa?',
    'Tôi sẽ gửi thêm ảnh thực tế',
    'Cảm ơn bạn nhiều!',
  ]

  return (
    <>
      {/* Floating Chat Bubble Launcher & Callout Widget */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3 pointer-events-none">
        {/* Floating Callout Preview Bubble (When closed) */}
        {!chatBubbleOpen && showCallout && (
          <div className="pointer-events-auto relative max-w-xs sm:max-w-sm rounded-2xl border border-border/80 bg-card/95 p-3.5 shadow-2xl backdrop-blur-md animate-in fade-in slide-in-from-bottom-3 duration-300">
            <button
              onClick={() => setShowCallout(false)}
              className="absolute -top-2 -left-2 flex size-6 items-center justify-center rounded-full border border-border bg-background text-muted-foreground shadow-sm hover:text-foreground hover:bg-muted transition-colors"
              title="Đóng thông báo"
            >
              <X className="size-3.5" />
            </button>
            <div
              onClick={() => {
                setShowCallout(false)
                setChatBubbleOpen(true)
              }}
              className="flex items-start gap-3 cursor-pointer group"
            >
              <Avatar
                initials={currentPartner.initials}
                className="size-10 shrink-0 ring-2 ring-brand/30"
                color={currentPartner.color}
              />
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-1">
                  <span className="truncate text-xs font-bold text-foreground group-hover:text-brand transition-colors">
                    {currentPartner.name}
                  </span>
                  <span className="shrink-0 rounded-full bg-brand/10 px-1.5 py-0.2 text-[9px] font-bold text-brand">
                    Mới
                  </span>
                </div>
                <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
                  {currentPartner.lastMessage}
                </p>
                <div className="mt-1 flex items-center gap-1 text-[10px] font-semibold text-brand">
                  <Sparkles className="size-3" />
                  <span>Nhấn để mở bong bóng chat</span>
                </div>
              </div>
            </div>

            {/* Little arrow indicator pointing to bubble */}
            <div className="absolute -bottom-2 right-6 size-4 rotate-45 border-b border-r border-border/80 bg-card" />
          </div>
        )}

        {/* Circular Floating Chat Bubble Button */}
        <button
          onClick={() => {
            setShowCallout(false)
            toggleChatBubble()
          }}
          aria-label={chatBubbleOpen ? 'Đóng bong bóng chat' : 'Mở bong bóng chat'}
          className={cn(
            'pointer-events-auto group relative flex items-center justify-center rounded-full shadow-2xl transition-all duration-300 active:scale-95',
            'bg-gradient-to-tr from-brand via-teal-500 to-cyan-400 text-white',
            'size-14 sm:size-16 ring-4 ring-brand/20 shadow-brand/40',
            chatBubbleOpen
              ? 'rotate-90 shadow-xl'
              : 'hover:scale-110 hover:shadow-brand/60',
          )}
        >
          {chatBubbleOpen ? (
            <X className="size-6 sm:size-7 transition-transform group-hover:rotate-90" />
          ) : (
            <div className="relative flex items-center justify-center">
              <MessageCircle className="size-7 sm:size-8" />
              {/* Pulsing notification dot */}
              <span className="absolute -top-1 -right-1 flex size-3">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-cta opacity-75" />
                <span className="relative inline-flex size-3 rounded-full bg-cta border-2 border-background" />
              </span>
            </div>
          )}

          {/* Unread count badge */}
          {!chatBubbleOpen && (
            <span className="absolute -top-1.5 -left-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-cta px-1.5 text-[10px] font-black text-cta-foreground shadow-md ring-2 ring-background animate-bounce">
              1
            </span>
          )}
        </button>
      </div>

      {/* Floating Interactive Chat Window (Bong bóng chat pop-up) */}
      {chatBubbleOpen && (
        <div
          className={cn(
            'fixed z-50 flex flex-col overflow-hidden rounded-3xl border border-border/80 bg-card/95 backdrop-blur-xl shadow-2xl shadow-black/20 transition-all duration-300 animate-in fade-in zoom-in-95',
            chatBubbleExpanded
              ? 'bottom-4 right-4 left-4 sm:left-auto sm:right-6 sm:bottom-6 sm:w-[720px] md:w-[820px] h-[calc(100vh-48px)] sm:h-[660px]'
              : 'bottom-24 right-4 sm:right-6 w-[calc(100vw-32px)] sm:w-[420px] md:w-[450px] h-[580px] max-h-[calc(100vh-120px)]',
          )}
        >
          {/* Header Bar */}
          <div className="flex items-center justify-between border-b border-border bg-card/90 px-4 py-3 backdrop-blur-md">
            <div className="flex items-center gap-2.5 min-w-0">
              {showConversationsList ? (
                <button
                  onClick={() => setShowConversationsList(false)}
                  className="flex size-8 items-center justify-center rounded-xl border border-border text-foreground hover:bg-muted transition-colors mr-1"
                  title="Quay lại hội thoại"
                >
                  <ArrowLeft className="size-4" />
                </button>
              ) : null}

              <div className="relative">
                <Avatar
                  initials={currentPartner.initials}
                  className="size-10 ring-2 ring-brand/30 shrink-0"
                  color={currentPartner.color}
                />
                {currentPartner.online && (
                  <span className="absolute bottom-0 right-0 size-2.5 rounded-full bg-emerald-500 ring-2 ring-background" />
                )}
              </div>

              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <h3 className="truncate text-sm font-extrabold text-foreground">
                    {showConversationsList ? 'Hộp thư tin nhắn' : currentPartner.name}
                  </h3>
                  {!showConversationsList && (
                    <ShieldCheck className="size-3.5 text-brand shrink-0" />
                  )}
                </div>
                <p className="truncate text-[11px] text-muted-foreground flex items-center gap-1">
                  {showConversationsList ? (
                    'Chọn người cần liên hệ'
                  ) : (
                    <>
                      <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      <span>{currentPartner.sub}</span>
                    </>
                  )}
                </p>
              </div>
            </div>

            {/* Header Actions */}
            <div className="flex items-center gap-1 text-muted-foreground">
              {/* Switch conversation list toggle */}
              <button
                onClick={() => setShowConversationsList((prev) => !prev)}
                className={cn(
                  'flex size-8 items-center justify-center rounded-xl border border-transparent transition-colors',
                  showConversationsList
                    ? 'bg-secondary text-brand font-bold'
                    : 'hover:bg-muted hover:text-foreground',
                )}
                title="Danh sách hội thoại"
              >
                <Layers className="size-4" />
              </button>

              {/* Call button */}
              {!showConversationsList && (
                <a
                  href={`tel:${currentPartner.phone}`}
                  className="flex size-8 items-center justify-center rounded-xl hover:bg-muted hover:text-brand transition-colors"
                  title={`Gọi ${currentPartner.phone}`}
                >
                  <Phone className="size-4" />
                </a>
              )}

              {/* Expand / Minimize Window size */}
              <button
                onClick={() => setChatBubbleExpanded((prev) => !prev)}
                className="hidden sm:flex size-8 items-center justify-center rounded-xl hover:bg-muted hover:text-foreground transition-colors"
                title={chatBubbleExpanded ? 'Thu nhỏ cửa sổ' : 'Phóng to cửa sổ'}
              >
                {chatBubbleExpanded ? (
                  <Minimize2 className="size-4" />
                ) : (
                  <Maximize2 className="size-4" />
                )}
              </button>

              {/* Minimize to bubble */}
              <button
                onClick={() => setChatBubbleOpen(false)}
                className="flex size-8 items-center justify-center rounded-xl hover:bg-muted hover:text-foreground transition-colors"
                title="Thu nhỏ thành bong bóng"
              >
                <Minus className="size-4" />
              </button>

              {/* Close */}
              <button
                onClick={() => setChatBubbleOpen(false)}
                className="flex size-8 items-center justify-center rounded-xl hover:bg-destructive/10 hover:text-destructive transition-colors"
                title="Đóng bong bóng chat"
              >
                <X className="size-4" />
              </button>
            </div>
          </div>

          {/* Body Content */}
          {showConversationsList ? (
            /* Conversations Switcher View */
            <div className="flex-1 flex flex-col min-h-0 bg-background/50">
              <div className="p-3 border-b border-border">
                <div className="flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-2 text-xs">
                  <Search className="size-4 text-muted-foreground" />
                  <input
                    value={searchConv}
                    onChange={(e) => setSearchConv(e.target.value)}
                    placeholder="Tìm kiếm thợ hoặc đoạn chat..."
                    className="w-full bg-transparent outline-none placeholder:text-muted-foreground"
                  />
                  {searchConv && (
                    <button onClick={() => setSearchConv('')}>
                      <X className="size-3 text-muted-foreground hover:text-foreground" />
                    </button>
                  )}
                </div>
              </div>

              <div className="flex-1 overflow-y-auto divide-y divide-border/60">
                {filteredPartners.map((p) => {
                  const isActive = p.id === currentPartner.id
                  return (
                    <div
                      key={p.id}
                      onClick={() => {
                        setActivePartnerId(p.id)
                        setShowConversationsList(false)
                      }}
                      className={cn(
                        'flex items-start gap-3 p-3.5 transition-colors cursor-pointer',
                        isActive
                          ? 'bg-secondary/70'
                          : 'hover:bg-muted/50 text-foreground',
                      )}
                    >
                      <div className="relative">
                        <Avatar
                          initials={p.initials}
                          className="size-10 shrink-0"
                          color={p.color}
                        />
                        {p.online && (
                          <span className="absolute bottom-0 right-0 size-2.5 rounded-full bg-emerald-500 ring-2 ring-background" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between">
                          <p className="truncate text-xs font-bold text-foreground flex items-center gap-1">
                            {p.name}
                            <ShieldCheck className="size-3 text-brand" />
                          </p>
                          <span className="text-[10px] text-muted-foreground">
                            {p.lastTime}
                          </span>
                        </div>
                        <p className="truncate text-xs text-muted-foreground mt-0.5">
                          {p.lastMessage}
                        </p>
                        <div className="mt-1 flex items-center gap-2">
                          <span className="rounded-md bg-brand/10 px-1.5 py-0.2 text-[9px] font-bold text-brand">
                            {p.category}
                          </span>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          ) : (
            /* Active Chat Stream View */
            <div className="flex-1 flex flex-col min-h-0 bg-background/50">
              {/* Booking Context Banner */}
              <div className="flex items-center justify-between border-b border-border bg-muted/40 px-4 py-2 text-xs">
                <span className="text-muted-foreground flex items-center gap-1.5 font-medium truncate">
                  <span className="size-2 rounded-full bg-brand" />
                  Đơn #BK-2026-09 · Sửa rò rỉ bồn rửa chén
                </span>
                <span className="shrink-0 rounded-full bg-brand/15 px-2 py-0.5 text-[10px] font-bold text-brand">
                  Đang trao đổi
                </span>
              </div>

              {/* Messages list */}
              <div
                ref={scrollRef}
                className="flex-1 space-y-3.5 overflow-y-auto p-4"
              >
                <div className="flex justify-center">
                  <span className="rounded-full bg-muted/90 px-3 py-0.5 text-[10px] font-medium text-muted-foreground">
                    Hôm nay · Trao đổi bảo đảm trên HomeHero
                  </span>
                </div>

                {chat.map((m) => (
                  <BubbleMessageItem
                    key={m.id}
                    message={m}
                    role={role}
                    partner={currentPartner}
                    accepted={accepted}
                    onAccept={() => setAccepted(true)}
                  />
                ))}
              </div>

              {/* Quick replies carousel */}
              <div className="flex gap-1.5 overflow-x-auto no-scrollbar border-t border-border bg-card/70 px-3 py-2">
                {(role === 'customer' ? vietnameseQuickReplies : QUICK_REPLIES).map(
                  (q) => (
                    <button
                      key={q}
                      onClick={() => sendMessage(q)}
                      className="shrink-0 rounded-full border border-border bg-background px-3 py-1 text-xs font-semibold text-foreground transition-all hover:border-brand hover:text-brand hover:bg-secondary/40 active:scale-95 shadow-2xs"
                    >
                      {q}
                    </button>
                  ),
                )}
              </div>

              {/* Input Composer */}
              <div className="flex items-center gap-2 border-t border-border bg-card p-3">
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
                  className="flex-1 rounded-2xl border border-border bg-background px-3.5 py-2.5 text-xs sm:text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/20 transition-all placeholder:text-muted-foreground"
                />
                <button
                  onClick={submit}
                  disabled={!draft.trim()}
                  aria-label="Gửi tin nhắn"
                  className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-brand text-brand-foreground shadow-sm transition-transform active:scale-95 disabled:opacity-40 hover:brightness-110"
                >
                  <Send className="size-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </>
  )
}

function BubbleMessageItem({
  message,
  role,
  partner,
  accepted,
  onAccept,
}: {
  message: ChatMessage
  role: Role
  partner: ChatPartner
  accepted: boolean
  onAccept: () => void
}) {
  const isMine = message.from === 'me'

  // Quote Card Bubble
  if (message.quote) {
    const total = message.quote.laborFee + message.quote.materialFee
    return (
      <div className={cn('flex', isMine ? 'justify-end' : 'justify-start')}>
        <div className="w-full max-w-[340px] sm:max-w-md overflow-hidden rounded-2xl border border-border bg-card shadow-md animate-in fade-in zoom-in-95 duration-200">
          <div className="flex items-center justify-between bg-gradient-to-r from-brand to-teal-500 px-3.5 py-2 text-white">
            <div className="flex items-center gap-1.5 text-xs font-bold">
              <Wallet className="size-3.5" />
              Báo giá chi tiết từ Thợ
            </div>
            <span className="rounded-full bg-white/20 px-2 py-0.5 text-[9px] font-bold">
              Chính thức
            </span>
          </div>

          <div className="p-3.5 space-y-2.5">
            <div className="grid grid-cols-2 gap-2 rounded-xl bg-muted/50 p-2.5 text-xs">
              <div>
                <span className="text-muted-foreground block text-[11px]">Tiền công thợ</span>
                <span className="font-bold text-foreground">
                  {formatVND(message.quote.laborFee)}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground block text-[11px]">Chi phí vật tư</span>
                <span className="font-bold text-foreground">
                  {formatVND(message.quote.materialFee)}
                </span>
              </div>
            </div>

            <div className="flex items-center justify-between border-t border-border pt-1.5">
              <span className="text-xs font-bold text-muted-foreground">Tổng thanh toán:</span>
              <span className="text-base sm:text-lg font-black text-brand">
                {formatVND(total)}
              </span>
            </div>

            <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
              <Clock className="size-3 text-brand" />
              Thời gian có mặt:{' '}
              <span className="font-bold text-foreground">
                {message.quote.arrival}
              </span>
            </div>

            {role === 'customer' &&
              (accepted ? (
                <div className="flex items-center justify-center gap-1.5 rounded-xl bg-brand/15 py-2 text-xs font-bold text-brand">
                  <Check className="size-3.5" /> Bạn đã chấp nhận báo giá này
                </div>
              ) : (
                <CtaButton onClick={onAccept} className="w-full py-2 rounded-xl text-xs">
                  Chấp nhận báo giá này
                </CtaButton>
              ))}
          </div>
        </div>
      </div>
    )
  }

  // Standard Text Message Bubble
  return (
    <div
      className={cn(
        'flex items-end gap-2',
        isMine ? 'justify-end' : 'justify-start',
      )}
    >
      {!isMine && (
        <Avatar
          initials={partner.initials}
          className="size-7 shrink-0 mb-1"
          color={partner.color}
        />
      )}
      <div
        className={cn(
          'max-w-[78%] rounded-2xl px-3.5 py-2.5 text-xs sm:text-sm shadow-2xs leading-relaxed transition-all',
          isMine
            ? 'rounded-br-xs bg-brand text-brand-foreground'
            : 'rounded-bl-xs border border-border/80 bg-card text-foreground',
        )}
      >
        <p className="whitespace-pre-wrap break-words">{message.text}</p>
        <div
          className={cn(
            'mt-1 flex items-center justify-end gap-1 text-[9px]',
            isMine ? 'text-brand-foreground/75' : 'text-muted-foreground',
          )}
        >
          <span>{message.time}</span>
          {isMine && <CheckCheck className="size-3" />}
        </div>
      </div>
    </div>
  )
}
