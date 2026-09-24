import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../types/navigation';
import { useAppStore } from '../../store/useAppStore';
import { CATEGORIES, formatVND } from '../../constants/mockData';
import { ServiceCategory } from '../../types';
import { Header } from '../../components/layout/Header';
import { Input } from '../../components/form/Input';
import { Button, Icon } from '../../components/ui';
import { Colors } from '../../constants/colors';
import { FontFamily, FontSize } from '../../constants/typography';
import { Radius, Shadow, Space } from '../../constants/spacing';

type Props = NativeStackScreenProps<RootStackParamList, 'Booking'>;

const STEPS = ['Dịch vụ', 'Thời gian', 'Ngân sách', 'Xác nhận'];
const TIME_SLOTS = ['08:00', '10:00', '13:00', '15:00', '17:00'];
const DATES = [
  { label: 'Hôm nay', sub: '23/09' },
  { label: 'Ngày mai', sub: '24/09' },
  { label: 'Thứ Sáu', sub: '25/09' },
  { label: 'Thứ Bảy', sub: '26/09' },
];

export default function BookingScreen({ route, navigation }: Props) {
  const { submitBooking } = useAppStore();

  const [step, setStep] = useState<number>(0);
  const [category, setCategory] = useState<ServiceCategory>('Cleaning');
  const [title, setTitle] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [dateIdx, setDateIdx] = useState<number>(0);
  const [time, setTime] = useState<string>(TIME_SLOTS[1]);
  const [address, setAddress] = useState<string>('12 Nguyễn Huệ, Quận 1, TP.HCM');
  const [photos, setPhotos] = useState<number>(1);
  const [budget, setBudget] = useState<number>(500000);

  const canNext =
    step === 0 ? title.trim().length > 0 : step === 1 ? !!time && !!address : true;

  const handleSubmit = () => {
    const finalTitle = title.trim() || `Dịch vụ ${category}`;
    submitBooking({
      category,
      title: finalTitle,
      description: description.trim(),
      date: `${DATES[dateIdx].sub}/2026`,
      time,
      address,
      budget,
      photos,
    });

    Alert.alert(
      'Gửi yêu cầu thành công!',
      'Yêu cầu của bạn đã được gửi đến các thợ uy tín trong khu vực. Bạn có thể theo dõi tiến độ trong mục Lịch đặt.',
      [
        {
          text: 'Xem lịch đặt',
          onPress: () => navigation.navigate('MainTabs'),
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.safe}>
      <Header
        title="Đặt dịch vụ mới"
        subtitle={`Bước ${step + 1} / 4: ${STEPS[step]}`}
        showBack
      />

      {/* Progress Bar */}
      <View style={styles.progressContainer}>
        {STEPS.map((s, idx) => {
          const isDone = idx <= step;
          return (
            <View key={s} style={styles.progressItem}>
              <View
                style={[
                  styles.progressBar,
                  isDone ? styles.progressBarDone : styles.progressBarPending,
                ]}
              />
              <Text
                style={[
                  styles.progressLabel,
                  isDone ? styles.progressLabelDone : styles.progressLabelPending,
                ]}
              >
                {s}
              </Text>
            </View>
          );
        })}
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
        >
          {/* STEP 0: Chọn dịch vụ & mô tả */}
          {step === 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>1. Chọn loại dịch vụ</Text>
              <View style={styles.categoryGrid}>
                {CATEGORIES.map((c) => {
                  const isSelected = category === c.name;
                  return (
                    <TouchableOpacity
                      key={c.name}
                      style={[
                        styles.catCard,
                        isSelected && styles.catCardSelected,
                      ]}
                      onPress={() => setCategory(c.name)}
                      activeOpacity={0.8}
                    >
                      <View
                        style={[
                          styles.catIconWrapper,
                          { backgroundColor: isSelected ? c.color : c.bgColor },
                        ]}
                      >
                        <Icon
                          name={c.iconName}
                          size={24}
                          color={isSelected ? Colors.neutral[0] : c.color}
                        />
                      </View>
                      <Text
                        style={[
                          styles.catTitle,
                          isSelected && styles.catTitleSelected,
                        ]}
                      >
                        {c.vietnameseTitle}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <Text style={[styles.sectionTitle, { marginTop: Space.xl }]}>
                2. Bạn đang gặp sự cố gì?
              </Text>
              <Input
                placeholder="VD: Rò rỉ nước bồn rửa chén, máy lạnh kêu to..."
                value={title}
                onChangeText={setTitle}
              />

              <Text style={[styles.sectionTitle, { marginTop: Space.lg }]}>
                3. Mô tả chi tiết để thợ báo giá chính xác
              </Text>
              <Input
                placeholder="Thêm mô tả về tình trạng, thời gian xuất hiện sự cố..."
                multiline
                numberOfLines={4}
                style={{ height: 96, textAlignVertical: 'top' }}
                value={description}
                onChangeText={setDescription}
              />
            </View>
          )}

          {/* STEP 1: Lịch hẹn & Địa điểm */}
          {step === 1 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Chọn ngày phục vụ</Text>
              <View style={styles.dateGrid}>
                {DATES.map((d, idx) => {
                  const isSelected = dateIdx === idx;
                  return (
                    <TouchableOpacity
                      key={d.sub}
                      style={[
                        styles.dateChip,
                        isSelected && styles.dateChipSelected,
                      ]}
                      onPress={() => setDateIdx(idx)}
                      activeOpacity={0.7}
                    >
                      <Text
                        style={[
                          styles.dateLabel,
                          isSelected && styles.dateLabelSelected,
                        ]}
                      >
                        {d.label}
                      </Text>
                      <Text
                        style={[
                          styles.dateSub,
                          isSelected && styles.dateSubSelected,
                        ]}
                      >
                        {d.sub}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <Text style={[styles.sectionTitle, { marginTop: Space.xl }]}>
                Chọn khung giờ mong muốn
              </Text>
              <View style={styles.timeSlotsRow}>
                {TIME_SLOTS.map((slot) => {
                  const isSelected = time === slot;
                  return (
                    <TouchableOpacity
                      key={slot}
                      style={[
                        styles.timeChip,
                        isSelected && styles.timeChipSelected,
                      ]}
                      onPress={() => setTime(slot)}
                      activeOpacity={0.7}
                    >
                      <Text
                        style={[
                          styles.timeChipText,
                          isSelected && styles.timeChipTextSelected,
                        ]}
                      >
                        {slot}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <Text style={[styles.sectionTitle, { marginTop: Space.xl }]}>
                Địa chỉ của bạn
              </Text>
              <Input
                placeholder="Số nhà, tên đường, phường, quận..."
                value={address}
                onChangeText={setAddress}
                leftIcon="location"
              />

              <View style={styles.mapPreview}>
                <Icon name="map" size={24} color={Colors.primary[500]} />
                <Text style={styles.mapPreviewText}>Bản đồ định vị chính xác</Text>
              </View>
            </View>
          )}

          {/* STEP 2: Ảnh & Ngân sách */}
          {step === 2 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>
                Đính kèm hình ảnh sự cố (Tùy chọn)
              </Text>
              <View style={styles.photoRow}>
                {Array.from({ length: photos }).map((_, i) => (
                  <View key={i} style={styles.photoThumbnail}>
                    <Icon name="image" size={24} color={Colors.primary[500]} />
                    <TouchableOpacity
                      style={styles.removePhotoBtn}
                      onPress={() => setPhotos(Math.max(0, photos - 1))}
                    >
                      <Icon name="close" size={12} color={Colors.neutral[0]} />
                    </TouchableOpacity>
                  </View>
                ))}
                {photos < 4 && (
                  <TouchableOpacity
                    style={styles.addPhotoBtn}
                    onPress={() => setPhotos(photos + 1)}
                    activeOpacity={0.7}
                  >
                    <Icon name="camera" size={24} color={Colors.neutral[400]} />
                    <Text style={styles.addPhotoText}>Thêm ảnh</Text>
                  </TouchableOpacity>
                )}
              </View>

              <Text style={[styles.sectionTitle, { marginTop: Space.xl }]}>
                Dự trù ngân sách của bạn
              </Text>
              <View style={styles.budgetCard}>
                <Text style={styles.budgetValueDisplay}>{formatVND(budget)}</Text>
                <View style={styles.stepperControl}>
                  <TouchableOpacity
                    style={styles.budgetStepBtn}
                    onPress={() => setBudget(Math.max(100000, budget - 50000))}
                  >
                    <Text style={styles.budgetStepText}>− 50k</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.budgetStepBtn}
                    onPress={() => setBudget(budget + 50000)}
                  >
                    <Text style={styles.budgetStepText}>+ 50k</Text>
                  </TouchableOpacity>
                </View>
                <View style={styles.budgetChips}>
                  {[300000, 500000, 800000, 1200000].map((preset) => (
                    <TouchableOpacity
                      key={preset}
                      style={[
                        styles.presetChip,
                        budget === preset && styles.presetChipActive,
                      ]}
                      onPress={() => setBudget(preset)}
                    >
                      <Text
                        style={[
                          styles.presetChipText,
                          budget === preset && styles.presetChipTextActive,
                        ]}
                      >
                        {preset / 1000}k
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </View>
          )}

          {/* STEP 3: Xem lại & Xác nhận */}
          {step === 3 && (
            <View style={styles.section}>
              <View style={styles.reviewCard}>
                <View style={styles.reviewHeader}>
                  <View style={styles.reviewIconBg}>
                    <Icon name="wrench" size={24} color={Colors.primary[600]} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.reviewTitle}>
                      {title || `Dịch vụ ${category}`}
                    </Text>
                    <Text style={styles.reviewCat}>{category}</Text>
                  </View>
                </View>

                <View style={styles.reviewDivider} />

                <View style={styles.reviewRow}>
                  <Text style={styles.reviewLabel}>Thời gian</Text>
                  <Text style={styles.reviewVal}>
                    {DATES[dateIdx].sub} · Lúc {time}
                  </Text>
                </View>
                <View style={styles.reviewRow}>
                  <Text style={styles.reviewLabel}>Địa điểm</Text>
                  <Text style={styles.reviewVal} numberOfLines={2}>
                    {address}
                  </Text>
                </View>
                <View style={styles.reviewRow}>
                  <Text style={styles.reviewLabel}>Ảnh đính kèm</Text>
                  <Text style={styles.reviewVal}>{photos} hình ảnh</Text>
                </View>
                <View style={styles.reviewRow}>
                  <Text style={styles.reviewLabel}>Ngân sách dự kiến</Text>
                  <Text style={[styles.reviewVal, { color: Colors.primary[600] }]}>
                    {formatVND(budget)}
                  </Text>
                </View>

                {description ? (
                  <View style={styles.reviewDescBox}>
                    <Text style={styles.reviewDescText}>&ldquo;{description}&rdquo;</Text>
                  </View>
                ) : null}
              </View>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Footer Navigation Buttons */}
      <View style={styles.footer}>
        <View style={styles.footerRow}>
          {step > 0 && (
            <Button
              label="Quay lại"
              variant="outline"
              size="lg"
              style={{ flex: 1 }}
              onPress={() => setStep(step - 1)}
            />
          )}
          <Button
            label={step < 3 ? 'Tiếp tục' : 'Xác nhận gửi yêu cầu'}
            variant="primary"
            size="lg"
            gradient
            disabled={!canNext}
            style={{ flex: step > 0 ? 1.8 : 1 }}
            onPress={() => {
              if (step < 3) {
                setStep(step + 1);
              } else {
                handleSubmit();
              }
            }}
          />
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: Colors.neutral[50],
  },
  progressContainer: {
    flexDirection: 'row',
    paddingHorizontal: Space.xl,
    paddingVertical: Space.sm,
    backgroundColor: Colors.neutral[0],
    borderBottomWidth: 1,
    borderBottomColor: Colors.neutral[200],
    gap: Space.sm,
  },
  progressItem: {
    flex: 1,
    gap: 4,
  },
  progressBar: {
    height: 4,
    borderRadius: Radius.full,
  },
  progressBarDone: {
    backgroundColor: Colors.primary[500],
  },
  progressBarPending: {
    backgroundColor: Colors.neutral[200],
  },
  progressLabel: {
    fontSize: 10,
    fontFamily: FontFamily.medium,
  },
  progressLabelDone: {
    color: Colors.primary[600],
    fontFamily: FontFamily.bold,
  },
  progressLabelPending: {
    color: Colors.neutral[400],
  },
  scroll: {
    padding: Space.xl,
    paddingBottom: 60,
  },
  section: {
    gap: Space.sm,
  },
  sectionTitle: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize.md,
    color: Colors.neutral[900],
    marginBottom: Space.xs,
  },
  // Categories
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Space.sm,
  },
  catCard: {
    width: '48%',
    backgroundColor: Colors.neutral[0],
    borderRadius: Radius.xl,
    padding: Space.md,
    alignItems: 'center',
    gap: Space.sm,
    borderWidth: 1.5,
    borderColor: Colors.neutral[200],
    ...Shadow.sm,
  },
  catCardSelected: {
    borderColor: Colors.primary[500],
    backgroundColor: Colors.primary[50],
  },
  catIconWrapper: {
    width: 48,
    height: 48,
    borderRadius: Radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  catTitle: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSize.xs,
    color: Colors.neutral[700],
    textAlign: 'center',
  },
  catTitleSelected: {
    color: Colors.primary[700],
    fontFamily: FontFamily.bold,
  },
  // Dates
  dateGrid: {
    flexDirection: 'row',
    gap: Space.sm,
  },
  dateChip: {
    flex: 1,
    paddingVertical: Space.sm + 2,
    borderRadius: Radius.lg,
    backgroundColor: Colors.neutral[0],
    borderWidth: 1,
    borderColor: Colors.neutral[200],
    alignItems: 'center',
  },
  dateChipSelected: {
    borderColor: Colors.primary[500],
    backgroundColor: Colors.primary[50],
  },
  dateLabel: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize.xs,
    color: Colors.neutral[700],
  },
  dateLabelSelected: {
    color: Colors.primary[600],
  },
  dateSub: {
    fontFamily: FontFamily.regular,
    fontSize: 10,
    color: Colors.neutral[400],
    marginTop: 2,
  },
  dateSubSelected: {
    color: Colors.primary[500],
  },
  // Time slots
  timeSlotsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Space.sm,
  },
  timeChip: {
    paddingHorizontal: Space.lg,
    paddingVertical: Space.sm,
    borderRadius: Radius.full,
    backgroundColor: Colors.neutral[0],
    borderWidth: 1,
    borderColor: Colors.neutral[200],
  },
  timeChipSelected: {
    borderColor: Colors.primary[500],
    backgroundColor: Colors.primary[50],
  },
  timeChipText: {
    fontFamily: FontFamily.medium,
    fontSize: FontSize.xs,
    color: Colors.neutral[700],
  },
  timeChipTextSelected: {
    color: Colors.primary[700],
    fontFamily: FontFamily.bold,
  },
  mapPreview: {
    height: 80,
    borderRadius: Radius.xl,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: Colors.primary[300],
    backgroundColor: Colors.primary[50],
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    marginTop: Space.md,
  },
  mapPreviewText: {
    fontFamily: FontFamily.medium,
    fontSize: FontSize.xs,
    color: Colors.primary[700],
  },
  // Photos
  photoRow: {
    flexDirection: 'row',
    gap: Space.md,
  },
  photoThumbnail: {
    width: 72,
    height: 72,
    borderRadius: Radius.xl,
    backgroundColor: Colors.primary[50],
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  removePhotoBtn: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: Colors.neutral[800],
    width: 20,
    height: 20,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addPhotoBtn: {
    width: 72,
    height: 72,
    borderRadius: Radius.xl,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: Colors.neutral[300],
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  addPhotoText: {
    fontFamily: FontFamily.medium,
    fontSize: 10,
    color: Colors.neutral[500],
  },
  // Budget
  budgetCard: {
    backgroundColor: Colors.neutral[0],
    borderRadius: Radius.xl,
    padding: Space.lg,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.neutral[200],
    ...Shadow.sm,
  },
  budgetValueDisplay: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize['3xl'],
    color: Colors.primary[600],
    marginVertical: Space.sm,
  },
  stepperControl: {
    flexDirection: 'row',
    gap: Space.md,
    marginTop: Space.sm,
  },
  budgetStepBtn: {
    backgroundColor: Colors.neutral[100],
    paddingHorizontal: Space.lg,
    paddingVertical: Space.sm,
    borderRadius: Radius.full,
  },
  budgetStepText: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize.xs,
    color: Colors.neutral[800],
  },
  budgetChips: {
    flexDirection: 'row',
    gap: Space.sm,
    marginTop: Space.lg,
  },
  presetChip: {
    paddingHorizontal: Space.md,
    paddingVertical: 4,
    borderRadius: Radius.full,
    backgroundColor: Colors.neutral[100],
  },
  presetChipActive: {
    backgroundColor: Colors.primary[500],
  },
  presetChipText: {
    fontFamily: FontFamily.semiBold,
    fontSize: 11,
    color: Colors.neutral[600],
  },
  presetChipTextActive: {
    color: Colors.neutral[0],
  },
  // Review
  reviewCard: {
    backgroundColor: Colors.neutral[0],
    borderRadius: Radius.xl,
    padding: Space.lg,
    borderWidth: 1,
    borderColor: Colors.neutral[200],
    ...Shadow.sm,
    gap: Space.md,
  },
  reviewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Space.md,
  },
  reviewIconBg: {
    width: 48,
    height: 48,
    borderRadius: Radius.lg,
    backgroundColor: Colors.primary[50],
    alignItems: 'center',
    justifyContent: 'center',
  },
  reviewTitle: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize.md,
    color: Colors.neutral[900],
  },
  reviewCat: {
    fontFamily: FontFamily.regular,
    fontSize: FontSize.xs,
    color: Colors.neutral[500],
    marginTop: 2,
  },
  reviewDivider: {
    height: 1,
    backgroundColor: Colors.neutral[100],
  },
  reviewRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  reviewLabel: {
    fontFamily: FontFamily.regular,
    fontSize: FontSize.xs,
    color: Colors.neutral[500],
  },
  reviewVal: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSize.xs,
    color: Colors.neutral[800],
    maxWidth: '65%',
    textAlign: 'right',
  },
  reviewDescBox: {
    backgroundColor: Colors.neutral[50],
    padding: Space.md,
    borderRadius: Radius.md,
    marginTop: Space.xs,
  },
  reviewDescText: {
    fontFamily: FontFamily.regular,
    fontSize: FontSize.xs,
    color: Colors.neutral[600],
    fontStyle: 'italic',
  },
  footer: {
    backgroundColor: Colors.neutral[0],
    paddingHorizontal: Space.xl,
    paddingVertical: Space.md,
    borderTopWidth: 1,
    borderTopColor: Colors.neutral[200],
    ...Shadow.md,
  },
  footerRow: {
    flexDirection: 'row',
    gap: Space.md,
  },
});
