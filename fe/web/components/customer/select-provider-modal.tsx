"use client";

import { useState, useEffect, useCallback } from "react";
import {
  X,
  Sparkles,
  Star,
  MapPin,
  CheckCircle2,
  Clock,
  ShieldCheck,
  ChevronRight,
  Briefcase,
  Loader2,
  Users,
} from "lucide-react";
import {
  getDispatchRecommendedProviders,
  customerSelectProvider,
  type RecommendedProviderItem,
} from "@/lib/api/service-requests";
import { cn, formatVND } from "@/lib/utils";

interface SelectProviderModalProps {
  isOpen: boolean;
  requestId: string;
  requestTitle?: string;
  onClose: () => void;
  onSuccess?: () => void;
}

type SortOption = "score" | "rating" | "distance";

export function SelectProviderModal({
  isOpen,
  requestId,
  requestTitle,
  onClose,
  onSuccess,
}: SelectProviderModalProps) {
  const [providers, setProviders] = useState<RecommendedProviderItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<SortOption>("score");
  const [radiusKm, setRadiusKm] = useState<number>(25);
  const [selectingId, setSelectingId] = useState<string | null>(null);
  const [successProvider, setSuccessProvider] = useState<string | null>(null);

  const fetchProviders = useCallback(async () => {
    if (!requestId) return;
    setLoading(true);
    setError(null);
    try {
      const data = await getDispatchRecommendedProviders(requestId, {
        limit: 15,
        radiusKm,
        sortBy,
      });
      setProviders(data);
    } catch (err: any) {
      setError(
        err.message || "Không thể tải danh sách thợ đề xuất. Vui lòng thử lại."
      );
    } finally {
      setLoading(false);
    }
  }, [requestId, radiusKm, sortBy]);

  useEffect(() => {
    if (isOpen && requestId) {
      setSuccessProvider(null);
      setSelectingId(null);
      void fetchProviders();
    }
  }, [isOpen, requestId, fetchProviders]);

  const handleSelect = async (provider: RecommendedProviderItem) => {
    setSelectingId(provider.providerId);
    setError(null);
    try {
      await customerSelectProvider(requestId, provider.providerId);
      setSuccessProvider(provider.fullName || "đối tác thợ");
      if (onSuccess) {
        onSuccess();
      }
      setTimeout(() => {
        onClose();
      }, 1800);
    } catch (err: any) {
      setError(
        err.message || "Không thể chọn thợ này. Vui lòng thử chọn thợ khác."
      );
    } finally {
      setSelectingId(null);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="fixed inset-0"
        aria-hidden="true"
        onClick={() => !selectingId && onClose()}
      />

      <div className="relative z-10 flex flex-col w-full max-w-2xl max-h-[90vh] bg-background border border-border rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-card">
          <div className="flex items-center gap-2.5">
            <div className="flex items-center justify-center size-9 rounded-2xl bg-brand/10 text-brand">
              <Sparkles className="size-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-foreground">
                Chọn thợ cho yêu cầu của bạn
              </h3>
              <p className="text-xs text-muted-foreground truncate max-w-sm">
                {requestTitle || "Hệ thống gợi ý các thợ phù hợp nhất tại Đà Nẵng"}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={!!selectingId}
            className="p-2 text-muted-foreground hover:text-foreground rounded-full hover:bg-muted/80 transition-colors"
          >
            <X className="size-5" />
          </button>
        </div>

        {/* Success Splash */}
        {successProvider ? (
          <div className="flex flex-col items-center justify-center p-12 text-center">
            <div className="flex items-center justify-center size-16 rounded-full bg-emerald-500/10 text-emerald-600 mb-4 animate-bounce">
              <CheckCircle2 className="size-10" />
            </div>
            <h4 className="text-xl font-bold text-foreground">
              Đã gửi yêu cầu thành công!
            </h4>
            <p className="text-sm text-muted-foreground mt-2 max-w-md">
              Yêu cầu của bạn đã được chuyển tới thợ{" "}
              <span className="font-semibold text-foreground">
                {successProvider}
              </span>
              . Thợ sẽ liên hệ và xác nhận lịch hẹn trong ít phút.
            </p>
          </div>
        ) : (
          <>
            {/* Filter Bar */}
            <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-3 border-b border-border bg-muted/30">
              {/* Sort Tabs */}
              <div className="flex items-center gap-1.5 p-1 bg-muted rounded-xl">
                <button
                  type="button"
                  onClick={() => setSortBy("score")}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all",
                    sortBy === "score"
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <Sparkles className="size-3.5 text-amber-500" />
                  Điểm phù hợp
                </button>
                <button
                  type="button"
                  onClick={() => setSortBy("rating")}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all",
                    sortBy === "rating"
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <Star className="size-3.5 text-amber-500 fill-amber-500" />
                  Đánh giá cao
                </button>
                <button
                  type="button"
                  onClick={() => setSortBy("distance")}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all",
                    sortBy === "distance"
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <MapPin className="size-3.5 text-sky-500" />
                  Gần nhất
                </button>
              </div>

              {/* Radius filter */}
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <span>Bán kính:</span>
                {[10, 15, 25].map((km) => (
                  <button
                    key={km}
                    type="button"
                    onClick={() => setRadiusKm(km)}
                    className={cn(
                      "px-2 py-0.5 rounded-md font-medium transition-colors",
                      radiusKm === km
                        ? "bg-brand text-brand-foreground font-bold"
                        : "bg-muted text-muted-foreground hover:text-foreground"
                    )}
                  >
                    {km} km
                  </button>
                ))}
              </div>
            </div>

            {/* Error banner */}
            {error && (
              <div className="mx-6 mt-4 p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs">
                {error}
              </div>
            )}

            {/* Providers List */}
            <div className="flex-1 overflow-y-auto p-6 space-y-3.5">
              {loading ? (
                <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-3">
                  <Loader2 className="size-8 animate-spin text-brand" />
                  <p className="text-sm">Đang tìm kiếm thợ phù hợp tại Đà Nẵng...</p>
                </div>
              ) : providers.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <div className="flex items-center justify-center size-14 rounded-full bg-muted text-muted-foreground mb-3">
                    <Users className="size-7" />
                  </div>
                  <h4 className="text-sm font-bold text-foreground">
                    Chưa tìm thấy thợ phù hợp trong bán kính {radiusKm}km
                  </h4>
                  <p className="text-xs text-muted-foreground mt-1 max-w-sm">
                    Bạn có thể thử tăng bán kính lên 25km, hoặc chọn &ldquo;Để hệ thống tự điều phối&rdquo; để nhân viên CSKH hỗ trợ.
                  </p>
                </div>
              ) : (
                providers.map((p) => {
                  const isSelecting = selectingId === p.providerId;
                  const initial = (p.fullName || "T")[0].toUpperCase();

                  return (
                    <div
                      key={p.providerId}
                      className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl border border-border bg-card hover:border-brand/50 hover:shadow-md transition-all group"
                    >
                      <div className="flex items-start gap-3.5">
                        {/* Avatar */}
                        {p.avatarUrl ? (
                          <img
                            src={p.avatarUrl}
                            alt={p.fullName}
                            className="size-12 rounded-2xl object-cover shrink-0 border border-border"
                          />
                        ) : (
                          <div className="size-12 rounded-2xl bg-gradient-to-br from-brand/20 to-brand/40 text-brand flex items-center justify-center font-bold text-lg shrink-0 border border-brand/20">
                            {initial}
                          </div>
                        )}

                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <h4 className="text-sm font-bold text-foreground truncate">
                              {p.fullName}
                            </h4>
                            <span className="inline-flex items-center gap-0.5 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded-full">
                              <ShieldCheck className="size-3" />
                              Đã xác thực
                            </span>
                          </div>

                          {p.businessName && (
                            <p className="text-xs text-muted-foreground truncate font-medium">
                              {p.businessName}
                            </p>
                          )}

                          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1.5 text-xs text-muted-foreground">
                            {/* Rating */}
                            <span className="flex items-center gap-1 font-semibold text-amber-500">
                              <Star className="size-3.5 fill-amber-500" />
                              {p.averageRating ? p.averageRating.toFixed(1) : "5.0"}
                              <span className="text-muted-foreground font-normal">
                                ({p.reviewCount || 0})
                              </span>
                            </span>

                            {/* Completed jobs */}
                            <span className="flex items-center gap-1">
                              <Briefcase className="size-3.5" />
                              {p.completedJobCount || 0} việc
                            </span>

                            {/* Distance */}
                            {typeof p.distanceKm === "number" && (
                              <span className="flex items-center gap-1 text-sky-600 dark:text-sky-400 font-medium">
                                <MapPin className="size-3.5" />
                                {p.distanceKm < 1
                                  ? `${Math.round(p.distanceKm * 1000)}m`
                                  : `${p.distanceKm.toFixed(1)} km`}
                              </span>
                            )}
                          </div>

                          {/* Reasons/Highlights */}
                          {p.reasons && p.reasons.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-2">
                              {p.reasons.map((r, i) => (
                                <span
                                  key={i}
                                  className="text-[10px] font-medium bg-muted px-2 py-0.5 rounded-md text-muted-foreground"
                                >
                                  {r}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Select Action Button */}
                      <button
                        type="button"
                        onClick={() => handleSelect(p)}
                        disabled={!!selectingId}
                        className={cn(
                          "sm:self-center shrink-0 flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-bold rounded-xl transition-all shadow-sm",
                          "bg-brand text-brand-foreground hover:brightness-105 active:scale-95 disabled:opacity-50"
                        )}
                      >
                        {isSelecting ? (
                          <>
                            <Loader2 className="size-3.5 animate-spin" />
                            Đang xử lý...
                          </>
                        ) : (
                          <>
                            Chọn thợ này
                            <ChevronRight className="size-3.5" />
                          </>
                        )}
                      </button>
                    </div>
                  );
                })
              )}
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-between px-6 py-4 border-t border-border bg-card">
              <span className="text-xs text-muted-foreground">
                Chưa muốn chọn ngay?
              </span>
              <button
                type="button"
                onClick={onClose}
                disabled={!!selectingId}
                className="px-4 py-2 text-xs font-semibold rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              >
                Để hệ thống tự điều phối (Bỏ qua)
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
