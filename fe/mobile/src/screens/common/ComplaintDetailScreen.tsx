import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Image,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Modal,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../types/navigation';
import { useAppStore } from '../../store/useAppStore';
import { useAuthStore } from '../../store/useAuthStore';
import { ComplaintStatus } from '../../types';
import { Colors } from '../../constants/colors';
import { FontFamily, FontSize } from '../../constants/typography';
import { Radius, Shadow, Space } from '../../constants/spacing';
import { Icon, AppIconKey } from '../../components/ui/Icon';
import { Button } from '../../components/ui/Button';

export default function ComplaintDetailScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<RootStackParamList, 'ComplaintDetail'>>();
  const { complaintId } = route.params;

  const { complaints, replyComplaint, resolveComplaint } = useAppStore();
  const { role, currentUser } = useAuthStore();

  const complaint = complaints.find((c) => c.id === complaintId) || complaints[0];

  const [replyText, setReplyText] = useState('');
  const [isSending, setIsSending] = useState(false);

  // Staff Resolve Modal state
  const [showResolveModal, setShowResolveModal] = useState(false);
  const [resolutionNote, setResolutionNote] = useState('');
  const [refundAmount, setRefundAmount] = useState('0');
  const [resolveStatus, setResolveStatus] = useState<ComplaintStatus>('RESOLVED');
  const [isResolving, setIsResolving] = useState(false);

  if (!complaint) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.notFoundWrap}>
          <Text style={styles.notFoundText}>Không tìm thấy khiếu nại</Text>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backLink}>
            <Text style={styles.backLinkText}>Quay lại</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const isResolved = complaint.status === 'RESOLVED';
  const isRejected = complaint.status === 'REJECTED';
  const isClosed = isResolved || isRejected || complaint.status === 'CLOSED';
  const isInvestigating = complaint.status === 'UNDER_REVIEW';
  const isStaffOrAdmin = role === 'staff' || role === 'admin';
  const isProvider = role === 'provider';

  const handleSendReply = async () => {
    if (!replyText.trim()) return;

    try {
      setIsSending(true);
      await replyComplaint(complaint.id, replyText.trim(), role);
      setReplyText('');
      setIsSending(false);
    } catch (err: any) {
      setIsSending(false);
      Alert.alert('Lỗi', err.message || 'Không thể gửi phản hồi.');
    }
  };

  const handleResolveSubmit = async () => {
    if (!resolutionNote.trim()) {
      Alert.alert('Thiếu thông tin', 'Vui lòng nhập ghi chú kết quả xử lý từ CSKH.');
      return;
    }

    try {
      setIsResolving(true);
      const parsedRefund = Number(refundAmount) || 0;
      await resolveComplaint(complaint.id, resolutionNote.trim(), parsedRefund, resolveStatus);
      setIsResolving(false);
      setShowResolveModal(false);
      Alert.alert('Thành công', 'Đã cập nhật giải quyết khiếu nại.');
    } catch (err: any) {
      setIsResolving(false);
      Alert.alert('Lỗi', err.message || 'Không thể cập nhật trạng thái.');
    }
  };

  const getStatusBadge = () => {
    if (isRejected) {
      return {
        label: 'Từ chối / Bác bỏ',
        bg: 'rgba(107, 114, 128, 0.15)',
        color: Colors.neutral[600],
      };
    }
    if (isResolved) {
      return {
        label: 'Đã giải quyết',
        bg: 'rgba(16, 185, 129, 0.15)',
        color: Colors.semantic.success,
      };
    }
    if (isInvestigating) {
      return {
        label: 'Đang xác minh',
        bg: 'rgba(245, 158, 11, 0.15)',
        color: Colors.accent[600],
      };
    }
    return {
      label: 'Chờ tiếp nhận',
      bg: 'rgba(239, 68, 68, 0.12)',
      color: Colors.semantic.error,
    };
  };

  const statusBadge = getStatusBadge();

  return (
    <SafeAreaView style={styles.safe}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backBtn}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Icon name="back" size={24} color={Colors.neutral[800]} />
        </TouchableOpacity>
        <View style={styles.headerTitleWrap}>
          <Text style={styles.headerTitle}>Chi tiết khiếu nại</Text>
          <Text style={styles.headerSub}>Mã đơn #{complaint.bookingId} · {complaint.category}</Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: statusBadge.bg }]}>
          <Text style={[styles.statusBadgeText, { color: statusBadge.color }]}>
            {statusBadge.label}
          </Text>
        </View>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Main Info Card */}
          <View style={styles.card}>
            <View style={styles.cardCategoryRow}>
              <View style={styles.tag}>
                <Text style={styles.tagText}>{complaint.category}</Text>
              </View>
              <Text style={styles.dateText}>{complaint.createdAt}</Text>
            </View>

            <Text style={styles.titleText}>{complaint.title}</Text>

            {/* Parties info */}
            <View style={styles.partiesBox}>
              <View style={styles.partyItem}>
                <Text style={styles.partyLabel}>Người khiếu nại:</Text>
                <Text style={styles.partyValue}>{complaint.reporterName}</Text>
              </View>
              <View style={styles.partyDivider} />
              <View style={styles.partyItem}>
                <Text style={styles.partyLabel}>Thợ đối tác:</Text>
                <Text style={styles.partyValue}>{complaint.againstName}</Text>
              </View>
            </View>

            {/* Description */}
            <Text style={styles.descLabel}>Nội dung phản ánh:</Text>
            <View style={styles.descBox}>
              <Text style={styles.descText}>&ldquo;{complaint.description}&rdquo;</Text>
            </View>

            {/* Evidence Images */}
            {complaint.evidenceUrls && complaint.evidenceUrls.length > 0 && (
              <View style={styles.evidenceWrap}>
                <Text style={styles.descLabel}>Hình ảnh đính kèm:</Text>
                <View style={styles.evidenceRow}>
                  {complaint.evidenceUrls.map((url, i) => (
                    <Image key={i} source={{ uri: url }} style={styles.evidenceImg} />
                  ))}
                </View>
              </View>
            )}
          </View>

          {/* Resolution Result Banner if resolved */}
          {isResolved && complaint.resolutionNote && (
            <View style={styles.resolvedCard}>
              <View style={styles.resolvedHeader}>
                <Icon name="check" size={20} color={Colors.semantic.success} />
                <Text style={styles.resolvedTitle}>Kết quả giải quyết từ CSKH</Text>
              </View>
              <Text style={styles.resolvedNote}>{complaint.resolutionNote}</Text>
              {complaint.refundAmount && complaint.refundAmount > 0 ? (
                <View style={styles.refundBox}>
                  <Icon name="earnings" size={18} color={Colors.primary[700]} />
                  <Text style={styles.refundText}>
                    Số tiền bồi thường / hoàn trả:{' '}
                    <Text style={styles.refundAmountBold}>
                      {complaint.refundAmount.toLocaleString('vi-VN')} VNĐ
                    </Text>
                  </Text>
                </View>
              ) : null}
              {complaint.resolvedBy && (
                <Text style={styles.resolvedByText}>
                  Xử lý bởi: <Text style={styles.bold}>{complaint.resolvedBy}</Text> · {complaint.resolvedAt}
                </Text>
              )}
            </View>
          )}

          {/* Provider explanation notice */}
          {isProvider && !isResolved && (
            <View style={styles.providerNotice}>
              <Icon name="info" size={18} color={Colors.primary[600]} />
              <Text style={styles.providerNoticeText}>
                Bạn là bên bị khiếu nại. Vui lòng gửi tin nhắn giải trình hoặc đề xuất phương án bảo hành để CSKH hỗ trợ hòa giải.
              </Text>
            </View>
          )}

          {/* Staff action CTA button */}
          {isStaffOrAdmin && !isClosed && (
            <View style={styles.staffActionCard}>
              <View style={styles.staffActionHeader}>
                <Icon name="shieldCheck" size={20} color={Colors.accent[600]} />
                <Text style={styles.staffActionTitle}>Dành cho Vận hành & CSKH (KAN-26)</Text>
              </View>
              <Text style={styles.staffActionSub}>
                Bạn có quyền thẩm định khiếu nại, quyết định bồi thường và cập nhật trạng thái đơn.
              </Text>
              <Button
                label="Phản hồi & Giải quyết khiếu nại"
                variant="secondary"
                size="md"
                onPress={() => setShowResolveModal(true)}
                leftIcon={<Icon name="check" size={18} color={Colors.neutral[0]} />}
              />
            </View>
          )}

          {/* Discussion Thread (Replied Complain - KAN-26) */}
          <View style={styles.threadCard}>
            <View style={styles.threadHeader}>
              <Icon name="chat" size={18} color={Colors.primary[700]} />
              <Text style={styles.threadTitle}>
                Luồng trao đổi xử lý ({complaint.replies?.length ?? 0})
              </Text>
            </View>
            <Text style={styles.threadSub}>
              Trao đổi minh bạch giữa Khách hàng, Thợ sửa chữa và CSKH
            </Text>

            <View style={styles.threadList}>
              {(complaint.replies || []).map((reply, index) => {
                const isMe = reply.senderRole === role;
                const isStaff = reply.senderRole === 'staff' || reply.senderRole === 'admin';
                const isReplyProvider = reply.senderRole === 'provider';

                return (
                  <View
                    key={reply.id || index}
                    style={[
                      styles.replyRow,
                      isStaff
                        ? styles.replyRowStaff
                        : isMe
                        ? styles.replyRowMe
                        : styles.replyRowThem,
                    ]}
                  >
                    <View
                      style={[
                        styles.bubble,
                        isStaff
                          ? styles.bubbleStaff
                          : isMe
                          ? styles.bubbleMe
                          : styles.bubbleThem,
                      ]}
                    >
                      <View style={styles.bubbleMeta}>
                        <Text
                          style={[
                            styles.senderRoleTag,
                            isStaff
                              ? styles.senderRoleTagStaff
                              : isReplyProvider
                              ? styles.senderRoleTagProvider
                              : styles.senderRoleTagCust,
                          ]}
                        >
                          {isStaff ? 'CSKH' : isReplyProvider ? 'Thợ' : 'Khách hàng'}
                        </Text>
                        <Text style={styles.senderName}>{reply.senderName}</Text>
                        <Text style={styles.replyTime}>{reply.createdAt}</Text>
                      </View>
                      <Text
                        style={[
                          styles.replyText,
                          isStaff && styles.replyTextStaff,
                        ]}
                      >
                        {reply.message}
                      </Text>
                    </View>
                  </View>
                );
              })}

              {(!complaint.replies || complaint.replies.length === 0) && (
                <Text style={styles.emptyThreadText}>
                  Chưa có trao đổi nào. Hãy nhập phản hồi bên dưới.
                </Text>
              )}
            </View>
          </View>
        </ScrollView>

        {/* Reply Bar at bottom (KAN-26) */}
        {isClosed ? (
          <View style={styles.closedBanner}>
            <Icon name="check" size={16} color={Colors.semantic.success} />
            <Text style={styles.closedBannerText}>
              Khiếu nại này đã được đóng hoặc giải quyết. Không thể gửi thêm phản hồi.
            </Text>
          </View>
        ) : (
          <View style={styles.replyBar}>
            <TextInput
              style={styles.replyInput}
              placeholder={`Gửi phản hồi với vai trò ${
                role === 'staff' ? 'CSKH' : role === 'provider' ? 'Thợ' : 'Khách hàng'
              }...`}
              placeholderTextColor={Colors.neutral[400]}
              value={replyText}
              onChangeText={setReplyText}
              multiline
              editable={!isSending}
            />
            <TouchableOpacity
              onPress={handleSendReply}
              style={[styles.sendBtn, (!replyText.trim() || isSending) && styles.sendBtnDisabled]}
              disabled={!replyText.trim() || isSending}
            >
              <Icon name="send" size={18} color={Colors.neutral[0]} />
            </TouchableOpacity>
          </View>
        )}
      </KeyboardAvoidingView>

      {/* Staff Resolve Modal (KAN-26) */}
      <Modal
        visible={showResolveModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowResolveModal(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalOverlay}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Xử lý & Giải quyết khiếu nại</Text>
              <TouchableOpacity onPress={() => setShowResolveModal(false)}>
                <Icon name="close" size={22} color={Colors.neutral[500]} />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalLabel}>Trạng thái kết luận:</Text>
            <View style={styles.modalStatusRow}>
              {(['RESOLVED', 'REJECTED', 'UNDER_REVIEW'] as ComplaintStatus[]).map((st) => (
                <TouchableOpacity
                  key={st}
                  onPress={() => setResolveStatus(st)}
                  style={[
                    styles.modalStatusChip,
                    resolveStatus === st && styles.modalStatusChipActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.modalStatusChipText,
                      resolveStatus === st && styles.modalStatusChipTextActive,
                    ]}
                  >
                    {st === 'RESOLVED' ? 'Chấp thuận' : st === 'REJECTED' ? 'Bác bỏ' : 'Đang xử lý'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.modalLabel}>Nội dung phản hồi từ CSKH *:</Text>
            <TextInput
              style={[styles.modalInput, styles.modalTextArea]}
              placeholder="vd: Đã liên hệ thợ giải trình, đồng ý cử thợ khác xử lý miễn phí và hoàn trả phí phát sinh..."
              placeholderTextColor={Colors.neutral[400]}
              value={resolutionNote}
              onChangeText={setResolutionNote}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />

            <Text style={styles.modalLabel}>Số tiền bồi thường / hoàn trả (VNĐ):</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="0"
              placeholderTextColor={Colors.neutral[400]}
              keyboardType="numeric"
              value={refundAmount}
              onChangeText={setRefundAmount}
            />

            <View style={styles.modalBtnRow}>
              <Button
                label="Hủy"
                variant="outline"
                size="md"
                onPress={() => setShowResolveModal(false)}
              />
              <Button
                label="Xác nhận giải quyết"
                variant="primary"
                size="md"
                loading={isResolving}
                onPress={handleResolveSubmit}
              />
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: Colors.neutral[50],
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Space.md,
    paddingVertical: Space.md,
    backgroundColor: Colors.neutral[0],
    borderBottomWidth: 1,
    borderBottomColor: Colors.neutral[200],
    ...Shadow.sm,
  },
  backBtn: {
    padding: Space.xs,
    marginRight: Space.sm,
  },
  headerTitleWrap: {
    flex: 1,
  },
  headerTitle: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize.md,
    color: Colors.neutral[900],
  },
  headerSub: {
    fontFamily: FontFamily.regular,
    fontSize: FontSize.xs,
    color: Colors.neutral[500],
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: Space.sm,
    paddingVertical: 4,
    borderRadius: Radius.full,
  },
  statusBadgeText: {
    fontFamily: FontFamily.bold,
    fontSize: 10,
    textTransform: 'uppercase',
  },
  scroll: {
    padding: Space.md,
    paddingBottom: Space['2xl'],
  },
  card: {
    backgroundColor: Colors.neutral[0],
    borderRadius: Radius.xl,
    padding: Space.md,
    marginBottom: Space.md,
    borderWidth: 1,
    borderColor: Colors.neutral[200],
    ...Shadow.sm,
  },
  cardCategoryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Space.xs,
  },
  tag: {
    backgroundColor: Colors.primary[50],
    paddingHorizontal: Space.sm,
    paddingVertical: 3,
    borderRadius: Radius.full,
  },
  tagText: {
    fontFamily: FontFamily.bold,
    fontSize: 10,
    color: Colors.primary[700],
    textTransform: 'uppercase',
  },
  dateText: {
    fontFamily: FontFamily.regular,
    fontSize: FontSize.xs,
    color: Colors.neutral[400],
  },
  titleText: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize.lg,
    color: Colors.neutral[900],
    marginTop: Space.xs,
    lineHeight: 22,
  },
  partiesBox: {
    flexDirection: 'row',
    backgroundColor: Colors.neutral[50],
    borderRadius: Radius.lg,
    padding: Space.sm,
    marginTop: Space.sm,
    marginBottom: Space.sm,
  },
  partyItem: {
    flex: 1,
  },
  partyLabel: {
    fontFamily: FontFamily.regular,
    fontSize: 10,
    color: Colors.neutral[500],
  },
  partyValue: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize.xs,
    color: Colors.neutral[800],
    marginTop: 2,
  },
  partyDivider: {
    width: 1,
    backgroundColor: Colors.neutral[200],
    marginHorizontal: Space.sm,
  },
  descLabel: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize.xs,
    color: Colors.neutral[700],
    marginTop: Space.xs,
    marginBottom: Space.xs,
  },
  descBox: {
    backgroundColor: Colors.neutral[50],
    borderRadius: Radius.lg,
    padding: Space.sm,
    borderWidth: 1,
    borderColor: Colors.neutral[200],
  },
  descText: {
    fontFamily: FontFamily.regular,
    fontSize: FontSize.sm,
    color: Colors.neutral[800],
    lineHeight: 20,
    fontStyle: 'italic',
  },
  evidenceWrap: {
    marginTop: Space.sm,
  },
  evidenceRow: {
    flexDirection: 'row',
    gap: Space.sm,
  },
  evidenceImg: {
    width: 80,
    height: 80,
    borderRadius: Radius.md,
  },
  resolvedCard: {
    backgroundColor: 'rgba(16, 185, 129, 0.08)',
    borderRadius: Radius.xl,
    padding: Space.md,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.25)',
    marginBottom: Space.md,
  },
  resolvedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: Space.xs,
  },
  resolvedTitle: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize.sm,
    color: Colors.semantic.success,
  },
  resolvedNote: {
    fontFamily: FontFamily.regular,
    fontSize: FontSize.sm,
    color: Colors.neutral[800],
    lineHeight: 20,
  },
  refundBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.neutral[0],
    paddingHorizontal: Space.sm,
    paddingVertical: Space.xs,
    borderRadius: Radius.md,
    marginTop: Space.sm,
    gap: 6,
  },
  refundText: {
    fontFamily: FontFamily.regular,
    fontSize: FontSize.xs,
    color: Colors.neutral[700],
  },
  refundAmountBold: {
    fontFamily: FontFamily.bold,
    color: Colors.semantic.success,
    fontSize: FontSize.sm,
  },
  resolvedByText: {
    fontFamily: FontFamily.regular,
    fontSize: 10,
    color: Colors.neutral[500],
    marginTop: Space.xs,
  },
  bold: {
    fontFamily: FontFamily.bold,
    color: Colors.neutral[700],
  },
  providerNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primary[50],
    padding: Space.sm,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.primary[200],
    marginBottom: Space.md,
    gap: Space.xs,
  },
  providerNoticeText: {
    flex: 1,
    fontFamily: FontFamily.regular,
    fontSize: FontSize.xs,
    color: Colors.primary[900],
    lineHeight: 18,
  },
  staffActionCard: {
    backgroundColor: Colors.neutral[0],
    borderRadius: Radius.xl,
    padding: Space.md,
    borderWidth: 1,
    borderColor: Colors.accent[400],
    marginBottom: Space.md,
    ...Shadow.sm,
  },
  staffActionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  staffActionTitle: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize.sm,
    color: Colors.accent[700],
  },
  staffActionSub: {
    fontFamily: FontFamily.regular,
    fontSize: FontSize.xs,
    color: Colors.neutral[600],
    marginBottom: Space.sm,
    lineHeight: 18,
  },
  threadCard: {
    backgroundColor: Colors.neutral[0],
    borderRadius: Radius.xl,
    padding: Space.md,
    borderWidth: 1,
    borderColor: Colors.neutral[200],
    ...Shadow.sm,
  },
  threadHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  threadTitle: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize.md,
    color: Colors.neutral[900],
  },
  threadSub: {
    fontFamily: FontFamily.regular,
    fontSize: FontSize.xs,
    color: Colors.neutral[500],
    marginTop: 2,
    marginBottom: Space.md,
  },
  threadList: {
    gap: Space.sm,
  },
  replyRow: {
    flexDirection: 'row',
  },
  replyRowMe: {
    justifyContent: 'flex-end',
  },
  replyRowThem: {
    justifyContent: 'flex-start',
  },
  replyRowStaff: {
    justifyContent: 'center',
  },
  bubble: {
    maxWidth: '85%',
    padding: Space.sm,
    borderRadius: Radius.lg,
  },
  bubbleMe: {
    backgroundColor: Colors.primary[50],
    borderBottomRightRadius: 2,
    borderWidth: 1,
    borderColor: Colors.primary[200],
  },
  bubbleThem: {
    backgroundColor: Colors.neutral[100],
    borderBottomLeftRadius: 2,
  },
  bubbleStaff: {
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.3)',
    maxWidth: '95%',
  },
  bubbleMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  senderRoleTag: {
    fontFamily: FontFamily.bold,
    fontSize: 9,
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: Radius.xs,
    overflow: 'hidden',
    color: Colors.neutral[0],
  },
  senderRoleTagStaff: {
    backgroundColor: Colors.accent[600],
  },
  senderRoleTagProvider: {
    backgroundColor: Colors.brand,
  },
  senderRoleTagCust: {
    backgroundColor: Colors.primary[600],
  },
  senderName: {
    fontFamily: FontFamily.bold,
    fontSize: 11,
    color: Colors.neutral[800],
  },
  replyTime: {
    fontFamily: FontFamily.regular,
    fontSize: 9,
    color: Colors.neutral[400],
    marginLeft: 'auto',
  },
  replyText: {
    fontFamily: FontFamily.regular,
    fontSize: FontSize.xs,
    color: Colors.neutral[900],
    lineHeight: 18,
  },
  replyTextStaff: {
    fontFamily: FontFamily.medium,
    color: Colors.neutral[900],
  },
  emptyThreadText: {
    fontFamily: FontFamily.regular,
    fontSize: FontSize.xs,
    color: Colors.neutral[400],
    fontStyle: 'italic',
    textAlign: 'center',
    paddingVertical: Space.md,
  },
  replyBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Space.md,
    paddingVertical: Space.sm,
    backgroundColor: Colors.neutral[0],
    borderTopWidth: 1,
    borderTopColor: Colors.neutral[200],
    gap: Space.sm,
  },
  replyInput: {
    flex: 1,
    fontFamily: FontFamily.regular,
    fontSize: FontSize.sm,
    color: Colors.neutral[900],
    backgroundColor: Colors.neutral[100],
    borderRadius: Radius.lg,
    paddingHorizontal: Space.md,
    paddingVertical: Space.xs,
    maxHeight: 80,
  },
  sendBtn: {
    width: 42,
    height: 42,
    borderRadius: Radius.full,
    backgroundColor: Colors.primary[600],
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnDisabled: {
    backgroundColor: Colors.neutral[300],
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: Colors.neutral[0],
    borderTopLeftRadius: Radius['2xl'],
    borderTopRightRadius: Radius['2xl'],
    padding: Space.lg,
    paddingBottom: Space['2xl'],
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Space.md,
  },
  modalTitle: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize.lg,
    color: Colors.neutral[900],
  },
  modalLabel: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize.xs,
    color: Colors.neutral[700],
    marginBottom: 4,
    marginTop: Space.sm,
  },
  modalStatusRow: {
    flexDirection: 'row',
    gap: Space.xs,
    marginBottom: Space.xs,
  },
  modalStatusChip: {
    paddingHorizontal: Space.sm,
    paddingVertical: 6,
    borderRadius: Radius.full,
    backgroundColor: Colors.neutral[100],
    borderWidth: 1,
    borderColor: Colors.neutral[300],
  },
  modalStatusChipActive: {
    backgroundColor: Colors.primary[600],
    borderColor: Colors.primary[700],
  },
  modalStatusChipText: {
    fontFamily: FontFamily.medium,
    fontSize: FontSize.xs,
    color: Colors.neutral[700],
  },
  modalStatusChipTextActive: {
    fontFamily: FontFamily.bold,
    color: Colors.neutral[0],
  },
  modalInput: {
    fontFamily: FontFamily.regular,
    fontSize: FontSize.sm,
    color: Colors.neutral[900],
    backgroundColor: Colors.neutral[50],
    borderWidth: 1,
    borderColor: Colors.neutral[300],
    borderRadius: Radius.lg,
    paddingHorizontal: Space.md,
    paddingVertical: Space.sm,
  },
  modalTextArea: {
    minHeight: 90,
  },
  modalBtnRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: Space.sm,
    marginTop: Space.lg,
  },
  notFoundWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notFoundText: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize.lg,
    color: Colors.neutral[600],
  },
  backLink: {
    marginTop: Space.md,
  },
  backLinkText: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize.sm,
    color: Colors.primary[600],
  },
  closedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Space.xs,
    paddingVertical: Space.md,
    paddingHorizontal: Space.lg,
    backgroundColor: Colors.neutral[100],
    borderTopWidth: 1,
    borderTopColor: Colors.neutral[200],
  },
  closedBannerText: {
    fontFamily: FontFamily.medium,
    fontSize: FontSize.xs,
    color: Colors.neutral[600],
  },
});