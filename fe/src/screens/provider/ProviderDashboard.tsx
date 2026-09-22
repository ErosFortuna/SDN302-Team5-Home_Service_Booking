import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Switch,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, gradients } from '../../constants/colors';
import { FontFamily, FontSize } from '../../constants/typography';
import { Radius, Shadow, Space } from '../../constants/spacing';
import { Icon, Button, StatusBadge } from '../../components/ui';

const INCOMING_REQUESTS = [
  {
    id: 'REQ-102',
    service: 'Sửa máy nước nóng',
    customer: 'Chị Mai',
    distance: '1.2 km',
    time: 'Hôm nay, 15:30',
    address: 'Chung cư Sunrise City, Q7',
  },
];

const IN_PROGRESS = [
  {
    id: 'JOB-098',
    service: 'Vệ sinh 2 máy lạnh',
    customer: 'Anh Tuấn',
    status: 'inProgress' as const,
    time: 'Đang làm',
    earnings: 300000,
  },
];

import { MainTabNavigationProp } from '../../types/navigation';

type Props = {
  navigation: MainTabNavigationProp<'Home'>;
};

export default function ProviderDashboard({ navigation }: Props) {
  const [isOnline, setIsOnline] = React.useState(true);

  return (
    <SafeAreaView style={styles.safe}>
      {/* ── Header ── */}
      <View style={styles.header}>
        <View style={styles.headerInfo}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>A</Text>
          </View>
          <View>
            <Text style={styles.greeting}>Thợ Nguyễn Văn An</Text>
            <View style={styles.ratingRow}>
              <Icon name="star" size={14} color={Colors.accent[500]} />
              <Text style={styles.ratingText}>4.9 (128 đánh giá)</Text>
            </View>
          </View>
        </View>
        <View style={styles.statusToggle}>
          <Text style={styles.statusText}>{isOnline ? 'Đang nhận việc' : 'Nghỉ'}</Text>
          <Switch
            value={isOnline}
            onValueChange={setIsOnline}
            trackColor={{ false: Colors.neutral[300], true: Colors.primary[300] }}
            thumbColor={isOnline ? Colors.primary[500] : Colors.neutral[100]}
          />
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        
        {/* ── Earnings Card ── */}
        <LinearGradient
          colors={gradients.heroTeal}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.earningsCard}
        >
          <View style={styles.earningsHeader}>
            <Text style={styles.earningsTitle}>Thu nhập hôm nay</Text>
            <Icon name="chevronRight" size={20} color={Colors.neutral[0]} />
          </View>
          <Text style={styles.earningsAmount}>850.000đ</Text>
          <View style={styles.earningsStats}>
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>Hoàn thành</Text>
              <Text style={styles.statValue}>3 chuyến</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>Tỉ lệ nhận</Text>
              <Text style={styles.statValue}>95%</Text>
            </View>
          </View>
        </LinearGradient>

        {/* ── Incoming Requests ── */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Yêu cầu mới (1)</Text>
          </View>
          {INCOMING_REQUESTS.map((req) => (
            <TouchableOpacity 
              key={req.id} 
              style={styles.requestCard}
              activeOpacity={0.7}
              onPress={() => navigation.navigate('JobDetail', { jobId: req.id })}
            >
              <View style={styles.requestHeader}>
                <Text style={styles.requestService}>{req.service}</Text>
                <Text style={styles.requestDistance}>{req.distance}</Text>
              </View>
              
              <View style={styles.requestInfoRow}>
                <Icon name="person" size={16} color={Colors.neutral[500]} />
                <Text style={styles.requestInfoText}>{req.customer}</Text>
              </View>
              <View style={styles.requestInfoRow}>
                <Icon name="clock" size={16} color={Colors.neutral[500]} />
                <Text style={styles.requestInfoText}>{req.time}</Text>
              </View>
              <View style={styles.requestInfoRow}>
                <Icon name="location" size={16} color={Colors.neutral[500]} />
                <Text style={styles.requestInfoText} numberOfLines={1}>{req.address}</Text>
              </View>

              <View style={styles.actionRow}>
                <Button label="Từ chối" variant="outline" size="sm" style={{ flex: 1 }} />
                <View style={{ width: Space.sm }} />
                <Button label="Nhận việc" variant="primary" size="sm" gradient style={{ flex: 1 }} />
              </View>
            </TouchableOpacity>
          ))}
        </View>

        {/* ── In Progress ── */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Đang thực hiện</Text>
          </View>
          {IN_PROGRESS.map((job) => (
            <View key={job.id} style={styles.jobCard}>
              <View style={styles.jobHeader}>
                <View style={styles.jobTitleRow}>
                  <Text style={styles.jobService}>{job.service}</Text>
                  <StatusBadge bookingStatus={job.status} size="sm" />
                </View>
                <Text style={styles.jobAmount}>
                  {job.earnings.toLocaleString('vi-VN')}đ
                </Text>
              </View>
              <View style={styles.jobInfoRow}>
                <Icon name="person" size={16} color={Colors.neutral[500]} />
                <Text style={styles.jobInfoText}>{job.customer}</Text>
              </View>
              
              <Button
                label="Cập nhật tiến độ"
                variant="secondary"
                size="md"
                fullWidth
                style={{ marginTop: Space.md }}
              />
            </View>
          ))}
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
  
  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Space.xl,
    paddingVertical: Space.md,
    backgroundColor: Colors.neutral[0],
    borderBottomWidth: 1,
    borderBottomColor: Colors.neutral[200],
  },
  headerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Space.sm,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: Radius.full,
    backgroundColor: Colors.primary[100],
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize.lg,
    color: Colors.primary[700],
  },
  greeting: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSize.md,
    color: Colors.neutral[900],
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Space.xs,
  },
  ratingText: {
    fontFamily: FontFamily.medium,
    fontSize: FontSize.xs,
    color: Colors.neutral[600],
  },
  statusToggle: {
    alignItems: 'flex-end',
  },
  statusText: {
    fontFamily: FontFamily.medium,
    fontSize: FontSize.xs,
    color: Colors.neutral[600],
    marginBottom: Space.xs,
  },

  scroll: {
    padding: Space.xl,
    paddingBottom: Space['3xl'],
  },

  // Earnings Card
  earningsCard: {
    borderRadius: Radius.xl,
    padding: Space.xl,
    marginBottom: Space['2xl'],
    ...Shadow.md,
  },
  earningsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Space.sm,
  },
  earningsTitle: {
    fontFamily: FontFamily.medium,
    fontSize: FontSize.md,
    color: Colors.transparent.white90,
  },
  earningsAmount: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize['4xl'],
    color: Colors.neutral[0],
    marginBottom: Space.lg,
  },
  earningsStats: {
    flexDirection: 'row',
    backgroundColor: Colors.transparent.black15,
    borderRadius: Radius.lg,
    padding: Space.md,
  },
  statItem: {
    flex: 1,
  },
  statLabel: {
    fontFamily: FontFamily.regular,
    fontSize: FontSize.xs,
    color: Colors.transparent.white70,
    marginBottom: Space.xs,
  },
  statValue: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSize.md,
    color: Colors.neutral[0],
  },
  statDivider: {
    width: 1,
    backgroundColor: Colors.transparent.white20,
    marginHorizontal: Space.md,
  },

  // Sections
  section: {
    marginBottom: Space['2xl'],
  },
  sectionHeader: {
    marginBottom: Space.md,
  },
  sectionTitle: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSize.lg,
    color: Colors.neutral[900],
  },

  // Request Card
  requestCard: {
    backgroundColor: Colors.neutral[0],
    borderRadius: Radius.lg,
    padding: Space.lg,
    ...Shadow.sm,
  },
  requestHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Space.sm,
  },
  requestService: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSize.md,
    color: Colors.neutral[900],
  },
  requestDistance: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSize.sm,
    color: Colors.accent[600],
  },
  requestInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Space.sm,
    marginBottom: Space.xs,
  },
  requestInfoText: {
    fontFamily: FontFamily.regular,
    fontSize: FontSize.sm,
    color: Colors.neutral[600],
    flex: 1,
  },
  actionRow: {
    flexDirection: 'row',
    marginTop: Space.lg,
  },

  // Job Card
  jobCard: {
    backgroundColor: Colors.neutral[0],
    borderRadius: Radius.lg,
    padding: Space.lg,
    ...Shadow.sm,
  },
  jobHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Space.sm,
  },
  jobTitleRow: {
    flex: 1,
    gap: Space.xs,
  },
  jobService: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSize.md,
    color: Colors.neutral[900],
  },
  jobAmount: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize.md,
    color: Colors.primary[600],
  },
  jobInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Space.sm,
  },
  jobInfoText: {
    fontFamily: FontFamily.regular,
    fontSize: FontSize.sm,
    color: Colors.neutral[600],
  },
});
