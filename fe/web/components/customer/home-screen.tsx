"use client";

import { useEffect, useState } from "react";
import { Search, MapPin, ChevronRight, ArrowRight } from "lucide-react";
import { useApp } from "../app-store";
import { Avatar, CategoryIcon, CtaButton, Stars } from "../shared";

interface DisplayProvider {
  id: string;
  name: string;
  avatar: string;
  rating: number;
  reviews: number;
  category?: string;
  distanceKm: number;
  tagline: string;
}

export function HomeScreen() {
  const { openBookingFlow, setCustomerTab, serviceCategories, currentUser } = useApp();
  const [providers, setProviders] = useState<DisplayProvider[]>([]);

  useEffect(() => {
    const apiBaseUrl =
      process.env.NEXT_PUBLIC_API_URL ||
      process.env.NEXT_PUBLIC_API_BASE_URL ||
      'http://localhost:5000/api';

    fetch(`${apiBaseUrl.replace(/\/$/, '')}/providers/search?limit=5`)
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => {
        if (json?.success && Array.isArray(json.data)) {
          setProviders(
            json.data.map((p: any) => ({
              id: p.providerId || p._id || p.id,
              name: p.businessName || p.fullName,
              avatar: (p.businessName || p.fullName || 'TH').slice(0, 2).toUpperCase(),
              rating: p.averageRating || 5.0,
              reviews: p.reviewCount || 0,
              distanceKm: p.distanceKm != null ? Math.round(p.distanceKm * 10) / 10 : 1.5,
              tagline: p.city ? `Phục vụ tại ${p.city}` : 'Thợ chuyên nghiệp, có mặt nhanh',
              category: 'Cleaning',
            }))
          );
        }
      })
      .catch((err) => console.warn('Could not load providers:', err));
  }, []);

  const displayName = currentUser?.name || 'Khách hàng';

  return (
    <div className="flex flex-col gap-5 px-4 pb-6 pt-4">
      {/* Greeting */}
      <div className="flex items-center justify-between animate-fade-up">
        <div>
          <p className="text-sm text-muted-foreground">Xin chào,</p>
          <h1 className="text-xl font-extrabold tracking-tight">{displayName}</h1>
        </div>
        <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground">
          <MapPin className="size-3.5 text-brand" />
          TP. Hồ Chí Minh
        </span>
      </div>

      {/* Search */}
      <button
        onClick={() => openBookingFlow()}
        className="flex items-center gap-3 rounded-2xl border border-border bg-card px-4 py-3.5 text-left shadow-sm transition-shadow hover:shadow-md animate-fade-up"
      >
        <Search className="size-5 text-muted-foreground" />
        <span className="text-sm text-muted-foreground">
          Tìm dịch vụ dọn dẹp, sửa ống nước, điện lạnh...
        </span>
      </button>

      {/* Categories */}
      <div className="animate-fade-up">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-bold">Danh mục dịch vụ</h2>
        </div>
        <div className="flex gap-2.5 overflow-x-auto no-scrollbar pb-1">
          {serviceCategories.slice(0, 6).map((c) => (
            <button
              key={c.name}
              onClick={() => openBookingFlow(c.name as any)}
              className="flex min-w-[76px] flex-col items-center gap-2 rounded-2xl border border-border bg-card p-3 transition-all hover:-translate-y-0.5 hover:shadow-md"
            >
              <CategoryIcon category={c.name} className="size-11" />
              <span className="text-xs font-semibold">{c.name}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Promo banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-brand via-teal-500 to-teal-600 p-5 text-white shadow-lg animate-fade-up">
        <div className="absolute -right-8 -top-10 size-40 rounded-full bg-white/10" />
        <div className="absolute -bottom-12 -right-2 size-28 rounded-full bg-white/10" />
        <div className="relative">
          <span className="inline-block rounded-full bg-cta px-2.5 py-1 text-[11px] font-extrabold text-cta-foreground">
            ƯU ĐÃI ĐẶC BIỆT
          </span>
          <h3 className="mt-3 text-lg font-extrabold leading-tight">
            Đặt thợ uy tín tại nhà
            <br />
            Nhanh chóng & An tâm
          </h3>
          <p className="mt-1 text-sm text-white/80">
            Thợ chuyên môn cao, bảng giá niêm yết rõ ràng.
          </p>
          <CtaButton
            onClick={() => openBookingFlow()}
            className="mt-4"
          >
            Đặt ngay
            <ArrowRight className="size-4" />
          </CtaButton>
        </div>
      </div>

      {/* Top rated */}
      <div className="animate-fade-up">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-bold">Thợ hàng đầu gần bạn</h2>
          <button
            onClick={() => setCustomerTab("bookings")}
            className="inline-flex items-center gap-0.5 text-xs font-semibold text-brand"
          >
            Xem tất cả
            <ChevronRight className="size-3.5" />
          </button>
        </div>

        {providers.length === 0 ? (
          <div className="rounded-2xl border border-border bg-card p-4 text-center text-xs text-muted-foreground">
            Hiện chưa có thợ trong khu vực này.
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {providers.map((p) => (
              <div
                key={p.id}
                className="flex cursor-pointer items-center gap-3 rounded-2xl border border-border bg-card p-3 shadow-sm transition-colors hover:border-brand/40 hover:bg-muted/30"
              >
                <Avatar
                  initials={p.avatar}
                  className="size-12 shrink-0"
                  color="bg-secondary text-secondary-foreground"
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <p className="truncate text-sm font-bold">{p.name}</p>
                  </div>
                  <p className="truncate text-xs text-muted-foreground">
                    {p.tagline}
                  </p>
                  <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                    <Stars rating={p.rating} className="text-foreground" />
                    <span>({p.reviews})</span>
                    <span className="inline-flex items-center gap-0.5">
                      <MapPin className="size-3" />
                      {p.distanceKm} km
                    </span>
                  </div>
                </div>
                <button
                  onClick={(event) => {
                    event.stopPropagation();
                    openBookingFlow((p.category || 'Cleaning') as any);
                  }}
                  className="shrink-0 rounded-xl bg-brand px-3 py-2 text-xs font-bold text-brand-foreground transition-transform active:scale-95"
                >
                  Đặt
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
