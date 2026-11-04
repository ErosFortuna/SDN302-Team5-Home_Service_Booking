"use client";

import { useState, useRef, useEffect } from "react";
import {
  X,
  Calendar,
  Clock,
  MapPin,
  ImagePlus,
  Check,
  ChevronLeft,
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
import { CategoryIcon, CtaButton, BrandButton } from "../shared";
import type { ServiceCategory } from "@/lib/types";
import { cn } from "@/lib/utils";
import { uploadRequestImages } from "@/lib/api/service-requests";
import {
  searchVietmapPlaces,
  fetchVietmapPlaceDetail,
  geocodeAddress,
  type VietmapAddressSuggestion,
} from "@/lib/vietmap";
import { VietmapCanvas } from "./vietmap-canvas";

const TIME_SLOTS = ["8:00 AM", "10:00 AM", "1:00 PM", "3:00 PM", "5:00 PM"];
function getDynamicBookingDates() {
  const dayNames = [
    "Chủ Nhật",
    "Thứ Hai",
    "Thứ Ba",
    "Thứ Tư",
    "Thứ Năm",
    "Thứ Sáu",
    "Thứ Bảy",
  ];
  return Array.from({ length: 4 }).map((_, i) => {
    const d = new Date();
    d.setDate(d.getDate() + i);
    const label =
      i === 0 ? "Hôm nay" : i === 1 ? "Ngày mai" : dayNames[d.getDay()];
    const day = String(d.getDate()).padStart(2, "0");
    const month = String(d.getMonth() + 1).padStart(2, "0");
    return {
      label,
      sub: `${day}/${month}`,
      year: d.getFullYear(),
    };
  });
}

const DATES = getDynamicBookingDates();
const STEPS = ["Service", "Schedule", "Details", "Review"];

export function BookingFlow() {
  const {
    bookingFlowOpen,
    closeBookingFlow,
    presetCategory,
    presetService,
    submitBooking,
    serviceCategories,
    serviceCategoriesLoading,
    serviceCategoriesError,
    isLoggedIn,
    openAuthModal,
    currentUser,
  } = useApp();

  const [step, setStep] = useState(0);
  const [category, setCategory] = useState<ServiceCategory>(
    presetCategory ?? "",
  );
  const [title, setTitle] = useState(presetService?.name ?? "");
  const [description, setDescription] = useState(
    presetService?.description ?? "",
  );
  const [dateIdx, setDateIdx] = useState(0);
  const [time, setTime] = useState(TIME_SLOTS[1]);
  const [address, setAddress] = useState(currentUser?.address ?? "");
  const [addressSource, setAddressSource] = useState<'profile' | 'custom'>('profile');
  const [customAddress, setCustomAddress] = useState('');
  const [customCoords, setCustomCoords] = useState<[number, number] | null>(null);
  const [profileCoords, setProfileCoords] = useState<[number, number] | null>(null);
  const [isSearchingAddress, setIsSearchingAddress] = useState(false);
  const [addressSuggestions, setAddressSuggestions] = useState<VietmapAddressSuggestion[]>([]);
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

  const effectiveAddress =
    addressSource === 'profile' && currentUser?.address
      ? currentUser.address
      : (customAddress.trim() || address.trim() || 'TP.HCM');

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

    if (item.refId && !item.refId.startsWith('osm_')) {
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
      setDateIdx(0);
      setTime(TIME_SLOTS[1]);
      setAddress(currentUser?.address ?? "");
      setPhotos(0);
      setAttachments([]);
      setIsUploadingImages(false);
      setBudget(500000);
      setIsSubmitting(false);
      setSubmitError(null);
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

  if (!bookingFlowOpen) return null;

  const canNext =
    step === 0
      ? category.length > 0 && title.trim().length > 0
      : step === 1
        ? !!time && !!effectiveAddress.trim()
        : true;

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    if (!isLoggedIn) {
      setSubmitError('Vui lòng đăng nhập trước khi đính kèm hình ảnh.');
      openAuthModal('login');
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
    if (!isLoggedIn) {
      closeBookingFlow();
      openAuthModal("login");
      return;
    }
    setIsSubmitting(true);
    setSubmitError(null);
    try {
      await submitBooking({
        category,
        title: title.trim() || `${category} service`,
        description: description.trim(),
        date: `${DATES[dateIdx].sub}/${DATES[dateIdx].year}`,
        time,
        address: effectiveAddress,
        coordinates: customCoords || undefined,
        budget,
        photos: attachments.length,
        attachments,
      });
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
                  Select a service
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
                      <CategoryIcon category={c.name} className="size-9" />
                      <span className="text-[11px] font-semibold">
                        {c.name}
                      </span>
                    </button>
                  ))}
                  {serviceCategories.length === 0 && (
                    <p className="col-span-3 py-4 text-center text-xs text-muted-foreground">
                      {serviceCategoriesLoading
                        ? "Loading categories..."
                        : serviceCategoriesError ||
                          "No active categories available."}
                    </p>
                  )}
                </div>
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-bold">
                  What do you need?
                </label>
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Fix leaking kitchen sink"
                  className="w-full rounded-xl border border-border bg-card px-3.5 py-3 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-bold">
                  Describe the problem
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={4}
                  placeholder="Add details so pros can prepare appropriate services..."
                  className="w-full resize-none rounded-xl border border-border bg-card px-3.5 py-3 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
                />
              </div>
            </div>
          )}

          {step === 1 && (
            <div className="flex flex-col gap-4 py-1">
              <div>
                <label className="mb-2 flex items-center gap-1.5 text-sm font-bold">
                  <Calendar className="size-4 text-brand" />
                  Select a date
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {DATES.map((d, i) => (
                    <button
                      key={d.sub}
                      onClick={() => setDateIdx(i)}
                      className={cn(
                        "flex flex-col items-center rounded-xl border py-2.5 transition-all",
                        dateIdx === i
                          ? "border-brand bg-secondary text-brand"
                          : "border-border bg-card",
                      )}
                    >
                      <span className="text-xs font-bold">{d.label}</span>
                      <span className="text-[10px] text-muted-foreground">
                        {d.sub}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="mb-2 flex items-center gap-1.5 text-sm font-bold">
                  <Clock className="size-4 text-brand" />
                  Preferred time
                </label>
                <div className="flex flex-wrap gap-2">
                  {TIME_SLOTS.map((t) => (
                    <button
                      key={t}
                      onClick={() => setTime(t)}
                      className={cn(
                        "rounded-xl border px-3.5 py-2 text-xs font-semibold transition-all",
                        time === t
                          ? "border-brand bg-secondary text-brand"
                          : "border-border bg-card",
                      )}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-1.5 text-sm font-bold">
                    <MapPin className="size-4 text-brand" />
                    Địa chỉ thực hiện dịch vụ
                  </label>
                  <a
                    href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(effectiveAddress)}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-xs font-semibold text-brand hover:underline"
                  >
                    Google Maps
                    <ExternalLink className="size-3" />
                  </a>
                </div>

                {/* Option to use profile address or enter custom Google Maps address */}
                <div className="grid grid-cols-2 gap-2 rounded-2xl border border-border bg-muted/30 p-1">
                  <button
                    type="button"
                    onClick={() => {
                      setAddressSource('profile');
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
                      addressSource === 'profile'
                        ? "bg-background text-foreground shadow-xs border border-border"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    <Home className="size-3.5" />
                    <span>Địa chỉ hồ sơ (mặc định)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setAddressSource('custom');
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
                      addressSource === 'custom'
                        ? "bg-brand text-brand-foreground shadow-xs"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    <Compass className="size-3.5" />
                    <span>Nhập địa chỉ khác (Maps)</span>
                  </button>
                </div>

                {/* Profile Address Display */}
                {addressSource === 'profile' && (
                  <div className="rounded-2xl border border-border bg-card p-3.5 space-y-2">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-2.5">
                        <Home className="size-4 text-brand mt-0.5 shrink-0" />
                        <div>
                          <p className="text-xs font-bold text-foreground">
                            {currentUser?.address ? currentUser.address : "Chưa có địa chỉ trong hồ sơ"}
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
                {addressSource === 'custom' && (
                  <div className="space-y-2.5">
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
                          if (addressSuggestions.length > 0 && !lastSelectedAddressRef.current) {
                            setShowSuggestions(true);
                          }
                        }}
                        placeholder="Nhập địa chỉ (tìm kiếm qua VietMap API v4)..."
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
                            <span>Gợi ý từ VietMap API ({addressSuggestions.length})</span>
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
                              <span className="rounded bg-blue-500/10 px-1.5 py-0.5 text-[9px] font-bold text-blue-600 shrink-0">
                                {item.source === 'vietmap' ? 'VietMap' : 'API'}
                              </span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Real VietMap Vector Canvas API Preview */}
                <VietmapCanvas
                  coords={addressSource === 'profile' ? profileCoords : customCoords}
                  address={effectiveAddress}
                  draggable={addressSource === 'custom'}
                  onLocationChange={(newCoords, newAddr) => {
                    if (addressSource === 'profile') {
                      setAddressSource('custom');
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
                  {attachments.map((url, i) => (
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
                  Estimated budget
                </label>
                <div className="rounded-2xl border border-border bg-card p-4">
                  <p className="text-center text-2xl font-extrabold text-brand">
                    {formatVND(budget)}
                  </p>
                  <input
                    type="range"
                    min={100000}
                    max={2000000}
                    step={50000}
                    value={budget}
                    onChange={(e) => setBudget(Number(e.target.value))}
                    className="mt-3 w-full accent-[var(--brand)]"
                  />
                  <div className="flex justify-between text-[10px] text-muted-foreground">
                    <span>100k ₫</span>
                    <span>2,000k ₫</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="flex flex-col gap-3 py-1">
              <div className="flex items-center gap-3 rounded-2xl border border-border bg-card p-3.5">
                <CategoryIcon category={category} className="size-11" />
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold">
                    {title || `${category} service`}
                  </p>
                  <p className="text-xs text-muted-foreground">{category}</p>
                </div>
              </div>
              <ReviewRow icon={Calendar} label="When">
                {DATES[dateIdx].sub}/{DATES[dateIdx].year} · {time}
              </ReviewRow>
              <ReviewRow icon={MapPin} label="Where">
                {address}
              </ReviewRow>
              <ReviewRow icon={ImagePlus} label="Photos">
                {attachments.length} ảnh đính kèm
              </ReviewRow>
              {attachments.length > 0 && (
                <div className="flex gap-2 overflow-x-auto py-1">
                  {attachments.map((url, i) => (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      key={i}
                      src={url}
                      alt={`Photo ${i + 1}`}
                      className="size-14 rounded-lg border border-border object-cover"
                    />
                  ))}
                </div>
              )}
              <ReviewRow icon={Wallet} label="Budget">
                {formatVND(budget)}
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
              Continue
            </BrandButton>
          ) : (
            <CtaButton
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="w-full py-3"
            >
              <Check className="size-4" />
              {isSubmitting ? "Đang gửi yêu cầu..." : "Submit Request"}
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
