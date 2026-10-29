import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
  Modal,
  TextInput,
  ScrollView,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../types/navigation';
import {
  getMyProviderBookings,
  confirmBooking,
  declineBooking,
} from '../../services/bookingService';
import { BackendBooking, DeclineReasonCode } from '../../types';
import { Header } from '../../components/layout/Header';
import { Icon } from '../../components/ui/Icon';
import { Colors } from '../../constants/colors';
import { FontFamily, FontSize } from '../../constants/typography';
import { Radius, Shadow, Space } from '../../constants/spacing';
import { formatVND } from '../../constants/mockData';

type Props = NativeStackScreenProps<RootStackParamList, 'PendingBookings'>;

const DECLINE_OPTIONS: { code: DeclineReasonCode; label: string; desc: string }[] = [
  { code: 'BUSY', label: 'Bận vào thời gian này', desc: 'Đã có lịch hẹn cá nhân hoặc việc đột xuất' },
  { code: 'TOO_FAR', label: 'Khoảng cách quá xa', desc: 'Vượt quá phạm vi di chuyển thuận tiện' },
  { code: 'OUT_OF_SKILL', label: 'Không đúng chuyên môn', desc: 'Yêu cầu kỹ thuật không phù hợp tay nghề' },
  { code: 'PRICE_ISSUE', label: 'Chi phí chưa phù hợp', desc: 'Có sự thay đổi hoặc phát sinh về giá cả' },
  { code: 'OTHER', label: 'Lý do khác', desc: 'Vui lòng ghi rõ lý do để thông báo khách hàng' },
];

export default function PendingBookingsScreen({ navigation }: Props) {
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [bookings, setBookings] = useState<BackendBooking[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Decline modal state
  const [declineModalVisible, setDeclineModalVisible] = useState<boolean>(false);
  const [selectedBooking, setSelectedBooking] = useState<BackendBooking | null>(null);
  const [selectedReason, setSelectedReason] = useState<DeclineReasonCode>('BUSY');
  const [declineNote, setDeclineNote] = useState<string>('');
  const [noteError, setNoteError] = useState<string | null>(null);

  const fetchPendingBookings = useCallback(async () => {
    try {
      setError(null);
      const data = await getMyProviderBookings({ status: 'PENDING_CONFIRMATION' });
      setBookings(data);
    } catch (err: any) {
      console.warn('Failed to load pending bookings:', err);
      setError(err?.message || 'Không thể tải danh sách đơn chờ. Vui lòng thử lại.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchPendingBookings();
  }, [fetchPendingBookings]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchPendingBookings();
  };

  const handleConfirm = (booking: BackendBooking) => {
    Alert.alert(
      'Xác nhận nhận đơn',
      `Bạn đồng ý thực hiện đơn "${booking.service?.name || 'Dịch vụ'}" vào lúc ${formatTime(booking.scheduledStartAt)}?`,
      [
        { text: 'Hủy bỏ', style: 'cancel' },
        {
          text: 'Đồng ý',
          style: 'default',
          onPress: async () => {
            const bookingId = booking._id || booking.id;
            if (!bookingId) return;
            try {
              setActionLoading(bookingId);
              await confirmBooking(bookingId);
              Alert.alert('Thành công', 'Bạn đã nhận đơn! Hãy chuẩn bị đồ nghề và có mặt đúng giờ.');
              fetchPendingBookings();
            } catch (err: any) {
              if (err?.message?.includes('no longer pending') || err?.message?.includes('409')) {
                Alert.alert('Thông báo', 'Đơn không còn ở trạng thái chờ xác nhận. Hệ thống sẽ làm mới danh sách.');
              } else {
                Alert.alert('Lỗi', err?.message || 'Không thể xác nhận đơn.');
              }
              fetchPendingBookings();
            } finally {
              setActionLoading(null);
            }
          },
        },
      ]
    );
  };

  const openDeclineModal = (booking: BackendBooking) => {
    setSelectedBooking(booking);
    setSelectedReason('BUSY');
    setDeclineNote('');
    setNoteError(null);
    setDeclineModalVisible(true);
  };

  const handleDeclineSubmit = async () => {
    if (!selectedBooking) return;
    if (selectedReason === 'OTHER') {
      const trimmed = declineNote.trim();
      if (trimmed.length < 5) {
        setNoteError('Vui lòng nhập lý do tối thiểu 5 ký tự.');
        return;
      }
    }

    const bookingId = selectedBooking._id || selectedBooking.id;
    if (!bookingId) return;

    try {
      setActionLoading(bookingId);
      await declineBooking(bookingId, {
        reasonCode: selectedReason,
        note: declineNote.trim() || undefined,
      });

      setDeclineModalVisible(false);
      Alert.alert('Đã từ chối', 'Đã từ chối đơn đặt. Yêu cầu đã được mở lại cho khách hàng lựa chọn thợ khác.');
      fetchPendingBookings();
    } catch (err: any) {
      if (err?.message?.includes('no longer pending') || err?.message?.includes('409')) {
        Alert.alert('Thông báo', 'Đơn không còn ở trạng thái chờ xác nhận. Hệ thống sẽ làm mới danh sách.');
        setDeclineModalVisible(false);
      } else {
        Alert.alert('Lỗi', err?.message || 'Không thể từ chối đơn.');
      }
      fetchPendingBookings();
    } finally {
      setActionLoading(null);
    }
  };

  const formatTime = (isoString?: string) => {
    if (!isoString) return '--:--';
    const d = new Date(isoString);
    if (Number.isNaN(d.getTime())) return '--:--';
    const time = d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
    const date = d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
    return `${time}, ${date}`;
  };

  const formatAddress = (addr: any) => {
    if (!addr) return 'Địa chỉ chưa cập nhật';
    if (typeof addr === 'string') return addr;
    const parts = [addr.addressLine || addr.line1, addr.ward, addr.district, addr.city].filter(Boolean);
    return parts.join(', ');
  };

  const getRemainingHours = (createdAt?: string) => {
    if (!createdAt) return null;
    const created = new Date(createdAt).getTime();
    if (Number.isNaN(created)) return null;
    const deadline = created + 12 * 60 * 60 * 1000; // 12 hours timeout
    const diff = deadline - Date.now();
    if (diff <= 0) return 'Hết hạn phản hồi';
    const h = Math.floor(diff / (1000 * 60 * 60));
    const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    return `Còn ${h}h ${m}m để phản hồi`;
  };

  const renderBookingCard = ({ item }: { item: BackendBooking }) => {
    const bookingId = item._id || item.id;
    const isActing = actionLoading === bookingId;
    const remainingText = getRemainingHours(item.createdAt);

    return (
      <TouchableOpacity
        style={styles.card}
        activeOpacity={0.9}
        onPress={() => bookingId && navigation.navigate('BookingRequestDetail', { bookingId })}
      >
        {/* Header: Service name & Countdown badge */}
        <View style={styles.cardHeader}>
          <View style={{ flex: 1 }}>
            <Text style={styles.serviceName} numberOfLines={1}>
              {item.service?.name || 'Dịch vụ tại nhà'}
            </Text>
            <Text style={styles.customerName}>
              Khách hàng: {item.customer?.fullName || 'Khách hàng'}
            </Text>
          </View>

          {remainingText && (
            <View style={styles.countdownBadge}>
              <Icon name="clock" size={11} color={Colors.accent[700]} />
              <Text style={styles.countdownText}>{remainingText}</Text>
            </View>
          )}
        </View>

        {/* Schedule & Location */}
        <View style={styles.infoStrip}>
          <View style={styles.infoRow}>
            <Icon name="calendar" size={14} color={Colors.primary[600]} />
            <Text style={styles.infoText}>
              Bắt đầu: <Text style={styles.infoHighlight}>{formatTime(item.scheduledStartAt)}</Text>
            </Text>
          </View>
          <View style={styles.infoRow}>
            <Icon name="location" size={14} color={Colors.neutral[500]} />
            <Text style={styles.infoText} numberOfLines={1}>
              {formatAddress(item.address)}
            </Text>
          </View>
        </View>

        {/* Price & Quote row */}
        <View style={styles.priceRow}>
          <Text style={styles.priceLabel}>Giá đã báo khách:</Text>
          <Text style={styles.priceValue}>{formatVND(item.price || 0)}</Text>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionsRow}>
          <TouchableOpacity
            style={[styles.declineBtn, isActing && styles.btnDisabled]}
            disabled={isActing}
            activeOpacity={0.8}
            onPress={() => openDeclineModal(item)}
          >
            <Text style={styles.declineBtnText}>Từ chối</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.confirmBtn, isActing && styles.btnDisabled]}
            disabled={isActing}
            activeOpacity={0.8}
            onPress={() => handleConfirm(item)}
          >
            {isActing ? (
              <ActivityIndicator size="small" color={Colors.neutral[0]} />
            ) : (
              <>
                <Icon name="check" size={16} color={Colors.neutral[0]} />
                <Text style={styles.confirmBtnText}>Chấp nhận</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.safe}>
      <Header
        title="Đơn chờ xác nhận"
        subtitle="Khách hàng đã chốt báo giá của bạn"
        showBack
      />

      <View style={styles.container}>
        {/* Banner guidance */}
        <View style={styles.guidanceBanner}>
          <Icon name="info" size={16} color={Colors.primary[700]} />
          <Text style={styles.guidanceText}>
            Vui lòng xác nhận sớm để chốt lịch. Nếu bận hoặc quá tải, bạn có thể từ chối để hệ thống mở lại cho khách.
          </Text>
        </View>

        {loading ? (
          <View style={styles.centerContainer}>
            <ActivityIndicator size="large" color={Colors.primary[500]} />
            <Text style={styles.centerText}>Đang tải danh sách đơn chờ...</Text>
          </View>
        ) : error ? (
          <View style={styles.centerContainer}>
            <Icon name="error" size={40} color={Colors.semantic.error} />
            <Text style={styles.errorTitle}>Đã xảy ra lỗi</Text>
            <Text style={styles.centerText}>{error}</Text>
            <TouchableOpacity style={styles.retryBtn} onPress={fetchPendingBookings}>
              <Text style={styles.retryBtnText}>Thử lại</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <FlatList
            data={bookings}
            keyExtractor={(item) => item._id || item.id || String(Math.random())}
            renderItem={renderBookingCard}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={handleRefresh}
                colors={[Colors.primary[500]]}
              />
            }
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <View style={styles.emptyIconBg}>
                  <Icon name="check" size={32} color={Colors.primary[500]} />
                </View>
                <Text style={styles.emptyTitle}>Không có đơn nào đang chờ</Text>
                <Text style={styles.emptySub}>
                  Hiện bạn không có đơn đặt nào cần phản hồi. Đơn mới sẽ xuất hiện ngay khi khách chốt báo giá.
                </Text>
              </View>
            }
          />
        )}
      </View>

      {/* Decline Reason Modal */}
      <Modal
        visible={declineModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setDeclineModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Từ chối nhận việc</Text>
              <TouchableOpacity onPress={() => setDeclineModalVisible(false)} style={styles.closeBtn}>
                <Icon name="close" size={20} color={Colors.neutral[500]} />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalSub}>
              Vui lòng chọn lý do để thông báo đến khách hàng và hoàn tất mở lại yêu cầu:
            </Text>

            <ScrollView style={styles.reasonsList} showsVerticalScrollIndicator={false}>
              {DECLINE_OPTIONS.map((opt) => {
                const isSelected = selectedReason === opt.code;
                return (
                  <TouchableOpacity
                    key={opt.code}
                    style={[styles.reasonOption, isSelected && styles.reasonOptionActive]}
                    onPress={() => {
                      setSelectedReason(opt.code);
                      setNoteError(null);
                    }}
                    activeOpacity={0.7}
                  >
                    <View style={styles.reasonRadio}>
                      {isSelected && <View style={styles.reasonRadioDot} />}
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.reasonLabel, isSelected && styles.reasonLabelActive]}>
                        {opt.label}
                      </Text>
                      <Text style={styles.reasonDesc}>{opt.desc}</Text>
                    </View>
                  </TouchableOpacity>
                );
              })}

              {/* Note input if OTHER or optional */}
              <View style={styles.noteSection}>
                <Text style={styles.noteLabel}>
                  Ghi chú chi tiết {selectedReason === 'OTHER' ? <Text style={{ color: Colors.semantic.error }}>* (tối thiểu 5 ký tự)</Text> : '(không bắt buộc)'}:
                </Text>
                <TextInput
                  style={[styles.noteInput, noteError ? styles.noteInputError : null]}
                  value={declineNote}
                  onChangeText={(text) => {
                    setDeclineNote(text);
                    if (noteError) setNoteError(null);
                  }}
                  placeholder="Nhập ghi chú thêm cho khách hàng..."
                  placeholderTextColor={Colors.neutral[400]}
                  multiline
                  numberOfLines={3}
                  maxLength={500}
                />
                {noteError && <Text style={styles.errorText}>{noteError}</Text>}
              </View>
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setDeclineModalVisible(false)}
              >
                <Text style={styles.modalCancelText}>Quay lại</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.modalConfirmDeclineBtn}
                onPress={handleDeclineSubmit}
              >
                <Text style={styles.modalConfirmDeclineText}>Xác nhận từ chối</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: Colors.neutral[50],
  },
  container: {
    flex: 1,
  },
  guidanceBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primary[50],
    paddingHorizontal: Space.md,
    paddingVertical: Space.sm,
    marginHorizontal: Space.md,
    marginTop: Space.sm,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.primary[200],
    gap: Space.sm,
  },
  guidanceText: {
    flex: 1,
    fontFamily: FontFamily.regular,
    fontSize: FontSize.xs,
    color: Colors.primary[900],
    lineHeight: 18,
  },
  listContent: {
    padding: Space.md,
    gap: Space.md,
  },
  card: {
    backgroundColor: Colors.neutral[0],
    borderRadius: Radius.lg,
    padding: Space.md,
    borderWidth: 1,
    borderColor: Colors.neutral[200],
    ...Shadow.sm,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: Space.sm,
  },
  serviceName: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize.lg,
    color: Colors.neutral[900],
  },
  customerName: {
    fontFamily: FontFamily.regular,
    fontSize: FontSize.xs,
    color: Colors.neutral[600],
    marginTop: 2,
  },
  countdownBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.accent[50],
    borderWidth: 1,
    borderColor: Colors.accent[300],
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Radius.full,
    gap: 4,
  },
  countdownText: {
    fontFamily: FontFamily.bold,
    fontSize: 10,
    color: Colors.accent[700],
  },
  infoStrip: {
    backgroundColor: Colors.neutral[50],
    borderRadius: Radius.md,
    padding: Space.sm,
    marginTop: Space.sm,
    gap: 4,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  infoText: {
    fontFamily: FontFamily.regular,
    fontSize: FontSize.xs,
    color: Colors.neutral[700],
    flex: 1,
  },
  infoHighlight: {
    fontFamily: FontFamily.bold,
    color: Colors.neutral[900],
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: Space.sm,
    paddingTop: Space.xs,
    borderTopWidth: 1,
    borderTopColor: Colors.neutral[100],
  },
  priceLabel: {
    fontFamily: FontFamily.medium,
    fontSize: FontSize.xs,
    color: Colors.neutral[600],
  },
  priceValue: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize.base,
    color: Colors.primary[700],
  },
  actionsRow: {
    flexDirection: 'row',
    gap: Space.sm,
    marginTop: Space.md,
  },
  declineBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Space.sm + 2,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.neutral[300],
    backgroundColor: Colors.neutral[0],
  },
  declineBtnText: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSize.sm,
    color: Colors.neutral[700],
  },
  confirmBtn: {
    flex: 1.3,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Space.sm + 2,
    borderRadius: Radius.md,
    backgroundColor: Colors.primary[500],
    gap: 6,
    ...Shadow.sm,
  },
  confirmBtnText: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize.sm,
    color: Colors.neutral[0],
  },
  btnDisabled: {
    opacity: 0.6,
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Space.xl,
    gap: Space.sm,
  },
  centerText: {
    fontFamily: FontFamily.medium,
    fontSize: FontSize.sm,
    color: Colors.neutral[600],
    textAlign: 'center',
  },
  errorTitle: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize.lg,
    color: Colors.neutral[800],
  },
  retryBtn: {
    backgroundColor: Colors.primary[500],
    paddingHorizontal: Space.lg,
    paddingVertical: Space.sm,
    borderRadius: Radius.md,
    marginTop: Space.sm,
  },
  retryBtnText: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize.sm,
    color: Colors.neutral[0],
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: Space.xl,
    marginTop: Space.xl,
  },
  emptyIconBg: {
    width: 64,
    height: 64,
    borderRadius: Radius.full,
    backgroundColor: Colors.primary[50],
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Space.md,
  },
  emptyTitle: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize.lg,
    color: Colors.neutral[800],
    marginBottom: Space.xs,
  },
  emptySub: {
    fontFamily: FontFamily.regular,
    fontSize: FontSize.xs,
    color: Colors.neutral[500],
    textAlign: 'center',
    lineHeight: 18,
    maxWidth: 280,
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: Colors.neutral[0],
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
    padding: Space.lg,
    maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Space.xs,
  },
  modalTitle: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize.lg,
    color: Colors.neutral[900],
  },
  closeBtn: {
    padding: 4,
  },
  modalSub: {
    fontFamily: FontFamily.regular,
    fontSize: FontSize.xs,
    color: Colors.neutral[500],
    marginBottom: Space.md,
    lineHeight: 18,
  },
  reasonsList: {
    maxHeight: 350,
  },
  reasonOption: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: Space.sm + 2,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.neutral[200],
    marginBottom: Space.sm,
    gap: Space.sm,
  },
  reasonOptionActive: {
    borderColor: Colors.primary[500],
    backgroundColor: Colors.primary[50],
  },
  reasonRadio: {
    width: 18,
    height: 18,
    borderRadius: Radius.full,
    borderWidth: 2,
    borderColor: Colors.neutral[400],
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  reasonRadioDot: {
    width: 9,
    height: 9,
    borderRadius: Radius.full,
    backgroundColor: Colors.primary[500],
  },
  reasonLabel: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize.sm,
    color: Colors.neutral[800],
  },
  reasonLabelActive: {
    color: Colors.primary[800],
  },
  reasonDesc: {
    fontFamily: FontFamily.regular,
    fontSize: FontSize.xs,
    color: Colors.neutral[500],
    marginTop: 1,
  },
  noteSection: {
    marginTop: Space.sm,
    marginBottom: Space.sm,
  },
  noteLabel: {
    fontFamily: FontFamily.medium,
    fontSize: FontSize.xs,
    color: Colors.neutral[700],
    marginBottom: 4,
  },
  noteInput: {
    backgroundColor: Colors.neutral[50],
    borderWidth: 1,
    borderColor: Colors.neutral[300],
    borderRadius: Radius.md,
    padding: Space.sm,
    fontFamily: FontFamily.regular,
    fontSize: FontSize.xs,
    color: Colors.neutral[900],
    minHeight: 70,
    textAlignVertical: 'top',
  },
  noteInputError: {
    borderColor: Colors.semantic.error,
  },
  errorText: {
    fontFamily: FontFamily.regular,
    fontSize: 11,
    color: Colors.semantic.error,
    marginTop: 3,
  },
  modalFooter: {
    flexDirection: 'row',
    gap: Space.sm,
    marginTop: Space.md,
    paddingTop: Space.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.neutral[200],
  },
  modalCancelBtn: {
    flex: 1,
    paddingVertical: Space.sm + 2,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.neutral[100],
  },
  modalCancelText: {
    fontFamily: FontFamily.medium,
    fontSize: FontSize.sm,
    color: Colors.neutral[700],
  },
  modalConfirmDeclineBtn: {
    flex: 1.5,
    paddingVertical: Space.sm + 2,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EF4444',
  },
  modalConfirmDeclineText: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize.sm,
    color: Colors.neutral[0],
  },
});
