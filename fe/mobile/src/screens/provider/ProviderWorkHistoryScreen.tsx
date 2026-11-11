import React from 'react';
import {
  ActivityIndicator,
  FlatList,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { CategoryIcon, Icon, StatusBadge } from '../../components/ui';
import { Header } from '../../components/layout/Header';
import { Colors } from '../../constants/colors';
import { FontFamily, FontSize } from '../../constants/typography';
import { Radius, Shadow, Space } from '../../constants/spacing';
import { useAppStore } from '../../store/useAppStore';
import { RootStackParamList } from '../../types/navigation';
import { Booking } from '../../types';

export default function ProviderWorkHistoryScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const bookings = useAppStore((state) => state.bookings);
  const fetchBookings = useAppStore((state) => state.fetchBookings);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState('');

  useFocusEffect(
    React.useCallback(() => {
      let active = true;
      setLoading(true);
      setError('');
      void fetchBookings()
        .catch((fetchError) => {
          if (active) {
            setError(fetchError instanceof Error ? fetchError.message : 'Không thể tải lịch sử công việc.');
          }
        })
        .finally(() => {
          if (active) setLoading(false);
        });
      return () => {
        active = false;
      };
    }, [fetchBookings]),
  );

  const completedJobs = bookings
    .filter((booking) => booking.status === 'completed')
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const renderJob = ({ item }: { item: Booking }) => (
    <TouchableOpacity
      style={styles.card}
      activeOpacity={0.8}
      onPress={() => navigation.navigate('JobDetail', { jobId: item.id })}
    >
      <CategoryIcon category={item.category} size={44} />
      <View style={styles.jobInfo}>
        <View style={styles.titleRow}>
          <Text style={styles.jobTitle} numberOfLines={1}>
            {item.categoryName || item.title}
          </Text>
          <StatusBadge bookingStatus={item.status} size="sm" />
        </View>
        {item.description ? (
          <Text style={styles.description} numberOfLines={2}>
            {item.description}
          </Text>
        ) : null}
        <View style={styles.metaRow}>
          <Text style={styles.customerName} numberOfLines={1}>{item.customerName}</Text>
          <Text style={styles.dot}>·</Text>
          <Icon name="calendar" size={12} color={Colors.neutral[400]} />
          <Text style={styles.metaText}>{item.date}</Text>
          <Text style={styles.metaText}>{item.time}</Text>
        </View>
        <View style={styles.addressRow}>
          <Icon name="location" size={12} color={Colors.neutral[400]} />
          <Text style={styles.metaText} numberOfLines={1}>{item.address}</Text>
        </View>
      </View>
      <Icon name="chevronRight" size={16} color={Colors.neutral[400]} />
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.safe}>
      <Header title="Lịch sử công việc" subtitle="Các công việc đã hoàn thành" />
      {loading ? (
        <ActivityIndicator color={Colors.primary[600]} style={styles.loading} />
      ) : error ? (
        <TouchableOpacity onPress={() => void fetchBookings().catch((fetchError) => {
          setError(fetchError instanceof Error ? fetchError.message : 'Không thể tải lịch sử công việc.');
        })}>
          <Text style={styles.error}>{error} · Chạm để thử lại.</Text>
        </TouchableOpacity>
      ) : (
        <FlatList
          data={completedJobs}
          keyExtractor={(item) => item.id}
          renderItem={renderJob}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={
            <Text style={styles.count}>{completedJobs.length} công việc đã hoàn thành</Text>
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <Icon name="history" size={36} color={Colors.neutral[400]} />
              <Text style={styles.emptyTitle}>Chưa có công việc hoàn thành</Text>
              <Text style={styles.emptyDescription}>
                Công việc đã hoàn tất sẽ xuất hiện tại đây.
              </Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: Colors.neutral[50],
  },
  loading: {
    flex: 1,
  },
  list: {
    padding: Space.md,
    gap: Space.sm,
    flexGrow: 1,
  },
  count: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSize.sm,
    color: Colors.neutral[600],
    marginBottom: Space.xs,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Space.md,
    backgroundColor: Colors.neutral[0],
    borderRadius: Radius.xl,
    padding: Space.md,
    borderWidth: 1,
    borderColor: Colors.neutral[200],
    ...Shadow.sm,
  },
  jobInfo: {
    flex: 1,
    gap: 4,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Space.xs,
  },
  jobTitle: {
    flex: 1,
    fontFamily: FontFamily.bold,
    fontSize: FontSize.sm,
    color: Colors.neutral[900],
  },
  description: {
    fontFamily: FontFamily.regular,
    fontSize: FontSize.xs,
    lineHeight: 16,
    color: Colors.neutral[600],
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 2,
  },
  customerName: {
    maxWidth: '42%',
    fontFamily: FontFamily.medium,
    fontSize: FontSize.xs,
    color: Colors.neutral[600],
  },
  dot: {
    color: Colors.neutral[400],
  },
  metaText: {
    fontFamily: FontFamily.regular,
    fontSize: 10,
    color: Colors.neutral[500],
  },
  addressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Space.xl,
    paddingVertical: Space['2xl'],
    gap: Space.sm,
  },
  emptyTitle: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize.md,
    color: Colors.neutral[800],
    textAlign: 'center',
  },
  emptyDescription: {
    fontFamily: FontFamily.regular,
    fontSize: FontSize.sm,
    color: Colors.neutral[500],
    textAlign: 'center',
  },
  error: {
    margin: Space.md,
    color: Colors.semantic.error,
    fontFamily: FontFamily.medium,
    fontSize: FontSize.sm,
  },
});
