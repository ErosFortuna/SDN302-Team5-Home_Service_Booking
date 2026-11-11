"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type FormEvent,
} from "react";
import {
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  LoaderCircle,
  MapPin,
  Navigation,
  RefreshCw,
  Save,
  Search,
  ShieldCheck,
  Trash2,
  X,
} from "lucide-react";
import { getErrorMessage } from "@/lib/api/client";
import {
  createMyProviderProfile,
  deleteMyProviderProfile,
  getMyProviderProfile,
  updateMyProviderProfile,
  type ProviderProfile,
  type ProviderProfileInput,
} from "@/lib/api/provider-profile";
import {
  searchVietmapPlaces,
  fetchVietmapPlaceDetail,
  getCurrentBrowserCoordinates,
  reverseGeocodeCoords,
  type VietmapAddressSuggestion,
} from "@/lib/vietmap";
import { VietmapCanvas } from "@/components/customer/vietmap-canvas";

type ProfileForm = {
  businessName: string;
  bio: string;
  yearsOfExperience: string;
  serviceAreas: string;
  city: string;
  latitude: string;
  longitude: string;
};

const EMPTY_FORM: ProfileForm = {
  businessName: "",
  bio: "",
  yearsOfExperience: "0",
  serviceAreas: "",
  city: "",
  latitude: "",
  longitude: "",
};

const VERIFICATION_LABELS: Record<
  ProviderProfile["verificationStatus"],
  string
> = {
  PENDING: "Chờ xác minh",
  UNDER_REVIEW: "Đang xem xét",
  VERIFIED: "Đã xác minh",
  REJECTED: "Bị từ chối",
};

function profileToForm(profile: ProviderProfile): ProfileForm {
  return {
    businessName: profile.businessName,
    bio: profile.bio,
    yearsOfExperience: String(profile.yearsOfExperience),
    serviceAreas: profile.serviceAreas.join(", "),
    city: profile.city,
    latitude: profile.location ? String(profile.location.coordinates[1]) : "",
    longitude: profile.location ? String(profile.location.coordinates[0]) : "",
  };
}

function formToInput(form: ProfileForm): ProviderProfileInput {
  const hasLatitude = form.latitude.trim() !== "";
  const hasLongitude = form.longitude.trim() !== "";
  if (hasLatitude !== hasLongitude) {
    throw new Error("Vui lòng nhập cả vĩ độ và kinh độ, hoặc để trống cả hai.");
  }
  const location = hasLatitude
    ? {
        type: "Point" as const,
        coordinates: [Number(form.longitude), Number(form.latitude)] as [
          number,
          number,
        ],
      }
    : null;
  if (
    location &&
    (!Number.isFinite(location.coordinates[0]) ||
      !Number.isFinite(location.coordinates[1]))
  ) {
    throw new Error("Vĩ độ và kinh độ phải là số hợp lệ.");
  }
  return {
    businessName: form.businessName.trim(),
    bio: form.bio.trim(),
    yearsOfExperience: Number(form.yearsOfExperience),
    serviceAreas: [
      ...new Set(
        form.serviceAreas
          .split(",")
          .map((area) => area.trim())
          .filter(Boolean),
      ),
    ],
    city: form.city.trim(),
    location,
  };
}

const inputClass =
  "mt-1.5 w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/20";

export function ProviderProfilePage() {
  const [profile, setProfile] = useState<ProviderProfile | null>(null);
  const [form, setForm] = useState<ProfileForm>(EMPTY_FORM);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  // Location search & autocomplete states
  const [searchAddress, setSearchAddress] = useState("");
  const [addressSuggestions, setAddressSuggestions] = useState<VietmapAddressSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isSearchingAddress, setIsSearchingAddress] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [showManualCoords, setShowManualCoords] = useState(false);
  const lastSelectedAddressRef = useRef<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const current = await getMyProviderProfile();
      setProfile(current);
      setForm(current ? profileToForm(current) : EMPTY_FORM);
      if (current?.location?.coordinates) {
        const [lng, lat] = current.location.coordinates;
        reverseGeocodeCoords([lng, lat])
          .then((addr) => {
            setSearchAddress(addr);
            lastSelectedAddressRef.current = addr;
          })
          .catch(() => {});
      } else {
        setSearchAddress("");
        lastSelectedAddressRef.current = null;
      }
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  // Handle click outside suggestions dropdown
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // 100% Autocomplete query on searchAddress change (VietMap / OSM fallback)
  useEffect(() => {
    const q = searchAddress.trim();
    if (!q || q.length < 2) {
      setAddressSuggestions([]);
      setShowSuggestions(false);
      return;
    }

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
        console.error("VietMap search error:", err);
      } finally {
        setIsSearchingAddress(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchAddress]);

  const setField = (field: keyof ProfileForm, value: string) =>
    setForm((current) => ({ ...current, [field]: value }));

  const handleSelectSuggestion = async (item: VietmapAddressSuggestion) => {
    lastSelectedAddressRef.current = item.label;
    setShowSuggestions(false);
    setAddressSuggestions([]);
    setSearchAddress(item.label);
    setLocationError(null);

    if (item.refId && !item.refId.startsWith("osm_")) {
      setIsSearchingAddress(true);
      try {
        const details = await fetchVietmapPlaceDetail(item.refId);
        if (details) {
          const resolvedAddr = details.address || item.label;
          lastSelectedAddressRef.current = resolvedAddr;
          setSearchAddress(resolvedAddr);
          setField("latitude", String(details.coords[1]));
          setField("longitude", String(details.coords[0]));
          return;
        }
      } catch (err) {
        console.warn("Place detail error:", err);
      } finally {
        setIsSearchingAddress(false);
      }
    }

    setField("latitude", String(item.coords[1]));
    setField("longitude", String(item.coords[0]));
  };

  const handleUseCurrentLocation = async () => {
    setLocationError(null);
    setIsLocating(true);
    try {
      const [lng, lat] = await getCurrentBrowserCoordinates();
      setField("latitude", String(lat));
      setField("longitude", String(lng));
      const addr = await reverseGeocodeCoords([lng, lat]);
      lastSelectedAddressRef.current = addr;
      setSearchAddress(addr);
    } catch (err: any) {
      setLocationError(err?.message || "Không thể lấy vị trí hiện tại.");
    } finally {
      setIsLocating(false);
    }
  };

  const handleMapLocationChange = (coords: [number, number], addr?: string) => {
    setField("latitude", String(coords[1]));
    setField("longitude", String(coords[0]));
    if (addr) {
      lastSelectedAddressRef.current = addr;
      setSearchAddress(addr);
    }
  };

  const hasCoords =
    Boolean(form.latitude.trim() && form.longitude.trim()) &&
    Number.isFinite(Number(form.latitude)) &&
    Number.isFinite(Number(form.longitude));

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    setError("");
    setNotice("");
    try {
      const payload = formToInput(form);
      const saved = profile
        ? await updateMyProviderProfile(payload)
        : await createMyProviderProfile(payload);
      setProfile(saved);
      setForm(profileToForm(saved));
      setNotice(
        profile
          ? "Đã cập nhật hồ sơ thợ."
          : "Đã tạo hồ sơ thợ. Hồ sơ đang chờ xác minh.",
      );
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    const confirmed = window.confirm(
      "Hồ sơ sẽ bị ẩn khỏi tìm kiếm và bạn không thể nhận yêu cầu mới. Lịch sử công việc và thanh toán vẫn được giữ lại. Tiếp tục?",
    );
    if (!confirmed) return;

    setDeleting(true);
    setError("");
    setNotice("");
    try {
      const deleted = await deleteMyProviderProfile();
      setProfile(deleted);
      setNotice("Hồ sơ đã được ẩn. Dữ liệu lịch sử vẫn được lưu.");
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setDeleting(false);
    }
  };

  const isDeleted = profile?.isDeleted === true;

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm font-bold uppercase tracking-wider text-brand">
            Tài khoản thợ
          </p>
          <h1 className="mt-1 text-3xl font-black tracking-tight">Hồ sơ thợ</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Quản lý thông tin kinh doanh và khu vực nhận việc.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void load()}
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-xl border border-border px-3 py-2 text-sm font-bold hover:bg-muted disabled:opacity-60"
        >
          <RefreshCw className={`size-4 ${loading ? "animate-spin" : ""}`} />{" "}
          Làm mới
        </button>
      </div>

      {error && (
        <div
          role="alert"
          className="mt-6 rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm font-semibold text-destructive"
        >
          {error}
        </div>
      )}
      {notice && (
        <div
          role="status"
          className="mt-6 rounded-xl border border-brand/20 bg-brand/5 p-4 text-sm font-semibold"
        >
          {notice}
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-20">
          <LoaderCircle className="size-7 animate-spin text-brand" />
        </div>
      ) : isDeleted ? (
        <div className="mt-8 rounded-3xl border border-amber-500/30 bg-amber-500/10 p-6">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 size-5 shrink-0 text-amber-700" />
            <div>
              <h2 className="font-black">Hồ sơ đã được ẩn</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Hồ sơ không còn xuất hiện khi khách tìm thợ. Lịch sử công việc,
                đánh giá và thanh toán vẫn được lưu. Vui lòng liên hệ quản trị
                viên nếu cần khôi phục.
              </p>
            </div>
          </div>
        </div>
      ) : (
        <>
          {profile && (
            <div className="mt-6 flex items-center gap-3 rounded-2xl border border-border bg-card p-4">
              <ShieldCheck className="size-5 text-brand" />
              <div>
                <p className="text-sm font-extrabold">
                  Trạng thái hồ sơ:{" "}
                  {VERIFICATION_LABELS[profile.verificationStatus]}
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {(profile.averageRating ?? 0).toFixed(1)} sao ·{" "}
                  {profile.reviewCount ?? 0} đánh giá ·{" "}
                  {profile.completedJobCount ?? 0} công việc hoàn thành
                </p>
              </div>
            </div>
          )}

          <form
            onSubmit={handleSubmit}
            className="mt-6 rounded-3xl border border-border bg-card p-5 shadow-sm sm:p-7"
          >
            <div className="grid gap-5 sm:grid-cols-2">
              <label className="text-sm font-bold sm:col-span-2">
                Tên cửa hàng / tên kinh doanh
                <input
                  required
                  minLength={2}
                  maxLength={160}
                  value={form.businessName}
                  onChange={(e) => setField("businessName", e.target.value)}
                  className={inputClass}
                />
              </label>
              <label className="text-sm font-bold sm:col-span-2">
                Giới thiệu
                <textarea
                  maxLength={2000}
                  rows={4}
                  value={form.bio}
                  onChange={(e) => setField("bio", e.target.value)}
                  className={inputClass}
                  placeholder="Mô tả kinh nghiệm và dịch vụ của bạn"
                />
              </label>
              <label className="text-sm font-bold">
                Số năm kinh nghiệm
                <input
                  type="number"
                  min={0}
                  max={80}
                  step={1}
                  required
                  value={form.yearsOfExperience}
                  onChange={(e) =>
                    setField("yearsOfExperience", e.target.value)
                  }
                  className={inputClass}
                />
              </label>
              <label className="text-sm font-bold">
                Thành phố
                <input
                  maxLength={100}
                  value={form.city}
                  onChange={(e) => setField("city", e.target.value)}
                  className={inputClass}
                  placeholder="Ví dụ: Đà Nẵng"
                />
              </label>
              <label className="text-sm font-bold sm:col-span-2">
                Khu vực nhận việc
                <input
                  maxLength={2048}
                  value={form.serviceAreas}
                  onChange={(e) => setField("serviceAreas", e.target.value)}
                  className={inputClass}
                  placeholder="Nhập các quận/huyện, cách nhau bằng dấu phẩy"
                />
              </label>
              <div className="sm:col-span-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="flex items-center gap-1.5 text-sm font-bold">
                    <MapPin className="size-4 text-brand" /> Vị trí hoạt động của thợ (không bắt buộc)
                  </p>
                  <button
                    type="button"
                    onClick={() => void handleUseCurrentLocation()}
                    disabled={isLocating}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-brand/30 bg-brand/5 px-2.5 py-1 text-xs font-bold text-brand hover:bg-brand/10 transition-colors disabled:opacity-50"
                  >
                    {isLocating ? (
                      <LoaderCircle className="size-3.5 animate-spin" />
                    ) : (
                      <Navigation className="size-3.5" />
                    )}
                    <span>{isLocating ? "Đang định vị..." : "Vị trí hiện tại (GPS)"}</span>
                  </button>
                </div>

                <p className="mt-1 text-xs text-muted-foreground">
                  Nhập địa chỉ hoặc chọn vị trí trên bản đồ để hệ thống gợi ý đơn hàng gần bạn nhất.
                </p>

                {/* Address Search Input with Autocomplete Suggestions */}
                <div ref={dropdownRef} className="relative mt-2">
                  <div className="relative flex items-center">
                    <MapPin className="absolute left-3.5 size-4 text-muted-foreground" />
                    <input
                      type="text"
                      value={searchAddress}
                      onChange={(e) => {
                        setSearchAddress(e.target.value);
                        lastSelectedAddressRef.current = null;
                      }}
                      onFocus={() => {
                        if (addressSuggestions.length > 0 && !lastSelectedAddressRef.current) {
                          setShowSuggestions(true);
                        }
                      }}
                      placeholder="Tìm địa chỉ (vd: 123 Nguyễn Huệ, Bến Nghé, Quận 1)..."
                      className="w-full rounded-2xl border border-border bg-background py-2.5 pl-10 pr-24 text-sm outline-none transition-all focus:border-brand focus:ring-2 focus:ring-brand/20"
                    />
                    <div className="absolute right-2 flex items-center gap-1">
                      {searchAddress && (
                        <button
                          type="button"
                          onClick={() => {
                            setSearchAddress("");
                            lastSelectedAddressRef.current = null;
                            setAddressSuggestions([]);
                            setShowSuggestions(false);
                          }}
                          className="rounded-lg p-1 text-muted-foreground hover:bg-muted"
                          title="Xóa tìm kiếm"
                        >
                          <X className="size-3.5" />
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={async () => {
                          if (!searchAddress.trim()) return;
                          lastSelectedAddressRef.current = null;
                          setIsSearchingAddress(true);
                          try {
                            const results = await searchVietmapPlaces(searchAddress);
                            setAddressSuggestions(results);
                            setShowSuggestions(results.length > 0);
                          } finally {
                            setIsSearchingAddress(false);
                          }
                        }}
                        disabled={isSearchingAddress || !searchAddress.trim()}
                        className="flex items-center gap-1 rounded-xl bg-secondary px-2.5 py-1 text-xs font-bold text-brand hover:bg-brand/10 transition-colors disabled:opacity-50"
                      >
                        {isSearchingAddress ? (
                          <LoaderCircle className="size-3.5 animate-spin" />
                        ) : (
                          <Search className="size-3.5" />
                        )}
                        <span>Tìm</span>
                      </button>
                    </div>
                  </div>

                  {/* Dropdown Suggestions */}
                  {showSuggestions && addressSuggestions.length > 0 && (
                    <div className="absolute left-0 right-0 top-full z-30 mt-1 max-h-60 overflow-y-auto rounded-2xl border border-border bg-popover p-1.5 shadow-2xl animate-in fade-in slide-in-from-top-1">
                      <div className="flex items-center justify-between px-2.5 py-1 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                        <span>Gợi ý địa chỉ ({addressSuggestions.length})</span>
                      </div>
                      {addressSuggestions.map((item, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => void handleSelectSuggestion(item)}
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

                {locationError && (
                  <p className="mt-1.5 text-xs font-semibold text-destructive">{locationError}</p>
                )}

                {/* Map Preview Canvas */}
                <div className="mt-3 overflow-hidden rounded-2xl border border-border">
                  <VietmapCanvas
                    coords={hasCoords ? [Number(form.longitude), Number(form.latitude)] : null}
                    address={searchAddress || form.city || "TP. Hồ Chí Minh"}
                    onLocationChange={handleMapLocationChange}
                    draggable={true}
                    height="h-52"
                  />
                </div>

                {/* Coordinate status & Manual Inputs Toggle */}
                <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
                  <div className="flex items-center gap-2">
                    {hasCoords ? (
                      <span className="inline-flex items-center gap-1 rounded-md bg-emerald-500/10 px-2 py-0.5 font-mono text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                        Tọa độ: {Number(form.latitude).toFixed(5)}, {Number(form.longitude).toFixed(5)}
                      </span>
                    ) : (
                      <span className="text-amber-600 dark:text-amber-400 font-medium text-[11px]">
                        Chưa chọn tọa độ
                      </span>
                    )}
                    {hasCoords && (
                      <button
                        type="button"
                        onClick={() => {
                          setField("latitude", "");
                          setField("longitude", "");
                          setSearchAddress("");
                          lastSelectedAddressRef.current = null;
                        }}
                        className="text-[11px] text-destructive hover:underline"
                      >
                        Xóa vị trí
                      </button>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => setShowManualCoords(!showManualCoords)}
                    className="inline-flex items-center gap-1 text-[11px] font-medium text-brand hover:underline"
                  >
                    <span>{showManualCoords ? "Ẩn tọa độ thủ công" : "Chỉnh tọa độ thủ công"}</span>
                    {showManualCoords ? <ChevronUp className="size-3" /> : <ChevronDown className="size-3" />}
                  </button>
                </div>

                {showManualCoords && (
                  <div className="mt-2.5 grid gap-3 sm:grid-cols-2 rounded-2xl bg-muted/40 p-3.5 border border-border animate-in fade-in">
                    <label className="text-xs font-semibold text-muted-foreground">
                      Vĩ độ (Latitude)
                      <input
                        type="number"
                        min={-90}
                        max={90}
                        step="any"
                        value={form.latitude}
                        onChange={(e) => setField("latitude", e.target.value)}
                        className={inputClass}
                        placeholder="VD: 10.7769"
                      />
                    </label>
                    <label className="text-xs font-semibold text-muted-foreground">
                      Kinh độ (Longitude)
                      <input
                        type="number"
                        min={-180}
                        max={180}
                        step="any"
                        value={form.longitude}
                        onChange={(e) => setField("longitude", e.target.value)}
                        className={inputClass}
                        placeholder="VD: 106.7009"
                      />
                    </label>
                  </div>
                )}
              </div>
            </div>
            <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
              <button
                type="submit"
                disabled={saving || deleting}
                className="inline-flex items-center gap-2 rounded-xl bg-brand px-5 py-3 text-sm font-extrabold text-brand-foreground shadow-md shadow-brand/20 hover:brightness-110 disabled:opacity-60"
              >
                {saving ? (
                  <LoaderCircle className="size-4 animate-spin" />
                ) : (
                  <Save className="size-4" />
                )}
                {profile ? "Lưu thay đổi" : "Tạo hồ sơ"}
              </button>
              {profile && (
                <button
                  type="button"
                  onClick={() => void handleDelete()}
                  disabled={saving || deleting}
                  className="inline-flex items-center gap-2 rounded-xl border border-destructive/30 px-4 py-3 text-sm font-bold text-destructive hover:bg-destructive/5 disabled:opacity-60"
                >
                  {deleting ? (
                    <LoaderCircle className="size-4 animate-spin" />
                  ) : (
                    <Trash2 className="size-4" />
                  )}
                  Ẩn hồ sơ
                </button>
              )}
            </div>
          </form>
          <p className="mt-4 text-xs leading-5 text-muted-foreground">
            Thông tin xác minh, đánh giá và số công việc hoàn thành do hệ thống
            quản lý. Ẩn hồ sơ sẽ không xóa lịch sử và bị từ chối nếu còn công
            việc đang thực hiện hoặc giao dịch membership chưa hoàn tất.
          </p>
        </>
      )}
    </div>
  );
}
