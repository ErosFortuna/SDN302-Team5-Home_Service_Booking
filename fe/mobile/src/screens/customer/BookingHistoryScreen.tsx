import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  FlatList,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../types/navigation';
import { useAppStore } from '../../store/useAppStore';
import { formatVND } from '../../constants/mockData';
import { Booking, BookingStatus } from '../../types';
import { CategoryIcon, Icon, StatusBadge } from '../../components/ui';
import { Colors } from '../../constants/colors';
import { FontFamily, FontSize } from '../../constants/typography';
import { Radius, Shadow, Space } from '../../constants/spacing';

type Tab = 'active' | 'completed' | 'cancelled';

const TABS: { key: Tab; label: string }[] = [
  { key: 'active', label: 'Đang thực hiện' },
  { key: 'completed', label: 'Hoàn thành' },
  { key: 'cancelled', label: 'Đã hủy' },
];

const ACTIVE_STATUSES: BookingStatus[] = ['pending', 'quoted', 'in_progress'];

const STATUS_STEPS: { key: BookingStatus; label: string }[] = [
  { key: 'pending', label: 'Chờ thợ' },
  { key: 'quoted', label: 'Báo giá' },
  { key: 'in_progress', label: 'Đang làm' },
  { key: 'completed', label: 'Xong' },
];

export default function BookingHistoryScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { bookings } = useAppStore();
  const [activeTab, setActiveTab] = useState<Tab>('active');

  const filteredBookings = bookings.filter((b) => {
    if (activeTab === 'active') return ACTIVE_STATUSES.includes(b.status);
    if (activeTab === 'completed') return b.status === 'completed';
    return b.status === 'cancelled';
  });

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {/* In-page Screen Header matching ai-fe */}
        <View style={styles.header}>
          <Text style={styles.screenTitle}>Lịch đặt dịch vụ</Text>
          <Text style={styles.screenSub}>Theo dõi và quản lý các yêu cầu của bạn</Text>
        </View>

        {/* Segmented Pill Tabs matching ai-fe */}
        <View style={styles.segmentedContainer}>
          {TABS.map((t) => {
            const count = bookings.filter((b) =>
              t.key === 'active'
                ? ACTIVE_STATUSES.includes(b.status)
                : t.key === 'completed'
                ? b.status === 'completed'
                : b.status === 'cancelled'
            ).length;

            const isActive = activeTab === t.key;

            return (
              <TouchableOpacity
                key={t.key}
                style={[styles.segmentedTab, isActive && styles.segmentedTabActive]}
                onPress={() => setActiveTab(t.key)}
                activeOpacity={0.8}
              >
                <Text style={[styles.segmentedTabText, isActive && styles.segmentedTabTextActive]}>
                  {t.label}
                  {count > 0 ? ` (${count})` : ''}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Bookings List */}
        <FlatList
          data={filteredBookings}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <BookingItemCard
              booking={item}
              onViewQuotes={() => navigation.navigate('QuoteCompare', { bookingId: item.id })}
            />
          )}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <View style={styles.emptyIconBg}>
                <Icon name="calendar" size={36} color={Colors.primary[600]} />
              </View>
              <Text style={styles.emptyTitle}>Chưa có đơn đặt nào</Text>
              <Text style={styles.emptyText}>
                Các yêu cầu dịch vụ {activeTab === 'active' ? 'đang thực hiện' : 'trong mục này'} sẽ hiển thị tại đây.
              </Text>
            </View>
          }
        />
      </View>
    </SafeAreaView>
  );
}

function BookingItemCard({
  booking,
  onViewQuotes,
}: {
  booking: Booking;
  onViewQuotes: () => void;
}) {
  const showTracker =
    booking.status !== 'cancelled' && booking.status !== 'completed';
  const currentStepIdx = STATUS_STEPS.findIndex((s) => s.key === booking.status);

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
                  <Text style={[styles.stepLabel, isDone && styles.stepLabelDone]}>
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
          <Text style={styles.budgetLabel}>Dự trù ngân sách</Text>
          <Text style={styles.budgetValue}>{formatVND(booking.budget)}</Text>
        </View>

        {booking.status === 'quoted' && (
          <TouchableOpacity
            style={styles.viewQuotesBtn}
            onPress={onViewQuotes}
            activeOpacity={0.8}
          >
            <Text style={styles.viewQuotesText}>
              Xem {booking.quotes.length} báo giá
            </Text>
            <Icon name="chevronRight" size={14} color={Colors.neutral[900]} />
          </TouchableOpacity>
        )}

        {booking.status === 'in_progress' && (
          <View style={styles.statusNotice}>
            <Text style={styles.statusNoticeText}>Thợ đang trên đường đến</Text>
          </View>
        )}

        {booking.status === 'pending' && (
          <Text style={styles.pendingText}>Đang chờ thợ phản hồi...</Text>
        )}

        {booking.status === 'completed' && (
          <View style={styles.completedBadge}>
            <Icon name="check" size={14} color={Colors.primary[600]} />
            <Text style={styles.completedText}>Hoàn thành</Text>
          </View>
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
    flexDirection: 'row',
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
    alignItems: 'center',
    justifyContent: 'center',
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
  listContent: {
    paddingHorizontal: Space.md + 2,
    paddingTop: Space.xs,
    paddingBottom: 40,
    gap: Space.md,
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
    flexDirection: 'row',
    gap: Space.md,
  },
  cardTitleCol: {
    flex: 1,
  },
  titleStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Space.xs,
  },
  bookingTitle: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize.sm,
    color: Colors.neutral[900],
    flex: 1,
  },
  dateLocationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Space.md,
    marginTop: 4,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontFamily: FontFamily.regular,
    fontSize: 11,
    color: Colors.neutral[500],
  },
  addressRow: {
    flexDirection: 'row',
    alignItems: 'center',
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: Space.md,
    paddingVertical: Space.sm,
    paddingHorizontal: Space.xs,
    backgroundColor: Colors.neutral[50],
    borderRadius: Radius.lg,
  },
  stepNode: {
    alignItems: 'center',
    gap: 4,
  },
  stepDot: {
    width: 20,
    height: 20,
    borderRadius: Radius.full,
    backgroundColor: Colors.neutral[200],
    alignItems: 'center',
    justifyContent: 'center',
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
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
  viewQuotesBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.accent[500],
    paddingHorizontal: Space.md,
    paddingVertical: Space.xs + 3,
    borderRadius: Radius.lg,
  },
  viewQuotesText: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize.xs,
    color: Colors.neutral[900],
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
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  completedText: {
    fontFamily: FontFamily.bold,
    fontSize: 11,
    color: Colors.primary[600],
  },
  emptyContainer: {
    padding: Space.xl,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 50,
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
    fontSize: FontSize.md,
    color: Colors.neutral[900],
    marginBottom: Space.xs,
  },
  emptyText: {
    fontFamily: FontFamily.regular,
    fontSize: FontSize.xs,
    color: Colors.neutral[500],
    textAlign: 'center',
    lineHeight: 18,
  },
});
