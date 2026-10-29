import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  TextInput,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../types/navigation';
import {
  getBookingById,
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

type Props = NativeStackScreenProps<RootStackParamList, 'BookingRequestDetail'>;

const DECLINE_OPTIONS: { code: DeclineReasonCode; label: string; desc: string }[] = [
  { code: 'BUSY', label: 'Bận vào thời gian này', desc: 'Đã có lịch hẹn cá nhân hoặc việc đột xuất' },
  { code: 'TOO_FAR', label: 'Khoảng cách quá xa', desc: 'Vượt quá phạm vi di chuyển thuận tiện' },
  { code: 'OUT_OF_SKILL', label: 'Không đúng chuyên môn', desc: 'Yêu cầu kỹ thuật không phù hợp tay nghề' },
  { code: 'PRICE_ISSUE', label: 'Chi phí chưa phù hợp', desc: 'Có sự thay đổi hoặc phát sinh về giá cả' },
  { code: 'OTHER', label: 'Lý do khác', desc: 'Vui lòng ghi rõ lý do để thông báo khách hàng' },
];

export default function BookingRequestDetailScreen({ route, navigation }: Props) {
  const { bookingId } = route.params;

  const [loading, setLoading] = useState<boolean>(true);
  const [acting, setActing] = useState<boolean>(false);
  const [booking, setBooking] = useState<BackendBooking | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Decline modal state
  const [declineModalVisible, setDeclineModalVisible] = useState<boolean>(false);
  const [selectedReason, setSelectedReason] = useState<DeclineReasonCode>('BUSY');
  const [declineNote, setDeclineNote] = useState<string>('');
  const [noteError, setNoteError] = useState<string | null>(null);

  const fetchDetail = useCallback(async () => {
    try {
      setError(null);
      const data = await getBookingById(bookingId);
      setBooking(data);
    } catch (err: any) {
      console.warn('Failed to fetch booking detail:', err);
      setError(err?.message || 'Không thể tải chi tiết đơn đặt. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  }, [bookingId]);

  useEffect(() => {
    fetchDetail();
  }, [fetchDetail]);

  const handleConfirm = () => {
    if (!booking) return;
    Alert.alert(
      'Xác nhận nhận đơn',
      `Bạn đồng ý thực hiện đơn "${booking.service?.name}" vào lúc ${formatTime(booking.scheduledStartAt)}?`,
      [
        { text: 'Hủy bỏ', style: 'cancel' },
        {
          text: 'Đồng ý',
          style: 'default',
          onPress: async () => {
            try {
              setActing(true);
              await confirmBooking(bookingId);
              Alert.alert('Thành công', 'Đã xác nhận nhận việc! Bạn có thể xem đơn trong mục Lịch làm việc.', [
                {
                  text: 'Đóng',
                  onPress: () => navigation.goBack(),
                },
              ]);
            } catch (err: any) {
              if (err?.message?.includes('no longer pending') || err?.message?.includes('409')) {
                Alert.alert('Thông báo', 'Đơn không còn ở trạng thái chờ xác nhận.', [
                  { text: 'Đóng', onPress: () => navigation.goBack() },
                ]);
              } else {
                Alert.alert('Lỗi', err?.message || 'Không thể xác nhận đơn.');
              }
            } finally {
              setActing(false);
            }
          },
        },
      ]
    );
  };

  const handleDeclineSubmit = async () => {
    if (!booking) return;
    if (selectedReason === 'OTHER') {
      const trimmed = declineNote.trim();
      if (trimmed.length < 5) {
        setNoteError('Vui lòng nhập lý do tối thiểu 5 ký tự.');
        return;
      }
    }

    try {
      setActing(true);
      await declineBooking(bookingId, {
        reasonCode: selectedReason,
        note: declineNote.trim() || undefined,
      });

      setDeclineModalVisible(false);
      Alert.alert('Đã từ chối', 'Đã từ chối đơn đặt thành công.', [
        { text: 'Đóng', onPress: () => navigation.goBack() },
      ]);
    } catch (err: any) {
      if (err?.message?.includes('no longer pending') || err?.message?.includes('409')) {
        Alert.alert('Thông báo', 'Đơn không còn ở trạng thái chờ xác nhận.', [
          { text: 'Đóng', onPress: () => navigation.goBack() },
        ]);
        setDeclineModalVisible(false);
      } else {
        Alert.alert('Lỗi', err?.message || 'Không thể từ chối đơn.');
      }
    } finally {
      setActing(false);
    }
  };

  const formatTime = (isoString?: string) => {
    if (!isoString) return '--:--';
    const d = new Date(isoString);
    if (Number.isNaN(d.getTime())) return '--:--';
    const time = d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
    const date = d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
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
    const deadline = created + 12 * 60 * 60 * 1000;
    const diff = deadline - Date.now();
    if (diff <= 0) return 'Hết hạn phản hồi';
    const h = Math.floor(diff / (1000 * 60 * 60));
    const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    return `Còn ${h}h ${m}m để phản hồi`;
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safe}>
        <Header title="Chi tiết đơn đặt" showBack />
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={Colors.primary[500]} />
          <Text style={styles.centerText}>Đang tải chi tiết đơn...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error || !booking) {
    return (
      <SafeAreaView style={styles.safe}>
        <Header title="Chi tiết đơn đặt" showBack />
        <View style={styles.centerContainer}>
          <Icon name="error" size={40} color={Colors.semantic.error} />
          <Text style={styles.errorTitle}>Lỗi tải dữ liệu</Text>
          <Text style={styles.centerText}>{error || 'Không tìm thấy đơn đặt'}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={fetchDetail}>
            <Text style={styles.retryBtnText}>Thử lại</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const isPending = booking.status === 'PENDING_CONFIRMATION';
  const remainingText = isPending ? getRemainingHours(booking.createdAt) : null;
  const attachments = booking.request?.attachments || [];

  return (
    <SafeAreaView style={styles.safe}>
      <Header
        title="Chi tiết đơn đặt"
        subtitle={booking.service?.name}
        showBack
      />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Status / Countdown Banner */}
        {isPending && (
          <View style={styles.countdownBanner}>
            <Icon name="clock" size={18} color={Colors.accent[700]} />
            <View style={{ flex: 1 }}>
              <Text style={styles.countdownBannerTitle}>Đang chờ bạn xác nhận</Text>
              {remainingText && (
                <Text style={styles.countdownBannerSub}>{remainingText}</Text>
              )}
            </View>
          </View>
        )}

        {/* Customer Information Card */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Thông tin khách hàng</Text>
          <View style={styles.customerRow}>
            {booking.customer?.avatarUrl ? (
              <Image source={{ uri: booking.customer.avatarUrl }} style={styles.avatar} />
            ) : (
              <View style={[styles.avatar, styles.avatarFallback]}>
                <Text style={styles.avatarText}>
                  {booking.customer?.fullName ? booking.customer.fullName.charAt(0).toUpperCase() : 'K'}
                </Text>
              </View>
            )}
            <View style={{ flex: 1 }}>
              <Text style={styles.customerName}>{booking.customer?.fullName}</Text>
              {booking.customer?.phone && (
                <View style={styles.contactRow}>
                  <Icon name="phone" size={13} color={Colors.neutral[500]} />
                  <Text style={styles.contactText}>{booking.customer.phone}</Text>
                </View>
              )}
            </View>

            <TouchableOpacity
              style={styles.chatIconBtn}
              onPress={() => navigation.navigate('Chat', { name: booking.customer?.fullName })}
            >
              <Icon name="chat" size={18} color={Colors.primary[600]} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Schedule & Service Details Card */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Nội dung công việc</Text>

          <View style={styles.detailRow}>
            <Icon name="wrench" size={16} color={Colors.primary[600]} />
            <View style={{ flex: 1 }}>
              <Text style={styles.detailLabel}>Dịch vụ</Text>
              <Text style={styles.detailValue}>{booking.service?.name}</Text>
            </View>
          </View>

          <View style={styles.detailRow}>
            <Icon name="calendar" size={16} color={Colors.primary[600]} />
            <View style={{ flex: 1 }}>
              <Text style={styles.detailLabel}>Thời gian thực hiện</Text>
              <Text style={styles.detailValue}>
                {formatTime(booking.scheduledStartAt)} - {formatTime(booking.scheduledEndAt)}
              </Text>
            </View>
          </View>

          <View style={styles.detailRow}>
            <Icon name="location" size={16} color={Colors.neutral[500]} />
            <View style={{ flex: 1 }}>
              <Text style={styles.detailLabel}>Địa chỉ làm việc</Text>
              <Text style={styles.detailValue}>{formatAddress(booking.address)}</Text>
            </View>
          </View>

          {booking.request?.description ? (
            <View style={styles.descBox}>
              <Text style={styles.descLabel}>Mô tả từ khách hàng:</Text>
              <Text style={styles.descText}>{booking.request.description}</Text>
            </View>
          ) : null}
        </View>

        {/* Site Photos / Attachments */}
        {attachments.length > 0 && (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Hình ảnh hiện trường ({attachments.length})</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.photosList}>
              {attachments.map((url: string, index: number) => (
                <Image key={index} source={{ uri: url }} style={styles.photoThumb} />
              ))}
            </ScrollView>
          </View>
        )}

        {/* Price & Quote Breakdown */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Chi phí dịch vụ</Text>
          <View style={styles.priceRow}>
            <Text style={styles.priceLabel}>Giá dịch vụ theo báo giá:</Text>
            <Text style={styles.priceValue}>{formatVND(booking.price || 0)}</Text>
          </View>
          {booking.additionalFees ? (
            <View style={styles.priceRow}>
              <Text style={styles.priceLabel}>Phát sinh đã duyệt:</Text>
              <Text style={styles.priceValue}>{formatVND(booking.additionalFees)}</Text>
            </View>
          ) : null}
          <View style={[styles.priceRow, styles.totalRow]}>
            <Text style={styles.totalLabel}>Tổng cộng:</Text>
            <Text style={styles.totalValue}>{formatVND((booking.price || 0) + (booking.additionalFees || 0))}</Text>
          </View>
        </View>
      </ScrollView>

      {/* Action Footer for PENDING_CONFIRMATION */}
      {isPending && (
        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.declineBtn, acting && styles.btnDisabled]}
            disabled={acting}
            onPress={() => {
              setSelectedReason('BUSY');
              setDeclineNote('');
              setNoteError(null);
              setDeclineModalVisible(true);
            }}
          >
            <Text style={styles.declineBtnText}>Từ chối</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.confirmBtn, acting && styles.btnDisabled]}
            disabled={acting}
            onPress={handleConfirm}
          >
            {acting ? (
              <ActivityIndicator size="small" color={Colors.neutral[0]} />
            ) : (
              <>
                <Icon name="check" size={18} color={Colors.neutral[0]} />
                <Text style={styles.confirmBtnText}>Chấp nhận nhận đơn</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      )}

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
  content: {
    padding: Space.md,
    gap: Space.md,
    paddingBottom: 40,
  },
  countdownBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.accent[50],
    borderWidth: 1,
    borderColor: Colors.accent[300],
    padding: Space.md,
    borderRadius: Radius.lg,
    gap: Space.sm,
  },
  countdownBannerTitle: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize.sm,
    color: Colors.accent[700],
  },
  countdownBannerSub: {
    fontFamily: FontFamily.medium,
    fontSize: FontSize.xs,
    color: Colors.accent[700],
    marginTop: 2,
  },
  card: {
    backgroundColor: Colors.neutral[0],
    borderRadius: Radius.lg,
    padding: Space.md,
    borderWidth: 1,
    borderColor: Colors.neutral[200],
    ...Shadow.sm,
  },
  sectionTitle: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize.md,
    color: Colors.neutral[900],
    marginBottom: Space.sm,
  },
  customerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Space.sm,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: Radius.full,
  },
  avatarFallback: {
    backgroundColor: Colors.primary[100],
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize.lg,
    color: Colors.primary[700],
  },
  customerName: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize.sm,
    color: Colors.neutral[900],
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  contactText: {
    fontFamily: FontFamily.regular,
    fontSize: FontSize.xs,
    color: Colors.neutral[600],
  },
  chatIconBtn: {
    width: 40,
    height: 40,
    borderRadius: Radius.full,
    backgroundColor: Colors.primary[50],
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Space.sm,
    marginBottom: Space.sm,
  },
  detailLabel: {
    fontFamily: FontFamily.regular,
    fontSize: 11,
    color: Colors.neutral[500],
  },
  detailValue: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSize.xs,
    color: Colors.neutral[900],
    marginTop: 1,
  },
  descBox: {
    backgroundColor: Colors.neutral[50],
    borderRadius: Radius.md,
    padding: Space.sm,
    marginTop: Space.xs,
  },
  descLabel: {
    fontFamily: FontFamily.semiBold,
    fontSize: 11,
    color: Colors.neutral[500],
    marginBottom: 2,
  },
  descText: {
    fontFamily: FontFamily.regular,
    fontSize: FontSize.xs,
    color: Colors.neutral[800],
    lineHeight: 18,
  },
  photosList: {
    gap: Space.sm,
  },
  photoThumb: {
    width: 90,
    height: 90,
    borderRadius: Radius.md,
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  priceLabel: {
    fontFamily: FontFamily.regular,
    fontSize: FontSize.xs,
    color: Colors.neutral[600],
  },
  priceValue: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSize.xs,
    color: Colors.neutral[900],
  },
  totalRow: {
    borderTopWidth: 1,
    borderTopColor: Colors.neutral[200],
    paddingTop: Space.sm,
    marginTop: Space.xs,
  },
  totalLabel: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize.sm,
    color: Colors.neutral[900],
  },
  totalValue: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize.lg,
    color: Colors.primary[700],
  },
  footer: {
    flexDirection: 'row',
    padding: Space.md,
    backgroundColor: Colors.neutral[0],
    borderTopWidth: 1,
    borderTopColor: Colors.neutral[200],
    gap: Space.sm,
  },
  declineBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Space.sm + 4,
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
    flex: 1.5,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Space.sm + 4,
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
