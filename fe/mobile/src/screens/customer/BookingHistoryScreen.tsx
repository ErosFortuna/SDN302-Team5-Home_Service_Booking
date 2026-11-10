import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  FlatList,
  Modal,
  TextInput,
  Alert,
  ActivityIndicator,
} from "react-native";
import { useFocusEffect, useNavigation, useRoute, type RouteProp } from "@react-navigation/native";
import { MainTabParamList, MainTabNavigationProp } from "../../types/navigation";
import { useAppStore } from "../../store/useAppStore";
import { formatVND } from '../../utils/formatters';
import { Booking, BookingStatus } from "../../types";
import { CategoryIcon, Icon, StatusBadge } from "../../components/ui";
import { Colors } from "../../constants/colors";
import { FontFamily, FontSize } from "../../constants/typography";
import { Radius, Shadow, Space } from "../../constants/spacing";
import { submitBookingReview, confirmCustomerPayment } from "../../services/bookingService";

type Tab = "active" | "completed" | "cancelled";

const TABS: { key: Tab; label: string }[] = [
  { key: "active", label: "Đang thực hiện" },
  { key: "completed", label: "Hoàn thành" },
  { key: "cancelled", label: "Đã hủy" },
];

const ACTIVE_STATUSES: BookingStatus[] = [
  "pending",
  "pending_confirmation",
  "confirmed",
  "provider_on_the_way",
  "arrived",
  "awaiting_approval",
  "in_progress",
];

type CreatedRange = "ALL" | "TODAY" | "7D" | "30D";

function createdDateKey(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "unknown"
    : new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Ho_Chi_Minh", year: "numeric", month: "2-digit", day: "2-digit" }).format(date);
}

function createdDateLabel(key: string) {
  if (key === "unknown") return "Không rõ ngày tạo";
  const today = createdDateKey(new Date().toISOString());
  if (key === today) return "Hôm nay";
  const yesterday = new Date(Date.now() - 86400000).toISOString();
  if (key === createdDateKey(yesterday)) return "Hôm qua";
  const [year, month, day] = key.split("-");
  return `${day}/${month}/${year}`;
}

const STATUS_STEPS: { key: BookingStatus; label: string }[] = [
  { key: "pending", label: "Chờ thợ" },
  { key: "pending_confirmation", label: "Chờ xác nhận" },
  { key: "in_progress", label: "Đang làm" },
  { key: "completed", label: "Xong" },
];

export default function BookingHistoryScreen() {
  const navigation = useNavigation<MainTabNavigationProp<'Bookings'>>();
  const route = useRoute<RouteProp<MainTabParamList, 'Bookings'>>();
  const { bookings, fetchBookings } = useAppStore();
  const bookingListRef = useRef<FlatList<Booking>>(null);
  const [activeTab, setActiveTab] = useState<Tab>("active");
  const [reviewBooking, setReviewBooking] = useState<Booking | null>(null);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState("");
  const [reviewError, setReviewError] = useState("");
  const [submittingReview, setSubmittingReview] = useState(false);
  const [search, setSearch] = useState("");
  const [createdRange, setCreatedRange] = useState<CreatedRange>("ALL");
  const [sortNewest, setSortNewest] = useState(true);
  const [loadingBookings, setLoadingBookings] = useState(true);
  const [bookingsError, setBookingsError] = useState('');
  const focusBookingId = route.params?.focusBookingId;

  useFocusEffect(
    React.useCallback(() => {
      let active = true;
      setLoadingBookings(true);
      setBookingsError('');
      void fetchBookings()
        .catch((error) => {
          if (active) setBookingsError(error instanceof Error ? error.message : 'Không thể tải đơn từ máy chủ.');
        })
        .finally(() => { if (active) setLoadingBookings(false); });
      return () => { active = false; };
    }, [fetchBookings]),
  );

  const filteredBookings = bookings.filter((b) => {
    if (activeTab === "active") return ACTIVE_STATUSES.includes(b.status);
    if (activeTab === "completed") return b.status === "completed";
    return b.status === "cancelled" || b.status === "no_show";
  }).filter((booking) => {
    const query = search.trim().toLocaleLowerCase("vi");
    if (query && !`${booking.title} ${booking.description} ${booking.address}`.toLocaleLowerCase("vi").includes(query)) return false;
    if (createdRange === "ALL") return true;
    const created = new Date(booking.createdAt).getTime();
    if (!Number.isFinite(created)) return false;
    if (createdRange === "TODAY") return createdDateKey(booking.createdAt) === createdDateKey(new Date().toISOString());
    return created >= Date.now() - (createdRange === "7D" ? 7 : 30) * 86400000;
  }).sort((a, b) => {
    const left = new Date(a.createdAt).getTime();
    const right = new Date(b.createdAt).getTime();
    const leftValid = Number.isFinite(left);
    const rightValid = Number.isFinite(right);
    if (!leftValid && !rightValid) return 0;
    if (!leftValid) return 1;
    if (!rightValid) return -1;
    return sortNewest ? right - left : left - right;
  });

  React.useEffect(() => {
    if (!focusBookingId) return;
    const target = bookings.find((booking) => booking.id === focusBookingId);
    if (!target) return;
    setActiveTab(
      target.status === 'completed'
        ? 'completed'
        : target.status === 'cancelled'
          ? 'cancelled'
          : 'active',
    );
  }, [bookings, focusBookingId]);

  React.useEffect(() => {
    if (!focusBookingId) return;
    const index = filteredBookings.findIndex((booking) => booking.id === focusBookingId);
    if (index < 0) return;
    const frame = requestAnimationFrame(() => {
      bookingListRef.current?.scrollToIndex({ index, animated: true, viewPosition: 0.25 });
      navigation.setParams({ focusBookingId: undefined });
    });
    return () => cancelAnimationFrame(frame);
  }, [filteredBookings, focusBookingId, navigation]);

  const sendReview = async () => {
    if (!reviewBooking || submittingReview) return;
    setSubmittingReview(true);
    setReviewError("");
    try {
      await submitBookingReview(reviewBooking.id, {
        rating: reviewRating,
        comment: reviewComment.trim() || undefined,
      });
      await fetchBookings();
      setReviewBooking(null);
      setReviewComment("");
    } catch (error) {
      setReviewError(error instanceof Error ? error.message : "Không thể gửi đánh giá.");
    } finally {
      setSubmittingReview(false);
    }
  };

  const handleConfirmPayment = async (booking: Booking) => {
    try {
      await confirmCustomerPayment(booking.id, "Khách hàng xác nhận đã thanh toán tiền mặt");
      await fetchBookings();
      Alert.alert("Thành công", "Đã xác nhận thanh toán trực tiếp thành công.");
    } catch (error) {
      Alert.alert("Lỗi", error instanceof Error ? error.message : "Không thể xác nhận thanh toán.");
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {/* In-page Screen Header matching ai-fe */}
        <View style={styles.header}>
          <Text style={styles.screenTitle}>Lịch đặt dịch vụ</Text>
          <Text style={styles.screenSub}>
            Theo dõi và quản lý các yêu cầu của bạn
          </Text>
        </View>

        {/* Segmented Pill Tabs matching ai-fe */}
        <View style={styles.segmentedContainer}>
          {TABS.map((t) => {
            const count = bookings.filter((b) =>
              t.key === "active"
                ? ACTIVE_STATUSES.includes(b.status)
                : t.key === "completed"
                  ? b.status === "completed"
                  : b.status === "cancelled" || b.status === "no_show",
            ).length;

            const isActive = activeTab === t.key;

            return (
              <TouchableOpacity
                key={t.key}
                style={[
                  styles.segmentedTab,
                  isActive && styles.segmentedTabActive,
                ]}
                onPress={() => setActiveTab(t.key)}
                activeOpacity={0.8}
              >
                <Text
                  style={[
                    styles.segmentedTabText,
                    isActive && styles.segmentedTabTextActive,
                  ]}
                >
                  {t.label}
                  {count > 0 ? ` (${count})` : ""}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {bookingsError ? (
          <TouchableOpacity onPress={() => {
            setBookingsError('');
            setLoadingBookings(true);
            void fetchBookings().catch((error) => setBookingsError(error instanceof Error ? error.message : 'Không thể tải đơn từ máy chủ.')).finally(() => setLoadingBookings(false));
          }}>
            <Text style={styles.loadError}>{bookingsError} · Chạm để thử lại.</Text>
          </TouchableOpacity>
        ) : loadingBookings ? (
          <ActivityIndicator color={Colors.primary[500]} style={styles.loadingIndicator} />
        ) : null}

        {/* Bookings List */}
        <FlatList
          ref={bookingListRef}
          data={filteredBookings}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          ListHeaderComponent={(
            <View style={styles.filterPanel}>
              <TextInput
                value={search}
                onChangeText={setSearch}
                placeholder="Tìm dịch vụ, mô tả hoặc địa chỉ..."
                placeholderTextColor={Colors.neutral[400]}
                style={styles.searchInput}
                accessibilityLabel="Tìm kiếm đơn đặt"
              />
              <View style={styles.filterRow}>
                {([['ALL', 'Mọi ngày'], ['TODAY', 'Hôm nay'], ['7D', '7 ngày'], ['30D', '30 ngày']] as [CreatedRange, string][]).map(([key, label]) => (
                  <TouchableOpacity key={key} style={[styles.filterChip, createdRange === key && styles.filterChipActive]} onPress={() => setCreatedRange(key)}>
                    <Text style={[styles.filterChipText, createdRange === key && styles.filterChipTextActive]}>{label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <View style={styles.filterRow}>
                <TouchableOpacity style={[styles.filterChip, sortNewest && styles.filterChipActive]} onPress={() => setSortNewest(true)}>
                  <Text style={[styles.filterChipText, sortNewest && styles.filterChipTextActive]}>Mới nhất</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.filterChip, !sortNewest && styles.filterChipActive]} onPress={() => setSortNewest(false)}>
                  <Text style={[styles.filterChipText, !sortNewest && styles.filterChipTextActive]}>Cũ nhất</Text>
                </TouchableOpacity>
                <Text style={styles.resultCount}>{filteredBookings.length}/{bookings.filter((b) => activeTab === 'active' ? ACTIVE_STATUSES.includes(b.status) : activeTab === 'completed' ? b.status === 'completed' : b.status === 'cancelled' || b.status === 'no_show').length} đơn</Text>
              </View>
            </View>
          )}
          showsVerticalScrollIndicator={false}
          onScrollToIndexFailed={({ index }) => {
            bookingListRef.current?.scrollToOffset({ offset: index * 220, animated: true });
          }}
          renderItem={({ item, index }) => (
            <View>
            {(index === 0 || createdDateKey(filteredBookings[index - 1].createdAt) !== createdDateKey(item.createdAt)) && (
              <Text style={styles.dateGroupTitle}>{createdDateLabel(createdDateKey(item.createdAt))}</Text>
            )}
            <BookingItemCard
              booking={item}
              onConfirmPayment={() => handleConfirmPayment(item)}
              onViewRecommended={() =>
                navigation.navigate("RecommendedProviders", {
                  requestId: item.id,
                  title: item.title,
                })
              }
              onComplaint={() =>
                navigation.navigate("CreateComplaint", {
                  bookingId: item.id,
                  bookingTitle: item.title,
                })
              }
              onReview={() => {
                setReviewRating(5);
                setReviewComment("");
                setReviewError("");
                setReviewBooking(item);
              }}
            />
            </View>
          )}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <View style={styles.emptyIconBg}>
                <Icon name="calendar" size={36} color={Colors.primary[600]} />
              </View>
              <Text style={styles.emptyTitle}>Chưa có đơn đặt nào</Text>
              <Text style={styles.emptyText}>
                Các yêu cầu dịch vụ{" "}
                {activeTab === "active" ? "đang thực hiện" : "trong mục này"} sẽ
                hiển thị tại đây.
              </Text>
            </View>
          }
        />
      </View>
      <Modal
        visible={reviewBooking !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setReviewBooking(null)}
      >
        <View style={styles.reviewOverlay}>
          <View style={styles.reviewModal}>
            <Text style={styles.reviewTitle}>Đánh giá dịch vụ</Text>
            <Text style={styles.reviewSubtitle}>
              Chia sẻ trải nghiệm của bạn để giúp khách hàng khác.
            </Text>
            <View style={styles.ratingPicker}>
              {[1, 2, 3, 4, 5].map((rating) => (
                <TouchableOpacity
                  key={rating}
                  accessibilityLabel={`${rating} sao`}
                  onPress={() => setReviewRating(rating)}
                  disabled={submittingReview}
                >
                  <Icon
                    name="star"
                    size={32}
                    color={rating <= reviewRating ? Colors.accent[500] : Colors.neutral[300]}
                  />
                </TouchableOpacity>
              ))}
            </View>
            <TextInput
              style={styles.reviewInput}
              value={reviewComment}
              onChangeText={setReviewComment}
              placeholder="Nhận xét (không bắt buộc)"
              placeholderTextColor={Colors.neutral[400]}
              multiline
              maxLength={2000}
              textAlignVertical="top"
              editable={!submittingReview}
            />
            {!!reviewError && <Text style={styles.reviewError}>{reviewError}</Text>}
            <View style={styles.reviewActions}>
              <TouchableOpacity
                style={styles.reviewCancel}
                onPress={() => setReviewBooking(null)}
                disabled={submittingReview}
              >
                <Text style={styles.reviewCancelText}>Để sau</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.reviewSubmit, submittingReview && styles.reviewSubmitDisabled]}
                onPress={() => void sendReview()}
                disabled={submittingReview}
              >
                <Text style={styles.reviewSubmitText}>
                  {submittingReview ? "Đang gửi..." : "Gửi đánh giá"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function BookingItemCard({
  booking,
  onViewRecommended,
  onComplaint,
  onReview,
  onConfirmPayment,
}: {
  booking: Booking;
  onViewRecommended?: () => void;
  onComplaint: () => void;
  onReview: () => void;
  onConfirmPayment?: () => void;
}) {
  const showTracker =
    booking.status !== "cancelled" && booking.status !== "no_show" && booking.status !== "completed";
  const currentStepIdx =
    booking.status === "pending_confirmation"
      ? 1
      : ["confirmed", "provider_on_the_way", "arrived", "awaiting_approval"].includes(booking.status)
        ? 2
        : STATUS_STEPS.findIndex((s) => s.key === booking.status);

  return (
    <View style={styles.card}>
      {/* Top row: Category icon, title, status */}
      <View style={styles.cardTopRow}>
        <CategoryIcon category={booking.category} size={44} />

        <View style={styles.cardTitleCol}>
          <View style={styles.titleStatusRow}>
            <Text style={styles.bookingTitle} numberOfLines={1}>
              {booking.title}
            </Text>
            <StatusBadge bookingStatus={booking.status} size="sm" />
          </View>

          <View style={styles.dateLocationRow}>
            <View style={styles.metaItem}>
              <Icon name="calendar" size={12} color={Colors.neutral[400]} />
              <Text style={styles.metaText}>{booking.date}</Text>
            </View>
            <View style={styles.metaItem}>
              <Icon name="clock" size={12} color={Colors.neutral[400]} />
              <Text style={styles.metaText}>{booking.time}</Text>
            </View>
          </View>

          <View style={styles.addressRow}>
            <Icon name="location" size={12} color={Colors.neutral[400]} />
            <Text style={styles.addressText} numberOfLines={1}>
              {booking.address}
            </Text>
          </View>
          {booking.description ? (
            <Text style={styles.bookingDescription} numberOfLines={2}>
              {booking.description}
            </Text>
          ) : null}
        </View>
      </View>

      {/* 4-Step Tracker matching ai-fe */}
      {showTracker && (
        <View style={styles.trackerContainer}>
          {STATUS_STEPS.map((step, idx) => {
            const isDone = idx <= currentStepIdx;
            const isLast = idx === STATUS_STEPS.length - 1;

            return (
              <React.Fragment key={step.key}>
                <View style={styles.stepNode}>
                  <View style={[styles.stepDot, isDone && styles.stepDotDone]}>
                    {isDone ? (
                      <Icon name="check" size={10} color={Colors.neutral[0]} />
                    ) : (
                      <Text style={styles.stepNumber}>{idx + 1}</Text>
                    )}
                  </View>
                  <Text
                    style={[styles.stepLabel, isDone && styles.stepLabelDone]}
                  >
                    {step.label}
                  </Text>
                </View>
                {!isLast && (
                  <View
                    style={[
                      styles.stepConnector,
                      idx < currentStepIdx && styles.stepConnectorDone,
                    ]}
                  />
                )}
              </React.Fragment>
            );
          })}
        </View>
      )}

      {/* Bottom info: Budget & Action matching ai-fe */}
      <View style={styles.cardBottomRow}>
        <View>
          <Text style={styles.budgetLabel}>
            {booking.status === "completed" && booking.finalPrice != null
              ? "Giá cuối đã thỏa thuận"
              : "Hình thức chi phí"}
          </Text>
          <Text style={styles.budgetValue}>
            {booking.status === "completed" && booking.finalPrice != null
              ? formatVND(booking.finalPrice)
              : "Thỏa thuận trực tiếp"}
          </Text>
        </View>

        {(booking.status === "cancelled" || booking.status === "no_show") && (
          <View style={styles.actionRowEnd}>
            <Text style={styles.pendingText}>Đơn đã kết thúc/hủy</Text>
          </View>
        )}

        {booking.status === "in_progress" && (
          <View style={styles.statusNotice}>
            <Text style={styles.statusNoticeText}>Thợ đang trên đường đến</Text>
          </View>
        )}

        {booking.status === "pending" && (
          <View style={styles.actionRowEnd}>
            <View style={styles.statusNotice}>
              <Icon name="clock" size={12} color={Colors.primary[700]} />
              <Text style={styles.statusNoticeText}>Nhân viên đang điều phối thợ...</Text>
            </View>
          </View>
        )}

        {booking.status === "completed" && (
          <View style={styles.actionRowEnd}>
            {booking.paymentStatus === "PAID" ? (
              <View style={styles.completedBadge}>
                <Icon name="check" size={14} color={Colors.primary[600]} />
                <Text style={styles.completedText}>Đã thanh toán</Text>
              </View>
            ) : (
              <TouchableOpacity
                style={styles.payBtn}
                onPress={onConfirmPayment}
                activeOpacity={0.8}
              >
                <Icon name="check" size={13} color="#fff" />
                <Text style={styles.payBtnText}>Đã trả tiền</Text>
              </TouchableOpacity>
            )}
            {booking.customerReview ? (
              <View style={styles.reviewDone}>
                <Icon name="star" size={12} color={Colors.accent[600]} />
                <Text style={styles.reviewDoneText}>{booking.customerReview.rating}/5</Text>
              </View>
            ) : (
              <TouchableOpacity
                style={styles.reviewBtn}
                onPress={onReview}
                activeOpacity={0.8}
              >
                <Icon name="star" size={13} color={Colors.primary[700]} />
                <Text style={styles.reviewBtnText}>Đánh giá</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={styles.complaintBtn}
              onPress={onComplaint}
              activeOpacity={0.8}
            >
              <Icon name="warning" size={13} color={Colors.accent[700]} />
              <Text style={styles.complaintBtnText}>Khiếu nại</Text>
            </TouchableOpacity>
          </View>
        )}

        {booking.status === "in_progress" && (
          <TouchableOpacity
            style={styles.complaintBtn}
            onPress={onComplaint}
            activeOpacity={0.8}
          >
            <Icon name="warning" size={13} color={Colors.accent[700]} />
            <Text style={styles.complaintBtnText}>Báo sự cố</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.neutral[50],
  },
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: Space.md + 2,
    paddingTop: Space.md,
    paddingBottom: Space.xs,
  },
  screenTitle: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize.xl,
    color: Colors.neutral[900],
    letterSpacing: -0.3,
  },
  screenSub: {
    fontFamily: FontFamily.regular,
    fontSize: FontSize.xs,
    color: Colors.neutral[500],
    marginTop: 2,
  },
  segmentedContainer: {
    flexDirection: "row",
    backgroundColor: Colors.neutral[100],
    borderRadius: Radius.xl,
    padding: 3,
    marginHorizontal: Space.md + 2,
    marginTop: Space.sm,
    marginBottom: Space.sm,
  },
  segmentedTab: {
    flex: 1,
    paddingVertical: 7,
    borderRadius: Radius.lg,
    alignItems: "center",
    justifyContent: "center",
  },
  segmentedTabActive: {
    backgroundColor: Colors.neutral[0],
    ...Shadow.sm,
  },
  segmentedTabText: {
    fontFamily: FontFamily.medium,
    fontSize: FontSize.xs,
    color: Colors.neutral[500],
  },
  segmentedTabTextActive: {
    fontFamily: FontFamily.bold,
    color: Colors.primary[600],
  },
  loadError: { paddingHorizontal: Space.md, color: Colors.semantic.error, fontFamily: FontFamily.medium, fontSize: FontSize.xs },
  loadingIndicator: { marginVertical: Space.md },
  listContent: {
    paddingHorizontal: Space.md + 2,
    paddingTop: Space.xs,
    paddingBottom: 40,
    gap: Space.md,
  },
  filterPanel: {
    backgroundColor: Colors.neutral[0],
    borderRadius: Radius.xl,
    padding: Space.sm,
    gap: Space.sm,
    borderWidth: 1,
    borderColor: Colors.neutral[200],
  },
  searchInput: {
    minHeight: 42,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.neutral[200],
    paddingHorizontal: Space.md,
    color: Colors.neutral[900],
    fontFamily: FontFamily.regular,
    fontSize: FontSize.sm,
  },
  filterRow: { flexDirection: "row", alignItems: "center", gap: 6, flexWrap: "wrap" },
  filterChip: {
    borderRadius: Radius.full,
    paddingHorizontal: 10,
    paddingVertical: 7,
    backgroundColor: Colors.neutral[100],
  },
  filterChipActive: { backgroundColor: Colors.primary[100] },
  filterChipText: { color: Colors.neutral[600], fontFamily: FontFamily.medium, fontSize: 11 },
  filterChipTextActive: { color: Colors.primary[700], fontFamily: FontFamily.bold },
  resultCount: { marginLeft: "auto", color: Colors.neutral[500], fontFamily: FontFamily.medium, fontSize: 11 },
  dateGroupTitle: {
    marginTop: Space.sm,
    marginBottom: Space.xs,
    color: Colors.neutral[600],
    fontFamily: FontFamily.bold,
    fontSize: FontSize.sm,
    textTransform: "capitalize",
  },
  card: {
    backgroundColor: Colors.neutral[0],
    borderRadius: Radius.xl,
    padding: Space.md,
    borderWidth: 1,
    borderColor: Colors.neutral[200],
    ...Shadow.sm,
  },
  cardTopRow: {
    flexDirection: "row",
    gap: Space.md,
  },
  cardTitleCol: {
    flex: 1,
  },
  titleStatusRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: Space.xs,
  },
  bookingTitle: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize.sm,
    color: Colors.neutral[900],
    flex: 1,
  },
  bookingDescription: {
    color: Colors.neutral[600],
    fontFamily: FontFamily.regular,
    fontSize: FontSize.xs,
    lineHeight: 17,
    marginTop: 5,
  },
  dateLocationRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Space.md,
    marginTop: 4,
  },
  metaItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  metaText: {
    fontFamily: FontFamily.regular,
    fontSize: 11,
    color: Colors.neutral[500],
  },
  addressRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 4,
  },
  addressText: {
    fontFamily: FontFamily.regular,
    fontSize: 11,
    color: Colors.neutral[400],
    flex: 1,
  },
  // Tracker
  trackerContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: Space.md,
    paddingVertical: Space.sm,
    paddingHorizontal: Space.xs,
    backgroundColor: Colors.neutral[50],
    borderRadius: Radius.lg,
  },
  stepNode: {
    alignItems: "center",
    gap: 4,
  },
  stepDot: {
    width: 20,
    height: 20,
    borderRadius: Radius.full,
    backgroundColor: Colors.neutral[200],
    alignItems: "center",
    justifyContent: "center",
  },
  stepDotDone: {
    backgroundColor: Colors.primary[500],
  },
  stepNumber: {
    fontSize: 10,
    fontFamily: FontFamily.bold,
    color: Colors.neutral[600],
  },
  stepLabel: {
    fontSize: 9,
    fontFamily: FontFamily.medium,
    color: Colors.neutral[400],
  },
  stepLabelDone: {
    fontFamily: FontFamily.bold,
    color: Colors.primary[600],
  },
  stepConnector: {
    flex: 1,
    height: 2,
    backgroundColor: Colors.neutral[200],
    marginBottom: 16,
  },
  stepConnectorDone: {
    backgroundColor: Colors.primary[500],
  },
  // Bottom
  cardBottomRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: Space.md,
    paddingTop: Space.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.neutral[100],
  },
  budgetLabel: {
    fontFamily: FontFamily.regular,
    fontSize: 10,
    color: Colors.neutral[400],
  },
  budgetValue: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize.sm,
    color: Colors.neutral[900],
    marginTop: 1,
  },
  statusNotice: {
    backgroundColor: Colors.semantic.infoBg,
    paddingHorizontal: Space.sm + 2,
    paddingVertical: 4,
    borderRadius: Radius.full,
  },
  statusNoticeText: {
    fontFamily: FontFamily.semiBold,
    fontSize: 11,
    color: Colors.semantic.info,
  },
  pendingText: {
    fontFamily: FontFamily.regular,
    fontSize: 11,
    color: Colors.neutral[400],
  },
  completedBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  completedText: {
    fontFamily: FontFamily.bold,
    fontSize: 11,
    color: Colors.primary[600],
  },
  pendingConfirmBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: Colors.accent[50],
    paddingHorizontal: Space.sm + 2,
    paddingVertical: 5,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: Colors.accent[200],
  },
  pendingConfirmText: {
    fontFamily: FontFamily.medium,
    fontSize: FontSize.xs,
    color: Colors.accent[700],
  },
  cancelledBox: {
    backgroundColor: Colors.semantic.errorBg,
    borderRadius: Radius.lg,
    padding: Space.sm,
    borderWidth: 1,
    borderColor: Colors.semantic.errorBg,
    gap: 4,
  },
  cancelledHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  cancelledTitle: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize.xs,
    color: Colors.semantic.error,
  },
  cancelledReason: {
    fontFamily: FontFamily.regular,
    fontSize: 11,
    color: Colors.neutral[600],
    marginLeft: 17,
  },
  reopenBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: 2,
    marginTop: 4,
    paddingVertical: 2,
  },
  reopenBtnText: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSize.xs,
    color: Colors.primary[700],
  },
  cancelledDefault: {
    alignSelf: "flex-end",
    paddingVertical: 2,
  },
  cancelledDefaultText: {
    fontFamily: FontFamily.regular,
    fontSize: FontSize.xs,
    color: Colors.neutral[500],
  },
  emptyContainer: {
    padding: Space.xl,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 50,
  },
  emptyIconBg: {
    width: 64,
    height: 64,
    borderRadius: Radius.full,
    backgroundColor: Colors.primary[50],
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Space.md,
  },
  emptyTitle: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize.md,
    color: Colors.neutral[900],
    marginBottom: Space.xs,
  },
  emptyText: {
    fontFamily: FontFamily.regular,
    fontSize: FontSize.xs,
    color: Colors.neutral[500],
    textAlign: "center",
    lineHeight: 18,
  },
  actionRowEnd: {
    flexDirection: "row",
    alignItems: "center",
    gap: Space.sm,
  },
  complaintBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.accent[50],
    borderWidth: 1,
    borderColor: Colors.accent[300],
    paddingHorizontal: Space.sm,
    paddingVertical: 4,
    borderRadius: Radius.full,
    gap: 4,
  },
  complaintBtnText: {
    fontFamily: FontFamily.bold,
    fontSize: 10,
    color: Colors.accent[700],
  },
  recommendBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.primary[50],
    borderWidth: 1,
    borderColor: Colors.primary[300],
    paddingHorizontal: Space.sm,
    paddingVertical: 4,
    borderRadius: Radius.full,
    gap: 4,
  },
  recommendBtnText: {
    fontFamily: FontFamily.bold,
    fontSize: 10,
    color: Colors.primary[700],
  },
  payBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.primary[600],
    paddingHorizontal: Space.sm + 2,
    paddingVertical: 5,
    borderRadius: Radius.full,
    gap: 4,
  },
  payBtnText: {
    fontFamily: FontFamily.bold,
    fontSize: 10,
    color: "#fff",
  },
  reviewBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.primary[50],
    borderWidth: 1,
    borderColor: Colors.primary[200],
    paddingHorizontal: Space.sm,
    paddingVertical: 4,
    borderRadius: Radius.full,
    gap: 4,
  },
  reviewBtnText: {
    fontFamily: FontFamily.bold,
    fontSize: 10,
    color: Colors.primary[700],
  },
  reviewDone: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
  },
  reviewDoneText: {
    fontFamily: FontFamily.semiBold,
    fontSize: 11,
    color: Colors.neutral[600],
  },
  reviewOverlay: {
    flex: 1,
    justifyContent: "center",
    padding: Space.lg,
    backgroundColor: "rgba(13, 17, 23, 0.5)",
  },
  reviewModal: {
    backgroundColor: Colors.neutral[0],
    borderRadius: Radius.xl,
    padding: Space.lg,
    gap: Space.md,
  },
  reviewTitle: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize.lg,
    color: Colors.neutral[900],
  },
  reviewSubtitle: {
    fontFamily: FontFamily.regular,
    fontSize: FontSize.sm,
    lineHeight: 20,
    color: Colors.neutral[600],
  },
  ratingPicker: {
    flexDirection: "row",
    justifyContent: "center",
    gap: Space.sm,
    paddingVertical: Space.xs,
  },
  reviewInput: {
    minHeight: 100,
    borderWidth: 1,
    borderColor: Colors.neutral[200],
    borderRadius: Radius.md,
    padding: Space.md,
    fontFamily: FontFamily.regular,
    fontSize: FontSize.sm,
    color: Colors.neutral[900],
  },
  reviewError: {
    fontFamily: FontFamily.medium,
    fontSize: FontSize.xs,
    color: Colors.semantic.error,
  },
  reviewActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: Space.sm,
  },
  reviewCancel: {
    paddingHorizontal: Space.md,
    paddingVertical: Space.sm,
    borderRadius: Radius.md,
    backgroundColor: Colors.neutral[100],
  },
  reviewCancelText: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSize.sm,
    color: Colors.neutral[700],
  },
  reviewSubmit: {
    paddingHorizontal: Space.md,
    paddingVertical: Space.sm,
    borderRadius: Radius.md,
    backgroundColor: Colors.primary[600],
  },
  reviewSubmitDisabled: {
    opacity: 0.6,
  },
  reviewSubmitText: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSize.sm,
    color: Colors.neutral[0],
  },
});
