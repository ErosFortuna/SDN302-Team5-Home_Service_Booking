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
} from 'react-native';
import { Colors } from '../../constants/colors';
import { FontFamily, FontSize } from '../../constants/typography';
import { Radius, Space } from '../../constants/spacing';
import { Icon, Button } from '../../components/ui';
import { Header } from '../../components/layout/Header';
import { Input } from '../../components/form/Input';

const CATEGORIES = [
  { id: 'plumbing', title: 'Sửa ống nước', icon: 'plumbing' as const },
  { id: 'electrical', title: 'Điện dân dụng', icon: 'electrical' as const },
  { id: 'cleaning', title: 'Vệ sinh nhà', icon: 'cleaning' as const },
  { id: 'acRepair', title: 'Điều hoà', icon: 'acRepair' as const },
];

import { RootStackNavigationProp } from '../../types/navigation';
import { CompositeNavigationProp } from '@react-navigation/native';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { MainTabParamList, RootStackParamList } from '../../types/navigation';

type Props = {
  navigation: CompositeNavigationProp<
    RootStackNavigationProp<'Booking'>,
    BottomTabNavigationProp<MainTabParamList>
  >;
};

export default function BookingScreen({ navigation }: Props) {
  const [step, setStep] = useState<number>(1);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [selectedDate, setSelectedDate] = useState<string>('today');

  return (
    <SafeAreaView style={styles.safe}>
      {/* ── Header ── */}
      <Header title="Đặt dịch vụ mới" showBack />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.scroll}>
          
          {/* ── Step Progress Indicator ── */}
          <View style={styles.progressContainer}>
            {[1, 2, 3].map((s) => (
              <React.Fragment key={s}>
                <View
                  style={[
                    styles.stepCircle,
                    step >= s ? styles.stepCircleActive : styles.stepCircleInactive,
                  ]}
                >
                  <Text
                    style={[
                      styles.stepText,
                      step >= s ? styles.stepTextActive : styles.stepTextInactive,
                    ]}
                  >
                    {s}
                  </Text>
                </View>
                {s < 3 && (
                  <View
                    style={[
                      styles.stepLine,
                      step > s ? styles.stepLineActive : styles.stepLineInactive,
                    ]}
                  />
                )}
              </React.Fragment>
            ))}
          </View>

          {/* ── Step 1: Category ── */}
          {step === 1 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Chọn loại dịch vụ</Text>
              <View style={styles.grid}>
                {CATEGORIES.map((cat) => (
                  <TouchableOpacity
                    key={cat.id}
                    style={[
                      styles.categoryCard,
                      selectedCategory === cat.id && styles.categoryCardActive,
                    ]}
                    onPress={() => setSelectedCategory(cat.id)}
                  >
                    <View
                      style={[
                        styles.iconWrapper,
                        selectedCategory === cat.id && styles.iconWrapperActive,
                      ]}
                    >
                      <Icon
                        name={cat.icon}
                        size={28}
                        color={
                          selectedCategory === cat.id
                            ? Colors.primary[600]
                            : Colors.neutral[500]
                        }
                      />
                    </View>
                    <Text
                      style={[
                        styles.categoryTitle,
                        selectedCategory === cat.id && styles.categoryTitleActive,
                      ]}
                    >
                      {cat.title}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          {/* ── Step 2: Details ── */}
          {step === 2 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Mô tả sự cố</Text>
              <Input
                placeholder="Ví dụ: Máy lạnh không làm mát, có tiếng ồn..."
                multiline
                numberOfLines={4}
                style={{ height: 100 }}
                textAlignVertical="top"
              />
              
              <TouchableOpacity style={styles.attachBtn} accessibilityLabel="Thêm hình ảnh">
                <Icon name="camera" size={20} color={Colors.primary[600]} />
                <Text style={styles.attachText}>Thêm hình ảnh (Tùy chọn)</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* ── Step 3: Schedule & Location ── */}
          {step === 3 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Thời gian & Địa điểm</Text>
              
              <View style={styles.dateSelector}>
                {['today', 'tomorrow', 'pick'].map((dateOpt) => (
                  <TouchableOpacity
                    key={dateOpt}
                    style={[
                      styles.dateChip,
                      selectedDate === dateOpt && styles.dateChipActive,
                    ]}
                    onPress={() => setSelectedDate(dateOpt)}
                  >
                    <Text
                      style={[
                        styles.dateText,
                        selectedDate === dateOpt && styles.dateTextActive,
                      ]}
                    >
                      {dateOpt === 'today' && 'Hôm nay'}
                      {dateOpt === 'tomorrow' && 'Ngày mai'}
                      {dateOpt === 'pick' && 'Chọn ngày'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Input
                placeholder="Chọn giờ (VD: 14:00)"
                leftIcon="clock"
                style={{ marginTop: Space.md }}
              />

              <Input
                placeholder="Địa chỉ của bạn"
                leftIcon="location"
                defaultValue="123 Đường Nguyễn Văn Linh, Q7, TP.HCM"
                style={{ marginTop: Space.md }}
              />
            </View>
          )}

        </ScrollView>
      </KeyboardAvoidingView>

      {/* ── Footer / CTA ── */}
      <View style={styles.footer}>
        {step === 3 && (
          <View style={styles.priceRow}>
            <Text style={styles.priceLabel}>Phí kiểm tra (Dự kiến)</Text>
            <Text style={styles.priceValue}>150.000đ</Text>
          </View>
        )}
        <View style={{ flexDirection: 'row', gap: Space.md }}>
          {step > 1 && (
            <Button
              label="Quay lại"
              variant="outline"
              size="lg"
              style={{ flex: 1 }}
              onPress={() => setStep(step - 1)}
            />
          )}
          <Button
            label={step < 3 ? "Tiếp tục" : "Xác nhận gửi yêu cầu"}
            variant="primary"
            size="lg"
            gradient
            style={{ flex: step > 1 ? 1 : 1 }}
            onPress={() => {
              if (step < 3) {
                setStep(step + 1);
              } else {
                navigation.navigate('Bookings');
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
  scroll: {
    padding: Space.xl,
    paddingBottom: Space['3xl'],
  },
  section: {
    marginBottom: Space['2xl'],
  },
  sectionTitle: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSize.lg,
    color: Colors.neutral[900],
    marginBottom: Space.lg,
  },

  // Progress Indicator
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Space['2xl'],
    paddingHorizontal: Space.xl,
  },
  stepCircle: {
    width: 32,
    height: 32,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepCircleActive: {
    backgroundColor: Colors.primary[500],
  },
  stepCircleInactive: {
    backgroundColor: Colors.neutral[200],
  },
  stepText: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize.sm,
  },
  stepTextActive: {
    color: Colors.neutral[0],
  },
  stepTextInactive: {
    color: Colors.neutral[500],
  },
  stepLine: {
    flex: 1,
    height: 2,
    marginHorizontal: Space.xs,
  },
  stepLineActive: {
    backgroundColor: Colors.primary[500],
  },
  stepLineInactive: {
    backgroundColor: Colors.neutral[200],
  },

  // Category Grid
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Space.md,
  },
  categoryCard: {
    width: '47%',
    backgroundColor: Colors.neutral[0],
    borderRadius: Radius.lg,
    padding: Space.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.neutral[200],
  },
  categoryCardActive: {
    borderColor: Colors.primary[500],
    backgroundColor: Colors.primary[50],
  },
  iconWrapper: {
    width: 56,
    height: 56,
    borderRadius: Radius.full,
    backgroundColor: Colors.neutral[100],
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Space.sm,
  },
  iconWrapperActive: {
    backgroundColor: Colors.primary[100],
  },
  categoryTitle: {
    fontFamily: FontFamily.medium,
    fontSize: FontSize.sm,
    color: Colors.neutral[700],
    textAlign: 'center',
  },
  categoryTitleActive: {
    color: Colors.primary[700],
    fontFamily: FontFamily.semiBold,
  },

  // Attach button
  attachBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Space.sm,
    paddingVertical: Space.sm,
  },
  attachText: {
    fontFamily: FontFamily.medium,
    fontSize: FontSize.sm,
    color: Colors.primary[600],
  },

  // Date Selector
  dateSelector: {
    flexDirection: 'row',
    gap: Space.sm,
  },
  dateChip: {
    flex: 1,
    paddingVertical: Space.sm,
    alignItems: 'center',
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: Colors.neutral[200],
    backgroundColor: Colors.neutral[0],
  },
  dateChipActive: {
    borderColor: Colors.primary[500],
    backgroundColor: Colors.primary[50],
  },
  dateText: {
    fontFamily: FontFamily.medium,
    fontSize: FontSize.sm,
    color: Colors.neutral[600],
  },
  dateTextActive: {
    color: Colors.primary[700],
  },

  // Footer
  footer: {
    backgroundColor: Colors.neutral[0],
    padding: Space.xl,
    paddingBottom: Space['2xl'],
    borderTopWidth: 1,
    borderTopColor: Colors.neutral[200],
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Space.lg,
  },
  priceLabel: {
    fontFamily: FontFamily.medium,
    fontSize: FontSize.md,
    color: Colors.neutral[600],
  },
  priceValue: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize.xl,
    color: Colors.neutral[900],
  },
});
