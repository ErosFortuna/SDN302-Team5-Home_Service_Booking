"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import {
  Sparkles,
  Zap,
  Droplets,
  Wind,
  Monitor,
  WashingMachine,
  PaintRoller,
  Search,
  Star,
  MapPin,
  ArrowRight,
  CalendarCheck,
  MessageSquare,
  BadgeCheck,
  BriefcaseBusiness,
  CalendarDays,
  Eye,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface LandingProvider {
  id: string;
  name: string;
  avatar: string;
  rating: number | null;
  reviews: number;
  completedJobs: number;
  experienceYears: number;
  city: string | null;
  distanceKm: number | null;
}

interface ProviderSearchItem {
  providerId?: string;
  fullName?: string;
  businessName?: string;
  averageRating?: number;
  reviewCount?: number;
  completedJobCount?: number;
  yearsOfExperience?: number;
  city?: string | null;
  distanceKm?: number | null;
}

function useTopProviders(accessToken: string | null) {
  const [providers, setProviders] = useState<LandingProvider[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    if (!accessToken) {
      setProviders([]);
      setLoading(false);
      setHasError(false);
      return;
    }

    const controller = new AbortController();
    const apiBaseUrl =
      process.env.NEXT_PUBLIC_API_URL ||
      process.env.NEXT_PUBLIC_API_BASE_URL ||
      'http://localhost:5173/api';
    const loadProviders = async () => {
      setLoading(true);
      setHasError(false);
      setProviders([]);

      try {
        const response = await fetch(
          `${apiBaseUrl.replace(/\/$/, '')}/providers/search?limit=6`,
          {
            headers: { Authorization: `Bearer ${accessToken}` },
            signal: controller.signal,
          },
        );
        if (!response.ok) {
          throw new Error(`Provider search failed with status ${response.status}`);
        }

        const result: { success?: boolean; data?: ProviderSearchItem[] } =
          await response.json();
        if (!result.success || !Array.isArray(result.data)) {
          throw new Error("Invalid provider search response");
        }

        setProviders(
          result.data.flatMap((provider) => {
            const id = provider.providerId;
            const name = provider.businessName || provider.fullName;
            if (!id || !name) return [];

            return [{
              id,
              name,
              avatar: name.slice(0, 2).toUpperCase(),
              rating: typeof provider.averageRating === "number" &&
                Number.isFinite(provider.averageRating)
                ? provider.averageRating
                : null,
              reviews: typeof provider.reviewCount === "number" &&
                Number.isFinite(provider.reviewCount)
                ? provider.reviewCount
                : 0,
              completedJobs: typeof provider.completedJobCount === "number" &&
                Number.isFinite(provider.completedJobCount)
                ? provider.completedJobCount
                : 0,
              experienceYears: typeof provider.yearsOfExperience === "number" &&
                Number.isFinite(provider.yearsOfExperience)
                ? provider.yearsOfExperience
                : 0,
              city: provider.city || null,
              distanceKm: typeof provider.distanceKm === "number" &&
                Number.isFinite(provider.distanceKm)
                ? Math.round(provider.distanceKm * 10) / 10
                : null,
            }];
          }),
        );
      } catch (requestError) {
        if (controller.signal.aborted) return;
        console.error("Could not load homepage providers:", requestError);
        setHasError(true);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    };

    void loadProviders();
    return () => controller.abort();
  }, [accessToken, reloadKey]);

  return {
    providers,
    loading,
    hasError,
    reload: () => setReloadKey((key) => key + 1),
  };
}
import { useApp } from "../app-store";
import type { ServiceCategory } from "@/lib/types";

const ICONS: Record<string, LucideIcon> = {
  cleaning: Sparkles,
  electrical: Zap,
  plumbing: Droplets,
  appliance: WashingMachine,
  "air-conditioning": Wind,
  "air conditioning": Wind,
  painting: PaintRoller,
  "pc-building": Monitor,
  "pc building": Monitor,
};

const CATEGORY_TINTS = [
  "bg-teal-500",
  "bg-amber-500",
  "bg-sky-500",
  "bg-violet-500",
  "bg-rose-500",
];

function Hero() {
  const { openBookingFlow, openServiceSearch } = useApp();
  const [searchVal, setSearchVal] = useState("");

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    openServiceSearch(searchVal.trim());
  };

  return (
    <section className="relative overflow-hidden">
      <div className="pointer-events-none absolute -right-24 -top-24 h-96 w-96 rounded-full bg-brand/20 blur-3xl" />
      <div className="pointer-events-none absolute -left-24 top-32 h-80 w-80 rounded-full bg-cta/20 blur-3xl" />

      <div className="mx-auto grid max-w-6xl items-center gap-12 px-5 py-16 md:grid-cols-2 md:py-24">
        <div className="flex flex-col items-start gap-6">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-brand/30 bg-brand/10 px-3.5 py-1 text-xs font-bold text-brand">
            <CalendarDays className="h-4 w-4" />
            Dịch vụ tại nhà theo lịch hẹn của bạn
          </span>
          <h1 className="text-balance text-4xl font-black leading-tight tracking-tight md:text-5xl lg:text-6xl">
            Tìm thợ dịch vụ tại nhà{" "}
            <span className="text-brand">phù hợp với bạn</span>
          </h1>
          <p className="max-w-md text-pretty text-lg text-muted-foreground leading-relaxed">
            Chọn dịch vụ, gửi yêu cầu và chọn thời gian phù hợp. Xem thông tin
            hồ sơ, kinh nghiệm và đánh giá của thợ trước khi đặt lịch.
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

          <div className="flex flex-wrap gap-3 pt-2">
            <span className="inline-flex items-center gap-2 rounded-full bg-muted px-3 py-2 text-xs font-semibold text-muted-foreground">
              <Eye className="h-4 w-4 text-brand" />
              Xem thông tin thợ
            </span>
            <span className="inline-flex items-center gap-2 rounded-full bg-muted px-3 py-2 text-xs font-semibold text-muted-foreground">
              <CalendarDays className="h-4 w-4 text-brand" />
              Chọn ngày và giờ
            </span>
          </div>
        </div>

        <div className="relative min-h-[24rem] overflow-hidden rounded-[2.5rem] bg-gradient-to-br from-brand via-teal-600 to-emerald-700 text-white shadow-2xl md:min-h-[31rem]">
          <Image
            src="/home-service-illustration.svg"
            alt="Minh họa thợ dịch vụ đang sửa chữa tại nhà"
            fill
            priority
            sizes="(max-width: 768px) 100vw, 50vw"
            className="object-cover object-center"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/85 via-slate-950/15 to-transparent" />
          <div className="absolute inset-x-0 bottom-0 p-6 sm:p-8">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-white/80">
              Home Service Booking
            </p>
            <h2 className="mt-2 max-w-sm text-2xl font-black leading-tight sm:text-3xl">
              Chăm sóc ngôi nhà theo cách của bạn
            </h2>
            <p className="mt-2 max-w-md text-sm leading-relaxed text-white/85">
              Tìm dịch vụ cần thiết, chọn thời gian phù hợp và theo dõi lịch hẹn
              ngay trên nền tảng.
            </p>
            <button
              onClick={() => openBookingFlow()}
              className="mt-5 rounded-xl bg-cta px-4 py-2.5 text-sm font-bold text-cta-foreground transition hover:brightness-105"
            >
              Khám phá dịch vụ
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}

function Services() {
  const { openBookingFlow, serviceCategories } = useApp();

  return (
    <section id="services" className="mx-auto max-w-6xl px-5 py-16">
      <div className="mb-10 flex flex-col items-center text-center">
        <h2 className="text-3xl font-extrabold tracking-tight">
          Danh mục dịch vụ phổ biến
        </h2>
        <p className="mt-2 text-muted-foreground">
          Mọi nhu cầu sửa chữa và bảo dưỡng nhà cửa của bạn đều có chuyên gia xử
          lý.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
        {serviceCategories.slice(0, 5).map((cat, index) => {
          const Icon =
            ICONS[cat.slug] ?? ICONS[cat.name.toLowerCase()] ?? Sparkles;
          return (
            <button
              key={cat.id}
              onClick={() => openBookingFlow(cat.name)}
              className="group flex flex-col items-center gap-3 rounded-2xl border border-border bg-card p-6 text-center shadow-xs transition-all hover:-translate-y-1 hover:border-brand hover:shadow-lg"
            >
              <div
                className={`flex h-14 w-14 items-center justify-center rounded-2xl text-white transition-transform group-hover:scale-110 shadow-sm ${CATEGORY_TINTS[index % CATEGORY_TINTS.length]}`}
              >
                <Icon className="h-7 w-7" />
              </div>
              <span className="text-sm font-bold">{cat.name}</span>
              <span className="text-[11px] text-muted-foreground">
                Đặt thợ ngay
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}

const STEPS = [
  {
    icon: Search,
    title: "1. Đăng yêu cầu",
    desc: "Mô tả sự cố bạn cần xử lý, chọn thời gian phù hợp và địa chỉ nhà.",
  },
  {
    icon: MessageSquare,
    title: "2. Gợi ý & Chọn thợ phù hợp",
    desc: "Hệ thống gợi ý các thợ tối ưu theo tay nghề, vị trí và lịch rảnh. Bạn chọn 1 thợ phù hợp.",
  },
  {
    icon: CalendarCheck,
    title: "3. Chọn thợ & Hoàn tất",
    desc: "Thợ xác nhận lịch hẹn, đến tận nhà sửa chữa chu đáo và nghiệm thu hài lòng.",
  },
];

function HowItWorks() {
  return (
    <section id="how" className="bg-muted/40 py-16 border-y border-border/60">
      <div className="mx-auto max-w-6xl px-5">
        <div className="mb-12 flex flex-col items-center text-center">
          <h2 className="text-3xl font-extrabold tracking-tight">
            Quy trình đặt dịch vụ đơn giản
          </h2>
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
              <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
                {step.desc}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function TopProviders() {
  const { accessToken, isLoggedIn, openAuthModal, openProviderProfile } = useApp();
  const { providers, loading, hasError, reload } = useTopProviders(accessToken);

  return (
    <section id="providers" className="mx-auto max-w-6xl px-5 py-16">
      <div className="mb-10 flex flex-col items-center text-center">
        <h2 className="text-3xl font-extrabold tracking-tight">
          Thợ dịch vụ đã xác minh
        </h2>
        <p className="mt-2 text-muted-foreground">
          Xem hồ sơ, kinh nghiệm và đánh giá từ khách hàng nếu đã có trước khi lựa chọn.
        </p>
      </div>

      {!accessToken ? (
        <div className="mx-auto flex max-w-xl flex-col items-center gap-4 rounded-2xl border border-border bg-card p-8 text-center">
          <p className="text-sm text-muted-foreground">
            {isLoggedIn
              ? "Đang tải phiên đăng nhập để hiển thị danh sách thợ."
              : "Đăng nhập để xem danh sách thợ đã xác minh."}
          </p>
          {!isLoggedIn && (
            <Button
              onClick={() => openAuthModal("login")}
              className="rounded-xl bg-cta font-bold text-cta-foreground hover:brightness-105"
            >
              Đăng nhập
            </Button>
          )}
        </div>
      ) : loading ? (
        <p className="py-8 text-center text-sm text-muted-foreground">
          Đang tải danh sách thợ...
        </p>
      ) : hasError ? (
        <div className="flex flex-col items-center gap-3 py-8 text-center">
          <p className="text-sm text-muted-foreground">
            Chưa thể tải danh sách thợ. Vui lòng thử lại.
          </p>
          <Button onClick={reload} variant="outline" className="rounded-xl">
            Tải lại
          </Button>
        </div>
      ) : providers.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">
          Hiện chưa có hồ sơ thợ phù hợp để hiển thị.
        </p>
      ) : (
      <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
        {providers.map((p) => (
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
                  <BadgeCheck className="h-4 w-4 shrink-0 text-brand" />
                </div>
                <p className="truncate text-xs text-muted-foreground">
                  {p.city || "Khu vực chưa được cập nhật"}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-4 text-xs">
              {p.reviews > 0 && p.rating !== null ? (
                <span className="flex items-center gap-1 font-bold">
                  <Star className="h-4 w-4 fill-cta text-cta" />
                  {p.rating.toFixed(1)}
                  <span className="font-normal text-muted-foreground">
                    ({p.reviews} đánh giá)
                  </span>
                </span>
              ) : (
                <span className="text-muted-foreground">Chưa có đánh giá</span>
              )}
              {p.experienceYears > 0 && (
                <span className="flex items-center gap-1 text-muted-foreground">
                  <BriefcaseBusiness className="h-4 w-4" />
                  {p.experienceYears} năm kinh nghiệm
                </span>
              )}
              {p.completedJobs > 0 && (
                <span className="text-muted-foreground">
                  {p.completedJobs} dịch vụ hoàn tất
                </span>
              )}
              {p.distanceKm !== null && (
                <span className="flex items-center gap-1 text-muted-foreground">
                  <MapPin className="h-4 w-4" />
                  {p.distanceKm} km
                </span>
              )}
            </div>

            <div className="flex items-center justify-between border-t border-border pt-4">
              <Button
                onClick={() => openProviderProfile(p.id)}
                size="sm"
                className="rounded-xl bg-cta font-bold text-cta-foreground hover:brightness-105"
              >
                Xem hồ sơ
                <ArrowRight className="ml-1 h-4 w-4" />
              </Button>
            </div>
          </div>
        ))}
      </div>
      )}
    </section>
  );
}

function ProCta() {
  const { isLoggedIn, openAuthModal } = useApp();

  const handleJoinPro = () => {
    openAuthModal("register_provider");
  };

  if (isLoggedIn) return null;

  return (
    <section className="mx-auto max-w-6xl px-5 pb-20">
      <div className="relative overflow-hidden rounded-[2.5rem] bg-foreground px-8 py-14 text-background md:px-14 shadow-2xl">
        <div className="pointer-events-none absolute -right-16 -top-16 h-64 w-64 rounded-full bg-brand/30 blur-3xl" />
        <div className="relative flex flex-col items-start gap-6 md:max-w-xl">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-cta px-3 py-1 text-xs font-extrabold text-cta-foreground">
            Dành cho Thợ & Đối tác sửa chữa
          </span>
          <h2 className="text-3xl font-black tracking-tight md:text-4xl leading-tight">
            Kết nối với khách hàng phù hợp
          </h2>
          <p className="text-background/80 leading-relaxed">
            Tạo hồ sơ dịch vụ, cập nhật kỹ năng và theo dõi các yêu cầu trong
            khu vực của bạn. Chủ động quản lý lịch làm việc trên nền tảng.
          </p>
          <Button
            onClick={handleJoinPro}
            size="lg"
            className="rounded-xl bg-brand font-bold text-brand-foreground hover:brightness-110 shadow-lg"
          >
            Đăng ký làm thợ
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </div>
    </section>
  );
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
            © 2026 HomeHero. Nền tảng kết nối khách hàng với thợ dịch vụ tại nhà.
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
  );
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
  );
}
