import React from "react";
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
} from "react-native";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { RootStackParamList } from "../../types/navigation";
import { useAppStore } from "../../store/useAppStore";
import { useAuthStore } from "../../store/useAuthStore";
import { Colors } from "../../constants/colors";
import { FontFamily, FontSize } from "../../constants/typography";
import { Radius, Shadow, Space } from "../../constants/spacing";
import { CategoryIcon, Icon, StatusBadge } from "../../components/ui";
import { getMyProviderBookings } from "../../services/bookingService";
import { getMyProviderProfile, type ProviderProfile } from "../../services/providerProfileService";

export default function ProviderDashboard() {
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { bookings, fetchBookings } = useAppStore();
  const currentUser = useAuthStore((state) => state.currentUser);
  const [pendingCount, setPendingCount] = React.useState<number>(0);
  const [providerProfile, setProviderProfile] = React.useState<ProviderProfile | null>(null);
  const [dashboardError, setDashboardError] = React.useState('');

  useFocusEffect(
    React.useCallback(() => {
      let isActive = true;
      setDashboardError('');
      fetchBookings().catch((error) => {
        if (isActive) setDashboardError(error instanceof Error ? error.message : 'Không tải được dữ liệu từ máy chủ.');
      });
      getMyProviderBookings({ status: "pending_confirmation" })
        .then((data: any[]) => {
          if (isActive && Array.isArray(data)) {
            setPendingCount(data.length);
          }
        })
        .catch((error) => {
          if (isActive) setDashboardError(error instanceof Error ? error.message : 'Không tải được số đơn chờ xác nhận.');
        });
      getMyProviderProfile()
        .then((profile) => { if (isActive) setProviderProfile(profile); })
        .catch(() => { if (isActive) setProviderProfile(null); });
      return () => {
        isActive = false;
      };
    }, [fetchBookings]),
  );

  const newRequestsCount = pendingCount;
  const activeJobs = bookings.filter((b) => ["confirmed", "provider_on_the_way", "arrived", "awaiting_approval", "in_progress"].includes(b.status));
  const completedJobs = bookings.filter((b) => b.status === "completed");
  const proName = currentUser?.name || "Thợ đối tác";
  const avatarInitials = proName.slice(0, 2).toUpperCase();
  const completionRate = bookings.length > 0
    ? `${Math.round((completedJobs.length / bookings.length) * 100)}%`
    : "—";

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {dashboardError ? <Text style={styles.errorText}>{dashboardError}</Text> : null}
        {/* Welcome back */}
        <TouchableOpacity style={styles.welcomeRow} onPress={() => (navigation as any).navigate('Profile')} activeOpacity={0.8}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{avatarInitials}</Text>
          </View>
          <View>
            <Text style={styles.welcomeSub}>Chào mừng trở lại,</Text>
            <Text style={styles.proName}>{proName}</Text>
          </View>
        </TouchableOpacity>

        {/* Metrics Grid */}
        <View style={styles.metricsGrid}>
          <View style={styles.metricCard}>
            <Icon name="briefcase" size={20} color={Colors.category.plumbing.icon} />
            <Text style={styles.metricVal}>{activeJobs.length}</Text>
            <Text style={styles.metricLabel}>Việc đang làm</Text>
          </View>
          <View style={styles.metricCard}>
            <Icon name="star" size={20} color={Colors.accent[500]} />
            <Text style={styles.metricVal}>{providerProfile && providerProfile.reviewCount > 0 && Number.isFinite(providerProfile.averageRating) ? providerProfile.averageRating.toFixed(1) : "—"}</Text>
            <Text style={styles.metricLabel}>Đánh giá</Text>
          </View>
          <View style={styles.metricCard}>
            <Icon name="trendingUp" size={20} color={Colors.primary[600]} />
            <Text style={styles.metricVal}>{completionRate}</Text>
            <Text style={styles.metricLabel}>Tỉ lệ hoàn thành</Text>
          </View>
        </View>

        {/* Pending confirmation alerts banner */}
        <TouchableOpacity
          style={styles.pendingCard}
          onPress={() => navigation.navigate("PendingBookings")}
          activeOpacity={0.85}
        >
          <View style={styles.pendingIcon}>
            <Icon name="clock" size={22} color={Colors.neutral[0]} />
          </View>
          <View style={{ flex: 1 }}>
            <View
              style={{ flexDirection: "row", alignItems: "center", gap: 6 }}
            >
              <Text style={styles.pendingTitle}>Đơn chờ xác nhận</Text>
              {pendingCount > 0 && (
                <View style={styles.pendingBadgePill}>
                  <Text style={styles.pendingBadgePillText}>
                    {pendingCount} mới
                  </Text>
                </View>
              )}
            </View>
            <Text style={styles.pendingSub}>
              {pendingCount > 0
                ? "Khách hàng đã chọn bạn. Vui lòng xác nhận trong 12h"
                : "Xem các yêu cầu đặt lịch đang chờ phản hồi"}
            </Text>
          </View>
          <Icon name="chevronRight" size={18} color={Colors.accent[700]} />
        </TouchableOpacity>

        {/* New requests callout banner */}
        <TouchableOpacity
          style={styles.calloutCard}
          onPress={() => navigation.navigate("JobBoard")}
          activeOpacity={0.85}
        >
          <View style={styles.calloutIcon}>
            <Icon name="earnings" size={22} color={Colors.neutral[0]} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.calloutTitle}>
              {newRequestsCount} yêu cầu công việc mới
            </Text>
            <Text style={styles.calloutSub}>
              Xem các đơn đặt mới chờ xác nhận
            </Text>
          </View>
          <Icon name="chevronRight" size={18} color={Colors.primary[600]} />
        </TouchableOpacity>

        {/* Active Jobs Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Việc đang thực hiện</Text>
          <View style={styles.jobsList}>
            {activeJobs.length === 0 ? (
              <View style={styles.emptyJobsCard}>
                <Text style={styles.emptyJobsText}>Chưa có công việc nào đang tiến hành.</Text>
              </View>
            ) : (
              activeJobs.map((j) => (
                <TouchableOpacity
                  key={j.id}
                  style={styles.jobItemCard}
                  onPress={() =>
                    navigation.navigate("JobDetail", { jobId: j.id })
                  }
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
                      <Icon
                        name="location"
                        size={12}
                        color={Colors.neutral[400]}
                      />
                      <Text style={styles.distanceText}>{j.distanceKm} km</Text>
                    </View>
                  </View>
                  <View style={styles.jobRight}>
                    <StatusBadge bookingStatus={j.status} size="sm" />
                    <Icon
                      name="chevronRight"
                      size={14}
                      color={Colors.neutral[400]}
                    />
                  </View>
                </TouchableOpacity>
              ))
            )}
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
  errorText: { color: Colors.semantic.error, fontFamily: FontFamily.medium, fontSize: FontSize.xs },
  welcomeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Space.md,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: Radius.full,
    backgroundColor: Colors.primary[50],
    alignItems: "center",
    justifyContent: "center",
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
  metricsGrid: {
    flexDirection: "row",
    gap: Space.sm,
  },
  metricCard: {
    flex: 1,
    backgroundColor: Colors.neutral[0],
    borderRadius: Radius.xl,
    padding: Space.md,
    alignItems: "center",
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
    textAlign: "center",
  },
  pendingCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: Space.md,
    backgroundColor: Colors.accent[50],
    borderRadius: Radius.xl,
    padding: Space.md,
    borderWidth: 1.5,
    borderColor: Colors.accent[300],
    ...Shadow.sm,
  },
  pendingIcon: {
    width: 44,
    height: 44,
    borderRadius: Radius.lg,
    backgroundColor: Colors.accent[500],
    alignItems: "center",
    justifyContent: "center",
  },
  pendingTitle: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize.sm,
    color: Colors.neutral[900],
  },
  pendingBadgePill: {
    backgroundColor: Colors.semantic.error,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: Radius.full,
  },
  pendingBadgePillText: {
    fontFamily: FontFamily.bold,
    fontSize: 10,
    color: Colors.neutral[0],
  },
  pendingSub: {
    fontFamily: FontFamily.regular,
    fontSize: 11,
    color: Colors.neutral[600],
    marginTop: 2,
  },
  calloutCard: {
    flexDirection: "row",
    alignItems: "center",
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
    alignItems: "center",
    justifyContent: "center",
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
  emptyJobsCard: {
    backgroundColor: Colors.neutral[0],
    borderRadius: Radius.xl,
    padding: Space.lg,
    borderWidth: 1,
    borderColor: Colors.neutral[200],
    alignItems: "center",
  },
  emptyJobsText: {
    fontFamily: FontFamily.regular,
    fontSize: FontSize.xs,
    color: Colors.neutral[500],
  },
  jobItemCard: {
    flexDirection: "row",
    alignItems: "center",
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
    flexDirection: "row",
    alignItems: "center",
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
    alignItems: "flex-end",
    gap: 6,
  },
});
