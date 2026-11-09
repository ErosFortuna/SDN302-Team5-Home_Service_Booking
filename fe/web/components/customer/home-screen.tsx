"use client";

import { useEffect, useState, useMemo } from "react";
import {
  Search,
  MapPin,
  ChevronRight,
  ArrowRight,
  ShieldCheck,
  Star,
  Clock,
  Filter,
  CheckCircle2,
  Calendar,
  Sparkles,
  X,
} from "lucide-react";
import { useApp } from "../app-store";
import { Avatar, CategoryIcon, CtaButton, Stars } from "../shared";
import { cn } from "@/lib/utils";
import type { ServiceCategory } from "@/lib/types";
import { getCurrentBrowserCoordinates } from "@/lib/vietmap";

interface DisplayProvider {
  id: string;
  name: string;
  avatar: string;
  rating: number;
  reviews: number;
  completedJobs: number;
  category?: string;
  categoryName?: string;
  distanceKm: number | null;
  city?: string;
  serviceAreas?: string[];
  tagline: string;
}

const DISTRICT_OPTIONS = [
  "Tất cả khu vực",
  "Quận 1",
  "Quận 3",
  "Quận 4",
  "Quận 7",
  "Bình Thạnh",
  "Gò Vấp",
  "Tân Bình",
  "TP. Thủ Đức",
];

const TIMING_OPTIONS = [
  { key: "any", label: "Mọi lúc", desc: "Tất cả thợ đang hoạt động" },
  { key: "today", label: "Hôm nay", desc: "Thợ rảnh ca hôm nay" },
  { key: "tomorrow", label: "Ngày mai", desc: "Đặt trước cho ngày mai" },
];

export function HomeScreen() {
  const { openBookingFlow, setCustomerTab, serviceCategories, currentUser } =
    useApp();

  const [providers, setProviders] = useState<DisplayProvider[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [keyword, setKeyword] = useState("");
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>("all");
  const [selectedDistrict, setSelectedDistrict] = useState<string>("Tất cả khu vực");
  const [selectedTiming, setSelectedTiming] = useState<string>("any");

  useEffect(() => {
    const apiBaseUrl =
      process.env.NEXT_PUBLIC_API_URL ||
      process.env.NEXT_PUBLIC_API_BASE_URL ||
      "http://localhost:5173/api";

    const fetchWithCoords = async () => {
      const params = new URLSearchParams();
      params.set("limit", "15");
      if (selectedCategoryId !== "all") {
        params.set("categoryId", selectedCategoryId);
      }
      if (selectedDistrict !== "Tất cả khu vực") {
        params.set("city", selectedDistrict);
      }

      // Try reading user's real browser GPS coordinates
      try {
        const coords = await getCurrentBrowserCoordinates().catch(() => null);
        if (coords && Array.isArray(coords) && coords.length === 2) {
          params.set("lng", String(coords[0]));
          params.set("lat", String(coords[1]));
        }
      } catch {
        // Fallback: no GPS
      }

      setLoading(true);
      fetch(`${apiBaseUrl.replace(/\/$/, "")}/providers/search?${params.toString()}`)
        .then((res) => (res.ok ? res.json() : null))
        .then((json) => {
          if (json?.success && Array.isArray(json.data)) {
            setProviders(
              json.data.map((p: any) => ({
                id: p.providerId || p._id || p.id,
                name: p.businessName || p.fullName,
                avatar: (p.businessName || p.fullName || "TH")
                  .slice(0, 2)
                  .toUpperCase(),
                rating: p.averageRating || 5.0,
                reviews: p.reviewCount || 0,
                completedJobs: p.completedJobCount || 0,
                distanceKm:
                  p.distanceKm != null && Number.isFinite(p.distanceKm)
                    ? Math.round(p.distanceKm * 10) / 10
                    : null,
                city: p.city || (p.serviceAreas && p.serviceAreas[0]) || "Đà Nẵng",
                serviceAreas: p.serviceAreas || [],
                tagline: p.city
                  ? `Phục vụ tại ${p.city}`
                  : "Thợ chuyên nghiệp, có mặt nhanh",
                category: "Cleaning",
                categoryName:
                  selectedCategoryId !== "all"
                    ? serviceCategories.find((c) => c.id === selectedCategoryId)?.name || "Điện nước"
                    : "Điện nước",
              }))
            );
          } else {
            setProviders([]);
          }
        })
        .catch((err) => {
          console.warn("Could not load providers:", err);
          setProviders([]);
        })
        .finally(() => setLoading(false));
    };

    void fetchWithCoords();
  }, [selectedCategoryId, selectedDistrict, serviceCategories]);

  // Client-side search keyword filtering
  const filteredProviders = useMemo(() => {
    if (!keyword.trim()) return providers;
    const term = keyword.toLowerCase().trim();
    return providers.filter(
      (p) =>
        p.name.toLowerCase().includes(term) ||
        p.tagline.toLowerCase().includes(term) ||
        (p.serviceAreas &&
          p.serviceAreas.some((a) => a.toLowerCase().includes(term)))
    );
  }, [providers, keyword]);

  const displayName = currentUser?.name || "Khách hàng";

  return (
    <div className="flex flex-col gap-6 px-4 pb-8 pt-4 max-w-5xl mx-auto">
      {/* Greeting & Quick Location */}
      <div className="flex items-center justify-between animate-fade-up">
        <div>
          <p className="text-xs sm:text-sm text-muted-foreground font-medium">
            Xin chào,
          </p>
          <h1 className="text-xl sm:text-2xl font-black tracking-tight">
            {displayName}
          </h1>
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-brand/10 border border-brand/20 px-3 py-1 text-xs font-bold text-brand">
          <MapPin className="size-3.5" />
          {selectedDistrict !== "Tất cả khu vực" ? selectedDistrict : "TP. Hồ Chí Minh"}
        </span>
      </div>

      {/* Hero Promo Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-brand via-teal-600 to-teal-800 p-6 text-white shadow-md animate-fade-up">
        <div className="absolute -right-8 -top-10 size-40 rounded-full bg-white/10 blur-xl" />
        <div className="absolute -bottom-12 -right-2 size-28 rounded-full bg-white/10 blur-lg" />
        <div className="relative max-w-lg">
          <span className="inline-flex items-center gap-1 rounded-full bg-cta px-3 py-1 text-[11px] font-black uppercase text-cta-foreground shadow-xs">
            <Sparkles className="size-3" /> Đặt thợ nhanh chóng
          </span>
          <h2 className="mt-3 text-xl sm:text-2xl font-black leading-tight">
            Cần thợ sửa chữa, dọn dẹp tại nhà?
          </h2>
          <p className="mt-1 text-xs sm:text-sm text-white/85 leading-relaxed">
            Hơn 1.200 thợ lành nghề đã qua kiểm định. Bạn có thể tạo đơn để hệ thống gợi ý thợ rảnh ngay, hoặc lọc thợ theo yêu cầu dưới đây!
          </p>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <CtaButton
              onClick={() => openBookingFlow()}
              className="rounded-xl px-4 py-2.5 font-bold shadow-md hover:brightness-105"
            >
              Tạo đơn & Tìm thợ ngay
              <ArrowRight className="size-4 ml-1" />
            </CtaButton>
          </div>
        </div>
      </div>

      {/* Smart Provider Filter & Search Panel */}
      <div className="rounded-3xl border border-border bg-card p-5 shadow-xs space-y-4 animate-fade-up">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-border/60 pb-3">
          <div>
            <h2 className="text-base font-extrabold tracking-tight flex items-center gap-2">
              <Filter className="size-4 text-brand" />
              Lọc thợ rảnh & Tìm theo yêu cầu
            </h2>
            <p className="text-xs text-muted-foreground">
              Tìm thợ có sẵn ca làm việc theo đúng khu vực và chuyên môn của bạn
            </p>
          </div>
          {(selectedCategoryId !== "all" ||
            selectedDistrict !== "Tất cả khu vực" ||
            keyword ||
            selectedTiming !== "any") && (
            <button
              onClick={() => {
                setSelectedCategoryId("all");
                setSelectedDistrict("Tất cả khu vực");
                setSelectedTiming("any");
                setKeyword("");
              }}
              className="inline-flex items-center gap-1 text-xs font-bold text-muted-foreground hover:text-destructive self-start sm:self-auto"
            >
              <X className="size-3.5" /> Xóa bộ lọc
            </button>
          )}
        </div>

        {/* Search Input */}
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <input
            type="text"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder="Tìm theo tên thợ, kỹ năng, cửa hàng điện nước..."
            className="w-full rounded-2xl border border-border bg-muted/30 pl-10 pr-4 py-2.5 text-xs sm:text-sm outline-none focus:border-brand focus:bg-background transition-all"
          />
        </div>

        {/* Category Filter Chips */}
        <div>
          <span className="text-xs font-bold text-muted-foreground block mb-2">
            Danh mục chuyên môn:
          </span>
          <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
            <button
              onClick={() => setSelectedCategoryId("all")}
              className={cn(
                "rounded-xl px-3.5 py-1.5 text-xs font-bold transition-all shrink-0",
                selectedCategoryId === "all"
                  ? "bg-brand text-brand-foreground shadow-xs"
                  : "border border-border bg-card text-muted-foreground hover:text-foreground"
              )}
            >
              Tất cả
            </button>
            {serviceCategories.map((c) => (
              <button
                key={c.id || c.slug}
                onClick={() => setSelectedCategoryId(c.id || c.slug)}
                className={cn(
                  "rounded-xl px-3 py-1.5 text-xs font-bold transition-all shrink-0 flex items-center gap-1.5",
                  selectedCategoryId === (c.id || c.slug)
                    ? "bg-brand text-brand-foreground shadow-xs"
                    : "border border-border bg-card text-muted-foreground hover:text-foreground"
                )}
              >
                <span>{c.name}</span>
              </button>
            ))}
          </div>
        </div>

        {/* District & Timing Filter Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
          {/* District selector */}
          <div>
            <label className="text-xs font-bold text-muted-foreground block mb-1.5">
              Khu vực phục vụ:
            </label>
            <select
              value={selectedDistrict}
              onChange={(e) => setSelectedDistrict(e.target.value)}
              className="w-full rounded-xl border border-border bg-muted/40 px-3 py-2 text-xs font-bold outline-none focus:border-brand"
            >
              {DISTRICT_OPTIONS.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </div>

          {/* Timing selector */}
          <div>
            <label className="text-xs font-bold text-muted-foreground block mb-1.5">
              Thời gian cần thợ:
            </label>
            <div className="grid grid-cols-3 gap-1.5">
              {TIMING_OPTIONS.map((t) => (
                <button
                  key={t.key}
                  type="button"
                  onClick={() => setSelectedTiming(t.key)}
                  className={cn(
                    "rounded-xl py-2 px-1 text-center text-xs font-bold transition-all border",
                    selectedTiming === t.key
                      ? "bg-brand/10 border-brand text-brand font-extrabold"
                      : "border-border bg-card text-muted-foreground hover:text-foreground"
                  )}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Provider List Section */}
      <div className="space-y-4 animate-fade-up">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-black tracking-tight flex items-center gap-2">
              Danh sách thợ phù hợp ({filteredProviders.length})
            </h2>
            <p className="text-xs text-muted-foreground">
              Thợ có kỹ năng phù hợp, đã xác minh lý lịch và sẵn sàng tiếp nhận yêu cầu
            </p>
          </div>
          <button
            onClick={() => setCustomerTab("bookings")}
            className="inline-flex items-center gap-0.5 text-xs font-bold text-brand hover:underline shrink-0"
          >
            Đơn của tôi
            <ChevronRight className="size-3.5" />
          </button>
        </div>

        {loading ? (
          <div className="rounded-3xl border border-border bg-card p-8 text-center text-xs text-muted-foreground">
            Đang tìm kiếm danh sách thợ phù hợp...
          </div>
        ) : filteredProviders.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-border bg-card/60 p-10 text-center">
            <MapPin className="size-8 text-muted-foreground/60 mb-2" />
            <h3 className="text-sm font-bold text-foreground">
              Không tìm thấy thợ nào theo điều kiện lọc
            </h3>
            <p className="mt-1 text-xs text-muted-foreground max-w-sm">
              Bạn có thể mở rộng bán kính tìm kiếm hoặc bấm &quot;Tạo đơn ngay&quot; để nhân viên điều phối gán thợ phù hợp cho bạn.
            </p>
            <CtaButton
              onClick={() => openBookingFlow()}
              className="mt-4 rounded-xl px-4 py-2 text-xs font-bold"
            >
              Tạo đơn để hệ thống tìm thợ
            </CtaButton>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {filteredProviders.map((p) => (
              <div
                key={p.id}
                className="flex flex-col justify-between rounded-3xl border border-border bg-card p-5 shadow-xs transition-all hover:border-brand/40 hover:shadow-md"
              >
                <div>
                  {/* Provider Header */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <Avatar
                        initials={p.avatar}
                        className="size-13 shrink-0 rounded-2xl text-base font-black"
                        color="bg-brand/10 text-brand border border-brand/20 shadow-xs"
                      />
                      <div>
                        <div className="flex items-center gap-1.5">
                          <h3 className="text-sm sm:text-base font-black text-foreground truncate max-w-[180px] sm:max-w-[220px]">
                            {p.name}
                          </h3>
                          <span
                            title="Thợ đã xác minh lý lịch và chuyên môn"
                            className="inline-flex text-brand"
                          >
                            <ShieldCheck className="size-4 shrink-0" />
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Chuyên môn: {p.categoryName || "Sửa chữa gia dụng"}
                        </p>
                      </div>
                    </div>

                    {/* Ready Badge */}
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 text-[11px] font-bold text-emerald-600 dark:text-emerald-400 shrink-0">
                      <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      Sẵn sàng nhận việc
                    </span>
                  </div>

                  {/* Rating & Stats Strip */}
                  <div className="mt-3.5 grid grid-cols-3 gap-2 rounded-2xl bg-muted/40 p-2.5 text-center text-xs">
                    <div>
                      <span className="text-[10px] text-muted-foreground block">
                        Đánh giá
                      </span>
                      <span className="font-extrabold text-foreground flex items-center justify-center gap-1">
                        <Star className="size-3 fill-amber-400 text-amber-400" />
                        {p.rating.toFixed(1)}
                        <span className="text-[10px] text-muted-foreground font-normal">
                          ({p.reviews})
                        </span>
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-muted-foreground block">
                        Đã làm xong
                      </span>
                      <span className="font-extrabold text-foreground">
                        {p.completedJobs} đơn
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-muted-foreground block">
                        {p.distanceKm != null ? "Khoảng cách" : "Khu vực"}
                      </span>
                      <span className="font-extrabold text-brand truncate block max-w-[85px]">
                        {p.distanceKm != null ? `~${p.distanceKm} km` : (p.city || "Đà Nẵng")}
                      </span>
                    </div>
                  </div>

                  {/* Areas */}
                  <div className="mt-3 flex items-center gap-1.5 text-xs text-muted-foreground">
                    <MapPin className="size-3.5 text-brand shrink-0" />
                    <span className="truncate">
                      Khu vực: {p.serviceAreas && p.serviceAreas.length > 0 ? p.serviceAreas.join(", ") : p.city}
                    </span>
                  </div>
                </div>

                {/* Direct Booking CTA */}
                <div className="mt-4 pt-3.5 border-t border-border flex items-center justify-between gap-3">
                  <span className="text-[11px] text-muted-foreground italic">
                    Chỉ định trực tiếp
                  </span>
                  <button
                    onClick={() => {
                      openBookingFlow(
                        p.categoryName as any,
                        undefined,
                        {
                          id: p.id,
                          name: p.name,
                          category: p.categoryName,
                        }
                      );
                    }}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-brand px-4 py-2 text-xs font-bold text-brand-foreground hover:brightness-110 active:scale-95 transition-all shadow-xs"
                  >
                    <CheckCircle2 className="size-3.5" />
                    Đặt thợ này
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
