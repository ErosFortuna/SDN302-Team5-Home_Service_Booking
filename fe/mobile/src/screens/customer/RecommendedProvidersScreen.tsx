import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  FlatList,
  RefreshControl,
  Image,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../types/navigation';
import { getRecommendedProviders } from '../../services/providerService';
import { RecommendedProvider } from '../../types';
import { Header } from '../../components/layout/Header';
import { Icon } from '../../components/ui/Icon';
import { Colors } from '../../constants/colors';
import { FontFamily, FontSize } from '../../constants/typography';
import { Radius, Shadow, Space } from '../../constants/spacing';

type Props = NativeStackScreenProps<RootStackParamList, 'RecommendedProviders'>;

type SortOption = 'score' | 'rating' | 'distance';

const SORT_OPTIONS: { key: SortOption; label: string; icon: 'sparkles' | 'star' | 'location' }[] = [
  { key: 'score', label: 'Điểm phù hợp', icon: 'sparkles' },
  { key: 'rating', label: 'Đánh giá cao', icon: 'star' },
  { key: 'distance', label: 'Gần nhất', icon: 'location' },
];

const RADIUS_OPTIONS = [5, 10, 15, 25];

export default function RecommendedProvidersScreen({ route, navigation }: Props) {
  const { requestId, title } = route.params;

  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [providers, setProviders] = useState<RecommendedProvider[]>([]);

  const [sortBy, setSortBy] = useState<SortOption>('score');
  const [radiusKm, setRadiusKm] = useState<number>(15);

  const fetchRecommendations = useCallback(async () => {
    try {
      setError(null);
      const data = await getRecommendedProviders(requestId, {
        limit: 20,
        radiusKm,
        sortBy,
      });
      setProviders(data);
    } catch (err: any) {
      console.warn('Failed to load recommended providers:', err);
      setError(err?.message || 'Không thể tải danh sách thợ gợi ý. Vui lòng thử lại.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [requestId, radiusKm, sortBy]);

  useEffect(() => {
    setLoading(true);
    fetchRecommendations();
  }, [fetchRecommendations]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchRecommendations();
  };

  const getScoreBadgeColor = (score: number) => {
    if (score >= 90) return { bg: Colors.semantic.successBg, text: Colors.semantic.success, border: Colors.semantic.success };
    if (score >= 75) return { bg: Colors.primary[50], text: Colors.primary[700], border: Colors.primary[200] };
    return { bg: Colors.neutral[100], text: Colors.neutral[700], border: Colors.neutral[300] };
  };

  const renderProviderCard = ({ item }: { item: RecommendedProvider }) => {
    const badgeStyle = getScoreBadgeColor(item.score);

    return (
      <View style={styles.card}>
        {/* Top Header */}
        <View style={styles.cardHeader}>
          <View style={styles.avatarContainer}>
            {item.avatarUrl ? (
              <Image source={{ uri: item.avatarUrl }} style={styles.avatar} />
            ) : (
              <View style={[styles.avatar, styles.avatarFallback]}>
                <Text style={styles.avatarText}>
                  {item.fullName ? item.fullName.charAt(0).toUpperCase() : 'T'}
                </Text>
              </View>
            )}
            <View style={styles.verifiedBadge}>
              <Icon name="check" size={10} color={Colors.neutral[0]} />
            </View>
          </View>

          <View style={styles.headerInfo}>
            <Text style={styles.providerName} numberOfLines={1}>
              {item.fullName}
            </Text>
            {item.businessName && item.businessName !== item.fullName ? (
              <Text style={styles.businessName} numberOfLines={1}>
                {item.businessName}
              </Text>
            ) : null}

            {/* Quick Meta Stats */}
            <View style={styles.metaRow}>
              <View style={styles.ratingBadge}>
                <Icon name="star" size={13} color="#F59E0B" />
                <Text style={styles.ratingText}>{item.averageRating.toFixed(1)}</Text>
                <Text style={styles.reviewCountText}>({item.reviewCount})</Text>
              </View>

              <Text style={styles.metaDot}>·</Text>

              <View style={styles.distanceBadge}>
                <Icon name="location" size={12} color={Colors.neutral[500]} />
                <Text style={styles.distanceText}>
                  {item.distanceKm != null ? `${item.distanceKm.toFixed(1)} km` : 'Trong khu vực'}
                </Text>
              </View>
            </View>
          </View>

          {/* Match Score Badge */}
          <View style={[styles.scoreBadge, { backgroundColor: badgeStyle.bg, borderColor: badgeStyle.border }]}>
            <Icon name="sparkles" size={11} color={badgeStyle.text} />
            <Text style={[styles.scoreBadgeText, { color: badgeStyle.text }]}>
              {Math.round(item.score)}% khớp
            </Text>
          </View>
        </View>

        {/* Experience & Jobs summary */}
        <View style={styles.experienceStrip}>
          <View style={styles.expItem}>
            <Icon name="briefcase" size={13} color={Colors.primary[600]} />
            <Text style={styles.expText}>{item.yearsOfExperience} năm kinh nghiệm</Text>
          </View>
          <View style={styles.expItem}>
            <Icon name="check" size={13} color={Colors.primary[600]} />
            <Text style={styles.expText}>{item.completedJobCount} việc hoàn thành</Text>
          </View>
        </View>

        {/* Score Breakdown Indicator */}
        <View style={styles.breakdownSection}>
          <Text style={styles.breakdownTitle}>Chỉ số phù hợp:</Text>
          <View style={styles.breakdownGrid}>
            <View style={styles.breakdownCol}>
              <Text style={styles.breakdownLabel}>Uy tín</Text>
              <View style={styles.progressBarBg}>
                <View style={[styles.progressBarFill, { width: `${item.scoreBreakdown.ratingScore}%` }]} />
              </View>
            </View>
            <View style={styles.breakdownCol}>
              <Text style={styles.breakdownLabel}>Vị trí</Text>
              <View style={styles.progressBarBg}>
                <View style={[styles.progressBarFill, { width: `${item.scoreBreakdown.distanceScore}%` }]} />
              </View>
            </View>
            <View style={styles.breakdownCol}>
              <Text style={styles.breakdownLabel}>Kinh nghiệm</Text>
              <View style={styles.progressBarBg}>
                <View style={[styles.progressBarFill, { width: `${item.scoreBreakdown.experienceScore}%` }]} />
              </View>
            </View>
            <View style={styles.breakdownCol}>
              <Text style={styles.breakdownLabel}>Lịch rảnh</Text>
              <View style={styles.progressBarBg}>
                <View style={[styles.progressBarFill, { width: `${item.scoreBreakdown.scheduleScore}%` }]} />
              </View>
            </View>
          </View>
        </View>

        {/* Reasons / Highlights */}
        {item.reasons && item.reasons.length > 0 && (
          <View style={styles.reasonsContainer}>
            {item.reasons.map((reason, idx) => (
              <View key={idx} style={styles.reasonRow}>
                <Icon name="check" size={13} color={Colors.semantic.success} />
                <Text style={styles.reasonText}>{reason}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Actions Footer */}
        <View style={styles.cardFooter}>
          <TouchableOpacity
            style={styles.chatButton}
            activeOpacity={0.8}
            onPress={() => navigation.navigate('Chat', { name: item.fullName })}
          >
            <Icon name="chat" size={16} color={Colors.primary[600]} />
            <Text style={styles.chatButtonText}>Nhắn tin</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.viewQuoteButton}
            activeOpacity={0.8}
            onPress={() => navigation.navigate('QuoteCompare', { bookingId: requestId })}
          >
            <Text style={styles.viewQuoteButtonText}>Xem báo giá</Text>
            <Icon name="forward" size={14} color={Colors.neutral[900]} />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safe}>
      <Header
        title="Gợi ý thợ phù hợp"
        subtitle={title || 'Tìm thợ tối ưu theo vị trí & lịch rảnh'}
        showBack
      />

      <View style={styles.container}>
        {/* Informative Guidance Banner (UC-13 Compliance) */}
        <View style={styles.infoBanner}>
          <Icon name="info" size={18} color={Colors.primary[600]} />
          <Text style={styles.infoBannerText}>
            Gợi ý mang tính tham khảo (UC-13). Thợ phù hợp sẽ nhận được yêu cầu và gửi báo giá cạnh tranh cho bạn.
          </Text>
        </View>

        {/* Filter Controls Bar */}
        <View style={styles.filtersBar}>
          {/* Sort By Chips */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.sortChipsContainer}
          >
            <Text style={styles.filterGroupLabel}>Sắp xếp:</Text>
            {SORT_OPTIONS.map((opt) => {
              const active = sortBy === opt.key;
              return (
                <TouchableOpacity
                  key={opt.key}
                  style={[styles.chip, active && styles.chipActive]}
                  onPress={() => setSortBy(opt.key)}
                  activeOpacity={0.8}
                >
                  <Icon
                    name={opt.icon}
                    size={13}
                    color={active ? Colors.neutral[0] : Colors.neutral[600]}
                  />
                  <Text style={[styles.chipText, active && styles.chipTextActive]}>
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              );
            })}

            <View style={styles.divider} />

            <Text style={styles.filterGroupLabel}>Bán kính:</Text>
            {RADIUS_OPTIONS.map((r) => {
              const active = radiusKm === r;
              return (
                <TouchableOpacity
                  key={r}
                  style={[styles.chip, active && styles.chipActive]}
                  onPress={() => setRadiusKm(r)}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.chipText, active && styles.chipTextActive]}>
                    {r} km
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* Content Body */}
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={Colors.primary[500]} />
            <Text style={styles.loadingText}>Đang phân tích thợ phù hợp...</Text>
          </View>
        ) : error ? (
          <View style={styles.errorContainer}>
            <Icon name="error" size={40} color={Colors.semantic.error} />
            <Text style={styles.errorTitle}>Đã xảy ra lỗi</Text>
            <Text style={styles.errorSub}>{error}</Text>
            <TouchableOpacity style={styles.retryButton} onPress={fetchRecommendations}>
              <Text style={styles.retryButtonText}>Thử lại</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <FlatList
            data={providers}
            keyExtractor={(item) => item.providerId}
            renderItem={renderProviderCard}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={handleRefresh}
                colors={[Colors.primary[500]]}
              />
            }
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <View style={styles.emptyIconBg}>
                  <Icon name="search" size={32} color={Colors.primary[500]} />
                </View>
                <Text style={styles.emptyTitle}>Chưa có thợ phù hợp trong bán kính</Text>
                <Text style={styles.emptySub}>
                  Hiện chưa tìm thấy thợ rảnh trong bán kính {radiusKm} km. Bạn vui lòng tăng bán kính hoặc chọn khung giờ khác.
                </Text>
                <TouchableOpacity
                  style={styles.expandRadiusBtn}
                  onPress={() => setRadiusKm(25)}
                >
                  <Text style={styles.expandRadiusBtnText}>Mở rộng bán kính lên 25 km</Text>
                </TouchableOpacity>
              </View>
            }
          />
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: Colors.neutral[50],
  },
  container: {
    flex: 1,
  },
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primary[50],
    paddingHorizontal: Space.md,
    paddingVertical: Space.sm,
    marginHorizontal: Space.md,
    marginTop: Space.sm,
    marginBottom: Space.xs,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.primary[200],
    gap: Space.sm,
  },
  infoBannerText: {
    flex: 1,
    fontFamily: FontFamily.regular,
    fontSize: FontSize.xs,
    color: Colors.primary[900],
    lineHeight: 18,
  },
  filtersBar: {
    paddingVertical: Space.sm,
    backgroundColor: Colors.neutral[0],
    borderBottomWidth: 1,
    borderBottomColor: Colors.neutral[200],
  },
  sortChipsContainer: {
    paddingHorizontal: Space.md,
    alignItems: 'center',
    gap: Space.xs,
  },
  filterGroupLabel: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSize.xs,
    color: Colors.neutral[500],
    marginRight: 2,
  },
  divider: {
    width: 1,
    height: 18,
    backgroundColor: Colors.neutral[300],
    marginHorizontal: Space.xs,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Space.sm + 2,
    paddingVertical: Space.xs,
    borderRadius: Radius.full,
    backgroundColor: Colors.neutral[100],
    borderWidth: 1,
    borderColor: Colors.neutral[200],
    gap: 4,
  },
  chipActive: {
    backgroundColor: Colors.primary[500],
    borderColor: Colors.primary[600],
  },
  chipText: {
    fontFamily: FontFamily.medium,
    fontSize: FontSize.xs,
    color: Colors.neutral[700],
  },
  chipTextActive: {
    color: Colors.neutral[0],
    fontFamily: FontFamily.semiBold,
  },
  listContent: {
    padding: Space.md,
    gap: Space.md,
  },
  card: {
    backgroundColor: Colors.neutral[0],
    borderRadius: Radius.lg,
    padding: Space.md,
    borderWidth: 1,
    borderColor: Colors.neutral[200],
    ...Shadow.sm,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Space.md,
  },
  avatarContainer: {
    position: 'relative',
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: Radius.full,
  },
  avatarFallback: {
    backgroundColor: Colors.primary[100],
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize.xl,
    color: Colors.primary[700],
  },
  verifiedBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    backgroundColor: Colors.primary[500],
    width: 16,
    height: 16,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: Colors.neutral[0],
  },
  headerInfo: {
    flex: 1,
  },
  providerName: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize.lg,
    color: Colors.neutral[900],
  },
  businessName: {
    fontFamily: FontFamily.regular,
    fontSize: FontSize.xs,
    color: Colors.neutral[500],
    marginTop: 1,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    gap: 4,
  },
  ratingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  ratingText: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize.xs,
    color: Colors.neutral[800],
  },
  reviewCountText: {
    fontFamily: FontFamily.regular,
    fontSize: FontSize.xs,
    color: Colors.neutral[500],
  },
  metaDot: {
    color: Colors.neutral[400],
    fontSize: FontSize.xs,
  },
  distanceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  distanceText: {
    fontFamily: FontFamily.medium,
    fontSize: FontSize.xs,
    color: Colors.neutral[600],
  },
  scoreBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: Radius.full,
    borderWidth: 1,
    gap: 3,
  },
  scoreBadgeText: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize.xs,
  },
  experienceStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.neutral[50],
    paddingHorizontal: Space.sm,
    paddingVertical: Space.xs,
    borderRadius: Radius.sm,
    marginTop: Space.sm,
    gap: Space.md,
  },
  expItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  expText: {
    fontFamily: FontFamily.medium,
    fontSize: FontSize.xs,
    color: Colors.neutral[700],
  },
  breakdownSection: {
    marginTop: Space.sm,
    paddingTop: Space.xs,
  },
  breakdownTitle: {
    fontFamily: FontFamily.semiBold,
    fontSize: 11,
    color: Colors.neutral[500],
    marginBottom: 4,
  },
  breakdownGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 6,
  },
  breakdownCol: {
    flex: 1,
  },
  breakdownLabel: {
    fontFamily: FontFamily.regular,
    fontSize: 10,
    color: Colors.neutral[500],
    marginBottom: 2,
  },
  progressBarBg: {
    height: 4,
    backgroundColor: Colors.neutral[200],
    borderRadius: Radius.full,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: Colors.primary[500],
    borderRadius: Radius.full,
  },
  reasonsContainer: {
    marginTop: Space.sm,
    backgroundColor: '#F0FDF4',
    padding: Space.sm,
    borderRadius: Radius.sm,
    gap: 4,
  },
  reasonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  reasonText: {
    fontFamily: FontFamily.regular,
    fontSize: FontSize.xs,
    color: '#15803D',
    flex: 1,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: Space.md,
    gap: Space.sm,
  },
  chatButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Space.sm,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.primary[500],
    backgroundColor: Colors.neutral[0],
    gap: 6,
  },
  chatButtonText: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSize.sm,
    color: Colors.primary[600],
  },
  viewQuoteButton: {
    flex: 1.3,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Space.sm,
    borderRadius: Radius.md,
    backgroundColor: Colors.accent[500],
    gap: 6,
    ...Shadow.sm,
  },
  viewQuoteButtonText: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize.sm,
    color: Colors.neutral[900],
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Space.sm,
    padding: Space.xl,
  },
  loadingText: {
    fontFamily: FontFamily.medium,
    fontSize: FontSize.sm,
    color: Colors.neutral[600],
  },
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Space.xl,
    gap: Space.sm,
  },
  errorTitle: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize.lg,
    color: Colors.neutral[800],
  },
  errorSub: {
    fontFamily: FontFamily.regular,
    fontSize: FontSize.xs,
    color: Colors.neutral[500],
    textAlign: 'center',
    marginBottom: Space.sm,
  },
  retryButton: {
    backgroundColor: Colors.primary[500],
    paddingHorizontal: Space.lg,
    paddingVertical: Space.sm,
    borderRadius: Radius.md,
  },
  retryButtonText: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize.sm,
    color: Colors.neutral[0],
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: Space.xl,
    marginTop: Space.xl,
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
    fontSize: FontSize.lg,
    color: Colors.neutral[800],
    marginBottom: Space.xs,
    textAlign: 'center',
  },
  emptySub: {
    fontFamily: FontFamily.regular,
    fontSize: FontSize.xs,
    color: Colors.neutral[500],
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: Space.md,
  },
  expandRadiusBtn: {
    backgroundColor: Colors.primary[50],
    borderWidth: 1,
    borderColor: Colors.primary[500],
    paddingHorizontal: Space.md,
    paddingVertical: Space.sm,
    borderRadius: Radius.md,
  },
  expandRadiusBtnText: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSize.xs,
    color: Colors.primary[700],
  },
});
