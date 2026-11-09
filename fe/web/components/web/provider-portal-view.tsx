"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
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
  Calendar,
  BadgeCheck,
  CreditCard,
  Wrench,
  ExternalLink,
} from "lucide-react";
import { useApp } from "../app-store";
import { formatVND } from '@/lib/utils';
import { Avatar, CategoryIcon, StatusBadge } from "../shared";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { ServiceCategory } from "@/lib/types";
import { ProviderProfilePage } from "../provider-booking/provider-profile-page";
import { ProviderStatusCard } from "@/components/admin-providers/provider-status-card";
import { AvailabilityMainView } from "@/components/provider-availability/availability-main-view";
import { MembershipPage } from "@/components/provider-booking/membership-page";
import { ProviderReviewsView } from "@/components/provider-booking/provider-reviews-view";
import { MySkillsPage } from "@/components/provider-skills/my-skills-page";
import { availabilityApi } from "@/lib/api/availability";
import { getErrorMessage } from "@/lib/api/client";
import { normalizeStatusToStep, getStepActionInfo, getStepProgressInfo } from "../provider-booking/job-progress-checklist";

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
  const activeJobs = providerJobs.filter((j) => {
    const s = String(j.rawStatus || j.status || '').toUpperCase();
    return s !== 'COMPLETED' && s !== 'CANCELLED' && s !== 'PENDING_CONFIRMATION';
  });
  const completedJobs = providerJobs.filter((j) => {
    const s = String(j.rawStatus || j.status || '').toUpperCase();
    return s === 'COMPLETED';
  });
  const completionRate = providerJobs.length > 0 ? `${Math.round((completedJobs.length / providerJobs.length) * 100)}%` : "100%";
  const areaText = currentUser?.address ? `Khu vực: ${currentUser.address}` : "Khu vực: TP. Hồ Chí Minh";

  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [jobFilter, setJobFilter] = useState<"all" | "in_progress" | "completed">("all");
  const [profileSubTab, setProfileSubTab] = useState<"info" | "skills" | "membership">("info");
  const [isAcceptingBookings, setIsAcceptingBookings] = useState<boolean | null>(null);
  const [availabilityStatusError, setAvailabilityStatusError] = useState("");
  const availabilityStatusRequestId = useRef(0);

  useEffect(() => {
    const controller = new AbortController();
    const requestId = ++availabilityStatusRequestId.current;
    availabilityApi.getMine(controller.signal)
      .then((response) => {
        if (requestId === availabilityStatusRequestId.current) {
          setIsAcceptingBookings(response.data.settings.isAcceptingBookings);
        }
      })
      .catch((error: unknown) => {
        if (requestId === availabilityStatusRequestId.current && (!(error instanceof Error) || error.name !== "AbortError")) {
          setAvailabilityStatusError(getErrorMessage(error));
        }
      });
    return () => controller.abort();
  }, []);

  const handleAcceptingStatusChange = useCallback((isAccepting: boolean) => {
    availabilityStatusRequestId.current += 1;
    setIsAcceptingBookings(isAccepting);
    setAvailabilityStatusError("");
  }, []);

  const filteredJobs = providerJobs.filter((j) => {
    if (jobFilter === "all") return true;
    const s = String(j.rawStatus || j.status || '').toUpperCase();
    if (jobFilter === "completed") return s === 'COMPLETED';
    if (jobFilter === "in_progress") return s !== 'COMPLETED' && s !== 'CANCELLED';
    return true;
  });

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

        {/* Right side controls: Active Status Badge */}
        <div className="flex items-center gap-2.5">
          <div className={cn(
            "flex items-center gap-2 rounded-2xl border px-3.5 py-2 text-xs font-bold shadow-2xs",
            isAcceptingBookings === true
              ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-700 dark:text-emerald-400"
              : isAcceptingBookings === false
                ? "bg-amber-500/10 border-amber-500/20 text-amber-700 dark:text-amber-400"
                : "bg-muted border-border text-muted-foreground"
          )}>
            <span className={cn(
              "size-2 rounded-full",
              isAcceptingBookings === true ? "bg-emerald-500 animate-pulse" : isAcceptingBookings === false ? "bg-amber-500" : "bg-muted-foreground"
            )} />
            <span>
              {isAcceptingBookings === true
                ? "Sẵn sàng nhận việc"
                : isAcceptingBookings === false
                  ? "Tạm ngưng nhận việc"
                  : availabilityStatusError
                    ? "Không tải được trạng thái"
                    : "Đang tải trạng thái"}
            </span>
          </div>
        </div>
      </div>
      {availabilityStatusError && (
        <p role="status" className="mt-2 text-right text-xs text-destructive">
          {availabilityStatusError}
        </p>
      )}

      {/* Live Provider Verification & Tier Status */}
      <div className="mt-6">
        <ProviderStatusCard />
      </div>

      {providerTab === "dashboard" ? (
        <div className="mt-8 space-y-8">
          {/* KPI strip */}
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
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

            <button
              type="button"
              onClick={() => setProviderTab("reviews")}
              className="rounded-3xl border border-border bg-card p-5 text-left shadow-xs transition hover:border-brand/40 hover:shadow-sm"
            >
              <div className="flex items-center justify-between text-muted-foreground">
                <span className="text-xs font-bold">Đánh giá khách hàng</span>
                <Star className="size-4 fill-cta text-cta" />
              </div>
              <p className="mt-2 text-base font-black text-foreground">
                Xem đánh giá & phản hồi
              </p>
              <span className="mt-2 block text-[11px] text-muted-foreground">
                Đọc nhận xét và trả lời khách hàng
              </span>
            </button>

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
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
              <div>
                <h2 className="text-lg font-black tracking-tight">
                  Công việc của tôi ({providerJobs.length})
                </h2>
                <p className="text-xs text-muted-foreground">
                  Check theo từng bước quy trình thi công để đồng bộ nhanh chóng với khách hàng.
                </p>
              </div>

              {/* Status Filter Pills */}
              <div className="flex items-center gap-1.5 rounded-2xl border border-border bg-muted/50 p-1 self-start sm:self-auto">
                {[
                  { key: "all", label: "Tất cả", count: providerJobs.length },
                  { key: "in_progress", label: "Đang làm", count: activeJobs.length },
                  { key: "completed", label: "Hoàn tất", count: completedJobs.length },
                ].map((f) => (
                  <button
                    key={f.key}
                    onClick={() => setJobFilter(f.key as any)}
                    className={cn(
                      "rounded-xl px-3 py-1.5 text-xs font-bold transition-all flex items-center gap-1.5",
                      jobFilter === f.key
                        ? "bg-card text-brand shadow-xs font-black"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    <span>{f.label}</span>
                    <span className="rounded-full bg-muted px-1.5 py-0.2 text-[10px] font-bold">
                      {f.count}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {filteredJobs.length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-border bg-card/40 p-8 text-center">
                <Briefcase className="size-8 text-muted-foreground mb-2" />
                <p className="text-sm font-bold text-foreground">Không có công việc nào trong mục này</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {jobFilter === "in_progress"
                    ? "Hiện bạn không có công việc nào đang thi công."
                    : "Chưa có dữ liệu công việc."}
                </p>
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {filteredJobs.map((j) => {
                  const rawStatusVal = j.rawStatus || (String(j.status || '').toUpperCase() === "COMPLETED" ? "COMPLETED" : String(j.status || '').toUpperCase() === "PENDING" ? "PENDING_CONFIRMATION" : "IN_PROGRESS");
                  const stepInfo = getStepProgressInfo(rawStatusVal);
                  const actionInfo = getStepActionInfo(rawStatusVal);

                  return (
                    <div
                      key={j.id}
                      className="flex flex-col justify-between rounded-3xl border border-border bg-card p-5 shadow-xs hover:shadow-md transition-shadow"
                    >
                      <div>
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-start gap-3 min-w-0 flex-1">
                            <CategoryIcon
                              category={j.category}
                              className="size-12 shrink-0 rounded-2xl"
                            />
                            <div className="min-w-0 flex-1">
                              <h3 className="font-bold text-base leading-snug line-clamp-2">
                                {j.title}
                              </h3>
                              <span className="text-xs text-muted-foreground block mt-0.5">
                                {j.category}
                              </span>
                            </div>
                          </div>
                          <div className="shrink-0 pt-0.5">
                            <StatusBadge status={rawStatusVal} />
                          </div>
                        </div>

                        <p className="mt-3 text-xs text-muted-foreground line-clamp-2">
                          {j.description}
                        </p>

                        {/* Visual 5-Stage Mini Progress Stepper */}
                        <div className="mt-3.5 rounded-2xl bg-muted/40 border border-border/60 p-2.5">
                          <div className="flex items-center justify-between text-[11px] mb-1.5 font-bold">
                            <span className="text-muted-foreground flex items-center gap-1">
                              <Wrench className="size-3 text-brand" /> Tiến độ quy trình
                            </span>
                            <span className={cn("font-black whitespace-nowrap", stepInfo.isCompleted ? "text-emerald-600 dark:text-emerald-400" : "text-brand")}>
                              {stepInfo.isCompleted ? "✓ Đã hoàn tất 5/5 bước (100%)" : stepInfo.badgeText}
                            </span>
                          </div>
                          <div className="grid grid-cols-5 gap-1.5">
                            {[1, 2, 3, 4, 5].map((s) => {
                              const isDone = stepInfo.step >= s;
                              const isActive = stepInfo.step === s - 1;
                              return (
                                <div
                                  key={s}
                                  className={cn(
                                    "h-1.5 rounded-full transition-all",
                                    isDone && "bg-emerald-500",
                                    isActive && "bg-brand animate-pulse",
                                    !isDone && !isActive && "bg-border"
                                  )}
                                />
                              );
                            })}
                          </div>
                        </div>

                        <div className="mt-3 grid grid-cols-2 gap-2 rounded-2xl bg-muted/30 p-3 text-xs">
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
                              Chi phí
                            </span>
                            <span className="font-bold text-brand">
                              {j.status === "completed" && j.finalPrice != null
                                ? formatVND(j.finalPrice)
                                : j.status === "completed"
                                  ? "Chưa ghi nhận"
                                  : "Thỏa thuận trực tiếp"}
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
                          {j.distanceKm != null
                            ? `Khoảng cách: ${j.distanceKm < 1 ? `${Math.round(j.distanceKm * 1000)}m` : `${j.distanceKm.toFixed(1)} km`}`
                            : (j.address || 'Đà Nẵng')}
                        </span>
                        <Button
                          onClick={() => openJobDetail(j.id)}
                          className={cn(
                            "rounded-xl font-bold transition-all shadow-xs",
                            stepInfo.isCompleted
                              ? "bg-secondary text-foreground hover:bg-muted"
                              : "bg-brand text-brand-foreground hover:brightness-110"
                          )}
                        >
                          <span>{actionInfo.label}</span>
                          <ChevronRight className="ml-1 size-4" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      ) : providerTab === "profile" || providerTab === "membership" ? (
        <div className="mt-8 space-y-6">
          {/* Sub-navigation tabs inside Profile */}
          <div className="flex items-center gap-2 border-b border-border pb-4 overflow-x-auto no-scrollbar">
            <button
              onClick={() => {
                setProviderTab("profile");
                setProfileSubTab("info");
              }}
              className={cn(
                "flex items-center gap-2 rounded-2xl px-4 py-2.5 text-xs font-bold transition-all shrink-0",
                profileSubTab === "info" && providerTab !== "membership"
                  ? "bg-brand text-brand-foreground shadow-sm font-black"
                  : "border border-border bg-card text-muted-foreground hover:text-foreground"
              )}
            >
              <User className="size-4" />
              <span>Thông tin cá nhân & Giấy tờ</span>
            </button>

            <button
              onClick={() => {
                setProviderTab("profile");
                setProfileSubTab("skills");
              }}
              className={cn(
                "flex items-center gap-2 rounded-2xl px-4 py-2.5 text-xs font-bold transition-all shrink-0",
                profileSubTab === "skills" && providerTab !== "membership"
                  ? "bg-brand text-brand-foreground shadow-sm font-black"
                  : "border border-border bg-card text-muted-foreground hover:text-foreground"
              )}
            >
              <Wrench className="size-4" />
              <span>Kỹ năng</span>
            </button>

            <button
              onClick={() => setProfileSubTab("membership")}
              className={cn(
                "flex items-center gap-2 rounded-2xl px-4 py-2.5 text-xs font-bold transition-all shrink-0",
                profileSubTab === "membership" || providerTab === "membership"
                  ? "bg-brand text-brand-foreground shadow-sm font-black"
                  : "border border-border bg-card text-muted-foreground hover:text-foreground"
              )}
            >
              <CreditCard className="size-4" />
              <span>Gói thợ & Thành viên</span>
            </button>
          </div>

          {(profileSubTab === "membership" || providerTab === "membership") ? (
            <MembershipPage
              onGoToProfile={() => {
                setProviderTab("profile");
                setProfileSubTab("info");
              }}
              isVerified={currentUser?.verifiedStatus === "verified"}
            />
          ) : profileSubTab === "skills" ? (
            <MySkillsPage />
          ) : (
            <ProviderProfilePage />
          )}
        </div>
      ) : providerTab === "availability" ? (
        <div className="mt-8">
          <AvailabilityMainView onAcceptingStatusChange={handleAcceptingStatusChange} />
        </div>
      ) : providerTab === "reviews" ? (
        currentUser?.id ? (
          <ProviderReviewsView providerId={currentUser.id} />
        ) : (
          <div role="alert" className="mt-8 rounded-2xl border border-destructive/30 bg-destructive/5 p-5 text-sm text-destructive">
            Không thể xác định tài khoản thợ để tải đánh giá.
          </div>
        )
      ) : providerTab === "jobs" ? (
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

          {filteredRequests.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-border bg-card/50 p-12 text-center">
              <div className="flex size-14 items-center justify-center rounded-2xl bg-muted text-muted-foreground mb-4">
                <Briefcase className="size-7" />
              </div>
              <h3 className="text-base font-bold text-foreground">
                Hiện không có yêu cầu việc mới nào
              </h3>
              <p className="mt-1.5 max-w-md text-xs sm:text-sm text-muted-foreground">
                Khi có khách hàng đặt dịch vụ phù hợp hoặc nhân viên vận hành phân công đơn mới, yêu cầu sẽ xuất hiện tại đây để bạn xác nhận trong vòng 12 giờ.
              </p>
            </div>
          ) : (
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
                        {r.distanceKm != null ? (
                          <span className="rounded-full bg-secondary px-2.5 py-1 text-xs font-bold text-secondary-foreground">
                            Cách {r.distanceKm < 1 ? `${Math.round(r.distanceKm * 1000)}m` : `${r.distanceKm.toFixed(1)} km`}
                          </span>
                        ) : (
                          <span className="rounded-full bg-secondary px-2.5 py-1 text-xs font-medium text-muted-foreground">
                            {r.address || 'Đà Nẵng'}
                          </span>
                        )}
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
          )}
        </div>
      ) : null}
    </div>
  );
}
