'use client'

import { useState } from 'react'
import {
  Sparkles,
  Zap,
  Droplets,
  WashingMachine,
  PaintRoller,
  Search,
  Star,
  ShieldCheck,
  MapPin,
  ArrowRight,
  CalendarCheck,
  MessageSquare,
  BadgeCheck,
  CheckCircle,
  type LucideIcon,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { CATEGORIES, PROVIDERS, formatVND } from '@/lib/data'
import { useApp } from '../app-store'
import type { ServiceCategory } from '@/lib/types'

const ICONS: Record<string, LucideIcon> = {
  Sparkles,
  Zap,
  Droplets,
  WashingMachine,
  PaintRoller,
}

function Hero() {
  const { openBookingFlow } = useApp()
  const [searchVal, setSearchVal] = useState('')

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    openBookingFlow()
  }

  return (
    <section className="relative overflow-hidden">
      <div className="pointer-events-none absolute -right-24 -top-24 h-96 w-96 rounded-full bg-brand/20 blur-3xl" />
      <div className="pointer-events-none absolute -left-24 top-32 h-80 w-80 rounded-full bg-cta/20 blur-3xl" />

      <div className="mx-auto grid max-w-6xl items-center gap-12 px-5 py-16 md:grid-cols-2 md:py-24">
        <div className="flex flex-col items-start gap-6">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-brand/30 bg-brand/10 px-3.5 py-1 text-xs font-bold text-brand">
            <ShieldCheck className="h-4 w-4" />
            Được tin dùng bởi hơn 25.000 hộ gia đình tại TP.HCM
          </span>
          <h1 className="text-balance text-4xl font-black leading-tight tracking-tight md:text-5xl lg:text-6xl">
            Dịch vụ sửa chữa tại nhà,{' '}
            <span className="text-brand">đặt lịch chỉ 1 phút</span>
          </h1>
          <p className="max-w-md text-pretty text-lg text-muted-foreground leading-relaxed">
            Kết nối thợ điện nước, dọn dẹp vệ sinh, điện lạnh uy tín đã qua xác minh.
            Nhận báo giá minh bạch, chat trao đổi trực tiếp và thanh toán an tâm.
          </p>

          <form
            onSubmit={handleSearch}
            className="flex w-full max-w-md items-center gap-2 rounded-2xl border border-border bg-card p-2 shadow-md transition-shadow hover:shadow-lg"
          >
            <div className="flex flex-1 items-center gap-2 pl-3">
              <Search className="h-5 w-5 shrink-0 text-muted-foreground" />
              <input
                value={searchVal}
                onChange={(e) => setSearchVal(e.target.value)}
                className="w-full bg-transparent py-2 text-sm outline-none placeholder:text-muted-foreground"
                placeholder="Tìm thợ dọn nhà, sửa ống nước, sửa máy lạnh..."
              />
            </div>
            <Button
              type="submit"
              className="rounded-xl bg-cta font-bold text-cta-foreground hover:brightness-105"
            >
              Tìm thợ
            </Button>
          </form>

          <div className="flex flex-wrap items-center gap-x-8 gap-y-3 pt-2">
            <Stat value="25k+" label="Khách hàng hài lòng" />
            <Stat value="1,200+" label="Thợ được xác minh" />
            <Stat value="4.9★" label="Đánh giá trung bình" />
          </div>
        </div>

        <div className="relative">
          <div className="rounded-[2.5rem] bg-gradient-to-br from-brand via-teal-600 to-emerald-700 p-8 text-white shadow-2xl">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-wider font-semibold opacity-90">
                  Thợ sẵn sàng phục vụ
                </p>
                <p className="mt-1 text-2xl font-black">Có mặt sau 30 phút</p>
              </div>
              <div className="flex size-10 items-center justify-center rounded-2xl bg-white/20">
                <CheckCircle className="size-5" />
              </div>
            </div>

            <div className="mt-6 space-y-3">
              {PROVIDERS.slice(0, 3).map((p) => (
                <div
                  key={p.id}
                  className="flex items-center gap-3 rounded-2xl bg-white/15 p-3.5 backdrop-blur-md transition-transform hover:scale-[1.02]"
                >
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/25 text-sm font-bold">
                    {p.avatar}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold">{p.name}</p>
                    <p className="truncate text-xs opacity-85">{p.tagline}</p>
                  </div>
                  <button
                    onClick={() => openBookingFlow(p.category as ServiceCategory)}
                    className="flex items-center gap-1 rounded-xl bg-cta px-3 py-1.5 text-xs font-bold text-cta-foreground hover:brightness-105"
                  >
                    <Star className="h-3.5 w-3.5 fill-current" />
                    {p.rating}
                  </button>
                </div>
              ))}
            </div>

            <div className="mt-6 pt-5 border-t border-white/20 flex items-center justify-between text-xs">
              <span className="opacity-90">Bảo hành dịch vụ 30 ngày</span>
              <button
                onClick={() => openBookingFlow()}
                className="font-bold underline underline-offset-4 hover:opacity-80"
              >
                Đặt dịch vụ ngay →
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div>
      <p className="text-2xl font-black text-foreground">{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  )
}

function Services() {
  const { openBookingFlow } = useApp()

  return (
    <section id="services" className="mx-auto max-w-6xl px-5 py-16">
      <div className="mb-10 flex flex-col items-center text-center">
        <h2 className="text-3xl font-extrabold tracking-tight">Danh mục dịch vụ phổ biến</h2>
        <p className="mt-2 text-muted-foreground">
          Mọi nhu cầu sửa chữa và bảo dưỡng nhà cửa của bạn đều có chuyên gia xử lý.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
        {CATEGORIES.map((cat) => {
          const Icon = ICONS[cat.icon] ?? Sparkles
          return (
            <button
              key={cat.name}
              onClick={() => openBookingFlow(cat.name as ServiceCategory)}
              className="group flex flex-col items-center gap-3 rounded-2xl border border-border bg-card p-6 text-center shadow-xs transition-all hover:-translate-y-1 hover:border-brand hover:shadow-lg"
            >
              <div
                className={`flex h-14 w-14 items-center justify-center rounded-2xl text-white transition-transform group-hover:scale-110 shadow-sm ${cat.tint}`}
              >
                <Icon className="h-7 w-7" />
              </div>
              <span className="text-sm font-bold">{cat.name}</span>
              <span className="text-[11px] text-muted-foreground">Đặt thợ ngay</span>
            </button>
          )
        })}
      </div>
    </section>
  )
}

const STEPS = [
  {
    icon: Search,
    title: '1. Đăng yêu cầu',
    desc: 'Mô tả sự cố bạn cần xử lý, chọn thời gian phù hợp và địa chỉ nhà.',
  },
  {
    icon: MessageSquare,
    title: '2. Nhận & So sánh báo giá',
    desc: 'Các thợ gần nhất sẽ gửi báo giá chi tiết. So sánh giá và chat trao đổi trực tiếp.',
  },
  {
    icon: CalendarCheck,
    title: '3. Chọn thợ & Hoàn tất',
    desc: 'Chấp nhận báo giá ưng ý, theo dõi thợ đến tận nhà sửa chữa và nghiệm thu hài lòng.',
  },
]

function HowItWorks() {
  return (
    <section id="how" className="bg-muted/40 py-16 border-y border-border/60">
      <div className="mx-auto max-w-6xl px-5">
        <div className="mb-12 flex flex-col items-center text-center">
          <h2 className="text-3xl font-extrabold tracking-tight">Quy trình đặt dịch vụ đơn giản</h2>
          <p className="mt-2 text-muted-foreground">
            3 bước nhanh chóng để ngôi nhà của bạn luôn hoàn hảo.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          {STEPS.map((step, i) => (
            <div
              key={step.title}
              className="relative rounded-2xl border border-border bg-card p-7 shadow-xs transition-all hover:shadow-md"
            >
              <span className="absolute right-6 top-6 text-5xl font-black text-muted/60 select-none">
                0{i + 1}
              </span>
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand/10 text-brand">
                <step.icon className="h-6 w-6" />
              </div>
              <h3 className="mt-5 text-lg font-bold">{step.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{step.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

function TopProviders() {
  const { openBookingFlow } = useApp()

  return (
    <section id="providers" className="mx-auto max-w-6xl px-5 py-16">
      <div className="mb-10 flex flex-col items-center text-center">
        <h2 className="text-3xl font-extrabold tracking-tight">
          Đội ngũ Thợ & Chuyên gia tiêu biểu
        </h2>
        <p className="mt-2 text-muted-foreground">
          Đã được kiểm tra tay nghề, hồ sơ lý lịch rõ ràng và đánh giá cao từ khách hàng.
        </p>
      </div>

      <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
        {PROVIDERS.map((p) => (
          <div
            key={p.id}
            className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-6 shadow-xs transition-all hover:-translate-y-1 hover:shadow-md"
          >
            <div className="flex items-start gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand/10 text-sm font-bold text-brand">
                {p.avatar}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <p className="truncate font-bold">{p.name}</p>
                  {p.verified && (
                    <BadgeCheck className="h-4 w-4 shrink-0 text-brand" />
                  )}
                </div>
                <p className="truncate text-xs text-muted-foreground">
                  {p.tagline}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-4 text-xs">
              <span className="flex items-center gap-1 font-bold">
                <Star className="h-4 w-4 fill-cta text-cta" />
                {p.rating}
                <span className="font-normal text-muted-foreground">
                  ({p.reviews} đánh giá)
                </span>
              </span>
              <span className="flex items-center gap-1 text-muted-foreground">
                <MapPin className="h-4 w-4" />
                {p.distanceKm} km
              </span>
            </div>

            <div className="flex items-center justify-between border-t border-border pt-4">
              <span className="rounded-full bg-secondary px-3 py-1 text-xs font-semibold text-secondary-foreground">
                {p.category}
              </span>
              <Button
                onClick={() => openBookingFlow(p.category as ServiceCategory)}
                size="sm"
                className="rounded-xl bg-cta font-bold text-cta-foreground hover:brightness-105"
              >
                Đặt thợ
                <ArrowRight className="ml-1 h-4 w-4" />
              </Button>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}

function ProCta() {
  const { setRole, setProviderTab } = useApp()

  const handleJoinPro = () => {
    setRole('provider')
    setProviderTab('jobs')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <section className="mx-auto max-w-6xl px-5 pb-20">
      <div className="relative overflow-hidden rounded-[2.5rem] bg-foreground px-8 py-14 text-background md:px-14 shadow-2xl">
        <div className="pointer-events-none absolute -right-16 -top-16 h-64 w-64 rounded-full bg-brand/30 blur-3xl" />
        <div className="relative flex flex-col items-start gap-6 md:max-w-xl">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-cta px-3 py-1 text-xs font-extrabold text-cta-foreground">
            Dành cho Thợ & Đối tác sửa chữa
          </span>
          <h2 className="text-3xl font-black tracking-tight md:text-4xl leading-tight">
            Tăng thu nhập ổn định cùng HomeHero
          </h2>
          <p className="text-background/80 leading-relaxed">
            Gia nhập mạng lưới hơn 1.200 thợ lành nghề. Nhận yêu cầu việc làm quanh khu vực của bạn,
            tự chủ báo giá và nhận thanh toán liền tay. Thu nhập trung bình lên đến{' '}
            <span className="font-bold text-cta">{formatVND(35000000)}/tháng</span>.
          </p>
          <Button
            onClick={handleJoinPro}
            size="lg"
            className="rounded-xl bg-brand font-bold text-brand-foreground hover:brightness-110 shadow-lg"
          >
            Chuyển sang Cổng Thợ nhận việc ngay
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </div>
    </section>
  )
}

function Footer() {
  return (
    <footer className="border-t border-border bg-muted/30">
      <div className="mx-auto max-w-6xl px-5 py-10">
        <div className="flex flex-col items-center justify-between gap-4 md:flex-row">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand text-brand-foreground">
              <Sparkles className="h-4 w-4" />
            </div>
            <span className="font-extrabold tracking-tight">HomeHero</span>
          </div>
          <p className="text-xs text-muted-foreground">
            © 2026 HomeHero. Nền tảng đặt dịch vụ sửa chữa gia đình hàng đầu.
          </p>
          <div className="flex gap-5 text-xs text-muted-foreground">
            <a href="#" className="hover:text-foreground">
              Chính sách bảo mật
            </a>
            <a href="#" className="hover:text-foreground">
              Điều khoản sử dụng
            </a>
            <a href="#" className="hover:text-foreground">
              Hỗ trợ khách hàng
            </a>
          </div>
        </div>
      </div>
    </footer>
  )
}

export function WebLanding() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <main>
        <Hero />
        <Services />
        <HowItWorks />
        <TopProviders />
        <ProCta />
      </main>
      <Footer />
    </div>
  )
}
