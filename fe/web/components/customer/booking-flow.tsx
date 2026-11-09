"use client";

import { useState, useRef, useEffect } from "react";
import {
  X,
  Sparkles,
  Calendar,
  Clock,
  MapPin,
  ImagePlus,
  Check,
  ChevronLeft,
  ChevronDown,
  Wallet,
  Loader2,
  Search,
  ExternalLink,
  Navigation,
  Home,
  Compass,
} from "lucide-react";
import { useApp } from "../app-store";
import { formatVND } from "@/lib/utils";
import { CtaButton, BrandButton } from "../shared";
import { CategoryIcon as DbCategoryIcon } from "@/lib/category-meta";
import type { ServiceCategory } from "@/lib/types";
import { filterSafeUrls } from "@/lib/safe-url";
import { cn } from "@/lib/utils";
import { SelectProviderModal } from "./select-provider-modal";
import {
  getEstimatedServiceDurationMinutes,
  uploadRequestImages,
  customerSelectProvider,
} from "@/lib/api/service-requests";
import {
  searchVietmapPlaces,
  fetchVietmapPlaceDetail,
  geocodeAddress,
  getCurrentBrowserCoordinates,
  reverseGeocodeCoords,
  type VietmapAddressSuggestion,
} from "@/lib/vietmap";
import { VietmapCanvas } from "./vietmap-canvas";
import { AiPriceCalculator } from "./ai-price-calculator";
import { formatVietnamDate, getVietnamParts, vietnamDateKey, vietnamWallClockToDate } from "@/lib/timezone";

function getLocalDateKey(date: Date) {
  return vietnamDateKey(date);
}

function getMaxBookingDate() {
  return vietnamDateKey(Date.now() + 13 * 24 * 60 * 60 * 1000);
}

function isBookingDateAllowed(date: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return false;
  const [year, month, day] = date.split("-").map(Number);
  const parsedDate = vietnamWallClockToDate(year, month, day);
  const parsedParts = getVietnamParts(parsedDate);
  if (
    Number.isNaN(parsedDate.getTime()) ||
    parsedParts.year !== year ||
    parsedParts.month !== month ||
    parsedParts.day !== day
  ) {
    return false;
  }
  const today = getLocalDateKey(new Date());
  return date >= today && date <= getMaxBookingDate();
}

function getEarliestTime(date: string) {
  const now = new Date();
  if (date !== getLocalDateKey(now)) return "08:00";
  const earliest = new Date(now.getTime() + 15 * 60_000);
  const earliestParts = getVietnamParts(earliest);
  const minutes =
    Math.ceil((earliestParts.hour * 60 + earliestParts.minute) / 15) * 15;
  if (minutes > 17 * 60) return "17:30";
  return `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;
}

function getAvailableTimeSlots(date: string, durationMinutes: number) {
  if (!isBookingDateAllowed(date)) return [];
  const slots: string[] = [];
  const latestStart = 17 * 60 - durationMinutes;
  const now = new Date();
  for (let minutes = 8 * 60; minutes <= latestStart; minutes += 15) {
    const hourText = String(Math.floor(minutes / 60)).padStart(2, "0");
    const minuteText = String(minutes % 60).padStart(2, "0");
    const value = `${hourText}:${minuteText}`;
    const [year, month, day] = date.split("-").map(Number);
    const [slotHour, slotMinute] = value.split(":").map(Number);
    const slotDate = vietnamWallClockToDate(year, month, day, slotHour, slotMinute);
    if (
      date !== getLocalDateKey(now) ||
      slotDate.getTime() > now.getTime() + 15 * 60_000
    ) {
      slots.push(value);
    }
  }
  return slots;
}

function formatBookingDate(date: string) {
  const [year, month, day] = date.split("-").map(Number);
  return formatVietnamDate(vietnamWallClockToDate(year, month, day, 12), {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

const STEPS = ["Dịch vụ", "Thời gian", "Thông tin", "Xác nhận"];

export function BookingFlow() {
  const {
    bookingFlowOpen,
    closeBookingFlow,
    presetCategory,
    presetService,
    presetProvider,
    loadUserBookings,
    submitBooking,
    backendServices,
    serviceCategories,
    serviceCategoriesLoading,
    serviceCategoriesError,
    isLoggedIn,
    openAuthModal,
    currentUser,
    setCustomerTab,
  } = useApp();

  const [step, setStep] = useState(0);
  const [createdRequestId, setCreatedRequestId] = useState<string | null>(null);
  const [category, setCategory] = useState<ServiceCategory>(
    presetCategory ?? "",
  );
  const [title, setTitle] = useState(presetService?.name ?? "");
  const [description, setDescription] = useState(
    presetService?.description ?? "",
  );
  const [selectedDate, setSelectedDate] = useState(() =>
    getLocalDateKey(new Date()),
  );
  const [hour, setHour] = useState("09");
  const [minute, setMinute] = useState("00");
  const [isHourDropdownOpen, setIsHourDropdownOpen] = useState(false);
  const [isMinuteDropdownOpen, setIsMinuteDropdownOpen] = useState(false);
  const [address, setAddress] = useState(currentUser?.address ?? "");
  const [addressSource, setAddressSource] = useState<"profile" | "custom">(
    "profile",
  );
  const [customAddress, setCustomAddress] = useState("");
  const [customCoords, setCustomCoords] = useState<[number, number] | null>(
    null,
  );
  const [profileCoords, setProfileCoords] = useState<[number, number] | null>(
    null,
  );
  const [isSearchingAddress, setIsSearchingAddress] = useState(false);
  const [addressSuggestions, setAddressSuggestions] = useState<
    VietmapAddressSuggestion[]
  >([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const addressContainerRef = useRef<HTMLDivElement>(null);
  const lastSelectedAddressRef = useRef<string | null>(null);
  const [photos, setPhotos] = useState(0);
  const [attachments, setAttachments] = useState<string[]>([]);
  const [isUploadingImages, setIsUploadingImages] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [budget, setBudget] = useState(500000);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isLocatingCurrent, setIsLocatingCurrent] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const serviceDurationMinutes = getEstimatedServiceDurationMinutes(
    category,
    backendServices,
  );
  const timeSlots = getAvailableTimeSlots(selectedDate, serviceDurationMinutes);
  const earliestTime = getEarliestTime(selectedDate);
  const latestTime = timeSlots[timeSlots.length - 1] || earliestTime;
  const time = hour && minute ? `${hour}:${minute}` : "";
  const availableHours = Array.from(
    new Set(timeSlots.map((slot) => slot.slice(0, 2))),
  );
  const availableMinutes = timeSlots
    .filter((slot) => slot.startsWith(`${hour}:`))
    .map((slot) => slot.slice(3));
  const isTimeValid = timeSlots.includes(time);

  useEffect(() => {
    const firstSlot = timeSlots[0];
    setHour(firstSlot?.slice(0, 2) || "");
    setMinute(firstSlot?.slice(3) || "");
  }, [selectedDate, serviceDurationMinutes]);

  const handleUseCurrentLocation = async () => {
    setIsLocatingCurrent(true);
    setLocationError(null);
    try {
      const coords = await getCurrentBrowserCoordinates();
      setCustomCoords(coords);
      setAddressSource("custom");
      const resolved = await reverseGeocodeCoords(coords);
      if (resolved) {
        setCustomAddress(resolved);
        setAddress(resolved);
        lastSelectedAddressRef.current = resolved;
      }
    } catch (err: unknown) {
      const msg =
        err instanceof Error
          ? err.message
          : "Không thể lấy vị trí hiện tại. Vui lòng cho phép quyền truy cập vị trí trên trình duyệt.";
      setLocationError(msg);
    } finally {
      setIsLocatingCurrent(false);
    }
  };

  const effectiveAddress =
    addressSource === "profile" && currentUser?.address
      ? currentUser.address
      : customAddress.trim() || address.trim() || "TP.HCM";

  // Priority to exact GPS coordinates (latitude, longitude) over raw text addresses
  // to prevent errors caused by recent administrative boundary reorganizations/mergers in Vietnam
  const activeCoords =
    addressSource === "profile"
      ? profileCoords || customCoords
      : customCoords || profileCoords;

  const googleMapsUrl = activeCoords
    ? `https://www.google.com/maps/search/?api=1&query=${activeCoords[1]},${activeCoords[0]}`
    : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(effectiveAddress)}`;

  // Pre-geocode profile address so map preview can immediately center on it
  useEffect(() => {
    if (currentUser?.address) {
      geocodeAddress(currentUser.address).then((coords) => {
        if (coords) setProfileCoords(coords);
      });
    } else {
      setProfileCoords(null);
    }
  }, [currentUser?.address]);

  // Dismiss suggestions dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        addressContainerRef.current &&
        !addressContainerRef.current.contains(e.target as Node)
      ) {
        setShowSuggestions(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // 100% API-driven autocomplete on user typing (VietMap API v4 / Live Geocoding)
  useEffect(() => {
    const q = customAddress.trim();
    if (!q || q.length < 2) {
      setAddressSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    // Skip auto-search if address was just picked from suggestion dropdown
    if (
      lastSelectedAddressRef.current &&
      q.toLowerCase() === lastSelectedAddressRef.current.trim().toLowerCase()
    ) {
      return;
    }

    setIsSearchingAddress(true);
    const timer = setTimeout(async () => {
      try {
        const results = await searchVietmapPlaces(q);
        setAddressSuggestions(results);
        setShowSuggestions(results.length > 0);
      } catch (err) {
        console.error("VietMap API search error:", err);
      } finally {
        setIsSearchingAddress(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [customAddress]);

  const handleSelectSuggestion = async (item: VietmapAddressSuggestion) => {
    lastSelectedAddressRef.current = item.label;
    setShowSuggestions(false);
    setAddressSuggestions([]);
    setCustomAddress(item.label);
    setAddress(item.label);

    if (item.refId && !item.refId.startsWith("osm_")) {
      setIsSearchingAddress(true);
      try {
        const details = await fetchVietmapPlaceDetail(item.refId);
        if (details) {
          lastSelectedAddressRef.current = details.address || item.label;
          setCustomAddress(details.address || item.label);
          setAddress(details.address || item.label);
          setCustomCoords(details.coords);
        }
      } finally {
        setIsSearchingAddress(false);
      }
    } else {
      setCustomCoords(item.coords);
    }
  };

  const searchAddressOnMap = async (query: string) => {
    if (!query || query.trim().length === 0) return;
    lastSelectedAddressRef.current = null;
    setIsSearchingAddress(true);
    try {
      const results = await searchVietmapPlaces(query);
      setAddressSuggestions(results);
      setShowSuggestions(results.length > 0);
    } finally {
      setIsSearchingAddress(false);
    }
  };

  // Reset when opening
  useEffect(() => {
    if (bookingFlowOpen) {
      setStep(0);
      setCategory(presetCategory ?? "");
      setTitle(presetService?.name ?? "");
      setDescription(presetService?.description ?? "");
      const today = getLocalDateKey(new Date());
      setSelectedDate(today);
      const firstSlot =
        getAvailableTimeSlots(today, serviceDurationMinutes)[0] || "";
      setHour(firstSlot.slice(0, 2));
      setMinute(firstSlot.slice(3));
      setAddress(currentUser?.address ?? "");
      setPhotos(0);
      setAttachments([]);
      setIsUploadingImages(false);
      setBudget(500000);
      setIsSubmitting(false);
      setSubmitError(null);
      setCreatedRequestId(null);
    }
  }, [bookingFlowOpen, presetCategory, presetService, currentUser?.address]);

  useEffect(() => {
    if (
      serviceCategories.length > 0 &&
      !serviceCategories.some((item) => item.name === category)
    ) {
      setCategory(serviceCategories[0].name);
    }
  }, [category, serviceCategories]);

  if (createdRequestId) {
    return (
      <SelectProviderModal
        isOpen={true}
        requestId={createdRequestId}
        requestTitle={title.trim() || `${category} service`}
        onClose={() => {
          setCreatedRequestId(null);
          closeBookingFlow();
          setCustomerTab("bookings");
        }}
        onSuccess={() => {
          setCreatedRequestId(null);
          closeBookingFlow();
          setCustomerTab("bookings");
        }}
      />
    );
  }

  if (!bookingFlowOpen) return null;

  const canNext =
    step === 0
      ? category.length > 0 && title.trim().length > 0
      : step === 1
        ? isBookingDateAllowed(selectedDate) &&
          isTimeValid &&
          !!effectiveAddress.trim()
        : true;

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    if (!isLoggedIn) {
      setSubmitError("Vui lòng đăng nhập trước khi đính kèm hình ảnh.");
      openAuthModal("login");
      return;
    }

    const remaining = 5 - attachments.length;
    if (remaining <= 0) return;

    const filesToUpload = Array.from(files).slice(0, remaining);
    setIsUploadingImages(true);
    setSubmitError(null);

    try {
      const urls = await uploadRequestImages(filesToUpload);
      setAttachments((prev) => [...prev, ...urls].slice(0, 5));
      setPhotos((p) => Math.min(5, p + urls.length));
    } catch (err: any) {
      setSubmitError(
        err.message || "Không thể tải ảnh lên Cloudinary. Vui lòng thử lại.",
      );
    } finally {
      setIsUploadingImages(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleRemovePhoto = (index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
    setPhotos((p) => Math.max(0, p - 1));
  };

  const handleSubmit = async () => {
    if (!isBookingDateAllowed(selectedDate)) {
      setSubmitError("Ngày đặt lịch phải nằm trong 14 ngày kể từ hôm nay.");
      return;
    }
    if (!isTimeValid) {
      setSubmitError(
        "Vui lòng chọn giờ và phút hợp lệ trong khung giờ cho phép.",
      );
      return;
    }
    if (!isLoggedIn) {
      closeBookingFlow();
      openAuthModal("login");
      return;
    }
    setIsSubmitting(true);
    setSubmitError(null);
    try {
      const createdBooking = await submitBooking({
        category,
        title: title.trim() || `${category} service`,
        description: description.trim(),
        date: selectedDate,
        time,
        address: effectiveAddress,
        coordinates: activeCoords || undefined,
        budget,
        photos: attachments.length,
        attachments,
      });
      const reqId = createdBooking?.requestId || createdBooking?.id;
      if (reqId) {
        if (presetProvider) {
          try {
            await customerSelectProvider(reqId, presetProvider.id);
            await loadUserBookings("customer");
            closeBookingFlow();
            setCustomerTab("bookings");
            return;
          } catch (selectErr: any) {
            console.warn("Could not auto-select preset provider:", selectErr);
            setCreatedRequestId(reqId);
          }
        } else {
          setCreatedRequestId(reqId);
        }
      } else {
        closeBookingFlow();
        setCustomerTab("bookings");
      }
    } catch (err: any) {
      setSubmitError(
        err.message || "Không thể tạo yêu cầu dịch vụ. Vui lòng thử lại.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        aria-label="Close"
        onClick={closeBookingFlow}
        className="absolute inset-0"
      />
      <div className="relative z-10 flex w-full max-w-xl max-h-[90vh] flex-col rounded-3xl border border-border bg-background shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-4 pt-3 pb-2">
          {step > 0 ? (
            <button
              onClick={() => setStep((s) => s - 1)}
              className="flex size-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted"
            >
              <ChevronLeft className="size-5" />
            </button>
          ) : (
            <div className="size-8" />
          )}
          <div className="mx-auto -mt-1 h-1 w-10 rounded-full bg-border" />
          <button
            onClick={closeBookingFlow}
            className="flex size-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted"
          >
            <X className="size-5" />
          </button>
        </div>

        {/* Progress */}
        <div className="flex items-center gap-1.5 px-4 pb-3">
          {STEPS.map((s, i) => (
            <div key={s} className="flex flex-1 flex-col gap-1">
              <div
                className={cn(
                  "h-1.5 rounded-full transition-colors",
                  i <= step ? "bg-brand" : "bg-muted",
                )}
              />
              <span
                className={cn(
                  "text-[10px] font-semibold",
                  i <= step ? "text-brand" : "text-muted-foreground",
                )}
              >
                {s}
              </span>
            </div>
          ))}
        </div>

        {/* Body */}
        <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-2">
          {step === 0 && (
            <div className="flex flex-col gap-4 py-1">
              <div>
                <label className="mb-2 block text-sm font-bold">
                  Chọn dịch vụ cần hỗ trợ
                </label>
                <div className="grid max-h-48 grid-cols-3 gap-2 overflow-y-auto pr-1">
                  {serviceCategories.map((c) => (
                    <button
                      key={c.id}
                      onClick={() => setCategory(c.name)}
                      className={cn(
                        "flex flex-col items-center gap-2 rounded-2xl border p-3 transition-all",
                        category === c.name
                          ? "border-brand bg-secondary"
                          : "border-border bg-card hover:border-brand/40",
                      )}
                    >
                      <DbCategoryIcon icon={c.icon} slug={c.slug} className="size-9" />
                      <span className="text-[11px] font-semibold">
                        {c.name}
                      </span>
                    </button>
                  ))}
                  {serviceCategories.length === 0 && (
                    <p className="col-span-3 py-4 text-center text-xs text-muted-foreground">
                      {serviceCategoriesLoading
                        ? "Đang tải danh mục..."
                        : serviceCategoriesError ||
                          "Chưa có danh mục khả dụng."}
                    </p>
                  )}
                </div>
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-bold">
                  Bạn cần hỗ trợ việc gì?
                </label>
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="VD: Sửa vòi nước rò rỉ bồn rửa chén"
                  className="w-full rounded-xl border border-border bg-card px-3.5 py-3 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
                />
                {!isBookingDateAllowed(selectedDate) && (
                  <p className="mt-1 text-xs text-destructive">
                    Ngày đặt lịch phải nằm trong 14 ngày kể từ hôm nay.
                  </p>
                )}
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-bold">
                  Mô tả sự cố & hiện tượng
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={4}
                  placeholder="Nhập mô tả sự cố của bạn tại đây để thợ chuẩn bị dụng cụ và AI phân tích chi phí..."
                  className="w-full resize-none rounded-xl border border-border bg-card px-3.5 py-3 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
                />
              </div>

              {/* AI Price Breakdown & Anti-Overcharge Smart Estimator */}
              <AiPriceCalculator
                description={description}
                categoryName={category}
                className="mt-1"
              />
            </div>
          )}

          {step === 1 && (
            <div className="flex flex-col gap-4 py-1">
              <div>
                <label
                  htmlFor="booking-date"
                  className="mb-2 flex items-center gap-1.5 text-sm font-bold"
                >
                  <Calendar className="size-4 text-brand" />
                  Chọn ngày phục vụ
                </label>
                <input
                  id="booking-date"
                  aria-label="Ngày phục vụ"
                  type="date"
                  min={getLocalDateKey(new Date())}
                  max={getMaxBookingDate()}
                  value={selectedDate}
                  onChange={(event) => setSelectedDate(event.target.value)}
                  aria-invalid={!isBookingDateAllowed(selectedDate)}
                  aria-describedby={
                    !isBookingDateAllowed(selectedDate)
                      ? "booking-date-error"
                      : undefined
                  }
                  className={cn(
                    "w-full rounded-xl border bg-card px-3.5 py-3 text-sm outline-none focus:ring-2",
                    isBookingDateAllowed(selectedDate)
                      ? "border-border focus:border-brand focus:ring-brand/20"
                      : "border-destructive focus:border-destructive focus:ring-destructive/20",
                  )}
                />
                {!isBookingDateAllowed(selectedDate) && (
                  <p
                    id="booking-date-error"
                    role="alert"
                    className="mt-1 text-xs text-destructive"
                  >
                    Vui lòng chọn ngày từ hôm nay đến tối đa 14 ngày tới.
                  </p>
                )}
              </div>
              <div>
                <label
                  htmlFor="booking-time"
                  className="mb-2 flex items-center gap-1.5 text-sm font-bold"
                >
                  <Clock className="size-4 text-brand" />
                  Chọn giờ bắt đầu
                </label>
                <p className="mb-2 text-xs text-muted-foreground">
                  Thời gian kết thúc dự kiến sau khoảng {serviceDurationMinutes}{" "}
                  phút. Đây là giờ ưu tiên; hệ thống chỉ gợi ý thợ có thể nhận
                  khung giờ này.
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label
                      htmlFor="booking-hour"
                      className="mb-1.5 block text-xs font-semibold text-muted-foreground"
                    >
                      Chọn giờ
                    </label>
                    <div className="relative">
                      <input
                        id="booking-hour"
                        aria-label="Giờ bắt đầu"
                        value={hour}
                        type="text"
                        inputMode="numeric"
                        placeholder="HH"
                        autoComplete="off"
                        maxLength={2}
                        disabled={timeSlots.length === 0}
                        aria-invalid={
                          hour.length > 0 && !availableHours.includes(hour)
                        }
                        aria-describedby={
                          hour.length > 0 && !availableHours.includes(hour)
                            ? "booking-time-error"
                            : undefined
                        }
                        onChange={(event) => {
                          setHour(event.target.value);
                          setIsHourDropdownOpen(false);
                        }}
                        className={cn(
                          "w-full rounded-xl border bg-card py-3 pl-3.5 pr-10 text-sm outline-none focus:ring-2 disabled:cursor-not-allowed disabled:opacity-50",
                          hour.length > 0 && !availableHours.includes(hour)
                            ? "border-destructive focus:border-destructive focus:ring-destructive/20"
                            : "border-border focus:border-brand focus:ring-brand/20",
                        )}
                      />
                      <button
                        type="button"
                        aria-label="Mở danh sách giờ"
                        aria-haspopup="listbox"
                        aria-expanded={isHourDropdownOpen}
                        disabled={timeSlots.length === 0}
                        onClick={() => setIsHourDropdownOpen((open) => !open)}
                        className="absolute inset-y-0 right-0 flex w-10 items-center justify-center text-muted-foreground disabled:cursor-not-allowed"
                      >
                        <ChevronDown aria-hidden="true" className="size-4" />
                      </button>
                      {isHourDropdownOpen && availableHours.length > 0 && (
                        <div
                          role="listbox"
                          aria-label="Các giờ khả dụng"
                          className="absolute left-0 right-0 top-full z-50 mt-1 max-h-48 overflow-y-auto rounded-xl border border-border bg-card p-1 shadow-lg"
                        >
                          {availableHours.map((value) => (
                            <button
                              key={value}
                              type="button"
                              role="option"
                              aria-selected={hour === value}
                              onClick={() => {
                                const firstSlotForHour = timeSlots.find(
                                  (slot) => slot.startsWith(`${value}:`),
                                );
                                setHour(value);
                                setMinute(firstSlotForHour?.slice(3) || "");
                                setIsHourDropdownOpen(false);
                              }}
                              className={cn(
                                "w-full rounded-lg px-3 py-2 text-left text-sm hover:bg-muted",
                                hour === value &&
                                  "bg-brand/10 font-semibold text-brand",
                              )}
                            >
                              {value}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                  <div>
                    <label
                      htmlFor="booking-minute"
                      className="mb-1.5 block text-xs font-semibold text-muted-foreground"
                    >
                      Chọn phút
                    </label>
                    <div className="relative">
                      <input
                        id="booking-minute"
                        aria-label="Phút bắt đầu"
                        value={minute}
                        type="text"
                        inputMode="numeric"
                        placeholder="MM"
                        autoComplete="off"
                        maxLength={2}
                        onChange={(event) => {
                          setMinute(event.target.value);
                          setIsMinuteDropdownOpen(false);
                        }}
                        disabled={timeSlots.length === 0}
                        aria-invalid={
                          minute.length > 0 &&
                          !availableMinutes.includes(minute)
                        }
                        aria-describedby={
                          minute.length > 0 &&
                          !availableMinutes.includes(minute)
                            ? "booking-time-error"
                            : undefined
                        }
                        className={cn(
                          "w-full rounded-xl border bg-card py-3 pl-3.5 pr-10 text-sm outline-none focus:ring-2 disabled:cursor-not-allowed disabled:opacity-50",
                          minute.length > 0 &&
                            !availableMinutes.includes(minute)
                            ? "border-destructive focus:border-destructive focus:ring-destructive/20"
                            : "border-border focus:border-brand focus:ring-brand/20",
                        )}
                      />
                      <button
                        type="button"
                        aria-label="Mở danh sách phút"
                        aria-haspopup="listbox"
                        aria-expanded={isMinuteDropdownOpen}
                        disabled={timeSlots.length === 0}
                        onClick={() => setIsMinuteDropdownOpen((open) => !open)}
                        className="absolute inset-y-0 right-0 flex w-10 items-center justify-center text-muted-foreground disabled:cursor-not-allowed"
                      >
                        <ChevronDown aria-hidden="true" className="size-4" />
                      </button>
                      {isMinuteDropdownOpen && availableMinutes.length > 0 && (
                        <div
                          role="listbox"
                          aria-label="Các phút khả dụng"
                          className="absolute left-0 right-0 top-full z-50 mt-1 max-h-48 overflow-y-auto rounded-xl border border-border bg-card p-1 shadow-lg"
                        >
                          {availableMinutes.map((value) => (
                            <button
                              key={value}
                              type="button"
                              role="option"
                              aria-selected={minute === value}
                              onClick={() => {
                                setMinute(value);
                                setIsMinuteDropdownOpen(false);
                              }}
                              className={cn(
                                "w-full rounded-lg px-3 py-2 text-left text-sm hover:bg-muted",
                                minute === value &&
                                  "bg-brand/10 font-semibold text-brand",
                              )}
                            >
                              {value}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  Chọn giờ và phút trong danh sách. Phút hợp lệ: 00, 15, 30, 45.
                  Giờ phục vụ từ {earliestTime} đến {latestTime}.
                </p>
                {(hour.length > 0 || minute.length > 0) && !isTimeValid && (
                  <p
                    id="booking-time-error"
                    role="alert"
                    className="mt-1 text-xs text-destructive"
                  >
                    Giờ hoặc phút không hợp lệ, ngoài lịch cho phép, hoặc không
                    đủ thời lượng dịch vụ.
                  </p>
                )}
                {timeSlots.length === 0 && (
                  <p className="mt-2 text-xs text-muted-foreground">
                    Không còn khung giờ phù hợp trong ngày này. Vui lòng chọn
                    ngày khác.
                  </p>
                )}
              </div>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-1.5 text-sm font-bold">
                    <MapPin className="size-4 text-brand" />
                    Địa chỉ thực hiện dịch vụ
                  </label>
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={handleUseCurrentLocation}
                      disabled={isLocatingCurrent}
                      title="Lấy vị trí GPS hiện tại của bạn"
                      className="inline-flex items-center gap-1 text-xs font-semibold text-brand hover:underline disabled:opacity-50"
                    >
                      {isLocatingCurrent ? (
                        <Loader2 className="size-3 animate-spin" />
                      ) : (
                        <Navigation className="size-3" />
                      )}
                    </button>
                    <a
                      href={googleMapsUrl}
                      target="_blank"
                      rel="noopener noreferrer nofollow"
                      title={
                        activeCoords
                          ? `Mở tọa độ GPS chính xác (${activeCoords[1].toFixed(5)}, ${activeCoords[0].toFixed(5)})`
                          : effectiveAddress
                      }
                      className="inline-flex items-center gap-1 text-xs font-semibold text-brand hover:underline"
                    >
                      Xem trong Google Maps
                      <ExternalLink className="size-3" />
                    </a>
                  </div>
                </div>

                {/* Option to use profile address or enter custom Google Maps address */}
                <div className="grid grid-cols-2 gap-2 rounded-2xl border border-border bg-muted/30 p-1">
                  <button
                    type="button"
                    onClick={() => {
                      setAddressSource("profile");
                      setShowSuggestions(false);
                      setAddressSuggestions([]);
                      setAddress(currentUser?.address ?? "");
                      if (currentUser?.address && !profileCoords) {
                        geocodeAddress(currentUser.address).then((coords) => {
                          if (coords) setProfileCoords(coords);
                        });
                      }
                    }}
                    className={cn(
                      "flex items-center justify-center gap-2 rounded-xl py-2 text-xs font-bold transition-all",
                      addressSource === "profile"
                        ? "bg-background text-foreground shadow-xs border border-border"
                        : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    <Home className="size-3.5" />
                    <span>Địa chỉ hồ sơ (mặc định)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setAddressSource("custom");
                      if (!customAddress) {
                        const initial = address || currentUser?.address || "";
                        setCustomAddress(initial);
                        if (initial && !customCoords) {
                          geocodeAddress(initial).then((coords) => {
                            if (coords) setCustomCoords(coords);
                          });
                        }
                      }
                    }}
                    className={cn(
                      "flex items-center justify-center gap-2 rounded-xl py-2 text-xs font-bold transition-all",
                      addressSource === "custom"
                        ? "bg-brand text-brand-foreground shadow-xs"
                        : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    <Compass className="size-3.5" />
                    <span>Nhập địa chỉ khác (Maps)</span>
                  </button>
                </div>

                {/* Profile Address Display */}
                {addressSource === "profile" && (
                  <div className="rounded-2xl border border-border bg-card p-3.5 space-y-2">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-2.5">
                        <Home className="size-4 text-brand mt-0.5 shrink-0" />
                        <div>
                          <p className="text-xs font-bold text-foreground">
                            {currentUser?.address
                              ? currentUser.address
                              : "Chưa có địa chỉ trong hồ sơ"}
                          </p>
                          <p className="text-[11px] text-muted-foreground mt-0.5">
                            {currentUser?.address
                              ? "Địa chỉ mặc định được lưu từ tài khoản của bạn."
                              : "Vui lòng chọn 'Nhập địa chỉ khác' bên cạnh để tìm vị trí."}
                          </p>
                        </div>
                      </div>
                      {currentUser?.address && (
                        <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-600 dark:text-emerald-400 shrink-0">
                          Mặc định
                        </span>
                      )}
                    </div>
                  </div>
                )}

                {/* Custom Address Input with VietMap Autocomplete */}
                {addressSource === "custom" && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs px-1">
                      <button
                        type="button"
                        onClick={handleUseCurrentLocation}
                        disabled={isLocatingCurrent}
                        className="inline-flex items-center gap-1.5 font-bold text-brand hover:underline"
                      >
                        {isLocatingCurrent ? (
                          <Loader2 className="size-3.5 animate-spin" />
                        ) : (
                          <Navigation className="size-3.5" />
                        )}
                        {isLocatingCurrent
                          ? "Đang định vị GPS..."
                          : "Sử dụng vị trí hiện tại của tôi (GPS)"}
                      </button>
                      {locationError && (
                        <span className="text-[11px] font-medium text-destructive">
                          {locationError}
                        </span>
                      )}
                    </div>
                    <div ref={addressContainerRef} className="relative">
                      <Search className="absolute left-3.5 top-3.5 size-4 text-muted-foreground" />
                      <input
                        value={customAddress}
                        onChange={(e) => {
                          const val = e.target.value;
                          lastSelectedAddressRef.current = null;
                          setCustomAddress(val);
                          setAddress(val);
                        }}
                        onFocus={() => {
                          if (
                            addressSuggestions.length > 0 &&
                            !lastSelectedAddressRef.current
                          ) {
                            setShowSuggestions(true);
                          }
                        }}
                        placeholder="Nhập địa chỉ của bạn..."
                        className="w-full rounded-2xl border border-border bg-card py-3 pl-10 pr-24 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/20 transition-all"
                      />
                      <div className="absolute right-2 top-2">
                        <button
                          type="button"
                          onClick={() => searchAddressOnMap(customAddress)}
                          disabled={isSearchingAddress || !customAddress.trim()}
                          className="flex items-center gap-1 rounded-xl bg-secondary px-2.5 py-1.5 text-xs font-bold text-brand hover:bg-brand/10 transition-colors"
                        >
                          {isSearchingAddress ? (
                            <Loader2 className="size-3.5 animate-spin" />
                          ) : (
                            <Navigation className="size-3.5" />
                          )}
                          <span>Tìm</span>
                        </button>
                      </div>

                      {/* Dropdown suggestions */}
                      {showSuggestions && addressSuggestions.length > 0 && (
                        <div className="absolute left-0 right-0 top-full z-30 mt-1 max-h-56 overflow-y-auto rounded-2xl border border-border bg-popover p-1.5 shadow-2xl animate-in fade-in slide-in-from-top-1">
                          <div className="flex items-center justify-between px-2.5 py-1 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                            <span>
                              Gợi ý địa chỉ ({addressSuggestions.length})
                            </span>
                          </div>
                          {addressSuggestions.map((item, idx) => (
                            <button
                              key={idx}
                              type="button"
                              onClick={() => handleSelectSuggestion(item)}
                              className="flex w-full items-start gap-2.5 rounded-xl p-2.5 text-left text-xs hover:bg-accent transition-colors group"
                            >
                              <div className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-lg bg-secondary text-brand group-hover:bg-brand group-hover:text-brand-foreground transition-colors">
                                <MapPin className="size-3" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="line-clamp-1 font-semibold text-foreground text-xs">
                                  {item.label}
                                </p>
                                {item.secondary && (
                                  <p className="line-clamp-1 text-[11px] text-muted-foreground mt-0.5">
                                    {item.secondary}
                                  </p>
                                )}
                              </div>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Real VietMap Vector Canvas API Preview */}
                <VietmapCanvas
                  coords={
                    addressSource === "profile" ? profileCoords : customCoords
                  }
                  address={effectiveAddress}
                  draggable={addressSource === "custom"}
                  onLocationChange={(newCoords, newAddr) => {
                    if (addressSource === "profile") {
                      setAddressSource("custom");
                    }
                    setCustomCoords(newCoords);
                    if (newAddr) {
                      lastSelectedAddressRef.current = newAddr;
                      setCustomAddress(newAddr);
                      setAddress(newAddr);
                    }
                  }}
                />
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="flex flex-col gap-4 py-1">
              <div>
                <label className="mb-2 block text-sm font-bold">
                  Ảnh đính kèm sự cố{" "}
                  <span className="font-normal text-muted-foreground">
                    (tối đa 5 ảnh qua Cloudinary)
                  </span>
                </label>
                <input
                  type="file"
                  ref={fileInputRef}
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={handleFileChange}
                />
                <div className="grid grid-cols-4 gap-2">
                  {filterSafeUrls(attachments).map((url, i) => (
                    <div
                      key={i}
                      className="relative aspect-square overflow-hidden rounded-xl border border-border bg-muted/30"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={url}
                        alt={`Attachment ${i + 1}`}
                        className="h-full w-full object-cover"
                      />
                      <button
                        type="button"
                        onClick={() => handleRemovePhoto(i)}
                        className="absolute right-1 top-1 flex size-5 items-center justify-center rounded-full bg-black/60 text-white transition-colors hover:bg-black"
                      >
                        <X className="size-3" />
                      </button>
                    </div>
                  ))}
                  {attachments.length < 5 && (
                    <button
                      type="button"
                      disabled={isUploadingImages}
                      onClick={() => fileInputRef.current?.click()}
                      className="flex aspect-square flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-border bg-muted/40 text-muted-foreground transition-colors hover:border-brand hover:text-brand disabled:opacity-50"
                    >
                      {isUploadingImages ? (
                        <>
                          <Loader2 className="size-5 animate-spin text-brand" />
                          <span className="text-[10px] font-semibold text-brand">
                            Đang tải...
                          </span>
                        </>
                      ) : (
                        <>
                          <ImagePlus className="size-5" />
                          <span className="text-[10px] font-semibold">
                            Thêm ảnh
                          </span>
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>
              <div>
                <label className="mb-2 flex items-center gap-1.5 text-sm font-bold">
                  <Wallet className="size-4 text-brand" />
                  Hình thức chi phí
                </label>
                <div className="rounded-2xl border border-border bg-card p-4 space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="rounded-full bg-emerald-500/10 px-2.5 py-1 text-xs font-bold text-emerald-600 dark:text-emerald-400">
                      Thỏa thuận trực tiếp tại nhà
                    </span>
                  </div>
                  <p className="text-xs text-foreground/85 leading-relaxed">
                    Thợ sẽ đến khảo sát tình trạng thực tế, tư vấn giải pháp và
                    thống nhất chi phí minh bạch trực tiếp với bạn trước khi
                    thực hiện.
                  </p>
                  <p className="text-[11px] text-muted-foreground italic">
                    * Bạn thanh toán trực tiếp cho thợ (tiền mặt / chuyển khoản)
                    sau khi nghiệm thu xong.
                  </p>
                </div>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="flex flex-col gap-3 py-1">
              <div className="flex items-center gap-3 rounded-2xl border border-border bg-card p-3.5">
                <DbCategoryIcon
                  icon={serviceCategories.find((item) => item.name === category)?.icon}
                  slug={serviceCategories.find((item) => item.name === category)?.slug}
                  className="size-11"
                />
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold">
                    {title || `Dịch vụ ${category}`}
                  </p>
                  <p className="text-xs text-muted-foreground">{category}</p>
                </div>
              </div>
              <ReviewRow icon={Calendar} label="Thời gian">
                {formatBookingDate(selectedDate)} · {time}
              </ReviewRow>
              <ReviewRow icon={MapPin} label="Địa chỉ">
                {address}
              </ReviewRow>
              <ReviewRow icon={ImagePlus} label="Hình ảnh">
                {attachments.length} ảnh đính kèm
              </ReviewRow>
              {attachments.length > 0 && (
                <div className="flex gap-2 overflow-x-auto py-1">
                  {filterSafeUrls(attachments).map((url, i) => (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      key={i}
                      src={url}
                      alt={`Ảnh ${i + 1}`}
                      className="size-14 rounded-lg border border-border object-cover"
                    />
                  ))}
                </div>
              )}
              <ReviewRow icon={Wallet} label="Chi phí">
                Thỏa thuận trực tiếp khi khảo sát
              </ReviewRow>
              {description && (
                <p className="rounded-xl bg-muted/50 p-3 text-xs text-muted-foreground">
                  {description}
                </p>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-border p-4">
          {submitError && (
            <div className="mb-3 rounded-xl border border-destructive/30 bg-destructive/10 px-3.5 py-2 text-xs font-medium text-destructive">
              {submitError}
            </div>
          )}
          {step < 3 ? (
            <BrandButton
              disabled={!canNext}
              onClick={() => setStep((s) => s + 1)}
              className="w-full py-3"
            >
              Tiếp tục
            </BrandButton>
          ) : (
            <CtaButton
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="w-full py-3"
            >
              <Check className="size-4" />
              {isSubmitting ? "Đang gửi yêu cầu..." : "Xác nhận & Chọn thợ"}
            </CtaButton>
          )}
        </div>
      </div>
    </div>
  );
}

function ReviewRow({
  icon: Icon,
  label,
  children,
}: {
  icon: typeof Calendar;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-border bg-card px-3.5 py-2.5">
      <Icon className="size-4 shrink-0 text-brand" />
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      <span className="ml-auto text-right text-xs font-semibold">
        {children}
      </span>
    </div>
  );
}
