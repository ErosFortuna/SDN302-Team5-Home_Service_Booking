"use client";

import { useState } from "react";
import {
  Wallet,
  Briefcase,
  Star,
  TrendingUp,
  MapPin,
  Clock,
  Send,
  Check,
  ChevronRight,
  ShieldCheck,
  Phone,
  MessageCircle,
  Filter,
  ImageIcon,
  User,
} from "lucide-react";
import { useApp } from "../app-store";
import { formatVND } from '@/lib/utils';
import { Avatar, CategoryIcon, StatusBadge } from "../shared";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { ServiceCategory } from "@/lib/types";
import { ProviderProfilePage } from "../provider-booking/provider-profile-page";

export function ProviderPortalView() {
  const {
    providerTab,
    setProviderTab,
    providerJobs,
    jobRequests,
    updateJobStatus,
    openJobDetail,
    openProfileModal,
    currentUser,
  } = useApp();

  const proName = currentUser?.name || "Thợ đối tác";
  const initials = proName.slice(0, 2).toUpperCase();
  const activeJobs = providerJobs.filter((j) => j.status === "in_progress");
  const completedJobs = providerJobs.filter((j) => j.status === "completed");
  const totalEarnings = completedJobs.reduce((sum, j) => sum + (j.budget || 0), 0);
  const completionRate = providerJobs.length > 0 ? `${Math.round((completedJobs.length / providerJobs.length) * 100)}%` : "100%";
  const areaText = currentUser?.address ? `Khu vực: ${currentUser.address}` : "Khu vực: TP. Hồ Chí Minh";

  const [categoryFilter, setCategoryFilter] = useState<string>("all");

  const newJobRequests = jobRequests;

  const filteredRequests = jobRequests.filter((r) => {
    if (categoryFilter === "all") return true;
    return r.category === categoryFilter;
  });

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Header Profile Bar */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between rounded-3xl border border-border bg-card p-6 shadow-xs">
        <div className="flex items-center gap-4">
          <div
            onClick={() => openProfileModal()}
            className="cursor-pointer hover:scale-105 hover:opacity-90 transition-all"
            title="Xem hồ sơ thợ"
          >
            <Avatar
              initials={initials}
              className="size-16 text-lg font-black"
              color="bg-brand text-brand-foreground shadow-sm"
            />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-black tracking-tight">
                {proName}
              </h1>
              <span className="inline-flex items-center gap-1 rounded-full bg-brand/10 px-2.5 py-0.5 text-xs font-bold text-brand">
                <ShieldCheck className="size-3.5" /> Thợ uy tín
              </span>
            </div>
            <p className="mt-0.5 text-xs sm:text-sm text-muted-foreground">
              Chuyên điện gia dụng & sửa ống nước · {areaText}
            </p>
          </div>
        </div>

        {/* Tab switch between Dashboard, Job Board and Profile */}
        <div className="flex rounded-2xl border border-border bg-muted/60 p-1">
          <button
            onClick={() => setProviderTab("dashboard")}
            className={cn(
              "flex items-center gap-2 rounded-xl px-4 py-2 text-xs sm:text-sm font-bold transition-all",
              providerTab === "dashboard"
                ? "bg-card text-brand shadow-xs"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <Briefcase className="size-4" />
            Bảng điều khiển
          </button>
          <button
            onClick={() => setProviderTab("jobs")}
            className={cn(
              "relative flex items-center gap-2 rounded-xl px-4 py-2 text-xs sm:text-sm font-bold transition-all",
              providerTab === "jobs"
                ? "bg-card text-brand shadow-xs"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <Wallet className="size-4" />
            Sàn nhận việc
            {newJobRequests.length > 0 && (
              <span className="flex size-5 items-center justify-center rounded-full bg-cta text-[10px] font-black text-cta-foreground">
                {newJobRequests.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setProviderTab("profile")}
            className={cn(
              "flex items-center gap-2 rounded-xl px-4 py-2 text-xs sm:text-sm font-bold transition-all",
              providerTab === "profile"
                ? "bg-card text-brand shadow-xs"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <User className="size-4" />
            Hồ sơ thợ
          </button>
        </div>
      </div>

      {providerTab === "dashboard" ? (
        <div className="mt-8 space-y-8">
          {/* KPI strip */}
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <div className="rounded-3xl border border-border bg-card p-5 shadow-xs">
              <div className="flex items-center justify-between text-muted-foreground">
                <span className="text-xs font-bold">Thu nhập đã hoàn tất</span>
                <Wallet className="size-4 text-brand" />
              </div>
              <p className="mt-2 text-2xl font-black text-brand">
                {formatVND(totalEarnings)}
              </p>
              <div className="mt-2 inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                <Check className="size-3" /> {completedJobs.length} đơn hoàn thành
              </div>
            </div>

            <div className="rounded-3xl border border-border bg-card p-5 shadow-xs">
              <div className="flex items-center justify-between text-muted-foreground">
                <span className="text-xs font-bold">Việc đang thực hiện</span>
                <Briefcase className="size-4 text-sky-500" />
              </div>
              <p className="mt-2 text-2xl font-black text-foreground">
                {activeJobs.length} việc
              </p>
              <span className="mt-2 block text-[11px] text-muted-foreground">
                {activeJobs.length > 0 ? `${activeJobs.length} việc đang làm` : "Chưa có việc đang làm"}
              </span>
            </div>

            <div className="rounded-3xl border border-border bg-card p-5 shadow-xs">
              <div className="flex items-center justify-between text-muted-foreground">
                <span className="text-xs font-bold">Đánh giá trung bình</span>
                <Star className="size-4 fill-cta text-cta" />
              </div>
              <p className="mt-2 text-2xl font-black text-foreground">
                4.9{" "}
                <span className="text-sm font-normal text-muted-foreground">
                  / 5.0
                </span>
              </p>
              <span className="mt-2 block text-[11px] text-muted-foreground">
                Đánh giá chất lượng dịch vụ
              </span>
            </div>

            <div className="rounded-3xl border border-border bg-card p-5 shadow-xs">
              <div className="flex items-center justify-between text-muted-foreground">
                <span className="text-xs font-bold">Tỷ lệ hoàn thành</span>
                <TrendingUp className="size-4 text-brand" />
              </div>
              <p className="mt-2 text-2xl font-black text-foreground">{completionRate}</p>
              <span className="mt-2 block text-[11px] text-muted-foreground">
                Đạt chuẩn chất lượng
              </span>
            </div>
          </div>

          {/* New requests banner */}
          {newJobRequests.length > 0 && (
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 rounded-3xl bg-gradient-to-r from-brand/15 via-secondary to-cta/15 border border-brand/30 p-6">
              <div className="flex items-center gap-4">
                <div className="flex size-12 items-center justify-center rounded-2xl bg-brand text-brand-foreground shadow-sm">
                  <Wallet className="size-6" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-foreground">
                    Có {newJobRequests.length} yêu cầu công việc mới quanh khu
                    vực của bạn!
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Hãy phản hồi nhanh để phục vụ khách hàng sớm nhất.
                  </p>
                </div>
              </div>
              <Button
                onClick={() => setProviderTab("jobs")}
                className="rounded-xl bg-cta font-bold text-cta-foreground hover:brightness-105 shrink-0"
              >
                Vào sàn nhận việc ngay
                <ChevronRight className="ml-1 size-4" />
              </Button>
            </div>
          )}

          {/* Active Jobs Section */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-black tracking-tight">
                  Công việc đang tiến hành ({providerJobs.length})
                </h2>
                <p className="text-xs text-muted-foreground">
                  Cập nhật trạng thái thi công để khách hàng an tâm theo dõi.
                </p>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              {providerJobs.map((j) => (
                <div
                  key={j.id}
                  className="flex flex-col justify-between rounded-3xl border border-border bg-card p-5 shadow-xs hover:shadow-md transition-shadow"
                >
                  <div>
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <CategoryIcon
                          category={j.category}
                          className="size-12 shrink-0 rounded-2xl"
                        />
                        <div>
                          <h3 className="font-bold text-base leading-tight">
                            {j.title}
                          </h3>
                          <span className="text-xs text-muted-foreground">
                            {j.category}
                          </span>
                        </div>
                      </div>
                      <StatusBadge status={j.status} />
                    </div>

                    <p className="mt-3 text-xs text-muted-foreground line-clamp-2">
                      {j.description}
                    </p>

                    <div className="mt-4 grid grid-cols-2 gap-2 rounded-2xl bg-muted/50 p-3 text-xs">
                      <div>
                        <span className="text-muted-foreground block text-[10px]">
                          Khách hàng
                        </span>
                        <span className="font-bold text-foreground">
                          {j.customerName}
                        </span>
                      </div>
                      <div>
                        <span className="text-muted-foreground block text-[10px]">
                          Giá thỏa thuận
                        </span>
                        <span className="font-bold text-brand">
                          {formatVND(j.budget)}
                        </span>
                      </div>
                      <div className="col-span-2 flex items-center gap-1.5 text-muted-foreground pt-1 border-t border-border/60">
                        <MapPin className="size-3.5 text-brand" />
                        {j.address} · {j.date} lúc {j.time}
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 pt-4 border-t border-border flex items-center justify-between gap-3">
                    <span className="text-xs text-muted-foreground">
                      Khoảng cách: {j.distanceKm} km
                    </span>
                    <Button
                      onClick={() => openJobDetail(j.id)}
                      className="rounded-xl bg-brand text-brand-foreground font-bold hover:brightness-110"
                    >
                      Cập nhật tiến độ & Nghiệm thu
                      <ChevronRight className="ml-1 size-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : providerTab === "profile" ? (
        <div className="mt-8">
          <ProviderProfilePage />
        </div>
      ) : (
        /* Job Board Screen (Web Grid) */
        <div className="mt-8 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h2 className="text-xl font-black tracking-tight">
                Sàn nhận việc mới
              </h2>
              <p className="text-xs sm:text-sm text-muted-foreground">
                Danh sách khách hàng đang tìm kiếm thợ sửa chữa trong bán kính
                10km.
              </p>
            </div>

            {/* Filter by Category */}
            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
              <span className="text-xs font-bold text-muted-foreground flex items-center gap-1">
                <Filter className="size-3.5" /> Lọc:
              </span>
              {[
                "all",
                "Plumbing",
                "Cleaning",
                "Electrical",
                "Appliance",
                "Painting",
              ].map((cat) => (
                <button
                  key={cat}
                  onClick={() => setCategoryFilter(cat)}
                  className={cn(
                    "rounded-xl px-3 py-1.5 text-xs font-bold transition-all shrink-0",
                    categoryFilter === cat
                      ? "bg-brand text-brand-foreground shadow-xs"
                      : "border border-border bg-card text-muted-foreground hover:text-foreground",
                  )}
                >
                  {cat === "all" ? "Tất cả" : cat}
                </button>
              ))}
            </div>
          </div>

          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {filteredRequests.map((r) => {
              const isSent = false;

              return (
                <div
                  key={r.id}
                  className="flex flex-col justify-between rounded-3xl border border-border bg-card p-5 shadow-xs hover:shadow-md transition-shadow"
                >
                  <div>
                    <div className="flex items-start justify-between gap-3">
                      <CategoryIcon
                        category={r.category}
                        className="size-12 shrink-0 rounded-2xl"
                      />
                      <span className="rounded-full bg-secondary px-2.5 py-1 text-xs font-bold text-secondary-foreground">
                        Cách {r.distanceKm} km
                      </span>
                    </div>

                    <h3 className="mt-3 font-bold text-base leading-snug">
                      {r.title}
                    </h3>
                    <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                      {r.description}
                    </p>

                    <div className="mt-4 grid grid-cols-3 gap-2 rounded-2xl bg-muted/50 p-2.5 text-center text-xs">
                      <div>
                        <span className="text-muted-foreground block text-[10px]">
                          Ngân sách
                        </span>
                        <span className="font-bold text-brand">
                          {formatVND(r.budget)}
                        </span>
                      </div>
                      <div>
                        <span className="text-muted-foreground block text-[10px]">
                          Giờ hẹn
                        </span>
                        <span className="font-semibold text-foreground">
                          {r.time}
                        </span>
                      </div>
                      <div>
                        <span className="text-muted-foreground block text-[10px]">
                          Hình ảnh
                        </span>
                        <span className="font-semibold text-foreground flex items-center justify-center gap-1">
                          <ImageIcon className="size-3" /> {r.photos}
                        </span>
                      </div>
                    </div>

                    <div className="mt-3 flex items-center gap-1 text-xs text-muted-foreground">
                      <MapPin className="size-3.5 text-brand shrink-0" />
                      <span className="truncate">{r.address}</span>
                      <span className="ml-auto shrink-0 font-medium">
                        ({r.createdAt})
                      </span>
                    </div>
                  </div>

                  <div className="mt-5 pt-4 border-t border-border">
                    <div className="flex gap-2">
                      <Button
                        onClick={() => updateJobStatus(r.id, 'in_progress')}
                        className="flex-1 rounded-xl bg-brand font-bold text-brand-foreground hover:brightness-105"
                      >
                        <Check className="mr-1.5 size-4" />
                        Chấp nhận
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => updateJobStatus(r.id, 'cancelled')}
                        className="rounded-xl border-border font-bold text-muted-foreground hover:text-destructive"
                      >
                        Từ chối
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
