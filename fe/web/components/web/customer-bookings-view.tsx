"use client";

import { useEffect, useState, type FormEvent } from "react";
import {
  AlertCircle,
  ArrowRight,
  Calendar,
  ClipboardList,
  Pencil,
  MapPin,
  PlusCircle,
  Ban,
  X,
} from "lucide-react";
import { useApp } from "../app-store";
import type { ServiceRequestItem } from "@/lib/types";
import { Button } from "@/components/ui/button";

const API_BASE_URL = (
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:5000/api"
).replace(/\/$/, "");

interface ServiceRequestListResponse {
  success: boolean;
  data: ServiceRequestItem[];
  message?: string;
  pagination?: { page: number; totalPages: number; hasNextPage: boolean };
}

const REQUEST_STATUS_LABEL: Record<ServiceRequestItem["status"], string> = {
  OPEN: "Đang mở",
  QUOTED: "Đã có báo giá",
  BOOKED: "Đã đặt lịch",
  CANCELLED: "Đã hủy",
  EXPIRED: "Hết hạn",
};

interface RequestEditDraft {
  description: string;
  recipientName: string;
  phone: string;
  addressLine: string;
  ward: string;
  district: string;
  city: string;
  preferredStartAt: string;
  preferredEndAt: string;
  budgetMin: string;
  budgetMax: string;
}

function toLocalDateTime(value: string) {
  const date = new Date(value);
  date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
  return date.toISOString().slice(0, 16);
}

export function CustomerBookingsView() {
  const { accessToken, openBookingFlow, openAuthModal } = useApp();
  const [serviceRequests, setServiceRequests] = useState<ServiceRequestItem[]>(
    [],
  );
  const [requestsLoading, setRequestsLoading] = useState(true);
  const [requestsError, setRequestsError] = useState("");
  const [requestRefresh, setRequestRefresh] = useState(0);
  const [selectedRequestId, setSelectedRequestId] = useState<string | null>(
    null,
  );
  const [requestDetail, setRequestDetail] = useState<ServiceRequestItem | null>(
    null,
  );
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState("");
  const [editDraft, setEditDraft] = useState<RequestEditDraft | null>(null);
  const [editSaving, setEditSaving] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [cancelFormOpen, setCancelFormOpen] = useState(false);
  const [cancelSaving, setCancelSaving] = useState(false);
  const [actionError, setActionError] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    setServiceRequests([]);
    setRequestsError("");

    if (!accessToken) {
      setRequestsLoading(false);
      return () => controller.abort();
    }

    setRequestsLoading(true);
    fetch(
      `${API_BASE_URL}/service-requests/me?page=1&limit=20&sortBy=createdAt&sortOrder=desc`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
        signal: controller.signal,
      },
    )
      .then(async (response) => {
        const result = (await response.json()) as ServiceRequestListResponse;
        if (!response.ok || !result.success) {
          throw new Error(result.message || "Không thể tải yêu cầu dịch vụ.");
        }
        setServiceRequests(result.data);
      })
      .catch((requestError: unknown) => {
        if (requestError instanceof Error && requestError.name === "AbortError")
          return;
        setRequestsError(
          requestError instanceof Error
            ? requestError.message
            : "Không thể kết nối tới máy chủ.",
        );
      })
      .finally(() => {
        if (!controller.signal.aborted) setRequestsLoading(false);
      });

    return () => controller.abort();
  }, [accessToken, requestRefresh]);

  const openRequestDetail = async (requestId: string) => {
    setSelectedRequestId(requestId);
    setRequestDetail(null);
    setEditDraft(null);
    setCancelReason("");
    setCancelFormOpen(false);
    setActionError("");
    setDetailError("");
    setDetailLoading(true);
    try {
      if (!accessToken)
        throw new Error(
          "Phiên đăng nhập API đã hết hạn. Vui lòng đăng nhập lại.",
        );
      const response = await fetch(
        `${API_BASE_URL}/service-requests/${requestId}`,
        {
          headers: { Authorization: `Bearer ${accessToken}` },
        },
      );
      const result = (await response.json()) as {
        success: boolean;
        data?: ServiceRequestItem;
        message?: string;
      };
      if (!response.ok || !result.success || !result.data) {
        throw new Error(result.message || "Không thể tải chi tiết yêu cầu.");
      }
      setRequestDetail(result.data);
    } catch (requestError) {
      setDetailError(
        requestError instanceof Error
          ? requestError.message
          : "Không thể kết nối tới máy chủ.",
      );
    } finally {
      setDetailLoading(false);
    }
  };

  const startEditingRequest = () => {
    if (!requestDetail) return;
    setEditDraft({
      description: requestDetail.description,
      recipientName: requestDetail.address.recipientName,
      phone: requestDetail.address.phone,
      addressLine: requestDetail.address.addressLine,
      ward: requestDetail.address.ward ?? "",
      district: requestDetail.address.district ?? "",
      city: requestDetail.address.city,
      preferredStartAt: toLocalDateTime(requestDetail.preferredStartAt),
      preferredEndAt: toLocalDateTime(requestDetail.preferredEndAt),
      budgetMin: requestDetail.budgetMin?.toString() ?? "",
      budgetMax: requestDetail.budgetMax?.toString() ?? "",
    });
    setActionError("");
  };

  const saveRequestChanges = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!accessToken || !selectedRequestId || !editDraft) return;
    setEditSaving(true);
    setActionError("");
    try {
      const response = await fetch(`${API_BASE_URL}/service-requests/${selectedRequestId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({
          description: editDraft.description,
          address: {
            recipientName: editDraft.recipientName,
            phone: editDraft.phone,
            addressLine: editDraft.addressLine,
            ward: editDraft.ward,
            district: editDraft.district,
            city: editDraft.city,
          },
          preferredStartAt: new Date(editDraft.preferredStartAt).toISOString(),
          preferredEndAt: new Date(editDraft.preferredEndAt).toISOString(),
          budgetMin: editDraft.budgetMin === "" ? null : Number(editDraft.budgetMin),
          budgetMax: editDraft.budgetMax === "" ? null : Number(editDraft.budgetMax),
        }),
      });
      const result = (await response.json()) as { success: boolean; message?: string };
      if (!response.ok || !result.success) throw new Error(result.message || "Không thể cập nhật yêu cầu.");
      setEditDraft(null);
      setRequestRefresh((version) => version + 1);
      await openRequestDetail(selectedRequestId);
    } catch (requestError) {
      setActionError(requestError instanceof Error ? requestError.message : "Không thể cập nhật yêu cầu.");
    } finally {
      setEditSaving(false);
    }
  };

  const cancelServiceRequest = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!accessToken || !selectedRequestId) return;
    setCancelSaving(true);
    setActionError("");
    try {
      const response = await fetch(`${API_BASE_URL}/service-requests/${selectedRequestId}/cancel`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({ reason: cancelReason }),
      });
      const result = (await response.json()) as { success: boolean; message?: string };
      if (!response.ok || !result.success) throw new Error(result.message || "Không thể hủy yêu cầu.");
      setCancelReason("");
      setRequestRefresh((version) => version + 1);
      await openRequestDetail(selectedRequestId);
    } catch (requestError) {
      setActionError(requestError instanceof Error ? requestError.message : "Không thể hủy yêu cầu.");
    } finally {
      setCancelSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Page Title & Actions */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-black tracking-tight sm:text-3xl">
            Quản lý đơn đặt dịch vụ
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Theo dõi tiến độ, nhận báo giá từ thợ và quản lý lịch sửa chữa tại
            nhà.
          </p>
        </div>
        <Button
          onClick={() => openBookingFlow()}
          className="rounded-xl bg-cta font-bold text-cta-foreground shadow-sm hover:brightness-105"
        >
          <PlusCircle className="mr-2 h-4 w-4" />
          Tạo yêu cầu mới
        </Button>
      </div>

      <section className="mt-8 rounded-3xl border border-border bg-card p-5 sm:p-8">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="flex items-center gap-2 text-lg font-extrabold">
              <ClipboardList className="size-5 text-brand" />
              Đơn của tôi
            </h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Các yêu cầu dịch vụ được đồng bộ từ tài khoản API của bạn.
            </p>
          </div>
          {accessToken && (
            <button
              type="button"
              onClick={() => setRequestRefresh((version) => version + 1)}
              className="self-start text-xs font-bold text-brand hover:underline sm:self-auto"
            >
              Làm mới danh sách
            </button>
          )}
        </div>

        {!accessToken ? (
          <div className="mt-4 flex flex-col gap-3 rounded-xl border border-border bg-card p-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-muted-foreground">
              Đăng nhập bằng email và mật khẩu API để xem yêu cầu đã gửi.
            </p>
            <Button
              onClick={() => openAuthModal("login")}
              className="rounded-lg bg-brand font-bold text-brand-foreground"
            >
              Đăng nhập API
            </Button>
          </div>
        ) : requestsLoading ? (
          <div className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
            <span className="size-4 animate-spin rounded-full border-2 border-brand border-r-transparent" />
            Đang tải yêu cầu...
          </div>
        ) : requestsError ? (
          <div
            role="alert"
            className="mt-4 flex items-start gap-3 rounded-xl border border-destructive/30 bg-card p-4 text-sm"
          >
            <AlertCircle className="mt-0.5 size-4 shrink-0 text-destructive" />
            <div>
              <p className="font-semibold">Không tải được yêu cầu</p>
              <p className="mt-1 text-muted-foreground">{requestsError}</p>
              <button
                type="button"
                onClick={() => setRequestRefresh((version) => version + 1)}
                className="mt-2 font-bold text-brand hover:underline"
              >
                Thử lại
              </button>
            </div>
          </div>
        ) : serviceRequests.length === 0 ? (
          <p className="mt-4 rounded-xl bg-muted/50 px-4 py-6 text-center text-sm text-muted-foreground">
            Chưa có yêu cầu dịch vụ trên tài khoản này.
          </p>
        ) : (
          <div className="mt-4 grid gap-3 lg:grid-cols-2">
            {serviceRequests.map((request) => (
              <button
                type="button"
                key={request.id}
                onClick={() => void openRequestDetail(request.id)}
                className="flex min-w-0 items-center gap-3 rounded-xl border border-border bg-card p-4 text-left transition-colors hover:border-brand/50"
              >
                <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-secondary text-brand">
                  <ClipboardList className="size-5" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-bold">
                    {request.service?.name || "Yêu cầu dịch vụ"}
                  </span>
                  <span className="mt-1 block truncate text-xs text-muted-foreground">
                    {request.description}
                  </span>
                </span>
                <span className="flex shrink-0 items-center gap-2 text-right">
                  <span className="text-[11px] font-semibold text-brand">
                    {REQUEST_STATUS_LABEL[request.status]}
                  </span>
                  <ArrowRight className="size-4 text-muted-foreground" />
                </span>
              </button>
            ))}
          </div>
        )}
      </section>

      {selectedRequestId && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
          role="presentation"
        >
          <div
            className="absolute inset-0"
            onClick={() => setSelectedRequestId(null)}
          />
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="request-detail-title"
            className="relative z-10 max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-2xl border border-border bg-background shadow-2xl"
          >
            <div className="flex items-start justify-between border-b border-border p-5">
              <div>
                <p className="text-xs font-bold text-brand">CHI TIẾT YÊU CẦU</p>
                <h2
                  id="request-detail-title"
                  className="mt-1 text-lg font-extrabold"
                >
                  {requestDetail?.service?.name || "Yêu cầu dịch vụ"}
                </h2>
              </div>
              <button
                type="button"
                aria-label="Đóng chi tiết"
                onClick={() => setSelectedRequestId(null)}
                className="flex size-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted"
              >
                <X className="size-5" />
              </button>
            </div>
            {detailLoading ? (
              <div className="p-8 text-center text-sm text-muted-foreground">
                Đang tải chi tiết...
              </div>
            ) : detailError ? (
              <div role="alert" className="p-6 text-sm text-destructive">
                {detailError}
              </div>
            ) : requestDetail ? (
              <div className="flex flex-col gap-4 p-5">
                <div className="flex items-center justify-between gap-3">
                  <span className="rounded-full bg-secondary px-3 py-1 text-xs font-bold text-brand">
                    {REQUEST_STATUS_LABEL[requestDetail.status]}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {new Date(requestDetail.createdAt).toLocaleDateString(
                      "vi-VN",
                    )}
                  </span>
                </div>
                <p className="whitespace-pre-line text-sm leading-6">
                  {requestDetail.description}
                </p>
                <div className="grid gap-3 rounded-xl bg-muted/50 p-4 text-sm sm:grid-cols-2">
                  <div>
                    <p className="text-xs text-muted-foreground">
                      Thời gian mong muốn
                    </p>
                    <p className="mt-1 font-semibold">
                      {new Date(requestDetail.preferredStartAt).toLocaleString(
                        "vi-VN",
                      )}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Ngân sách</p>
                    <p className="mt-1 font-semibold">
                      {requestDetail.budgetMin != null ||
                      requestDetail.budgetMax != null
                        ? `${requestDetail.budgetMin?.toLocaleString("vi-VN") ?? "0"} - ${requestDetail.budgetMax?.toLocaleString("vi-VN") ?? "Thỏa thuận"} đ`
                        : "Chưa cung cấp"}
                    </p>
                  </div>
                </div>
                <div className="rounded-xl border border-border p-4 text-sm">
                  <p className="mb-2 flex items-center gap-2 font-bold">
                    <MapPin className="size-4 text-brand" /> Địa chỉ dịch vụ
                  </p>
                  <p>
                    {requestDetail.address.recipientName} ·{" "}
                    {requestDetail.address.phone}
                  </p>
                  <p className="mt-1 text-muted-foreground">
                    {[
                      requestDetail.address.addressLine,
                      requestDetail.address.ward,
                      requestDetail.address.district,
                      requestDetail.address.city,
                    ]
                      .filter(Boolean)
                      .join(", ")}
                  </p>
                </div>
                {requestDetail.attachments?.length > 0 && (
                  <p className="text-xs text-muted-foreground">
                    Tệp đính kèm: {requestDetail.attachments.length}
                  </p>
                )}
                {requestDetail.cancellationReason && (
                  <p className="rounded-lg bg-muted/50 p-3 text-sm">
                    <span className="font-semibold">Lý do hủy:</span> {requestDetail.cancellationReason}
                  </p>
                )}
                {actionError && <p role="alert" className="text-sm text-destructive">{actionError}</p>}
                {editDraft ? (
                  <form onSubmit={saveRequestChanges} className="flex flex-col gap-3 border-t border-border pt-4">
                    <h3 className="text-sm font-bold">Chỉnh sửa yêu cầu</h3>
                    <label className="text-xs font-semibold">Mô tả
                      <textarea required minLength={10} maxLength={3000} value={editDraft.description} onChange={(event) => setEditDraft({ ...editDraft, description: event.target.value })} className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm" rows={3} />
                    </label>
                    <div className="grid gap-3 sm:grid-cols-2">
                      {([
                        ["recipientName", "Người nhận"], ["phone", "Số điện thoại"], ["addressLine", "Địa chỉ"],
                        ["ward", "Phường/Xã"], ["district", "Quận/Huyện"], ["city", "Thành phố"],
                      ] as const).map(([field, label]) => (
                        <label key={field} className="text-xs font-semibold">{label}
                          <input required={field !== "ward" && field !== "district"} value={editDraft[field]} onChange={(event) => setEditDraft({ ...editDraft, [field]: event.target.value })} className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm" />
                        </label>
                      ))}
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <label className="text-xs font-semibold">Bắt đầu
                        <input type="datetime-local" required value={editDraft.preferredStartAt} onChange={(event) => setEditDraft({ ...editDraft, preferredStartAt: event.target.value })} className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm" />
                      </label>
                      <label className="text-xs font-semibold">Kết thúc
                        <input type="datetime-local" required value={editDraft.preferredEndAt} onChange={(event) => setEditDraft({ ...editDraft, preferredEndAt: event.target.value })} className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm" />
                      </label>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <label className="text-xs font-semibold">Ngân sách tối thiểu
                        <input type="number" min="0" value={editDraft.budgetMin} onChange={(event) => setEditDraft({ ...editDraft, budgetMin: event.target.value })} className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm" />
                      </label>
                      <label className="text-xs font-semibold">Ngân sách tối đa
                        <input type="number" min="0" value={editDraft.budgetMax} onChange={(event) => setEditDraft({ ...editDraft, budgetMax: event.target.value })} className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm" />
                      </label>
                    </div>
                    <div className="flex justify-end gap-2">
                      <Button type="button" variant="outline" onClick={() => setEditDraft(null)}>Đóng</Button>
                      <Button type="submit" disabled={editSaving}>{editSaving ? "Đang lưu..." : "Lưu thay đổi"}</Button>
                    </div>
                  </form>
                ) : requestDetail.status === "OPEN" || requestDetail.status === "QUOTED" ? (
                  <>
                    {cancelFormOpen && (
                      <form onSubmit={cancelServiceRequest} className="flex flex-col gap-3 border-t border-border pt-4">
                        <label className="text-xs font-semibold">Lý do hủy
                          <textarea required maxLength={500} value={cancelReason} onChange={(event) => setCancelReason(event.target.value)} className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm" rows={2} />
                        </label>
                        <div className="flex justify-end gap-2">
                          <Button type="button" variant="outline" onClick={() => { setCancelFormOpen(false); setCancelReason(""); }}>Quay lại</Button>
                          <Button type="submit" variant="destructive" disabled={cancelSaving}>{cancelSaving ? "Đang hủy..." : "Xác nhận hủy"}</Button>
                        </div>
                      </form>
                    )}
                    {!cancelFormOpen && (
                      <div className="flex justify-end gap-2 border-t border-border pt-4">
                        {requestDetail.status === "OPEN" && <Button type="button" variant="outline" onClick={startEditingRequest}><Pencil className="mr-2 size-4" />Chỉnh sửa</Button>}
                        <Button type="button" variant="destructive" onClick={() => { setCancelFormOpen(true); setCancelReason(""); setActionError(""); }}><Ban className="mr-2 size-4" />Hủy yêu cầu</Button>
                      </div>
                    )}
                  </>
                ) : null}
              </div>
            ) : null}
          </section>
        </div>
      )}
    </div>
  );
}
