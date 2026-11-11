"use client";

import { useEffect, useRef, useState } from "react";
import {
  X,
  User,
  Mail,
  Phone,
  MapPin,
  Navigation,
  ShieldCheck,
  CheckCircle2,
  Save,
  Loader2,
  LogOut,
  Briefcase,
  Star,
  Check,
  ArrowRight,
  ClipboardList,
  Sparkles,
  Eye,
  EyeOff,
} from "lucide-react";
import { useApp } from "../app-store";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  getMyProviderProfile,
  updateMyProviderProfile,
  type ProviderProfile,
} from "@/lib/api/provider-profile";
import { apiRequest } from "@/lib/api/client";
import {
  searchVietmapPlaces,
  fetchVietmapPlaceDetail,
  getCurrentBrowserCoordinates,
  reverseGeocodeCoords,
  type VietmapAddressSuggestion,
} from "@/lib/vietmap";

export function WebProfileModal() {
  const {
    profileModalOpen,
    closeProfileModal,
    currentUser,
    role,
    logout,
    updateUserProfile,
    bookings,
    providerJobs,
    setCustomerTab,
    setProviderTab,
    openAuthModal,
  } = useApp();

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [phoneCurrentPassword, setPhoneCurrentPassword] = useState("");
  const [address, setAddress] = useState("");

  // Provider specific fields
  const [businessName, setBusinessName] = useState("");
  const [bio, setBio] = useState("");
  const [yearsOfExperience, setYearsOfExperience] = useState("0");
  const [serviceAreas, setServiceAreas] = useState("");
  const [providerProfile, setProviderProfile] = useState<ProviderProfile | null>(null);

  // Address suggestions & GPS states
  const [addressSuggestions, setAddressSuggestions] = useState<VietmapAddressSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isSearchingAddress, setIsSearchingAddress] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [providerLocation, setProviderLocation] = useState<{ type: "Point"; coordinates: [number, number] } | null>(null);
  const lastSelectedAddressRef = useRef<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState("");

  // Reset form when modal opens or user changes
  useEffect(() => {
    if (profileModalOpen && currentUser) {
      setName(currentUser.name || "");
      setPhone(currentUser.phone || "");
      setPhoneCurrentPassword("");
      setAddress(currentUser.address || "");
      lastSelectedAddressRef.current = currentUser.address || null;
      setAddressSuggestions([]);
      setShowSuggestions(false);
      setLocationError(null);
      setSuccessMsg("");
      setErrorMsg("");

      if (role === "provider") {
        getMyProviderProfile()
          .then((p) => {
            if (p) {
              setProviderProfile(p);
              setProviderLocation(p.location || null);
              setBusinessName(p.businessName || "");
              setBio(p.bio || "");
              setYearsOfExperience(String(p.yearsOfExperience || 0));
              setServiceAreas((p.serviceAreas || []).join(", "));
            }
          })
          .catch(() => {
            // Provider profile might not exist yet
          });
      }
    }
  }, [profileModalOpen, currentUser, role]);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Autocomplete suggestions when user types in address
  useEffect(() => {
    const q = address.trim();
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
  }, [address]);

  const handleSelectSuggestion = async (item: VietmapAddressSuggestion) => {
    lastSelectedAddressRef.current = item.label;
    setShowSuggestions(false);
    setAddressSuggestions([]);
    setAddress(item.label);
    setLocationError(null);

    let coords = item.coords;
    if (item.refId && !item.refId.startsWith("osm_")) {
      setIsSearchingAddress(true);
      try {
        const details = await fetchVietmapPlaceDetail(item.refId);
        if (details) {
          const resolvedAddr = details.address || item.label;
          lastSelectedAddressRef.current = resolvedAddr;
          setAddress(resolvedAddr);
          coords = details.coords;
        }
      } catch (err) {
        console.warn("Place detail error:", err);
      } finally {
        setIsSearchingAddress(false);
      }
    }

    setProviderLocation({
      type: "Point",
      coordinates: [coords[0], coords[1]],
    });
  };

  const handleUseCurrentLocation = async () => {
    setLocationError(null);
    setIsLocating(true);
    try {
      const [lng, lat] = await getCurrentBrowserCoordinates();
      setProviderLocation({
        type: "Point",
        coordinates: [lng, lat],
      });
      const addr = await reverseGeocodeCoords([lng, lat]);
      lastSelectedAddressRef.current = addr;
      setAddress(addr);
    } catch (err: any) {
      setLocationError(err?.message || "Không thể lấy vị trí hiện tại.");
    } finally {
      setIsLocating(false);
    }
  };

  if (!profileModalOpen || !currentUser) return null;

  // Stats calculation
  const completedBookings = bookings.filter((b) => b.status === "completed").length;
  const activeBookings = bookings.filter((b) =>
    ["pending", "in_progress"].includes(b.status)
  ).length;

  const completedJobs = providerJobs.filter((j) => j.status === "completed");
  const activeJobs = providerJobs.filter((j) => j.status === "in_progress");

  const initials =
    currentUser.avatar ||
    currentUser.name.slice(0, 2).toUpperCase() ||
    (role === "provider" ? "TH" : "KH");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");

    if (!name.trim()) {
      setErrorMsg("Vui lòng nhập họ và tên.");
      return;
    }

    setIsSubmitting(true);
    try {
      await updateUserProfile({
        name: name.trim(),
        phone: phone.trim(),
        address: address.trim(),
        ...(phone.trim() !== (currentUser.phone || "") ? { currentPassword: phoneCurrentPassword } : {}),
      });

      if (role === "provider" && providerProfile) {
        try {
          const updated = await updateMyProviderProfile({
            businessName: businessName.trim() || name.trim(),
            bio: bio.trim(),
            yearsOfExperience: Number(yearsOfExperience) || 0,
            serviceAreas: serviceAreas
              .split(",")
              .map((s) => s.trim())
              .filter(Boolean),
            city: providerProfile.city || "TP. Hồ Chí Minh",
            location: providerLocation ?? providerProfile.location ?? null,
          });
          setProviderProfile(updated);
        } catch (provErr) {
          console.warn("Could not update provider details:", provErr);
        }
      }

      setSuccessMsg("Cập nhật thông tin hồ sơ thành công!");
      setTimeout(() => setSuccessMsg(""), 4000);
    } catch (err: any) {
      setErrorMsg(err?.message || "Không thể cập nhật hồ sơ. Vui lòng thử lại.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLogout = () => {
    closeProfileModal();
    logout();
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError("");
    if ([...newPassword].length < 10 || new TextEncoder().encode(newPassword).length > 72) {
      setPasswordError("Mật khẩu mới phải có ít nhất 10 ký tự và tối đa 72 byte.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError("Mật khẩu xác nhận không khớp.");
      return;
    }
    setIsChangingPassword(true);
    try {
      await apiRequest("/auth/change-password", {
        method: "POST",
        body: { currentPassword, newPassword },
      });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      closeProfileModal();
      await logout();
      openAuthModal("login");
    } catch (error: any) {
      setPasswordError(error?.message || "Không thể đổi mật khẩu. Vui lòng thử lại.");
    } finally {
      setIsChangingPassword(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div
        className="fixed inset-0"
        onClick={closeProfileModal}
        aria-hidden="true"
      />

      <div className="relative w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-3xl border border-border bg-card p-6 shadow-2xl z-10 text-foreground transition-all">
        {/* Header bar */}
        <div className="flex items-center justify-between border-b border-border/80 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-brand/10 text-brand">
              <User className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-black tracking-tight">Hồ sơ cá nhân</h2>
              <p className="text-xs text-muted-foreground">
                Quản lý thông tin tài khoản và thiết lập dịch vụ
              </p>
            </div>
          </div>
          <button
            onClick={closeProfileModal}
            className="flex h-8 w-8 items-center justify-center rounded-xl text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* User Card */}
        <div className="mt-5 rounded-2xl bg-gradient-to-r from-brand/10 via-secondary/50 to-brand/5 border border-brand/20 p-4">
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-brand text-xl font-black text-brand-foreground shadow-md shadow-brand/20">
              {initials}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <h3 className="truncate text-base font-extrabold">{currentUser.name}</h3>
                <span className="inline-flex items-center gap-1 rounded-full bg-brand/15 px-2 py-0.5 text-[10px] font-bold text-brand">
                  <ShieldCheck className="h-3 w-3" />
                  {role === "customer"
                    ? "Khách hàng"
                    : role === "provider"
                      ? "Thợ đối tác"
                      : role === "staff"
                        ? "Nhân viên CSKH"
                        : "Quản trị viên"}
                </span>
              </div>
              <p className="truncate text-xs text-muted-foreground mt-0.5 flex items-center gap-1.5">
                <Mail className="h-3 w-3 shrink-0" />
                {currentUser.email}
              </p>
              {currentUser.phone && (
                <p className="truncate text-xs text-muted-foreground mt-0.5 flex items-center gap-1.5">
                  <Phone className="h-3 w-3 shrink-0" />
                  {currentUser.phone}
                </p>
              )}
            </div>
          </div>

          {/* Quick stats strip */}
          <div className={cn(
            "mt-4 grid gap-2 border-t border-brand/15 pt-3 text-center",
            role === "provider" ? "grid-cols-2" : "grid-cols-3",
          )}>
            {role === "provider" ? (
              <>
                <div>
                  <span className="block text-xs font-black text-foreground">
                    {activeJobs.length}
                  </span>
                  <span className="text-[10px] text-muted-foreground">Đang làm</span>
                </div>
                <div>
                  <span className="block text-xs font-black text-foreground">
                    {completedJobs.length}
                  </span>
                  <span className="text-[10px] text-muted-foreground">Hoàn thành</span>
                </div>
              </>
            ) : (
              <>
                <div>
                  <span className="block text-xs font-black text-foreground">
                    {bookings.length}
                  </span>
                  <span className="text-[10px] text-muted-foreground">Tổng số đơn</span>
                </div>
                <div>
                  <span className="block text-xs font-black text-brand">
                    {activeBookings}
                  </span>
                  <span className="text-[10px] text-muted-foreground">Đang xử lý</span>
                </div>
                <div>
                  <span className="block text-xs font-black text-emerald-600 dark:text-emerald-400">
                    {completedBookings}
                  </span>
                  <span className="text-[10px] text-muted-foreground">Đã xong</span>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Status messages */}
        {successMsg && (
          <div className="mt-4 flex items-center gap-2 rounded-xl bg-emerald-500/10 border border-emerald-500/30 p-3 text-xs font-bold text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}
        {errorMsg && (
          <div className="mt-4 flex items-center gap-2 rounded-xl bg-rose-500/10 border border-rose-500/30 p-3 text-xs font-bold text-rose-600 dark:text-rose-400">
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Edit form */}
        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          <div className="space-y-3">
            <div>
              <label className="text-xs font-bold text-foreground">Họ và tên</label>
              <div className="relative mt-1">
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm outline-none transition-all focus:border-brand focus:ring-2 focus:ring-brand/20 pl-9"
                  placeholder="Nhập họ và tên..."
                  required
                />
                <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-foreground">Email</label>
              <div className="relative mt-1">
                <input
                  type="email"
                  value={currentUser.email}
                  disabled
                  className="w-full rounded-xl border border-border bg-muted/50 px-3.5 py-2.5 text-sm text-muted-foreground outline-none cursor-not-allowed pl-9"
                />
                <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <span className="absolute right-3 top-2.5 inline-flex items-center gap-1 rounded-md bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                  <Check className="h-3 w-3" /> Đã xác thực
                </span>
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-foreground">Số điện thoại</label>
              <div className="relative mt-1">
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm outline-none transition-all focus:border-brand focus:ring-2 focus:ring-brand/20 pl-9"
                  placeholder="Ví dụ: 0912345678"
                />
                <Phone className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              </div>
              {phone.trim() !== (currentUser.phone || "") && (
                <input
                  type="password"
                  value={phoneCurrentPassword}
                  onChange={(e) => setPhoneCurrentPassword(e.target.value)}
                  autoComplete="current-password"
                  required
                  className="mt-2 w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
                  placeholder="Nhập mật khẩu hiện tại để xác nhận đổi số điện thoại"
                />
              )}
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-bold text-foreground">Địa chỉ</label>
                <button
                  type="button"
                  onClick={() => void handleUseCurrentLocation()}
                  disabled={isLocating}
                  className="inline-flex items-center gap-1 text-[11px] font-semibold text-brand hover:underline disabled:opacity-50"
                >
                  {isLocating ? (
                    <Loader2 className="size-3 animate-spin" />
                  ) : (
                    <Navigation className="size-3" />
                  )}
                  <span>{isLocating ? "Đang định vị..." : "Vị trí hiện tại (GPS)"}</span>
                </button>
              </div>

              <div ref={dropdownRef} className="relative mt-1">
                <input
                  type="text"
                  value={address}
                  onChange={(e) => {
                    setAddress(e.target.value);
                    lastSelectedAddressRef.current = null;
                  }}
                  onFocus={() => {
                    if (addressSuggestions.length > 0 && !lastSelectedAddressRef.current) {
                      setShowSuggestions(true);
                    }
                  }}
                  className="w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm outline-none transition-all focus:border-brand focus:ring-2 focus:ring-brand/20 pl-9"
                  placeholder="Nhập địa chỉ nhà, phường/xã, quận/huyện..."
                />
                <MapPin className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />

                {/* Autocomplete Suggestions */}
                {showSuggestions && addressSuggestions.length > 0 && (
                  <div className="absolute left-0 right-0 top-full z-30 mt-1 max-h-56 overflow-y-auto rounded-2xl border border-border bg-popover p-1.5 shadow-2xl animate-in fade-in slide-in-from-top-1">
                    <div className="flex items-center justify-between px-2.5 py-1 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                      <span>Gợi ý địa chỉ ({addressSuggestions.length})</span>
                    </div>
                    {addressSuggestions.map((item, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => void handleSelectSuggestion(item)}
                        className="flex w-full items-start gap-2.5 rounded-xl p-2 text-left text-xs hover:bg-accent transition-colors group"
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
                <p className="mt-1 text-[11px] text-destructive">{locationError}</p>
              )}
            </div>

            {/* Provider fields */}
            {role === "provider" && (
              <div className="mt-4 pt-4 border-t border-border space-y-3">
                <div className="flex items-center gap-2">
                  <Briefcase className="h-4 w-4 text-brand" />
                  <span className="text-xs font-extrabold uppercase tracking-wider text-brand">
                    Thông tin hồ sơ thợ
                  </span>
                </div>

                <div>
                  <label className="text-xs font-bold text-foreground">Tên thương hiệu / Cửa hàng</label>
                  <input
                    type="text"
                    value={businessName}
                    onChange={(e) => setBusinessName(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
                    placeholder="VD: Sửa Điện Nước Phúc Thịnh"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-bold text-foreground">Số năm kinh nghiệm</label>
                    <input
                      type="number"
                      min="0"
                      max="50"
                      value={yearsOfExperience}
                      onChange={(e) => setYearsOfExperience(e.target.value)}
                      className="mt-1 w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-foreground">Khu vực phục vụ</label>
                    <input
                      type="text"
                      value={serviceAreas}
                      onChange={(e) => setServiceAreas(e.target.value)}
                      className="mt-1 w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
                      placeholder="Quận 1, Quận 3..."
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-foreground">Giới thiệu bản thân</label>
                  <textarea
                    rows={2}
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-border bg-background px-3.5 py-2 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
                    placeholder="Mô tả kỹ năng, cam kết chất lượng..."
                  />
                </div>
              </div>
            )}
          </div>

          {/* Action buttons */}
          <div className="mt-6 flex flex-col gap-2.5 pt-2">
            <Button
              type="submit"
              disabled={isSubmitting}
              className="w-full rounded-xl bg-brand font-bold text-brand-foreground shadow-sm hover:brightness-105 active:scale-95"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Đang lưu...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Lưu thay đổi
                </>
              )}
            </Button>

            {/* Role specific quick jump */}
            {role === "customer" && (
              <button
                type="button"
                onClick={() => {
                  closeProfileModal();
                  setCustomerTab("bookings");
                }}
                className="flex items-center justify-center gap-1.5 rounded-xl border border-border bg-secondary/60 py-2.5 text-xs font-bold text-foreground transition-all hover:bg-secondary"
              >
                <ClipboardList className="h-4 w-4 text-brand" />
                Xem đơn hàng của tôi ({bookings.length})
                <ArrowRight className="h-3.5 w-3.5 ml-1" />
              </button>
            )}

            {role === "provider" && (
              <button
                type="button"
                onClick={() => {
                  closeProfileModal();
                  setProviderTab("profile");
                }}
                className="flex items-center justify-center gap-1.5 rounded-xl border border-border bg-secondary/60 py-2.5 text-xs font-bold text-foreground transition-all hover:bg-secondary"
              >
                <Briefcase className="h-4 w-4 text-brand" />
                Quản lý hồ sơ thợ chi tiết
                <ArrowRight className="h-3.5 w-3.5 ml-1" />
              </button>
            )}

            <button
              type="button"
              onClick={handleLogout}
              className="mt-1 flex items-center justify-center gap-1.5 rounded-xl py-2 text-xs font-bold text-muted-foreground transition-colors hover:text-destructive hover:bg-destructive/10"
            >
              <LogOut className="h-4 w-4" />
              Đăng xuất tài khoản
            </button>
          </div>
        </form>

        <form onSubmit={handleChangePassword} className="mt-6 border-t border-border pt-5 space-y-3">
          <h3 className="text-sm font-extrabold">Đổi mật khẩu</h3>
          {[
            { label: "Mật khẩu hiện tại", value: currentPassword, set: setCurrentPassword },
            { label: "Mật khẩu mới", value: newPassword, set: setNewPassword },
            { label: "Xác nhận mật khẩu mới", value: confirmPassword, set: setConfirmPassword },
          ].map((field) => (
            <label key={field.label} className="block text-xs font-bold text-foreground">
              {field.label}
              <span className="mt-1 flex rounded-xl border border-border bg-background focus-within:border-brand">
                <input
                  type={passwordVisible ? "text" : "password"}
                  value={field.value}
                  onChange={(event) => field.set(event.target.value)}
                  autoComplete="current-password"
                  className="min-w-0 flex-1 rounded-xl bg-transparent px-3.5 py-2.5 text-sm outline-none"
                  required
                />
                <button type="button" aria-label={passwordVisible ? "Ẩn mật khẩu" : "Hiện mật khẩu"} onClick={() => setPasswordVisible(!passwordVisible)} className="px-3 text-muted-foreground">
                  {passwordVisible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </span>
            </label>
          ))}
          {passwordError && <p role="alert" className="text-xs font-semibold text-destructive">{passwordError}</p>}
          <Button type="submit" disabled={isChangingPassword} className="w-full rounded-xl bg-brand font-bold text-brand-foreground">
            {isChangingPassword ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Đang đổi...</> : "Đổi mật khẩu"}
          </Button>
          <p className="text-[11px] text-muted-foreground">Sau khi đổi, phiên đăng nhập hiện tại và các phiên khác sẽ bị thu hồi.</p>
        </form>
      </div>
    </div>
  );
}
