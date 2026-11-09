"use client";

import { useEffect, useState } from "react";
import {
  User,
  Mail,
  Phone,
  MapPin,
  ShieldCheck,
  CheckCircle2,
  Save,
  Loader2,
  Calendar,
  Clock,
  ClipboardList,
  ArrowLeft,
  ChevronRight,
  LogOut,
  AlertCircle,
} from "lucide-react";
import { useApp } from "../app-store";
import { Button } from "@/components/ui/button";
import { formatVND } from "@/lib/utils";
import { CategoryIcon, StatusBadge } from "../shared";

export function CustomerProfileView() {
  const {
    currentUser,
    setCustomerTab,
    bookings,
    updateUserProfile,
    logout,
  } = useApp();

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    if (currentUser) {
      setName(currentUser.name || "");
      setPhone(currentUser.phone || "");
      setAddress(currentUser.address || "");
    }
  }, [currentUser]);

  if (!currentUser) return null;

  const completedBookings = bookings.filter((b) => b.status === "completed").length;
  const activeBookings = bookings.filter((b) =>
    ["pending", "in_progress"].includes(b.status)
  ).length;

  const initials =
    currentUser.avatar || currentUser.name.slice(0, 2).toUpperCase() || "KH";

  const handleSave = async (e: React.FormEvent) => {
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
      });
      setSuccessMsg("Cập nhật thông tin thành công!");
      setTimeout(() => setSuccessMsg(""), 4000);
    } catch (err: any) {
      setErrorMsg(err?.message || "Không thể cập nhật thông tin. Vui lòng thử lại.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Back button */}
      <button
        onClick={() => setCustomerTab("home")}
        className="inline-flex items-center gap-2 rounded-xl text-xs font-bold text-muted-foreground transition-colors hover:text-foreground mb-6"
      >
        <ArrowLeft className="h-4 w-4" /> Quay lại trang chủ
      </button>

      {/* Profile Header Hero Card */}
      <div className="relative overflow-hidden rounded-3xl border border-border bg-gradient-to-r from-brand/15 via-secondary/60 to-brand/5 p-6 sm:p-8 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          <div className="flex items-center gap-5">
            <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-3xl bg-brand text-2xl font-black text-brand-foreground shadow-lg shadow-brand/20 ring-4 ring-background">
              {initials}
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl font-black tracking-tight">{currentUser.name}</h1>
                <span className="inline-flex items-center gap-1 rounded-full bg-brand/20 px-3 py-0.5 text-xs font-extrabold text-brand">
                  <ShieldCheck className="h-3.5 w-3.5" /> Khách hàng thân thiết
                </span>
              </div>
              <p className="mt-1 text-xs sm:text-sm text-muted-foreground flex items-center gap-2">
                <Mail className="h-3.5 w-3.5" /> {currentUser.email}
              </p>
              {currentUser.address && (
                <p className="mt-0.5 text-xs text-muted-foreground flex items-center gap-2">
                  <MapPin className="h-3.5 w-3.5" /> {currentUser.address}
                </p>
              )}
            </div>
          </div>

          <div className="flex sm:flex-col items-center sm:items-end justify-between gap-2">
            <button
              onClick={logout}
              className="text-xs font-bold text-muted-foreground hover:text-destructive flex items-center gap-1 p-1"
            >
              <LogOut className="h-3.5 w-3.5" /> Đăng xuất
            </button>
          </div>
        </div>
      </div>

      {/* 3 Stats Overview Strip */}
      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-border bg-card p-5 shadow-xs">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-bold">Tổng số đơn đã đặt</span>
            <ClipboardList className="h-4 w-4 text-brand" />
          </div>
          <p className="mt-2 text-2xl font-black text-foreground">{bookings.length}</p>
          <span className="mt-1 block text-[11px] text-muted-foreground">
            Từ ngày tham gia hệ thống
          </span>
        </div>

        <div className="rounded-2xl border border-border bg-card p-5 shadow-xs">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-bold">Đang chờ & Đang làm</span>
            <Clock className="h-4 w-4 text-amber-500" />
          </div>
          <p className="mt-2 text-2xl font-black text-amber-600 dark:text-amber-400">
            {activeBookings}
          </p>
          <span className="mt-1 block text-[11px] text-muted-foreground">
            Cần theo dõi tiến độ
          </span>
        </div>

        <div className="rounded-2xl border border-border bg-card p-5 shadow-xs">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-bold">Đơn hoàn thành</span>
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
          </div>
          <p className="mt-2 text-2xl font-black text-emerald-600 dark:text-emerald-400">
            {completedBookings}
          </p>
          <span className="mt-1 block text-[11px] text-muted-foreground">
            Dịch vụ đã hoàn tất chuẩn mực
          </span>
        </div>
      </div>

      <div className="mt-8 grid gap-8 lg:grid-cols-3">
        {/* Edit Profile Form */}
        <div className="lg:col-span-2 rounded-3xl border border-border bg-card p-6 sm:p-7 shadow-xs">
          <div className="flex items-center gap-2.5 pb-4 border-b border-border">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand/10 text-brand">
              <User className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-extrabold tracking-tight">Thông tin tài khoản</h2>
              <p className="text-xs text-muted-foreground">
                Cập nhật thông tin để thợ liên hệ và phục vụ chính xác nhất
              </p>
            </div>
          </div>

          {successMsg && (
            <div className="mt-4 flex items-center gap-2 rounded-xl bg-emerald-500/10 border border-emerald-500/30 p-3 text-xs font-bold text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}
          {errorMsg && (
            <div className="mt-4 flex items-center gap-2 rounded-xl bg-rose-500/10 border border-rose-500/30 p-3 text-xs font-bold text-rose-600 dark:text-rose-400">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <form onSubmit={handleSave} className="mt-5 space-y-4">
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

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                    placeholder="VD: 0912345678"
                  />
                  <Phone className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                </div>
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-foreground">Địa chỉ mặc định</label>
              <div className="relative mt-1">
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm outline-none transition-all focus:border-brand focus:ring-2 focus:ring-brand/20 pl-9"
                  placeholder="Nhập số nhà, tên đường, phường/xã, quận/huyện..."
                />
                <MapPin className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              </div>
              <p className="mt-1 text-[11px] text-muted-foreground">
                Địa chỉ này sẽ tự động điền khi bạn đặt dịch vụ mới.
              </p>
            </div>

            <div className="pt-2">
              <Button
                type="submit"
                disabled={isSubmitting}
                className="rounded-xl bg-brand font-bold text-brand-foreground shadow-sm hover:brightness-105 active:scale-95"
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
            </div>
          </form>
        </div>

        {/* Recent Bookings Sidebar */}
        <div className="rounded-3xl border border-border bg-card p-6 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-4 border-b border-border">
              <h3 className="text-sm font-extrabold tracking-tight">Đơn gần đây</h3>
              <button
                onClick={() => setCustomerTab("bookings")}
                className="text-xs font-bold text-brand hover:underline flex items-center gap-1"
              >
                Tất cả ({bookings.length}) <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>

            <div className="mt-4 space-y-3">
              {bookings.length === 0 ? (
                <div className="py-8 text-center text-xs text-muted-foreground">
                  <ClipboardList className="mx-auto h-8 w-8 text-muted-foreground/50 mb-2" />
                  Bạn chưa có đơn đặt nào.
                </div>
              ) : (
                bookings.slice(0, 3).map((b) => (
                  <div
                    key={b.id}
                    className="flex flex-col gap-2 rounded-2xl border border-border bg-muted/40 p-3.5 hover:bg-muted/70 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold truncate max-w-[150px]">
                        {b.title}
                      </span>
                      <StatusBadge status={b.status} />
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                      <span>{b.createdAt}</span>
                      <span className="font-semibold text-foreground">Thỏa thuận trực tiếp</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-border">
            <Button
              onClick={() => setCustomerTab("bookings")}
              variant="outline"
              className="w-full rounded-xl border-border font-bold text-xs"
            >
              <ClipboardList className="mr-2 h-4 w-4 text-brand" /> Quản lý danh sách đơn
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

