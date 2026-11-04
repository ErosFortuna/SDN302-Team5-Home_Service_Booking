import React from 'react';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Colors } from '../../constants/colors';
import { FontFamily, FontSize } from '../../constants/typography';
import { Radius, Space } from '../../constants/spacing';
import { Header } from '../../components/layout/Header';
import { Icon } from '../../components/ui/Icon';
import {
  getMyNotifications,
  getUnreadNotificationCount,
  markAllNotificationsRead,
  markNotificationRead,
  type AppNotification,
} from '../../services/notificationService';
import { RootStackParamList } from '../../types/navigation';

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function NotificationListScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [notifications, setNotifications] = React.useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = React.useState(0);
  const [page, setPage] = React.useState(1);
  const [hasNextPage, setHasNextPage] = React.useState(false);
  const [loading, setLoading] = React.useState(true);
  const [refreshing, setRefreshing] = React.useState(false);
  const [loadingMore, setLoadingMore] = React.useState(false);
  const [error, setError] = React.useState('');

  const loadNotifications = React.useCallback(async (nextPage = 1, append = false) => {
    try {
      setError('');
      const [result, unreadTotal] = await Promise.all([
        getMyNotifications(nextPage),
        append ? Promise.resolve(null) : getUnreadNotificationCount(),
      ]);
      setNotifications((current) =>
        append ? [...current, ...result.notifications] : result.notifications,
      );
      setPage(result.pagination.page);
      setHasNextPage(result.pagination.hasNextPage);
      if (unreadTotal !== null) setUnreadCount(unreadTotal);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Không thể tải thông báo.');
    } finally {
      setLoading(false);
      setRefreshing(false);
      setLoadingMore(false);
    }
  }, []);

  useFocusEffect(
    React.useCallback(() => {
      setLoading(true);
      void loadNotifications();
    }, [loadNotifications]),
  );

  const refresh = React.useCallback(() => {
    setRefreshing(true);
    void loadNotifications();
  }, [loadNotifications]);

  const loadMore = () => {
    if (!hasNextPage || loadingMore || loading) return;
    setLoadingMore(true);
    void loadNotifications(page + 1, true);
  };

  const handleMarkRead = async (notification: AppNotification) => {
    if (notification.readAt) return;
    try {
      const result = await markNotificationRead(notification.id);
      setNotifications((current) =>
        current.map((item) =>
          item.id === notification.id
            ? { ...item, readAt: result.readAt || new Date().toISOString() }
            : item,
        ),
      );
      setUnreadCount((current) => Math.max(0, current - 1));
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Không thể cập nhật thông báo.');
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await markAllNotificationsRead();
      const readAt = new Date().toISOString();
      setNotifications((current) =>
        current.map((item) => ({ ...item, readAt: item.readAt || readAt })),
      );
      setUnreadCount(0);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Không thể cập nhật thông báo.');
    }
  };

  const renderItem = ({ item }: { item: AppNotification }) => (
    <TouchableOpacity
      style={[styles.notification, !item.readAt && styles.unreadNotification]}
      onPress={() => void handleMarkRead(item)}
      activeOpacity={0.75}
      accessibilityRole="button"
      accessibilityLabel={`${item.title}. ${item.message}${item.readAt ? '' : '. Chưa đọc'}`}
    >
      <View style={[styles.iconBox, !item.readAt && styles.unreadIconBox]}>
        <Icon
          name={item.type === 'MATERIALS_PENDING_APPROVAL' ? 'receipt' : 'notification'}
          size={18}
          color={item.readAt ? Colors.neutral[500] : Colors.primary[600]}
        />
      </View>
      <View style={styles.notificationContent}>
        <View style={styles.titleRow}>
          <Text style={styles.notificationTitle} numberOfLines={2}>{item.title}</Text>
          {!item.readAt && <View style={styles.unreadDot} />}
        </View>
        <Text style={styles.message}>{item.message}</Text>
        <Text style={styles.date}>{formatDate(item.createdAt)}</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <Header
        title="Thông báo"
        showBack
        rightLabel={unreadCount > 0 ? 'Đọc tất cả' : undefined}
        onRightPress={unreadCount > 0 ? () => void handleMarkAllRead() : undefined}
      />
      {error ? (
        <View style={styles.errorBanner}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity onPress={refresh} accessibilityLabel="Thử tải lại">
            <Text style={styles.retryText}>Thử lại</Text>
          </TouchableOpacity>
        </View>
      ) : null}
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={Colors.primary[500]} />
          <Text style={styles.helperText}>Đang tải thông báo...</Text>
        </View>
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={notifications.length ? styles.listContent : styles.emptyContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={refresh}
              tintColor={Colors.primary[500]}
            />
          }
          onEndReached={loadMore}
          onEndReachedThreshold={0.4}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <View style={styles.emptyIcon}>
                <Icon name="notification" size={28} color={Colors.neutral[400]} />
              </View>
              <Text style={styles.emptyTitle}>Chưa có thông báo</Text>
              <Text style={styles.helperText}>Thông báo về lịch hẹn và trạng thái dịch vụ sẽ xuất hiện tại đây.</Text>
            </View>
          }
          ListFooterComponent={
            loadingMore ? (
              <ActivityIndicator style={styles.loadingMore} color={Colors.primary[500]} />
            ) : null
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.neutral[50],
  },
  listContent: {
    padding: Space.md,
    gap: Space.sm,
  },
  emptyContent: {
    flexGrow: 1,
    padding: Space.lg,
    justifyContent: 'center',
  },
  notification: {
    flexDirection: 'row',
    gap: Space.md,
    padding: Space.md,
    borderRadius: Radius.lg,
    backgroundColor: Colors.neutral[0],
    borderWidth: 1,
    borderColor: Colors.neutral[200],
  },
  unreadNotification: {
    borderColor: Colors.primary[200],
    backgroundColor: Colors.primary[50],
  },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.neutral[100],
  },
  unreadIconBox: {
    backgroundColor: Colors.neutral[0],
  },
  notificationContent: {
    flex: 1,
    gap: 4,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Space.xs,
  },
  notificationTitle: {
    flex: 1,
    fontFamily: FontFamily.bold,
    fontSize: FontSize.sm,
    color: Colors.neutral[900],
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: Radius.full,
    marginTop: 5,
    backgroundColor: Colors.primary[500],
  },
  message: {
    fontFamily: FontFamily.regular,
    fontSize: FontSize.sm,
    lineHeight: 20,
    color: Colors.neutral[600],
  },
  date: {
    marginTop: 2,
    fontFamily: FontFamily.regular,
    fontSize: FontSize.xs,
    color: Colors.neutral[400],
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Space.sm,
  },
  helperText: {
    fontFamily: FontFamily.regular,
    fontSize: FontSize.sm,
    color: Colors.neutral[500],
    textAlign: 'center',
  },
  emptyState: {
    alignItems: 'center',
    gap: Space.sm,
  },
  emptyIcon: {
    width: 64,
    height: 64,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.neutral[100],
  },
  emptyTitle: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize.md,
    color: Colors.neutral[900],
  },
  errorBanner: {
    margin: Space.md,
    padding: Space.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Space.sm,
    borderRadius: Radius.md,
    backgroundColor: Colors.semantic.errorBg,
  },
  errorText: {
    flex: 1,
    fontFamily: FontFamily.regular,
    fontSize: FontSize.xs,
    color: Colors.semantic.error,
  },
  retryText: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize.xs,
    color: Colors.primary[700],
  },
  loadingMore: {
    margin: Space.md,
  },
});
