import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  FlatList,
  TouchableOpacity,
  TextInput,
  RefreshControl,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { RootStackParamList } from "../../types/navigation";
import { useAppStore } from "../../store/useAppStore";
import { Complaint, ComplaintStatus } from "../../types";
import { Colors } from "../../constants/colors";
import { FontFamily, FontSize } from "../../constants/typography";
import { Radius, Shadow, Space } from "../../constants/spacing";
import { Icon, AppIconKey } from "../../components/ui/Icon";

type FilterTab = "ALL" | "OPEN" | "UNDER_REVIEW" | "RESOLVED";

const TABS: { key: FilterTab; label: string }[] = [
  { key: "ALL", label: "Tất cả" },
  { key: "OPEN", label: "Chờ tiếp nhận" },
  { key: "UNDER_REVIEW", label: "Đang xử lý" },
  { key: "RESOLVED", label: "Đã giải quyết" },
];

export default function ComplaintListScreen() {
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { complaints, fetchComplaints } = useAppStore();
  const [activeTab, setActiveTab] = useState<FilterTab>("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchComplaints();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchComplaints();
    setRefreshing(false);
  };

  const filteredComplaints = complaints.filter((c) => {
    // Tab filter
    if (activeTab === "OPEN" && c.status !== "OPEN") return false;
    if (activeTab === "UNDER_REVIEW" && c.status !== "UNDER_REVIEW")
      return false;
    if (
      activeTab === "RESOLVED" &&
      c.status !== "RESOLVED" &&
      c.status !== "REJECTED"
    )
      return false;

    // Search filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTitle = c.title.toLowerCase().includes(q);
      const matchDesc = c.description.toLowerCase().includes(q);
      const matchBooking = c.bookingId.toLowerCase().includes(q);
      const matchReporter = c.reporterName.toLowerCase().includes(q);
      const matchAgainst = c.againstName.toLowerCase().includes(q);
      return (
        matchTitle || matchDesc || matchBooking || matchReporter || matchAgainst
      );
    }
    return true;
  });

  const getStatusConfig = (status: ComplaintStatus) => {
    switch (status) {
      case "OPEN":
        return {
          label: "Chờ tiếp nhận",
          color: Colors.semantic.error,
          bg: "rgba(239, 68, 68, 0.1)",
        };
      case "UNDER_REVIEW":
        return {
          label: "Đang xác minh",
          color: Colors.accent[600],
          bg: "rgba(245, 158, 11, 0.15)",
        };
      case "RESOLVED":
        return {
          label: "Đã giải quyết",
          color: Colors.semantic.success,
          bg: "rgba(16, 185, 129, 0.12)",
        };
      case "REJECTED":
        return {
          label: "Bác bỏ / Từ chối",
          color: Colors.neutral[600],
          bg: Colors.neutral[200],
        };
      default:
        return {
          label: status,
          color: Colors.neutral[700],
          bg: Colors.neutral[100],
        };
    }
  };

  const getCategoryIcon = (category: string): AppIconKey => {
    switch (category) {
      case "QUALITY":
        return "services";
      case "LATE_ARRIVAL":
        return "pending";
      case "NO_SHOW":
        return "cancel";
      case "PRICE":
        return "payment";
      case "BEHAVIOR":
        return "warning";
      case "DAMAGE":
        return "error";
      default:
        return "info";
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backBtn}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Icon name="back" size={24} color={Colors.neutral[800]} />
        </TouchableOpacity>
        <View style={styles.headerTitleWrap}>
          <Text style={styles.headerTitle}>Khiếu nại dịch vụ</Text>
          <Text style={styles.headerSub}>
            Danh sách & tiến độ giải quyết (KAN-19)
          </Text>
        </View>
        <TouchableOpacity
          onPress={() => navigation.navigate("CreateComplaint")}
          style={styles.addBtnHeader}
          activeOpacity={0.8}
        >
          <Icon name="add" size={20} color={Colors.primary[700]} />
          <Text style={styles.addBtnHeaderText}>Tạo mới</Text>
        </TouchableOpacity>
      </View>

      {/* Search Bar */}
      <View style={styles.searchBarWrap}>
        <View style={styles.searchBox}>
          <Icon name="search" size={18} color={Colors.neutral[400]} />
          <TextInput
            style={styles.searchInput}
            placeholder="Tìm theo tiêu đề, mã đơn, tên thợ..."
            placeholderTextColor={Colors.neutral[400]}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery("")}>
              <Icon name="close" size={18} color={Colors.neutral[400]} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Filter Tabs */}
      <View style={styles.tabsWrap}>
        {TABS.map((tab) => {
          const count = complaints.filter((c) => {
            if (tab.key === "ALL") return true;
            if (tab.key === "OPEN") return c.status === "OPEN";
            if (tab.key === "UNDER_REVIEW") return c.status === "UNDER_REVIEW";
            if (tab.key === "RESOLVED")
              return c.status === "RESOLVED" || c.status === "REJECTED";
            return true;
          }).length;

          const isActive = activeTab === tab.key;

          return (
            <TouchableOpacity
              key={tab.key}
              onPress={() => setActiveTab(tab.key)}
              style={[styles.tab, isActive && styles.tabActive]}
              activeOpacity={0.8}
            >
              <Text style={[styles.tabText, isActive && styles.tabTextActive]}>
                {tab.label}
                {count > 0 ? ` (${count})` : ""}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Complaint List */}
      <FlatList
        data={filteredComplaints}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[Colors.primary[600]]}
          />
        }
        renderItem={({ item }) => {
          const statusCfg = getStatusConfig(item.status);
          const repliesCount = item.replies?.length ?? 0;
          return (
            <TouchableOpacity
              style={styles.card}
              activeOpacity={0.85}
              onPress={() =>
                navigation.navigate("ComplaintDetail", { complaintId: item.id })
              }
            >
              {/* Card Top Row */}
              <View style={styles.cardHeader}>
                <View style={styles.categoryBadge}>
                  <Icon
                    name={getCategoryIcon(item.category)}
                    size={14}
                    color={Colors.primary[700]}
                  />
                  <Text style={styles.categoryBadgeText}>{item.category}</Text>
                </View>
                <View
                  style={[
                    styles.statusBadge,
                    { backgroundColor: statusCfg.bg },
                  ]}
                >
                  <Text
                    style={[styles.statusBadgeText, { color: statusCfg.color }]}
                  >
                    {statusCfg.label}
                  </Text>
                </View>
              </View>

              {/* Title */}
              <Text style={styles.cardTitle} numberOfLines={2}>
                {item.title}
              </Text>

              {/* Description preview */}
              <Text style={styles.cardDesc} numberOfLines={2}>
                &ldquo;{item.description}&rdquo;
              </Text>

              {/* Meta details */}
              <View style={styles.cardMetaRow}>
                <View style={styles.metaItem}>
                  <Icon name="receipt" size={13} color={Colors.neutral[500]} />
                  <Text style={styles.metaText}>Đơn #{item.bookingId}</Text>
                </View>
                <View style={styles.metaItem}>
                  <Icon name="person" size={13} color={Colors.neutral[500]} />
                  <Text style={styles.metaText}>Thợ: {item.againstName}</Text>
                </View>
                <View style={styles.metaItem}>
                  <Icon name="clock" size={13} color={Colors.neutral[500]} />
                  <Text style={styles.metaText}>{item.createdAt}</Text>
                </View>
              </View>

              {/* Resolution pill if resolved */}
              {item.status === "RESOLVED" && item.resolutionNote && (
                <View style={styles.resolutionPreview}>
                  <Icon
                    name="check"
                    size={15}
                    color={Colors.semantic.success}
                  />
                  <Text style={styles.resolutionPreviewText} numberOfLines={1}>
                    CSKH: {item.resolutionNote}
                  </Text>
                </View>
              )}

              {/* Card Footer: replies & action */}
              <View style={styles.cardFooter}>
                <View style={styles.repliesCountWrap}>
                  <Icon name="chat" size={15} color={Colors.primary[600]} />
                  <Text style={styles.repliesCountText}>
                    {repliesCount > 0
                      ? `${repliesCount} tin nhắn giải quyết`
                      : "Chưa có phản hồi"}
                  </Text>
                </View>
                <View style={styles.viewDetailLink}>
                  <Text style={styles.viewDetailText}>Xem chi tiết</Text>
                  <Icon
                    name="chevronRight"
                    size={14}
                    color={Colors.primary[600]}
                  />
                </View>
              </View>
            </TouchableOpacity>
          );
        }}
        ListEmptyComponent={
          <View style={styles.emptyWrap}>
            <View style={styles.emptyIconCircle}>
              <Icon name="document" size={36} color={Colors.neutral[400]} />
            </View>
            <Text style={styles.emptyTitle}>Chưa có khiếu nại nào</Text>
            <Text style={styles.emptySub}>
              {searchQuery
                ? "Không tìm thấy khiếu nại phù hợp với từ khóa."
                : "Mọi giao dịch dịch vụ của bạn đều đang diễn ra thuận lợi."}
            </Text>
            <TouchableOpacity
              style={styles.emptyCta}
              onPress={() => navigation.navigate("CreateComplaint")}
            >
              <Text style={styles.emptyCtaText}>Tạo khiếu nại mới</Text>
            </TouchableOpacity>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: Colors.neutral[50],
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Space.md,
    paddingVertical: Space.md,
    backgroundColor: Colors.neutral[0],
    borderBottomWidth: 1,
    borderBottomColor: Colors.neutral[200],
    ...Shadow.sm,
  },
  backBtn: {
    padding: Space.xs,
    marginRight: Space.sm,
  },
  headerTitleWrap: {
    flex: 1,
  },
  headerTitle: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize.lg,
    color: Colors.neutral[900],
  },
  headerSub: {
    fontFamily: FontFamily.regular,
    fontSize: FontSize.xs,
    color: Colors.neutral[500],
    marginTop: 2,
  },
  addBtnHeader: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.primary[50],
    paddingHorizontal: Space.sm,
    paddingVertical: 6,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: Colors.primary[200],
    gap: 4,
  },
  addBtnHeaderText: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize.xs,
    color: Colors.primary[700],
  },
  searchBarWrap: {
    paddingHorizontal: Space.md,
    paddingTop: Space.sm,
    paddingBottom: Space.xs,
    backgroundColor: Colors.neutral[0],
  },
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.neutral[100],
    borderRadius: Radius.full,
    paddingHorizontal: Space.md,
    height: 40,
    gap: Space.xs,
  },
  searchInput: {
    flex: 1,
    fontFamily: FontFamily.regular,
    fontSize: FontSize.sm,
    color: Colors.neutral[900],
  },
  tabsWrap: {
    flexDirection: "row",
    paddingHorizontal: Space.md,
    paddingVertical: Space.sm,
    backgroundColor: Colors.neutral[0],
    borderBottomWidth: 1,
    borderBottomColor: Colors.neutral[200],
    gap: Space.xs,
  },
  tab: {
    paddingHorizontal: Space.sm,
    paddingVertical: 6,
    borderRadius: Radius.full,
    backgroundColor: Colors.neutral[100],
  },
  tabActive: {
    backgroundColor: Colors.primary[600],
  },
  tabText: {
    fontFamily: FontFamily.medium,
    fontSize: FontSize.xs,
    color: Colors.neutral[600],
  },
  tabTextActive: {
    fontFamily: FontFamily.bold,
    color: Colors.neutral[0],
  },
  listContent: {
    padding: Space.md,
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
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Space.xs,
  },
  categoryBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.primary[50],
    paddingHorizontal: Space.sm,
    paddingVertical: 3,
    borderRadius: Radius.full,
    gap: 4,
  },
  categoryBadgeText: {
    fontFamily: FontFamily.bold,
    fontSize: 10,
    color: Colors.primary[700],
    textTransform: "uppercase",
  },
  statusBadge: {
    paddingHorizontal: Space.sm,
    paddingVertical: 3,
    borderRadius: Radius.full,
  },
  statusBadgeText: {
    fontFamily: FontFamily.bold,
    fontSize: 10,
    textTransform: "uppercase",
  },
  cardTitle: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize.md,
    color: Colors.neutral[900],
    marginTop: Space.xs,
  },
  cardDesc: {
    fontFamily: FontFamily.regular,
    fontSize: FontSize.xs,
    color: Colors.neutral[600],
    marginTop: Space.xs,
    lineHeight: 18,
    fontStyle: "italic",
  },
  cardMetaRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Space.md,
    marginTop: Space.sm,
    paddingTop: Space.xs,
    borderTopWidth: 1,
    borderTopColor: Colors.neutral[100],
  },
  metaItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  metaText: {
    fontFamily: FontFamily.regular,
    fontSize: 11,
    color: Colors.neutral[500],
  },
  resolutionPreview: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(16, 185, 129, 0.08)",
    borderRadius: Radius.md,
    paddingHorizontal: Space.sm,
    paddingVertical: 6,
    marginTop: Space.sm,
    gap: 6,
  },
  resolutionPreviewText: {
    flex: 1,
    fontFamily: FontFamily.medium,
    fontSize: 11,
    color: Colors.semantic.success,
  },
  cardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: Space.sm,
    paddingTop: Space.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.neutral[100],
  },
  repliesCountWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  repliesCountText: {
    fontFamily: FontFamily.medium,
    fontSize: FontSize.xs,
    color: Colors.primary[700],
  },
  viewDetailLink: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
  },
  viewDetailText: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize.xs,
    color: Colors.primary[600],
  },
  emptyWrap: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Space["2xl"],
    paddingHorizontal: Space.xl,
  },
  emptyIconCircle: {
    width: 72,
    height: 72,
    borderRadius: Radius.full,
    backgroundColor: Colors.neutral[100],
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Space.md,
  },
  emptyTitle: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize.lg,
    color: Colors.neutral[800],
    marginBottom: Space.xs,
  },
  emptySub: {
    fontFamily: FontFamily.regular,
    fontSize: FontSize.sm,
    color: Colors.neutral[500],
    textAlign: "center",
    marginBottom: Space.lg,
    lineHeight: 20,
  },
  emptyCta: {
    backgroundColor: Colors.primary[600],
    paddingHorizontal: Space.lg,
    paddingVertical: Space.sm,
    borderRadius: Radius.full,
  },
  emptyCtaText: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize.sm,
    color: Colors.neutral[0],
  },
});
