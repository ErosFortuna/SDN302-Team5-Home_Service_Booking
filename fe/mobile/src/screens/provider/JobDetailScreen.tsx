import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Alert,
  TextInput,
  Modal,
  Image,
} from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { RootStackParamList } from "../../types/navigation";
import { useAppStore } from "../../store/useAppStore";
import { formatVND } from '../../utils/formatters';
import { Header } from "../../components/layout/Header";
import { Icon, StatusBadge, Button } from "../../components/ui";
import { Colors } from "../../constants/colors";
import { FontFamily, FontSize } from "../../constants/typography";
import { Radius, Shadow, Space } from "../../constants/spacing";
import { updateBookingStatus } from "../../services/bookingService";
import * as ImagePicker from 'expo-image-picker';
import { uploadRequestImage } from '../../services/serviceRequestService';
import { CategoryIcon } from '../../components/ui/CategoryIcon';

type Props = NativeStackScreenProps<RootStackParamList, "JobDetail">;

export default function JobDetailScreen({ route, navigation }: Props) {
  const { jobId } = route.params || {};
  const { bookings, fetchBookings } = useAppStore();
  const job = bookings.find((b) => b.id === jobId);

  const [proofPhotos, setProofPhotos] = useState<string[]>(job?.progressPhotos || job?.proofPhotos || []);
  const [photoUploading, setPhotoUploading] = useState(false);
  const [progressNote, setProgressNote] = useState<string>(job?.completionNote || '');
  const [completionModalOpen, setCompletionModalOpen] = useState(false);
  const [finalPriceInput, setFinalPriceInput] = useState('');
  const [finalPriceError, setFinalPriceError] = useState('');
  const [completing, setCompleting] = useState(false);
  const customerAttachments = Array.isArray(job?.attachments) ? job.attachments : [];

  if (!job) {
    return (
      <SafeAreaView style={styles.safe}>
        <Header title="Chi tiết công việc" showBack />
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>
            Không tìm thấy thông tin công việc này.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  const handleStartJob = async () => {
    try {
      const nextStatus = job.status === 'confirmed'
        ? 'PROVIDER_ON_THE_WAY'
        : job.status === 'provider_on_the_way'
          ? 'ARRIVED'
          : 'IN_PROGRESS';
      await updateBookingStatus(job.id, { status: nextStatus, photos: proofPhotos });
      await fetchBookings();
      Alert.alert("Thành công", "Đã cập nhật tiến độ công việc.");
    } catch (err: any) {
      Alert.alert("Lỗi", err.message || "Không thể cập nhật trạng thái");
    }
  };

  const handleAddPhoto = async () => {
    if (proofPhotos.length >= 4 || photoUploading) return;
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Cần quyền truy cập', 'Vui lòng cấp quyền thư viện ảnh để tải ảnh nghiệm thu.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: false,
      quality: 0.8,
      preferredAssetRepresentationMode: ImagePicker.UIImagePickerPreferredAssetRepresentationMode.Compatible,
    });
    if (result.canceled || !result.assets[0]?.uri) return;
    setPhotoUploading(true);
    try {
      const url = await uploadRequestImage(result.assets[0].uri);
      if (!url) throw new Error('Máy chủ không trả về đường dẫn ảnh.');
      setProofPhotos((current) => [...current, url]);
    } catch (error) {
      Alert.alert('Không thể tải ảnh', error instanceof Error ? error.message : 'Vui lòng thử lại.');
    } finally {
      setPhotoUploading(false);
    }
  };

  const handleCompleteJob = () => {
    setCompletionModalOpen(true);
  };

  const confirmCompleteJob = async () => {
    const value = finalPriceInput.trim();
    const finalPrice = value ? Number(value) : undefined;
    if (value && (typeof finalPrice !== "number" || !/^\d+$/.test(value) || !Number.isSafeInteger(finalPrice))) {
      setFinalPriceError("Nhập số tiền nguyên không âm hoặc để trống.");
      return;
    }

    setFinalPriceError("");
    setCompleting(true);
    try {
      await updateBookingStatus(job.id, {
        status: "COMPLETED",
        note: progressNote.trim() || undefined,
        confirmCompletion: true,
        photos: proofPhotos,
        finalPrice,
      });
      await fetchBookings();
      setCompletionModalOpen(false);
      Alert.alert("Chúc mừng!", "Công việc đã được đánh dấu hoàn tất.");
    } catch (err: any) {
      Alert.alert("Lỗi", err.message || "Không thể hoàn thành công việc");
    } finally {
      setCompleting(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <Header title="Chi tiết công việc" showBack />

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* Title & Status */}
        <View style={styles.headerCard}>
          <View style={styles.headerTop}>
            <CategoryIcon category={job.category} size={44} />
            <View style={{ flex: 1 }}>
              <Text style={styles.jobTitle}>{job.categoryName || job.title}</Text>
            </View>
            <StatusBadge bookingStatus={job.status} size="sm" />
          </View>

          <View style={styles.descBox}>
            <Text style={styles.descText}>{job.description}</Text>
          </View>
        </View>

        {/* Customer uploaded problem photos */}
        {customerAttachments.length > 0 && (
          <View style={styles.photosSection}>
            <Text style={styles.sectionTitle}>
              Hình ảnh hiện trường từ khách hàng ({customerAttachments.length})
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.photosRow}>
                {customerAttachments.map((url: string, index: number) => (
                  <Image
                    key={`${url}-${index}`}
                    source={{ uri: url }}
                    style={styles.customerPhoto}
                  />
                ))}
              </View>
            </ScrollView>
          </View>
        )}

        {/* Customer card with Call & Message */}
        <View style={styles.customerCard}>
          <View style={styles.customerAvatar}>
            <Text style={styles.customerAvatarText}>
              {job.customerName
                ? job.customerName.slice(0, 2).toUpperCase()
                : "KH"}
            </Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.customerName}>{job.customerName}</Text>
            <Text style={styles.customerRole}>Khách hàng</Text>
          </View>
          <TouchableOpacity
            style={styles.circleActionBtn}
            onPress={() =>
              navigation.navigate("Chat", { name: job.customerName })
            }
          >
            <Icon name="messages" size={18} color={Colors.primary[600]} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.circleActionBtn}
            onPress={() =>
              Alert.alert(
                "Gọi khách hàng",
                "Đang kết nối cuộc gọi đến khách hàng...",
              )
            }
          >
            <Icon name="phone" size={18} color={Colors.primary[600]} />
          </TouchableOpacity>
        </View>

        {/* Meta rows */}
        <View style={styles.metaCard}>
          <View style={styles.metaRow}>
            <Icon name="calendar" size={16} color={Colors.primary[500]} />
            <Text style={styles.metaLabel}>Ngày hẹn:</Text>
            <Text style={styles.metaValue}>{job.date}</Text>
          </View>
          <View style={styles.metaRow}>
            <Icon name="clock" size={16} color={Colors.primary[500]} />
            <Text style={styles.metaLabel}>Giờ hẹn:</Text>
            <Text style={styles.metaValue}>{job.time}</Text>
          </View>
          <View style={styles.metaRow}>
            <Icon name="location" size={16} color={Colors.primary[500]} />
            <Text style={styles.metaLabel}>Địa chỉ:</Text>
            <Text style={[styles.metaValue, { flex: 1 }]} numberOfLines={2}>
              {job.address}
            </Text>
          </View>
          <View style={styles.metaRow}>
            <Icon name="earnings" size={16} color={Colors.primary[500]} />
            <Text style={styles.metaLabel}>Hình thức chi phí:</Text>
            <Text
              style={[
                styles.metaValue,
                { color: Colors.primary[600], fontFamily: FontFamily.bold },
              ]}
            >
              Thỏa thuận trực tiếp tại nhà
            </Text>
          </View>
          {job.status === "completed" && (
            <View style={styles.metaRow}>
              <Icon name="check" size={16} color={Colors.primary[500]} />
              <Text style={styles.metaLabel}>Giá cuối:</Text>
              <Text style={styles.metaValue}>
                {job.finalPrice != null ? formatVND(job.finalPrice) : "Chưa ghi nhận"}
              </Text>
            </View>
          )}
        </View>


        {/* Progress & Completion Report */}
        {(job.status === "in_progress" || job.status === "completed") && (
          <View style={styles.photosSection}>
            <Text style={styles.sectionTitle}>Báo cáo tiến độ & Ghi chú</Text>
            {job.status === "in_progress" ? (
              <TextInput
                style={styles.progressInput}
                value={progressNote}
                onChangeText={setProgressNote}
                placeholder="Nhập ghi chú hiện trường, tiến độ công việc..."
                placeholderTextColor={Colors.neutral[400]}
                multiline
                numberOfLines={3}
              />
            ) : (
              <View style={styles.descBox}>
                <Text style={styles.descText}>
                  {job.completionNote || "Không có ghi chú thêm."}
                </Text>
              </View>
            )}
          </View>
        )}

        {/* Completion photos */}
        {(job.status === "in_progress" || job.status === "completed") && (
          <View style={styles.photosSection}>
            <Text style={styles.sectionTitle}>Hình ảnh nghiệm thu</Text>
            <View style={styles.photosRow}>
              {proofPhotos.map((url, i) => (
                <Image key={`${url}-${i}`} source={{ uri: url }} style={styles.photoBox} />
              ))}
              {job.status === "in_progress" && proofPhotos.length < 4 && (
                <TouchableOpacity
                  style={styles.uploadPhotoBtn}
                  onPress={() => void handleAddPhoto()}
                  disabled={photoUploading}
                  activeOpacity={0.7}
                >
                  {photoUploading ? <Text style={styles.uploadText}>Đang tải...</Text> : <>
                    <Icon name="camera" size={22} color={Colors.neutral[400]} />
                    <Text style={styles.uploadText}>Thêm ảnh</Text>
                  </>}
                </TouchableOpacity>
              )}
            </View>
          </View>
        )}
      </ScrollView>

      {/* Footer Actions */}
      <View style={styles.footer}>
        {job.status === "confirmed" || job.status === "provider_on_the_way" || job.status === "arrived" || job.status === "awaiting_approval" ? (
          <Button
            label={job.status === 'confirmed' ? 'Bắt đầu di chuyển' : job.status === 'provider_on_the_way' ? 'Đã đến nơi' : job.status === 'arrived' ? 'Bắt đầu công việc' : 'Tiếp tục công việc'}
            variant="primary"
            size="lg"
            gradient
            fullWidth
            onPress={handleStartJob}
          />
        ) : job.status === "in_progress" ? (
          <Button
            label="Hoàn tất công việc"
            variant="primary"
            size="lg"
            gradient
            fullWidth
            onPress={handleCompleteJob}
          />
        ) : job.status === "pending_confirmation" || job.status === "pending" ? (
          <View style={styles.completedNotice}>
            <Text style={styles.completedNoticeText}>Đơn đang chờ xác nhận của thợ.</Text>
          </View>
        ) : (
          <View style={styles.completedNotice}>
            <Icon name="check" size={18} color={Colors.semantic.success} />
            <Text style={styles.completedNoticeText}>
              Công việc đã hoàn thành xuất sắc
            </Text>
          </View>
        )}
      </View>

      <Modal
        visible={completionModalOpen}
        transparent
        animationType="fade"
        onRequestClose={() => {
          if (!completing) setCompletionModalOpen(false);
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.completionModal} accessibilityRole="alert">
            <Text style={styles.completionModalTitle}>Xác nhận hoàn thành</Text>
            <Text style={styles.completionModalDescription}>
              Chỉ ghi nhận giá cuối nếu hai bên đã thỏa thuận. Bạn có thể để trống.
            </Text>
            <Text style={styles.completionPriceLabel}>Giá cuối đã thỏa thuận (tùy chọn)</Text>
            <TextInput
              style={styles.completionPriceInput}
              value={finalPriceInput}
              onChangeText={(value) => {
                setFinalPriceInput(value);
                setFinalPriceError("");
              }}
              placeholder="Nhập số tiền (VNĐ)"
              placeholderTextColor={Colors.neutral[400]}
              keyboardType="number-pad"
              maxLength={15}
              editable={!completing}
              accessibilityLabel="Giá cuối đã thỏa thuận, tùy chọn"
            />
            {finalPriceError ? (
              <Text style={styles.completionPriceError}>{finalPriceError}</Text>
            ) : null}
            <View style={styles.completionModalActions}>
              <TouchableOpacity
                style={styles.completionCancelButton}
                onPress={() => setCompletionModalOpen(false)}
                disabled={completing}
              >
                <Text style={styles.completionCancelText}>Hủy</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.completionConfirmButton}
                onPress={confirmCompleteJob}
                disabled={completing}
              >
                <Text style={styles.completionConfirmText}>
                  {completing ? "Đang lưu..." : "Hoàn thành"}
                </Text>
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
  scroll: {
    padding: Space.lg,
    paddingBottom: 40,
    gap: Space.md,
  },
  headerCard: {
    backgroundColor: Colors.neutral[0],
    borderRadius: Radius.xl,
    padding: Space.lg,
    borderWidth: 1,
    borderColor: Colors.neutral[200],
    ...Shadow.sm,
  },
  headerTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: Space.md,
  },
  catIconCircle: {
    width: 44,
    height: 44,
    borderRadius: Radius.lg,
    backgroundColor: Colors.primary[50],
    alignItems: "center",
    justifyContent: "center",
  },
  jobTitle: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize.md,
    color: Colors.neutral[900],
  },
  jobCategory: {
    fontFamily: FontFamily.regular,
    fontSize: FontSize.xs,
    color: Colors.neutral[500],
    marginTop: 2,
  },
  descBox: {
    backgroundColor: Colors.neutral[50],
    padding: Space.md,
    borderRadius: Radius.md,
    marginTop: Space.md,
  },
  descText: {
    fontFamily: FontFamily.regular,
    fontSize: FontSize.xs,
    color: Colors.neutral[600],
    lineHeight: 18,
  },
  customerCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.neutral[0],
    borderRadius: Radius.xl,
    padding: Space.md,
    borderWidth: 1,
    borderColor: Colors.neutral[200],
    gap: Space.md,
    ...Shadow.sm,
  },
  customerAvatar: {
    width: 44,
    height: 44,
    borderRadius: Radius.full,
    backgroundColor: Colors.primary[50],
    alignItems: "center",
    justifyContent: "center",
  },
  customerAvatarText: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize.md,
    color: Colors.primary[700],
  },
  customerName: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize.sm,
    color: Colors.neutral[900],
  },
  customerRole: {
    fontFamily: FontFamily.regular,
    fontSize: FontSize.xs,
    color: Colors.neutral[500],
    marginTop: 2,
  },
  circleActionBtn: {
    width: 38,
    height: 38,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: Colors.neutral[200],
    alignItems: "center",
    justifyContent: "center",
  },
  metaCard: {
    backgroundColor: Colors.neutral[0],
    borderRadius: Radius.xl,
    padding: Space.lg,
    borderWidth: 1,
    borderColor: Colors.neutral[200],
    gap: Space.md,
    ...Shadow.sm,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Space.sm,
  },
  metaLabel: {
    fontFamily: FontFamily.medium,
    fontSize: FontSize.xs,
    color: Colors.neutral[500],
    minWidth: 80,
  },
  metaValue: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSize.xs,
    color: Colors.neutral[800],
  },
  progressInput: {
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.neutral[200],
    borderRadius: Radius.lg,
    padding: Space.md,
    fontSize: FontSize.sm,
    fontFamily: FontFamily.regular,
    color: Colors.neutral[800],
    minHeight: 80,
    textAlignVertical: "top",
  },
  modalOverlay: {
    flex: 1,
    justifyContent: "center",
    padding: Space.lg,
    backgroundColor: "rgba(0, 0, 0, 0.55)",
  },
  completionModal: {
    backgroundColor: Colors.neutral[0],
    borderRadius: Radius.xl,
    padding: Space.lg,
    ...Shadow.md,
  },
  completionModalTitle: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize.lg,
    color: Colors.neutral[900],
  },
  completionModalDescription: {
    marginTop: Space.xs,
    fontFamily: FontFamily.regular,
    fontSize: FontSize.xs,
    lineHeight: 18,
    color: Colors.neutral[600],
  },
  completionPriceLabel: {
    marginTop: Space.md,
    marginBottom: Space.xs,
    fontFamily: FontFamily.semiBold,
    fontSize: FontSize.xs,
    color: Colors.neutral[800],
  },
  completionPriceInput: {
    borderWidth: 1,
    borderColor: Colors.neutral[200],
    borderRadius: Radius.md,
    paddingHorizontal: Space.md,
    paddingVertical: Space.sm + 2,
    fontFamily: FontFamily.regular,
    fontSize: FontSize.sm,
    color: Colors.neutral[900],
  },
  completionPriceError: {
    marginTop: Space.xs,
    fontFamily: FontFamily.medium,
    fontSize: FontSize.xs,
    color: Colors.semantic.error,
  },
  completionModalActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: Space.sm,
    marginTop: Space.lg,
  },
  completionCancelButton: {
    paddingHorizontal: Space.md,
    paddingVertical: Space.sm,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.neutral[200],
  },
  completionCancelText: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSize.xs,
    color: Colors.neutral[700],
  },
  completionConfirmButton: {
    paddingHorizontal: Space.md,
    paddingVertical: Space.sm,
    borderRadius: Radius.md,
    backgroundColor: Colors.primary[600],
  },
  completionConfirmText: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize.xs,
    color: Colors.neutral[0],
  },
  photosSection: {
    backgroundColor: Colors.neutral[0],
    borderRadius: Radius.xl,
    padding: Space.lg,
    borderWidth: 1,
    borderColor: Colors.neutral[200],
    ...Shadow.sm,
    gap: Space.sm,
  },
  sectionTitle: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize.sm,
    color: Colors.neutral[800],
  },
  photosRow: {
    flexDirection: "row",
    gap: Space.md,
    marginTop: Space.xs,
  },
  photoBox: {
    width: 64,
    height: 64,
    borderRadius: Radius.lg,
    backgroundColor: Colors.primary[50],
    alignItems: "center",
    justifyContent: "center",
  },
  customerPhoto: {
    width: 84,
    height: 84,
    borderRadius: Radius.lg,
    backgroundColor: Colors.neutral[100],
  },
  uploadPhotoBtn: {
    width: 64,
    height: 64,
    borderRadius: Radius.lg,
    borderWidth: 1.5,
    borderStyle: "dashed",
    borderColor: Colors.neutral[300],
    alignItems: "center",
    justifyContent: "center",
    gap: 2,
  },
  uploadText: {
    fontFamily: FontFamily.medium,
    fontSize: 9,
    color: Colors.neutral[500],
  },
  footer: {
    backgroundColor: Colors.neutral[0],
    paddingHorizontal: Space.xl,
    paddingVertical: Space.md,
    borderTopWidth: 1,
    borderTopColor: Colors.neutral[200],
    ...Shadow.md,
  },
  completedNotice: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: Colors.semantic.successBg,
    paddingVertical: Space.md,
    borderRadius: Radius.lg,
  },
  completedNoticeText: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize.sm,
    color: Colors.semantic.success,
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    padding: 40,
  },
  emptyText: {
    fontFamily: FontFamily.regular,
    fontSize: FontSize.md,
    color: Colors.neutral[500],
  },
});
