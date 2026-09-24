import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../types/navigation';
import { useAppStore } from '../../store/useAppStore';
import { formatVND } from '../../constants/mockData';
import { Colors } from '../../constants/colors';
import { FontFamily, FontSize } from '../../constants/typography';
import { Radius, Shadow, Space } from '../../constants/spacing';
import { CategoryIcon, Icon, StatusBadge } from '../../components/ui';

export default function ProviderDashboard() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { jobRequests, bookings, quotedRequestIds } = useAppStore();

  const newRequestsCount = jobRequests.filter((r) => !quotedRequestIds.includes(r.id)).length;
  const activeJobs = bookings.filter((b) => b.status === 'in_progress');

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Welcome back */}
        <View style={styles.welcomeRow}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>JD</Text>
          </View>
          <View>
            <Text style={styles.welcomeSub}>Chào mừng trở lại,</Text>
            <Text style={styles.proName}>Thợ Nguyễn Văn An</Text>
          </View>
        </View>

        {/* Earnings hero */}
        <View style={styles.earningsWrapper}>
          <LinearGradient
            colors={['#00B4A6', '#0E7490']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.earningsCard}
          >
            <View style={styles.decorCircle} />
            <Text style={styles.earningsLabel}>Thu nhập hôm nay</Text>
            <Text style={styles.earningsValue}>{formatVND(1250000)}</Text>
            <View style={styles.trendBadge}>
              <Icon name="trendingUp" size={13} color={Colors.neutral[0]} />
              <Text style={styles.trendText}>+18% so với hôm qua</Text>
            </View>
          </LinearGradient>
        </View>

        {/* Metrics Grid */}
        <View style={styles.metricsGrid}>
          <View style={styles.metricCard}>
            <Icon name="briefcase" size={20} color="#0284C7" />
            <Text style={styles.metricVal}>3</Text>
            <Text style={styles.metricLabel}>Việc đang làm</Text>
          </View>
          <View style={styles.metricCard}>
            <Icon name="star" size={20} color={Colors.accent[500]} />
            <Text style={styles.metricVal}>4.9</Text>
            <Text style={styles.metricLabel}>Điểm uy tín</Text>
          </View>
          <View style={styles.metricCard}>
            <Icon name="trendingUp" size={20} color={Colors.primary[600]} />
            <Text style={styles.metricVal}>98%</Text>
            <Text style={styles.metricLabel}>Tỉ lệ nhận việc</Text>
          </View>
        </View>

        {/* New requests callout banner */}
        <TouchableOpacity
          style={styles.calloutCard}
          onPress={() => navigation.navigate('JobBoard')}
          activeOpacity={0.85}
        >
          <View style={styles.calloutIcon}>
            <Icon name="earnings" size={22} color={Colors.neutral[0]} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.calloutTitle}>{newRequestsCount} yêu cầu công việc mới</Text>
            <Text style={styles.calloutSub}>Gửi báo giá ngay để nhận thêm khách</Text>
          </View>
          <Icon name="chevronRight" size={18} color={Colors.primary[600]} />
        </TouchableOpacity>

        {/* Active Jobs Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Việc đang thực hiện</Text>
          <View style={styles.jobsList}>
            {activeJobs.map((j) => (
              <TouchableOpacity
                key={j.id}
                style={styles.jobItemCard}
                onPress={() => navigation.navigate('JobDetail', { jobId: j.id })}
                activeOpacity={0.8}
              >
                <CategoryIcon category={j.category} size={44} />
                <View style={styles.jobInfo}>
                  <Text style={styles.jobTitle} numberOfLines={1}>
                    {j.title}
                  </Text>
                  <View style={styles.jobMetaRow}>
                    <Text style={styles.customerName}>{j.customerName}</Text>
                    <Text style={styles.metaDot}>•</Text>
                    <Icon name="location" size={12} color={Colors.neutral[400]} />
                    <Text style={styles.distanceText}>{j.distanceKm} km</Text>
                  </View>
                </View>
                <View style={styles.jobRight}>
                  <StatusBadge bookingStatus={j.status} size="sm" />
                  <Icon name="chevronRight" size={14} color={Colors.neutral[400]} />
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </View>
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
    flex: 1,
  },
  content: {
    paddingHorizontal: Space.md + 2,
    paddingTop: Space.md,
    paddingBottom: 40,
    gap: Space.lg,
  },
  welcomeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Space.md,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: Radius.full,
    backgroundColor: Colors.primary[50],
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize.md,
    color: Colors.primary[700],
  },
  welcomeSub: {
    fontFamily: FontFamily.regular,
    fontSize: FontSize.xs,
    color: Colors.neutral[500],
  },
  proName: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize.lg,
    color: Colors.neutral[900],
    letterSpacing: -0.3,
  },
  earningsWrapper: {
    borderRadius: Radius['2xl'],
    overflow: 'hidden',
    ...Shadow.md,
  },
  earningsCard: {
    padding: Space.lg,
    position: 'relative',
  },
  decorCircle: {
    position: 'absolute',
    top: -20,
    right: -20,
    width: 110,
    height: 110,
    borderRadius: Radius.full,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  earningsLabel: {
    fontFamily: FontFamily.regular,
    fontSize: FontSize.xs,
    color: Colors.transparent.white85,
  },
  earningsValue: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize['3xl'],
    color: Colors.neutral[0],
    marginVertical: 4,
  },
  trendBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
    alignSelf: 'flex-start',
    paddingHorizontal: Space.sm + 2,
    paddingVertical: 3,
    borderRadius: Radius.full,
    marginTop: 4,
  },
  trendText: {
    fontFamily: FontFamily.semiBold,
    fontSize: 11,
    color: Colors.neutral[0],
  },
  metricsGrid: {
    flexDirection: 'row',
    gap: Space.sm,
  },
  metricCard: {
    flex: 1,
    backgroundColor: Colors.neutral[0],
    borderRadius: Radius.xl,
    padding: Space.md,
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    borderColor: Colors.neutral[200],
    ...Shadow.sm,
  },
  metricVal: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize.lg,
    color: Colors.neutral[900],
  },
  metricLabel: {
    fontFamily: FontFamily.medium,
    fontSize: 10,
    color: Colors.neutral[500],
    textAlign: 'center',
  },
  calloutCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Space.md,
    backgroundColor: Colors.primary[50],
    borderRadius: Radius.xl,
    padding: Space.md,
    borderWidth: 1,
    borderColor: Colors.primary[200],
  },
  calloutIcon: {
    width: 44,
    height: 44,
    borderRadius: Radius.lg,
    backgroundColor: Colors.primary[500],
    alignItems: 'center',
    justifyContent: 'center',
  },
  calloutTitle: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize.sm,
    color: Colors.primary[900],
  },
  calloutSub: {
    fontFamily: FontFamily.regular,
    fontSize: 11,
    color: Colors.primary[700],
    marginTop: 2,
  },
  section: {
    gap: Space.sm,
  },
  sectionTitle: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize.sm,
    color: Colors.neutral[900],
  },
  jobsList: {
    gap: Space.sm,
  },
  jobItemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.neutral[0],
    borderRadius: Radius.xl,
    padding: Space.md,
    borderWidth: 1,
    borderColor: Colors.neutral[200],
    gap: Space.md,
    ...Shadow.sm,
  },
  jobInfo: {
    flex: 1,
  },
  jobTitle: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize.sm,
    color: Colors.neutral[900],
  },
  jobMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  customerName: {
    fontFamily: FontFamily.regular,
    fontSize: 11,
    color: Colors.neutral[600],
  },
  metaDot: {
    color: Colors.neutral[300],
    fontSize: 10,
  },
  distanceText: {
    fontFamily: FontFamily.regular,
    fontSize: 11,
    color: Colors.neutral[500],
  },
  jobRight: {
    alignItems: 'flex-end',
    gap: 6,
  },
});
