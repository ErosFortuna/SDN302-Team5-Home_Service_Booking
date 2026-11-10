"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import {
  AlertCircle,
  ArrowRight,
  ClipboardList,
  Pencil,
  MapPin,
  Ban,
  X,
  CalendarClock,
  Clock3,
  CheckCircle,
  MessageSquare,
  Star,
  TriangleAlert,
} from "lucide-react";
import { useApp } from "../app-store";
import type { ServiceRequestItem } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { parseRequestTitleAndDesc } from "@/lib/api/service-requests";
import { bookingApi } from "@/lib/api/bookings";
import { complaintApi, type ComplaintCategory } from "@/lib/api/complaints";
import { filterSafeUrls } from "@/lib/safe-url";
import { dateTimeLocalToIso, formatVietnamDate, formatVietnamDateTime, formatVietnamTime, toDateTimeLocalValue, vietnamDateKey } from "@/lib/timezone";

const API_BASE_URL = (
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:5173/api"
).replace(/\/$/, "");

interface ServiceRequestListResponse {
  success: boolean;
  data: ServiceRequestItem[];
  message?: string;
  pagination?: { page: number; totalPages: number; hasNextPage: boolean };
}

type ApiBookingStatus =
  | "PENDING_CONFIRMATION"
  | "CONFIRMED"
  | "PROVIDER_ON_THE_WAY"
  | "ARRIVED"
  | "IN_PROGRESS"
  | "AWAITING_APPROVAL"
  | "COMPLETED"
  | "CANCELLED"
  | "NO_SHOW";

interface CustomerBooking {
  id: string;
  status: ApiBookingStatus;
  createdAt?: string;
  scheduledStartAt: string;
  scheduledEndAt: string;
  price: number;
  finalPrice?: number;
  paymentStatus?: string;
  cancellationReason?: string;
  service?: { name?: string } | null;
  provider?: { fullName?: string; name?: string } | null;
  customerReview?: { rating: number; comment: string } | null;
  request?: {
    id?: string;
    _id?: string;
    description?: string;
    preferredStartAt?: string;
    preferredEndAt?: string;
    status?: string;
  } | null;
  address?: {
    addressLine?: string;
    ward?: string;
    district?: string;
    city?: string;
  };
  statusHistory?: {
    from: ApiBookingStatus;
    to: ApiBookingStatus;
    note?: string;
    changedAt: string;
  }[];
  scheduleHistory?: {
    fromStartAt: string;
    toStartAt: string;
    changedAt: string;
    note?: string;
  }[];
}

interface BookingListResponse {
  success: boolean;
  data: CustomerBooking[];
  message?: string;
}

const BOOKING_STATUS_LABEL: Record<ApiBookingStatus, string> = {
  PENDING_CONFIRMATION: "Chờ thợ xác nhận",
  CONFIRMED: "Đã xác nhận",
  PROVIDER_ON_THE_WAY: "Thợ đang đến",
  ARRIVED: "Thợ đã đến",
  IN_PROGRESS: "Đang thực hiện",
  AWAITING_APPROVAL: "Đang thực hiện",
  COMPLETED: "Hoàn thành",
  CANCELLED: "Đã hủy",
  NO_SHOW: "Không có mặt",
};

const REQUEST_STATUS_LABEL: Record<ServiceRequestItem["status"], string> = {
  OPEN: "Đang mở",
  BOOKED: "Đã đặt lịch",
  CANCELLED: "Đã hủy",
  EXPIRED: "Hết hạn",
};

type CreatedRangeFilter = "ALL" | "TODAY" | "7D" | "30D";
type SortOrder = "NEWEST" | "OLDEST";

const CREATED_RANGE_OPTIONS: { value: CreatedRangeFilter; label: string }[] = [
  { value: "ALL", label: "Tất cả thời gian" },
  { value: "TODAY", label: "Hôm nay" },
  { value: "7D", label: "7 ngày qua" },
  { value: "30D", label: "30 ngày qua" },
];

const SORT_ORDER_OPTIONS: { value: SortOrder; label: string }[] = [
  { value: "NEWEST", label: "Mới nhất trước" },
  { value: "OLDEST", label: "Cũ nhất trước" },
];

const REQUEST_STATUS_OPTIONS = (
  Object.keys(REQUEST_STATUS_LABEL) as ServiceRequestItem["status"][]
).map((value) => ({ value, label: REQUEST_STATUS_LABEL[value] }));

const BOOKING_STATUS_OPTIONS = (
  Object.keys(BOOKING_STATUS_LABEL) as ApiBookingStatus[]
).map((value) => ({ value, label: BOOKING_STATUS_LABEL[value] }));

function isWithinCreatedRange(createdAt: string | undefined, range: CreatedRangeFilter) {
  if (range === "ALL") return true;
  if (!createdAt) return false;
  const created = new Date(createdAt).getTime();
  if (Number.isNaN(created)) return false;
  if (range === "TODAY") return vietnamDateKey(created) === vietnamDateKey();
  const days = range === "7D" ? 7 : 30;
  return created >= Date.now() - days * 24 * 60 * 60 * 1000;
}

function compareByCreatedAt(
  first: string | undefined,
  second: string | undefined,
  order: SortOrder,
) {
  const firstValue = first ? new Date(first).getTime() : Number.NaN;
  const secondValue = second ? new Date(second).getTime() : Number.NaN;
  const firstValid = !Number.isNaN(firstValue);
  const secondValid = !Number.isNaN(secondValue);
  if (!firstValid && !secondValid) return 0;
  if (!firstValid) return 1;
  if (!secondValid) return -1;
  return order === "NEWEST" ? secondValue - firstValue : firstValue - secondValue;
}

function formatCreatedDateLabel(createdAt: Date) {
  const key = vietnamDateKey(createdAt);
  if (key === vietnamDateKey()) return "Hôm nay";
  if (key === vietnamDateKey(Date.now() - 24 * 60 * 60 * 1000)) return "Hôm qua";
  return formatVietnamDate(createdAt, {
    weekday: "long",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function groupByCreatedDate<T>(items: T[], getCreatedAt: (item: T) => string | undefined) {
  const groups: { key: string; label: string; items: T[] }[] = [];
  for (const item of items) {
    const rawCreatedAt = getCreatedAt(item);
    const createdAt = rawCreatedAt ? new Date(rawCreatedAt) : null;
    const isValid = createdAt != null && !Number.isNaN(createdAt.getTime());
    const key = isValid ? vietnamDateKey(createdAt) : "unknown";
    const lastGroup = groups[groups.length - 1];
    if (lastGroup?.key === key) {
      lastGroup.items.push(item);
      continue;
    }
    groups.push({
      key,
      label: isValid ? formatCreatedDateLabel(createdAt) : "Không rõ ngày tạo",
      items: [item],
    });
  }
  return groups;
}

interface OrderFilterBarProps {
  search: string;
  onSearchChange: (value: string) => void;
  searchPlaceholder: string;
  status: string;
  onStatusChange: (value: string) => void;
  statusOptions: { value: string; label: string }[];
  statusAllLabel: string;
  createdRange: CreatedRangeFilter;
  onCreatedRangeChange: (value: CreatedRangeFilter) => void;
  sortOrder: SortOrder;
  onSortOrderChange: (value: SortOrder) => void;
  onReset: () => void;
  resultCount: number;
  totalCount: number;
}

function OrderFilterBar({
  search,
  onSearchChange,
  searchPlaceholder,
  status,
  onStatusChange,
  statusOptions,
  statusAllLabel,
  createdRange,
  onCreatedRangeChange,
  sortOrder,
  onSortOrderChange,
  onReset,
  resultCount,
  totalCount,
}: OrderFilterBarProps) {
  const hasActiveFilter =
    search.trim() !== "" || status !== "ALL" || createdRange !== "ALL";

  return (
    <div className="mt-4 flex flex-col gap-2 rounded-xl border border-border bg-muted/30 p-3 sm:flex-row sm:flex-wrap sm:items-center">
      <input
        type="search"
        value={search}
        onChange={(event) => onSearchChange(event.target.value)}
        placeholder={searchPlaceholder}
        aria-label={searchPlaceholder}
        className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm sm:min-w-56 sm:flex-1"
      />
      <select
        value={status}
        onChange={(event) => onStatusChange(event.target.value)}
        aria-label="Lọc theo trạng thái"
        className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm sm:w-auto"
      >
        <option value="ALL">{statusAllLabel}</option>
        {statusOptions.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <select
        value={createdRange}
        onChange={(event) => onCreatedRangeChange(event.target.value as CreatedRangeFilter)}
        aria-label="Lọc theo ngày tạo"
        className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm sm:w-auto"
      >
        {CREATED_RANGE_OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <select
        value={sortOrder}
        onChange={(event) => onSortOrderChange(event.target.value as SortOrder)}
        aria-label="Sắp xếp theo ngày tạo"
        className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm sm:w-auto"
      >
        {SORT_ORDER_OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <button
        type="button"
        onClick={onReset}
        disabled={!hasActiveFilter && sortOrder === "NEWEST"}
        className="h-10 w-full rounded-lg border border-border px-3 text-xs font-bold text-muted-foreground transition-colors hover:border-brand/40 hover:text-brand disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
      >
        Xóa lọc
      </button>
      <span className="text-xs font-medium text-muted-foreground sm:ml-auto">
        {resultCount}/{totalCount} mục
      </span>
    </div>
  );
}

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
  return toDateTimeLocalValue(value);
}

export function CustomerBookingsView() {
  const {
    accessToken,
    openAuthModal,
    focusedBookingId,
    clearFocusedBooking,
    focusedRequestId,
    clearFocusedRequest,
  } = useApp();
  const [serviceRequests, setServiceRequests] = useState<ServiceRequestItem[]>(
    [],
  );
  const [requestsLoading, setRequestsLoading] = useState(true);
  const [requestsError, setRequestsError] = useState("");
  const [requestRefresh, setRequestRefresh] = useState(0);
  const [requestSearch, setRequestSearch] = useState("");
  const [requestStatusFilter, setRequestStatusFilter] = useState<"ALL" | ServiceRequestItem["status"]>("ALL");
  const [requestCreatedRange, setRequestCreatedRange] = useState<CreatedRangeFilter>("ALL");
  const [requestSortOrder, setRequestSortOrder] = useState<SortOrder>("NEWEST");
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
  const [bookings, setBookings] = useState<CustomerBooking[]>([]);
  const [bookingsLoading, setBookingsLoading] = useState(true);
  const [bookingsError, setBookingsError] = useState("");
  const [bookingRefresh, setBookingRefresh] = useState(0);
  const [bookingSearch, setBookingSearch] = useState("");
  const [bookingStatusFilter, setBookingStatusFilter] = useState<"ALL" | ApiBookingStatus>("ALL");
  const [bookingCreatedRange, setBookingCreatedRange] = useState<CreatedRangeFilter>("ALL");
  const [bookingSortOrder, setBookingSortOrder] = useState<SortOrder>("NEWEST");
  const [bookingActionId, setBookingActionId] = useState<string | null>(null);
  const [bookingActionError, setBookingActionError] = useState("");
  const [bookingActionErrorId, setBookingActionErrorId] = useState<string | null>(null);
  const [rescheduleId, setRescheduleId] = useState<string | null>(null);
  const [rescheduleStart, setRescheduleStart] = useState("");
  const [bookingCancelId, setBookingCancelId] = useState<string | null>(null);
  const [bookingCancelReason, setBookingCancelReason] = useState("");
  const [reviewDraftId, setReviewDraftId] = useState<string | null>(null);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState("");
  const [complaintDraftId, setComplaintDraftId] = useState<string | null>(null);
  const [complaintCategory, setComplaintCategory] = useState<ComplaintCategory>("QUALITY");
  const [complaintDescription, setComplaintDescription] = useState("");
  const [feedbackSaving, setFeedbackSaving] = useState(false);
  const [feedbackError, setFeedbackError] = useState("");
  const [feedbackSuccess, setFeedbackSuccess] = useState("");
  const [feedbackSuccessBookingId, setFeedbackSuccessBookingId] = useState<string | null>(null);

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

  useEffect(() => {
    const controller = new AbortController();
    setBookings([]);
    setBookingsError("");

    if (!accessToken) {
      setBookingsLoading(false);
      return () => controller.abort();
    }

    setBookingsLoading(true);
    fetch(`${API_BASE_URL}/bookings/customer/me`, {
      headers: { Authorization: `Bearer ${accessToken}` },
      signal: controller.signal,
    })
      .then(async (response) => {
        const result = (await response.json()) as BookingListResponse;
        if (!response.ok || !result.success) {
          throw new Error(result.message || "Không thể tải booking.");
        }
        setBookings(result.data);
      })
      .catch((requestError: unknown) => {
        if (requestError instanceof Error && requestError.name === "AbortError")
          return;
        setBookingsError(
          requestError instanceof Error
            ? requestError.message
            : "Không thể kết nối tới máy chủ.",
        );
      })
      .finally(() => {
        if (!controller.signal.aborted) setBookingsLoading(false);
      });

    return () => controller.abort();
  }, [accessToken, bookingRefresh]);

  const updateCustomerBooking = async (
    bookingId: string,
    action: "reschedule" | "cancel",
    body: { scheduledStartAt: string } | { reason: string },
  ) => {
    if (!accessToken) return;
    setBookingActionId(bookingId);
    setBookingActionError("");
    setBookingActionErrorId(null);
    try {
      const response = await fetch(
        `${API_BASE_URL}/bookings/${bookingId}/${action}`,
        {
          method: action === "cancel" ? "POST" : "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify(body),
        },
      );
      const result = (await response.json()) as {
        success: boolean;
        message?: string;
      };
      if (!response.ok || !result.success) {
        throw new Error(result.message || "Không thể cập nhật booking.");
      }
      setRescheduleId(null);
      setBookingCancelId(null);
      setBookingCancelReason("");
      setBookingRefresh((version) => version + 1);
      setRequestRefresh((version) => version + 1);
    } catch (requestError) {
      setBookingActionErrorId(bookingId);
      setBookingActionError(
        requestError instanceof Error
          ? requestError.message
          : "Không thể kết nối tới máy chủ.",
      );
    } finally {
      setBookingActionId(null);
    }
  };

  const confirmPaymentAction = async (bookingId: string) => {
    if (!accessToken) return;
    setBookingActionId(bookingId);
    setBookingActionError("");
    setBookingActionErrorId(null);
    try {
      await bookingApi.confirmPayment(bookingId, "Khách hàng xác nhận đã thanh toán tiền mặt");
      setFeedbackSuccess("Xác nhận thanh toán tiền mặt thành công!");
      setFeedbackSuccessBookingId(bookingId);
      setBookingRefresh((version) => version + 1);
    } catch (requestError) {
      setBookingActionErrorId(bookingId);
      setBookingActionError(
        requestError instanceof Error
          ? requestError.message
          : "Không thể kết nối tới máy chủ.",
      );
    } finally {
      setBookingActionId(null);
    }
  };

  const submitBookingReview = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!reviewDraftId) return;
    setFeedbackSaving(true);
    setFeedbackError("");
    setFeedbackSuccess("");
    try {
      const response = await bookingApi.review(reviewDraftId, reviewRating, reviewComment.trim());
      if (!response.success) throw new Error(response.message || "Không thể gửi đánh giá.");
      setReviewDraftId(null);
      setReviewComment("");
      setBookingRefresh((version) => version + 1);
      setFeedbackSuccess("Cảm ơn bạn đã đánh giá dịch vụ.");
      setFeedbackSuccessBookingId(reviewDraftId);
    } catch (requestError) {
      setFeedbackError(
        requestError instanceof Error ? requestError.message : "Không thể gửi đánh giá.",
      );
    } finally {
      setFeedbackSaving(false);
    }
  };

  const submitBookingComplaint = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!complaintDraftId) return;
    setFeedbackSaving(true);
    setFeedbackError("");
    setFeedbackSuccess("");
    try {
      const response = await complaintApi.create({
        bookingId: complaintDraftId,
        category: complaintCategory,
        description: complaintDescription.trim(),
      });
      if (!response.success) throw new Error(response.message || "Không thể gửi khiếu nại.");
      setComplaintDraftId(null);
      setComplaintDescription("");
      setFeedbackSuccess("Khiếu nại đã được gửi đến bộ phận hỗ trợ.");
      setFeedbackSuccessBookingId(complaintDraftId);
    } catch (requestError) {
      setFeedbackError(
        requestError instanceof Error ? requestError.message : "Không thể gửi khiếu nại.",
      );
    } finally {
      setFeedbackSaving(false);
    }
  };

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
          "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.",
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

  useEffect(() => {
    if (!focusedRequestId || requestsLoading) return;
    const requestExists = serviceRequests.some((request) => request.id === focusedRequestId);
    clearFocusedRequest();
    if (requestExists) void openRequestDetail(focusedRequestId);
  }, [focusedRequestId, requestsLoading, serviceRequests, clearFocusedRequest]);

  useEffect(() => {
    if (!focusedBookingId || bookingsLoading) return;
    document.getElementById(`booking-${focusedBookingId}`)?.scrollIntoView({
      behavior: "smooth",
      block: "center",
    });
    clearFocusedBooking();
  }, [focusedBookingId, bookingsLoading, bookings, clearFocusedBooking]);

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
          preferredStartAt: dateTimeLocalToIso(editDraft.preferredStartAt),
          preferredEndAt: dateTimeLocalToIso(editDraft.preferredEndAt),
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

  const visibleBookings = bookings
    .filter((booking) => bookingStatusFilter === "ALL" || booking.status === bookingStatusFilter)
    .filter((booking) => isWithinCreatedRange(booking.createdAt, bookingCreatedRange))
    .filter((booking) => {
      const query = bookingSearch.trim().toLocaleLowerCase("vi");
      if (!query) return true;
      return [
        booking.service?.name,
        booking.request?.description,
        booking.provider?.fullName,
        booking.provider?.name,
      ].some((value) => value?.toLocaleLowerCase("vi").includes(query));
    })
    .sort((first, second) => compareByCreatedAt(first.createdAt, second.createdAt, bookingSortOrder));
  const bookingDateGroups = groupByCreatedDate(visibleBookings, (booking) => booking.createdAt);

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Page Title */}
      <div>
        <h1 className="text-2xl font-black tracking-tight sm:text-3xl">
          Quản lý đơn đặt dịch vụ
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Theo dõi tiến độ, chọn thợ phù hợp và quản lý lịch sửa chữa tại nhà.
        </p>
      </div>

      <section className="mt-8 rounded-3xl border border-border bg-card p-5 sm:p-8">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="flex items-center gap-2 text-lg font-extrabold">
              <ClipboardList className="size-5 text-brand" />
              Đơn của tôi
            </h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Các yêu cầu dịch vụ được đồng bộ từ tài khoản của bạn.
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
              Đăng nhập để xem yêu cầu đã gửi.
            </p>
            <Button
              onClick={() => openAuthModal("login")}
              className="rounded-lg bg-brand font-bold text-brand-foreground"
            >
              Đăng nhập
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
            {serviceRequests.map((request) => {
              const parsed = parseRequestTitleAndDesc(request.description, request.service?.name);
              return (
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
                      {parsed.title}
                    </span>
                    <span className="mt-1 block truncate text-xs text-muted-foreground">
                      {parsed.description || request.service?.name || request.description}
                    </span>
                  </span>
                  <span className="flex shrink-0 items-center gap-2 text-right">
                    <span className="text-[11px] font-semibold text-brand">
                      {REQUEST_STATUS_LABEL[request.status]}
                    </span>
                    <ArrowRight className="size-4 text-muted-foreground" />
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </section>

      <section className="mt-6 rounded-3xl border border-border bg-card p-5 sm:p-8">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="flex items-center gap-2 text-lg font-extrabold">
              <CalendarClock className="size-5 text-brand" />
              Lịch đã đặt
            </h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Theo dõi tiến độ, đổi lịch hoặc hủy booking đã được xác nhận.
            </p>
          </div>
          {accessToken && (
            <button
              type="button"
              onClick={() => setBookingRefresh((version) => version + 1)}
              className="self-start text-xs font-bold text-brand hover:underline sm:self-auto"
            >
              Làm mới lịch
            </button>
          )}
        </div>

        {!accessToken ? (
          <p className="mt-4 rounded-xl bg-muted/50 px-4 py-5 text-center text-sm text-muted-foreground">
            Đăng nhập để xem và quản lý các booking đã đặt.
          </p>
        ) : bookingsLoading ? (
          <div className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
            <span className="size-4 animate-spin rounded-full border-2 border-brand border-r-transparent" />
            Đang tải lịch đã đặt...
          </div>
        ) : bookingsError ? (
          <div role="alert" className="mt-4 rounded-xl border border-destructive/30 p-4 text-sm">
            <p className="text-destructive">{bookingsError}</p>
            <button
              type="button"
              onClick={() => setBookingRefresh((version) => version + 1)}
              className="mt-2 font-bold text-brand hover:underline"
            >
              Thử lại
            </button>
          </div>
        ) : bookings.length === 0 ? (
          <p className="mt-4 rounded-xl bg-muted/50 px-4 py-5 text-center text-sm text-muted-foreground">
            Chưa có booking nào được tạo.
          </p>
        ) : (
          <>
          <OrderFilterBar
            search={bookingSearch}
            onSearchChange={setBookingSearch}
            searchPlaceholder="Tìm dịch vụ, mô tả hoặc thợ..."
            status={bookingStatusFilter}
            onStatusChange={(value) => setBookingStatusFilter(value as "ALL" | ApiBookingStatus)}
            statusOptions={BOOKING_STATUS_OPTIONS}
            statusAllLabel="Tất cả trạng thái"
            createdRange={bookingCreatedRange}
            onCreatedRangeChange={setBookingCreatedRange}
            sortOrder={bookingSortOrder}
            onSortOrderChange={setBookingSortOrder}
            onReset={() => {
              setBookingSearch("");
              setBookingStatusFilter("ALL");
              setBookingCreatedRange("ALL");
              setBookingSortOrder("NEWEST");
            }}
            resultCount={visibleBookings.length}
            totalCount={bookings.length}
          />
          {visibleBookings.length === 0 ? (
            <p className="mt-4 rounded-xl bg-muted/50 px-4 py-5 text-center text-sm text-muted-foreground">
              Không tìm thấy đơn phù hợp với bộ lọc.
            </p>
          ) : (
          <div className="mt-4 space-y-5">
            {bookingDateGroups.map((group) => (
              <section key={group.key}>
                <h3 className="mb-3 text-sm font-bold capitalize text-muted-foreground">{group.label}</h3>
                <div className="grid gap-4">
            {group.items.map((booking) => {
              const isConfirmed = booking.status === "CONFIRMED";
              const isUpcoming =
                new Date(booking.scheduledStartAt).getTime() > Date.now();
              const canManage = isConfirmed && isUpcoming;
              const bookingBusy = bookingActionId === booking.id;
              const parsedBooking = parseRequestTitleAndDesc(
                booking.request?.description,
                booking.service?.name || "Dịch vụ tại nhà"
              );

              return (
                <article
                  key={booking.id}
                  id={`booking-${booking.id}`}
                  className="rounded-2xl border border-border p-4 sm:p-5"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h3 className="font-bold">
                        {parsedBooking.title}
                      </h3>
                      {booking.service?.name && booking.service.name !== parsedBooking.title && (
                        <p className="mt-0.5 text-xs font-medium text-brand">
                          Dịch vụ: {booking.service.name}
                        </p>
                      )}
                      <p className="mt-1 text-xs text-muted-foreground">
                        Thợ: {booking.provider?.fullName || booking.provider?.name || "Đang cập nhật"}
                      </p>
                    </div>
                    <span className="rounded-full bg-secondary px-3 py-1 text-xs font-bold text-brand">
                      {BOOKING_STATUS_LABEL[booking.status]}
                    </span>
                  </div>

                  <div className="mt-4 grid gap-3 rounded-xl bg-muted/40 p-3 text-sm sm:grid-cols-2">
                    <div>
                      <p className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Clock3 className="size-3.5" /> Lịch thực hiện
                      </p>
                      <p className="mt-1 font-semibold">
                        {formatVietnamDateTime(booking.scheduledStartAt)}
                        {" – "}
                        {formatVietnamTime(booking.scheduledEndAt)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">
                        {booking.status === "COMPLETED" && booking.finalPrice != null
                          ? "Giá cuối đã thỏa thuận"
                          : "Giá dịch vụ niêm yết (tham khảo)"}
                      </p>
                      <p className="mt-1 font-semibold">
                        {(booking.finalPrice ?? booking.price ?? 0).toLocaleString("vi-VN")} đ
                      </p>
                    </div>
                    {booking.address && (
                      <p className="text-xs text-muted-foreground sm:col-span-2">
                        <MapPin className="mr-1 inline size-3.5" />
                        {[booking.address.addressLine, booking.address.ward, booking.address.district, booking.address.city]
                          .filter(Boolean)
                          .join(", ")}
                      </p>
                    )}
                  </div>

                  {booking.request && (
                    <section className="mt-3 rounded-xl border border-border p-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <h4 className="text-xs font-bold">Yêu cầu dịch vụ liên kết</h4>
                        {(booking.request.id || booking.request._id) && (
                          <button
                            type="button"
                            onClick={() =>
                              void openRequestDetail(
                                booking.request?.id || booking.request?._id || "",
                              )
                            }
                            className="text-[11px] font-semibold text-brand hover:underline"
                          >
                            Xem yêu cầu #{booking.request.id || booking.request._id}
                          </button>
                        )}
                      </div>
                      {booking.request.description && (
                        <p className="mt-2 whitespace-pre-line text-sm leading-6">
                          {booking.request.description}
                        </p>
                      )}
                      {booking.request.preferredStartAt && (
                        <p className="mt-2 text-xs text-muted-foreground">
                          Thời gian yêu cầu:{" "}
                          {formatVietnamDateTime(booking.request.preferredStartAt)}
                        </p>
                      )}
                    </section>
                  )}

                  {booking.statusHistory?.length ? (
                    <div className="mt-4">
                      <p className="mb-2 text-xs font-bold">Theo dõi tiến độ</p>
                      <ol className="space-y-2 border-l border-brand/30 pl-4">
                        {booking.statusHistory.map((entry, index) => (
                          <li key={`${entry.changedAt}-${index}`} className="relative text-xs">
                            <span className="absolute -left-[21px] top-1 size-2 rounded-full bg-brand" />
                            <span className="font-semibold">{BOOKING_STATUS_LABEL[entry.to]}</span>
                            <span className="ml-2 text-muted-foreground">
                              {formatVietnamDateTime(entry.changedAt)}
                            </span>
                            {entry.note && <p className="mt-0.5 text-muted-foreground">{entry.note}</p>}
                          </li>
                        ))}
                      </ol>
                    </div>
                  ) : (
                    <p className="mt-3 text-xs text-muted-foreground">
                      Tiến độ sẽ được cập nhật khi thợ xác nhận booking.
                    </p>
                  )}

                  {booking.scheduleHistory?.length ? (
                    <p className="mt-3 text-xs text-muted-foreground">
                      Đã đổi lịch {booking.scheduleHistory.length} lần · cập nhật gần nhất{" "}
                      {formatVietnamDateTime(booking.scheduleHistory[booking.scheduleHistory.length - 1].changedAt)}
                    </p>
                  ) : null}
                  {booking.cancellationReason && (
                    <p className="mt-3 rounded-lg bg-muted/50 p-3 text-xs">
                      <span className="font-semibold">Lý do hủy:</span> {booking.cancellationReason}
                    </p>
                  )}

                  {booking.status === "COMPLETED" && (
                    <section className="mt-4 rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="text-sm font-bold">Thanh toán trực tiếp</h4>
                            {booking.paymentStatus === "PAID" ? (
                              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-xs font-semibold text-emerald-700">
                                <CheckCircle className="size-3.5 text-emerald-600" />
                                Đã thanh toán
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-2.5 py-0.5 text-xs font-semibold text-amber-700">
                                <Clock3 className="size-3.5 text-amber-600" />
                                Chờ xác nhận tiền mặt (COD)
                              </span>
                            )}
                          </div>
                          <p className="mt-1 text-xs text-muted-foreground">
                            Số tiền cần thanh toán cho thợ:{" "}
                            <span className="font-bold text-foreground">
                              {(booking.finalPrice ?? booking.price ?? 0).toLocaleString("vi-VN")} đ
                            </span>
                            {booking.paymentStatus === "PAID"
                              ? " · Bạn đã xác nhận thanh toán."
                              : " · Vui lòng bấm xác nhận sau khi đã trả tiền mặt cho thợ."}
                          </p>
                        </div>
                        {booking.paymentStatus !== "PAID" && (
                          <Button
                            type="button"
                            variant="default"
                            className="bg-emerald-600 text-white hover:bg-emerald-700"
                            disabled={bookingActionId === booking.id}
                            onClick={() => void confirmPaymentAction(booking.id)}
                          >
                            <CheckCircle className="mr-1.5 size-4" />
                            {bookingActionId === booking.id ? "Đang xử lý..." : "Xác nhận đã trả tiền mặt"}
                          </Button>
                        )}
                      </div>
                    </section>
                  )}

                  {booking.status === "COMPLETED" && (
                    <section className="mt-4 rounded-xl border border-brand/20 bg-brand/5 p-4">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <h4 className="text-sm font-bold">Bạn hài lòng với dịch vụ?</h4>
                          <p className="mt-1 text-xs text-muted-foreground">
                            Đánh giá giúp khách hàng khác chọn thợ phù hợp; gửi khiếu nại nếu cần hỗ trợ.
                          </p>
                        </div>
                        {booking.customerReview ? (
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/10 px-3 py-1.5 text-xs font-bold text-amber-700">
                            <Star className="size-3.5 fill-amber-400 text-amber-400" />
                            Đã đánh giá {booking.customerReview.rating}/5
                          </span>
                        ) : (
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => {
                              setFeedbackError("");
                              setFeedbackSuccess("");
                              setReviewDraftId(booking.id);
                              setComplaintDraftId(null);
                              setReviewRating(5);
                              setReviewComment("");
                            }}
                          >
                            <Star className="mr-2 size-4" />
                            Đánh giá thợ
                          </Button>
                        )}
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => {
                            setFeedbackError("");
                            setFeedbackSuccess("");
                            setComplaintDraftId(booking.id);
                            setReviewDraftId(null);
                            setComplaintCategory("QUALITY");
                            setComplaintDescription("");
                          }}
                        >
                          <TriangleAlert className="mr-2 size-4" />
                          Gửi khiếu nại
                        </Button>
                      </div>

                      {reviewDraftId === booking.id && (
                        <form onSubmit={submitBookingReview} className="mt-4 space-y-3 border-t border-brand/15 pt-4">
                          <fieldset>
                            <legend className="mb-2 text-xs font-semibold">Mức đánh giá</legend>
                            <div className="flex gap-1" role="radiogroup" aria-label="Mức đánh giá">
                              {[1, 2, 3, 4, 5].map((rating) => (
                                <button
                                  key={rating}
                                  type="button"
                                  role="radio"
                                  aria-checked={reviewRating === rating}
                                  aria-label={`${rating} sao`}
                                  onClick={() => setReviewRating(rating)}
                                  className="rounded-md p-1 transition hover:bg-amber-500/10"
                                >
                                  <Star className={`size-6 ${rating <= reviewRating ? "fill-amber-400 text-amber-400" : "text-muted-foreground/40"}`} />
                                </button>
                              ))}
                            </div>
                          </fieldset>
                          <label className="block text-xs font-semibold">
                            Nhận xét (không bắt buộc)
                            <textarea
                              maxLength={2000}
                              value={reviewComment}
                              onChange={(event) => setReviewComment(event.target.value)}
                              rows={3}
                              className="mt-1.5 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm font-normal"
                              placeholder="Chia sẻ trải nghiệm của bạn"
                            />
                          </label>
                          <div className="flex justify-end gap-2">
                            <Button type="button" variant="outline" onClick={() => setReviewDraftId(null)}>Đóng</Button>
                            <Button type="submit" disabled={feedbackSaving}>
                              {feedbackSaving ? "Đang gửi..." : "Gửi đánh giá"}
                            </Button>
                          </div>
                        </form>
                      )}

                      {complaintDraftId === booking.id && (
                        <form onSubmit={submitBookingComplaint} className="mt-4 space-y-3 border-t border-brand/15 pt-4">
                          <label className="block text-xs font-semibold">
                            Lý do khiếu nại
                            <select
                              value={complaintCategory}
                              onChange={(event) => setComplaintCategory(event.target.value as ComplaintCategory)}
                              className="mt-1.5 h-10 w-full rounded-lg border border-border bg-background px-3 text-sm font-normal"
                            >
                              <option value="QUALITY">Chất lượng dịch vụ</option>
                              <option value="LATE_ARRIVAL">Thợ đến muộn</option>
                              <option value="NO_SHOW">Thợ không đến</option>
                              <option value="PRICE">Chi phí phát sinh</option>
                              <option value="BEHAVIOR">Thái độ phục vụ</option>
                              <option value="DAMAGE">Gây hư hại tài sản</option>
                              <option value="OTHER">Vấn đề khác</option>
                            </select>
                          </label>
                          <label className="block text-xs font-semibold">
                            Mô tả sự việc
                            <textarea
                              required
                              minLength={10}
                              maxLength={4000}
                              value={complaintDescription}
                              onChange={(event) => setComplaintDescription(event.target.value)}
                              rows={4}
                              className="mt-1.5 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm font-normal"
                              placeholder="Mô tả chi tiết vấn đề (ít nhất 10 ký tự)"
                            />
                          </label>
                          <div className="flex justify-end gap-2">
                            <Button type="button" variant="outline" onClick={() => setComplaintDraftId(null)}>Đóng</Button>
                            <Button type="submit" disabled={feedbackSaving}>
                              {feedbackSaving ? "Đang gửi..." : "Gửi khiếu nại"}
                            </Button>
                          </div>
                        </form>
                      )}
                      {feedbackError && (reviewDraftId === booking.id || complaintDraftId === booking.id) && (
                        <p role="alert" className="mt-3 text-sm text-destructive">{feedbackError}</p>
                      )}
                      {feedbackSuccess && feedbackSuccessBookingId === booking.id && (
                        <p role="status" className="mt-3 text-sm font-medium text-emerald-700">{feedbackSuccess}</p>
                      )}
                    </section>
                  )}

                  {bookingActionError && bookingActionErrorId === booking.id && (
                    <p role="alert" className="mt-3 text-sm text-destructive">{bookingActionError}</p>
                  )}

                  <div className="mt-4 border-t border-border pt-4">
                    {!canManage && (
                      <p className="mb-3 text-xs text-muted-foreground">
                        {!isConfirmed
                          ? "Có thể đổi lịch hoặc hủy sau khi thợ xác nhận booking."
                          : "Booking đã đến giờ thực hiện nên không thể đổi lịch hoặc hủy."}
                      </p>
                    )}
                    {canManage && (
                      <>
                      {rescheduleId === booking.id ? (
                        <form
                          onSubmit={(event) => {
                            event.preventDefault();
                            if (!rescheduleStart) return;
                            void updateCustomerBooking(booking.id, "reschedule", {
                              scheduledStartAt: dateTimeLocalToIso(rescheduleStart),
                            });
                          }}
                          className="flex flex-col gap-3"
                        >
                          <label className="text-xs font-semibold">
                            Thời gian bắt đầu mới
                            <input
                              type="datetime-local"
                              required
                              min={toLocalDateTime(new Date().toISOString())}
                              value={rescheduleStart}
                              onChange={(event) => setRescheduleStart(event.target.value)}
                              className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                            />
                          </label>
                          <p className="text-xs text-muted-foreground">
                            Thời lượng dịch vụ được giữ nguyên. Hệ thống sẽ kiểm tra lịch trống của thợ.
                          </p>
                          <div className="flex justify-end gap-2">
                            <Button type="button" variant="outline" onClick={() => setRescheduleId(null)}>
                              Đóng
                            </Button>
                            <Button type="submit" disabled={bookingBusy}>
                              {bookingBusy ? "Đang lưu..." : "Xác nhận đổi lịch"}
                            </Button>
                          </div>
                        </form>
                      ) : bookingCancelId === booking.id ? (
                        <form
                          onSubmit={(event) => {
                            event.preventDefault();
                            void updateCustomerBooking(booking.id, "cancel", {
                              reason: bookingCancelReason,
                            });
                          }}
                          className="flex flex-col gap-3"
                        >
                          <label className="text-xs font-semibold">
                            Lý do hủy booking
                            <textarea
                              required
                              minLength={3}
                              maxLength={500}
                              value={bookingCancelReason}
                              onChange={(event) => setBookingCancelReason(event.target.value)}
                              className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                              rows={2}
                            />
                          </label>
                          <div className="flex justify-end gap-2">
                            <Button type="button" variant="outline" onClick={() => setBookingCancelId(null)}>
                              Quay lại
                            </Button>
                            <Button type="submit" variant="destructive" disabled={bookingBusy}>
                              {bookingBusy ? "Đang hủy..." : "Xác nhận hủy booking"}
                            </Button>
                          </div>
                        </form>
                      ) : null}
                      </>
                    )}
                    <div className="flex flex-wrap justify-end gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        disabled={!canManage || bookingBusy}
                        onClick={() => {
                          setBookingActionError("");
                          setBookingCancelId(null);
                          setRescheduleId(booking.id);
                          setRescheduleStart("");
                        }}
                      >
                        <CalendarClock className="mr-2 size-4" />
                        Đổi lịch
                      </Button>
                      <Button
                        type="button"
                        variant="destructive"
                        disabled={!canManage || bookingBusy}
                        onClick={() => {
                          setBookingActionError("");
                          setRescheduleId(null);
                          setBookingCancelId(booking.id);
                          setBookingCancelReason("");
                        }}
                      >
                        <Ban className="mr-2 size-4" />
                        Hủy booking
                      </Button>
                    </div>
                  </div>
                </article>
              );
            })}
                </div>
              </section>
            ))}
          </div>
          )}
          </>
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
                {(() => {
                  const parsed = parseRequestTitleAndDesc(
                    requestDetail?.description,
                    requestDetail?.service?.name || "Yêu cầu dịch vụ"
                  );
                  return (
                    <>
                      <h2
                        id="request-detail-title"
                        className="mt-1 text-lg font-extrabold"
                      >
                        {parsed.title}
                      </h2>
                      {requestDetail?.service?.name && requestDetail.service.name !== parsed.title && (
                        <p className="mt-0.5 text-xs font-medium text-brand">
                          Dịch vụ: {requestDetail.service.name}
                        </p>
                      )}
                    </>
                  );
                })()}
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
                    {formatVietnamDate(requestDetail.createdAt)}
                  </span>
                </div>
                {(() => {
                  const parsed = parseRequestTitleAndDesc(requestDetail.description);
                  return (
                    <p className="whitespace-pre-line text-sm leading-6">
                      {parsed.description || requestDetail.description}
                    </p>
                  );
                })()}
                <div className="grid gap-3 rounded-xl bg-muted/50 p-4 text-sm sm:grid-cols-2">
                  <div>
                    <p className="text-xs text-muted-foreground">
                      Thời gian mong muốn
                    </p>
                    <p className="mt-1 font-semibold">
                      {formatVietnamDateTime(requestDetail.preferredStartAt)}
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
                {(() => {
                  const safeAttachments = filterSafeUrls(requestDetail.attachments);
                  if (safeAttachments.length === 0) return null;
                  return (
                    <div>
                      <p className="mb-2 text-sm font-bold">
                        Ảnh đính kèm ({safeAttachments.length})
                      </p>
                      <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                        {safeAttachments.map((url, index) => (
                          <a
                            key={`${url}-${index}`}
                            href={url}
                            target="_blank"
                            rel="noopener noreferrer nofollow"
                            className="aspect-square overflow-hidden rounded-xl border border-border bg-muted/30"
                            aria-label={`Xem ảnh đính kèm ${index + 1}`}
                          >
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={url}
                              alt={`Ảnh đính kèm ${index + 1}`}
                              className="h-full w-full object-cover transition-transform hover:scale-105"
                            />
                          </a>
                        ))}
                      </div>
                    </div>
                  );
                })()}
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
                ) : requestDetail.status === "OPEN" ? (
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
