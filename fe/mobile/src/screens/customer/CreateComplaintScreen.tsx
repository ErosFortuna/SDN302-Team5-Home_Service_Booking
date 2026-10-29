import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Image,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../types/navigation';
import { useAppStore } from '../../store/useAppStore';
import { ComplaintCategory } from '../../types';
import { Colors } from '../../constants/colors';
import { FontFamily, FontSize } from '../../constants/typography';
import { Radius, Shadow, Space } from '../../constants/spacing';
import { Icon, AppIconKey } from '../../components/ui/Icon';
import { Button } from '../../components/ui/Button';

interface CategoryOption {
  key: ComplaintCategory;
  label: string;
  icon: AppIconKey;
}

const CATEGORIES: CategoryOption[] = [
  { key: 'QUALITY', label: 'Chất lượng kém', icon: 'services' },
  { key: 'LATE_ARRIVAL', label: 'Đến muộn', icon: 'pending' },
  { key: 'NO_SHOW', label: 'Bỏ hẹn / Không đến', icon: 'cancel' },
  { key: 'PRICE', label: 'Giá cả sai lệch', icon: 'payment' },
  { key: 'BEHAVIOR', label: 'Thái độ phục vụ', icon: 'warning' },
  { key: 'DAMAGE', label: 'Gây hư hại', icon: 'error' },
  { key: 'OTHER', label: 'Vấn đề khác', icon: 'info' },
];

const SAMPLE_EVIDENCE = [
  'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?w=500',
  'https://images.unsplash.com/photo-1607472586893-edb57bdc0e39?w=500',
];

export default function CreateComplaintScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<RootStackParamList, 'CreateComplaint'>>();
  const { bookings, createComplaint } = useAppStore();

  const presetBookingId = route.params?.bookingId || (bookings[0]?.id ?? 'b1');
  const [selectedBookingId, setSelectedBookingId] = useState<string>(presetBookingId);
  const [selectedCategory, setSelectedCategory] = useState<ComplaintCategory>('QUALITY');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [evidenceList, setEvidenceList] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const selectedBooking = bookings.find((b) => b.id === selectedBookingId) || bookings[0];

  const handleAddSampleEvidence = () => {
    if (evidenceList.length >= 4) {
      Alert.alert('Giới hạn', 'Bạn chỉ có thể đính kèm tối đa 4 hình ảnh.');
      return;
    }
    const nextImg = SAMPLE_EVIDENCE[evidenceList.length % SAMPLE_EVIDENCE.length];
    setEvidenceList([...evidenceList, nextImg]);
  };

  const handleRemoveEvidence = (index: number) => {
    setEvidenceList(evidenceList.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (!title.trim()) {
      Alert.alert('Thiếu thông tin', 'Vui lòng nhập tóm tắt tiêu đề khiếu nại.');
      return;
    }
    if (description.trim().length < 10) {
      Alert.alert('Mô tả quá ngắn', 'Vui lòng mô tả chi tiết sự việc tối thiểu 10 ký tự.');
      return;
    }

    try {
      setIsSubmitting(true);
      const newComplaint = await createComplaint({
        bookingId: selectedBookingId,
        category: selectedCategory,
        title: title.trim(),
        description: description.trim(),
        evidenceUrls: evidenceList,
      });

      setIsSubmitting(false);
      Alert.alert(
        'Đã gửi khiếu nại thành công',
        'Khiếu nại của bạn đã được ghi nhận. Bộ phận CSKH sẽ xem xét và phản hồi trong 24h.',
        [
          {
            text: 'Xem chi tiết',
            onPress: () => navigation.replace('ComplaintDetail', { complaintId: newComplaint.id }),
          },
          {
            text: 'Danh sách khiếu nại',
            onPress: () => navigation.replace('ComplaintList'),
          },
        ]
      );
    } catch (err: any) {
      setIsSubmitting(false);
      Alert.alert('Lỗi', err.message || 'Không thể gửi khiếu nại. Vui lòng thử lại.');
    }
  };

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
          <Text style={styles.headerTitle}>Tạo khiếu nại dịch vụ</Text>
          <Text style={styles.headerSub}>Bảo vệ quyền lợi & hoàn tiền (KAN-13)</Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Booking Reference Card */}
        <View style={styles.card}>
          <Text style={styles.sectionLabel}>Đơn đặt dịch vụ liên quan</Text>
          {selectedBooking ? (
            <View style={styles.bookingRow}>
              <View style={styles.bookingIconWrap}>
                <Icon name="receipt" size={22} color={Colors.primary[600]} />
              </View>
              <View style={styles.bookingInfo}>
                <Text style={styles.bookingTitle}>{selectedBooking.title}</Text>
                <Text style={styles.bookingMeta}>
                  Mã đơn: #{selectedBooking.id} · {selectedBooking.date}
                </Text>
                <Text style={styles.bookingMeta}>
                  Địa chỉ: {selectedBooking.address}
                </Text>
              </View>
            </View>
          ) : (
            <Text style={styles.noBookingText}>Chưa chọn đơn dịch vụ</Text>
          )}

          {/* Booking selector buttons if multiple */}
          {bookings.length > 1 && (
            <View style={styles.bookingSelectWrap}>
              <Text style={styles.subHint}>Chọn đơn khác nếu cần:</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.hScroll}>
                {bookings.map((b) => (
                  <TouchableOpacity
                    key={b.id}
                    onPress={() => setSelectedBookingId(b.id)}
                    style={[
                      styles.bookingChip,
                      selectedBookingId === b.id && styles.bookingChipActive,
                    ]}
                  >
                    <Text
                      style={[
                        styles.bookingChipText,
                        selectedBookingId === b.id && styles.bookingChipTextActive,
                      ]}
                    >
                      #{b.id} - {b.category}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}
        </View>

        {/* Category Selector */}
        <View style={styles.card}>
          <Text style={styles.sectionLabel}>Loại khiếu nại</Text>
          <Text style={styles.subHint}>Chọn vấn đề bạn gặp phải để xử lý nhanh nhất:</Text>
          <View style={styles.categoryGrid}>
            {CATEGORIES.map((cat) => {
              const isSelected = selectedCategory === cat.key;
              return (
                <TouchableOpacity
                  key={cat.key}
                  onPress={() => setSelectedCategory(cat.key)}
                  activeOpacity={0.8}
                  style={[
                    styles.catChip,
                    isSelected && styles.catChipActive,
                  ]}
                >
                  <Icon
                    name={cat.icon}
                    size={18}
                    color={isSelected ? Colors.neutral[0] : Colors.neutral[700]}
                  />
                  <Text
                    style={[
                      styles.catChipText,
                      isSelected && styles.catChipTextActive,
                    ]}
                  >
                    {cat.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Title Input */}
        <View style={styles.card}>
          <View style={styles.labelRow}>
            <Text style={styles.sectionLabel}>Tiêu đề tóm tắt</Text>
            <Text style={styles.counter}>{title.length}/200</Text>
          </View>
          <TextInput
            style={styles.input}
            placeholder="vd: Thợ làm rò rỉ nước sau khi sửa xong"
            placeholderTextColor={Colors.neutral[400]}
            value={title}
            onChangeText={setTitle}
            maxLength={200}
          />
        </View>

        {/* Description Input */}
        <View style={styles.card}>
          <View style={styles.labelRow}>
            <Text style={styles.sectionLabel}>Mô tả chi tiết sự việc *</Text>
            <Text style={styles.counter}>{description.length}/4000</Text>
          </View>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Nêu rõ thời gian xảy ra, thái độ hoặc hành vi thợ, mức độ ảnh hưởng và yêu cầu bồi thường/khắc phục của bạn..."
            placeholderTextColor={Colors.neutral[400]}
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={5}
            textAlignVertical="top"
            maxLength={4000}
          />
          {description.length > 0 && description.length < 10 && (
            <Text style={styles.errorHint}>Mô tả cần tối thiểu 10 ký tự</Text>
          )}
        </View>

        {/* Evidence Attachments */}
        <View style={styles.card}>
          <View style={styles.labelRow}>
            <Text style={styles.sectionLabel}>Hình ảnh minh chứng</Text>
            <Text style={styles.counter}>{evidenceList.length}/4 ảnh</Text>
          </View>
          <Text style={styles.subHint}>
            Đính kèm ảnh hiện trường hư hỏng hoặc tin nhắn để hỗ trợ giải quyết nhanh hơn.
          </Text>

          <View style={styles.evidenceRow}>
            {evidenceList.map((url, index) => (
              <View key={index} style={styles.thumbWrap}>
                <Image source={{ uri: url }} style={styles.thumb} />
                <TouchableOpacity
                  onPress={() => handleRemoveEvidence(index)}
                  style={styles.removeBadge}
                >
                  <Icon name="close" size={14} color={Colors.neutral[0]} />
                </TouchableOpacity>
              </View>
            ))}

            {evidenceList.length < 4 && (
              <TouchableOpacity
                onPress={handleAddSampleEvidence}
                style={styles.addPhotoBtn}
                activeOpacity={0.7}
              >
                <Icon name="camera" size={22} color={Colors.primary[600]} />
                <Text style={styles.addPhotoText}>Thêm ảnh</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Policy Guarantee Note */}
        <View style={styles.guaranteeCard}>
          <Icon name="shieldCheck" size={24} color={Colors.primary[600]} />
          <View style={styles.guaranteeContent}>
            <Text style={styles.guaranteeTitle}>Chính sách bảo hành & hoàn tiền</Text>
            <Text style={styles.guaranteeText}>
              Đội ngũ CSKH cam kết bảo vệ khách hàng 100%. Nếu thợ vi phạm hợp đồng hoặc làm hỏng thiết bị, hệ thống sẽ hỗ trợ bồi thường hoặc cử thợ khác xử lý miễn phí.
            </Text>
          </View>
        </View>

        {/* Submit Button */}
        <Button
          label="Gửi khiếu nại ngay"
          variant="primary"
          size="lg"
          fullWidth
          loading={isSubmitting}
          onPress={handleSubmit}
          leftIcon={<Icon name="warning" size={20} color={Colors.neutral[900]} />}
        />

        <View style={{ height: Space['2xl'] }} />
      </ScrollView>
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
    fontSize: FontSize.lg,
    color: Colors.neutral[900],
  },
  headerSub: {
    fontFamily: FontFamily.regular,
    fontSize: FontSize.xs,
    color: Colors.neutral[500],
    marginTop: 2,
  },
  scroll: {
    padding: Space.md,
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
  sectionLabel: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize.md,
    color: Colors.neutral[800],
  },
  subHint: {
    fontFamily: FontFamily.regular,
    fontSize: FontSize.xs,
    color: Colors.neutral[500],
    marginTop: Space.xs,
    marginBottom: Space.sm,
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Space.xs,
  },
  counter: {
    fontFamily: FontFamily.medium,
    fontSize: FontSize.xs,
    color: Colors.neutral[400],
  },
  bookingRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: Colors.neutral[50],
    borderRadius: Radius.lg,
    padding: Space.sm,
    marginTop: Space.sm,
  },
  bookingIconWrap: {
    width: 40,
    height: 40,
    borderRadius: Radius.md,
    backgroundColor: Colors.primary[100],
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Space.sm,
  },
  bookingInfo: {
    flex: 1,
  },
  bookingTitle: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize.sm,
    color: Colors.neutral[900],
  },
  bookingMeta: {
    fontFamily: FontFamily.regular,
    fontSize: FontSize.xs,
    color: Colors.neutral[500],
    marginTop: 2,
  },
  noBookingText: {
    fontFamily: FontFamily.regular,
    fontSize: FontSize.sm,
    color: Colors.neutral[500],
    fontStyle: 'italic',
    marginTop: Space.xs,
  },
  bookingSelectWrap: {
    marginTop: Space.sm,
  },
  hScroll: {
    flexDirection: 'row',
  },
  bookingChip: {
    paddingHorizontal: Space.sm,
    paddingVertical: 6,
    borderRadius: Radius.full,
    backgroundColor: Colors.neutral[100],
    borderWidth: 1,
    borderColor: Colors.neutral[300],
    marginRight: Space.xs,
  },
  bookingChipActive: {
    backgroundColor: Colors.primary[50],
    borderColor: Colors.primary[600],
  },
  bookingChipText: {
    fontFamily: FontFamily.medium,
    fontSize: FontSize.xs,
    color: Colors.neutral[700],
  },
  bookingChipTextActive: {
    fontFamily: FontFamily.bold,
    color: Colors.primary[700],
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Space.xs,
  },
  catChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Space.sm,
    paddingVertical: 8,
    borderRadius: Radius.lg,
    backgroundColor: Colors.neutral[100],
    borderWidth: 1,
    borderColor: Colors.neutral[200],
    gap: 6,
  },
  catChipActive: {
    backgroundColor: Colors.primary[600],
    borderColor: Colors.primary[700],
  },
  catChipText: {
    fontFamily: FontFamily.medium,
    fontSize: FontSize.xs,
    color: Colors.neutral[800],
  },
  catChipTextActive: {
    fontFamily: FontFamily.bold,
    color: Colors.neutral[0],
  },
  input: {
    fontFamily: FontFamily.regular,
    fontSize: FontSize.sm,
    color: Colors.neutral[900],
    borderWidth: 1,
    borderColor: Colors.neutral[300],
    borderRadius: Radius.lg,
    paddingHorizontal: Space.md,
    paddingVertical: Space.sm,
    backgroundColor: Colors.neutral[50],
  },
  textArea: {
    minHeight: 110,
    lineHeight: 20,
  },
  errorHint: {
    fontFamily: FontFamily.regular,
    fontSize: FontSize.xs,
    color: Colors.semantic.error,
    marginTop: 4,
  },
  evidenceRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Space.sm,
    marginTop: Space.xs,
  },
  thumbWrap: {
    position: 'relative',
    width: 72,
    height: 72,
    borderRadius: Radius.md,
    overflow: 'hidden',
  },
  thumb: {
    width: '100%',
    height: '100%',
  },
  removeBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 20,
    height: 20,
    borderRadius: Radius.full,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addPhotoBtn: {
    width: 72,
    height: 72,
    borderRadius: Radius.md,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: Colors.primary[400],
    backgroundColor: Colors.primary[50],
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  addPhotoText: {
    fontFamily: FontFamily.medium,
    fontSize: 10,
    color: Colors.primary[700],
  },
  guaranteeCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: Colors.primary[50],
    borderWidth: 1,
    borderColor: Colors.primary[200],
    borderRadius: Radius.xl,
    padding: Space.md,
    marginBottom: Space.lg,
    gap: Space.sm,
  },
  guaranteeContent: {
    flex: 1,
  },
  guaranteeTitle: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize.sm,
    color: Colors.primary[800],
  },
  guaranteeText: {
    fontFamily: FontFamily.regular,
    fontSize: FontSize.xs,
    color: Colors.primary[900],
    marginTop: 2,
    lineHeight: 18,
  },
});
