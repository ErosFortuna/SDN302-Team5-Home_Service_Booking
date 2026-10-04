import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../types/navigation';
import { useAppStore } from '../../store/useAppStore';
import { formatVND } from '../../constants/mockData';
import { Header } from '../../components/layout/Header';
import { Button, Icon } from '../../components/ui';
import { Colors } from '../../constants/colors';
import { FontFamily, FontSize } from '../../constants/typography';
import { Radius, Shadow, Space } from '../../constants/spacing';

type Props = NativeStackScreenProps<RootStackParamList, 'QuoteSubmit'>;

const ARRIVAL_OPTIONS = [
  'Hôm nay, càng sớm càng tốt',
  'Hôm nay, 16:00',
  'Sáng mai, 08:30',
  'Chiều mai, 14:00',
];

export default function QuoteSubmitScreen({ route, navigation }: Props) {
  const { requestId } = route.params;
  const { jobRequests, submitProviderQuote } = useAppStore();

  const request = jobRequests.find((r) => r.id === requestId);

  const [laborFee, setLaborFee] = useState<number>(250000);
  const [materialFee, setMaterialFee] = useState<number>(100000);
  const [arrival, setArrival] = useState<string>(ARRIVAL_OPTIONS[0]);

  if (!request) {
    return (
      <SafeAreaView style={styles.safe}>
        <Header title="Gửi báo giá" showBack />
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>Không tìm thấy thông tin yêu cầu này.</Text>
        </View>
      </SafeAreaView>
    );
  }

  const total = laborFee + materialFee;

  const handleSubmit = () => {
    submitProviderQuote(request.id, {
      laborFee,
      materialFee,
      arrival,
    });
    Alert.alert(
      'Báo giá thành công!',
      `Đã gửi báo giá ${formatVND(total)} đến khách hàng ${request.customerName}.`,
      [
        {
          text: 'Về danh sách',
          onPress: () => navigation.goBack(),
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.safe}>
      <Header title="Gửi báo giá" subtitle={request.title} showBack />

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Request summary */}
        <View style={styles.summaryCard}>
          <Text style={styles.summaryTitle}>{request.title}</Text>
          <Text style={styles.summaryDesc}>{request.description}</Text>
          <View style={styles.summaryMetaRow}>
            <View style={styles.metaItem}>
              <Icon name="location" size={13} color={Colors.neutral[500]} />
              <Text style={styles.metaItemText}>{request.distanceKm} km</Text>
            </View>
            <View style={styles.metaItem}>
              <Icon name="earnings" size={13} color={Colors.primary[500]} />
              <Text style={styles.metaItemText}>
                Ngân sách khách: {formatVND(request.budget)}
              </Text>
            </View>
          </View>
        </View>

        {/* Labor Fee */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Tiền công thợ (Dự kiến)</Text>
          <View style={styles.stepperContainer}>
            <TouchableOpacity
              style={styles.stepperBtn}
              onPress={() => setLaborFee(Math.max(50000, laborFee - 50000))}
            >
              <Text style={styles.stepperBtnText}>−</Text>
            </TouchableOpacity>
            <View style={styles.stepperValueContainer}>
              <Text style={styles.stepperValue}>{formatVND(laborFee)}</Text>
            </View>
            <TouchableOpacity
              style={styles.stepperBtn}
              onPress={() => setLaborFee(laborFee + 50000)}
            >
              <Text style={styles.stepperBtnText}>+</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Material Fee */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Vật tư / phụ tùng thay thế</Text>
          <View style={styles.stepperContainer}>
            <TouchableOpacity
              style={styles.stepperBtn}
              onPress={() => setMaterialFee(Math.max(0, materialFee - 20000))}
            >
              <Text style={styles.stepperBtnText}>−</Text>
            </TouchableOpacity>
            <View style={styles.stepperValueContainer}>
              <Text style={styles.stepperValue}>{formatVND(materialFee)}</Text>
            </View>
            <TouchableOpacity
              style={styles.stepperBtn}
              onPress={() => setMaterialFee(materialFee + 20000)}
            >
              <Text style={styles.stepperBtnText}>+</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Arrival Option */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Thời gian có mặt phục vụ</Text>
          <View style={styles.arrivalGrid}>
            {ARRIVAL_OPTIONS.map((opt) => (
              <TouchableOpacity
                key={opt}
                style={[
                  styles.arrivalChip,
                  arrival === opt && styles.arrivalChipActive,
                ]}
                onPress={() => setArrival(opt)}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.arrivalChipText,
                    arrival === opt && styles.arrivalChipTextActive,
                  ]}
                >
                  {opt}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Total banner */}
        <View style={styles.totalCard}>
          <View style={styles.totalLeft}>
            <Icon name="earnings" size={24} color={Colors.primary[600]} />
            <Text style={styles.totalLabel}>Tổng báo giá</Text>
          </View>
          <Text style={styles.totalAmount}>{formatVND(total)}</Text>
        </View>

        {/* Submit button */}
        <Button
          label="Xác nhận gửi báo giá"
          variant="primary"
          size="lg"
          gradient
          fullWidth
          leftIcon={<Icon name="send" size={18} color={Colors.neutral[900]} />}
          onPress={handleSubmit}
          style={{ marginTop: Space.md }}
        />
      </ScrollView>
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
    gap: Space.lg,
  },
  summaryCard: {
    backgroundColor: Colors.neutral[0],
    borderRadius: Radius.xl,
    padding: Space.lg,
    borderWidth: 1,
    borderColor: Colors.neutral[200],
    ...Shadow.sm,
  },
  summaryTitle: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize.md,
    color: Colors.neutral[900],
  },
  summaryDesc: {
    fontFamily: FontFamily.regular,
    fontSize: FontSize.xs,
    color: Colors.neutral[500],
    marginTop: 4,
    lineHeight: 18,
  },
  summaryMetaRow: {
    flexDirection: 'row',
    gap: Space.lg,
    marginTop: Space.sm,
    paddingTop: Space.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.neutral[100],
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaItemText: {
    fontFamily: FontFamily.medium,
    fontSize: FontSize.xs,
    color: Colors.neutral[600],
  },
  section: {
    gap: Space.xs,
  },
  sectionTitle: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize.sm,
    color: Colors.neutral[800],
    marginBottom: Space.xs,
  },
  stepperContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Space.sm,
  },
  stepperBtn: {
    width: 48,
    height: 48,
    borderRadius: Radius.lg,
    backgroundColor: Colors.neutral[0],
    borderWidth: 1,
    borderColor: Colors.neutral[200],
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperBtnText: {
    fontFamily: FontFamily.bold,
    fontSize: 22,
    color: Colors.neutral[700],
  },
  stepperValueContainer: {
    flex: 1,
    height: 48,
    borderRadius: Radius.lg,
    backgroundColor: Colors.neutral[0],
    borderWidth: 1,
    borderColor: Colors.neutral[200],
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperValue: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize.md,
    color: Colors.neutral[900],
  },
  arrivalGrid: {
    gap: Space.xs + 2,
  },
  arrivalChip: {
    paddingVertical: Space.sm + 2,
    paddingHorizontal: Space.md,
    borderRadius: Radius.lg,
    backgroundColor: Colors.neutral[0],
    borderWidth: 1,
    borderColor: Colors.neutral[200],
  },
  arrivalChipActive: {
    borderColor: Colors.primary[500],
    backgroundColor: Colors.primary[50],
  },
  arrivalChipText: {
    fontFamily: FontFamily.medium,
    fontSize: FontSize.xs,
    color: Colors.neutral[700],
  },
  arrivalChipTextActive: {
    fontFamily: FontFamily.semiBold,
    color: Colors.primary[700],
  },
  totalCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.primary[50],
    padding: Space.lg,
    borderRadius: Radius.xl,
    marginTop: Space.xs,
  },
  totalLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Space.sm,
  },
  totalLabel: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize.md,
    color: Colors.primary[900],
  },
  totalAmount: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize.xl,
    color: Colors.primary[600],
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  emptyText: {
    fontFamily: FontFamily.regular,
    fontSize: FontSize.md,
    color: Colors.neutral[500],
  },
});
