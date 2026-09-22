import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  FlatList,
} from "react-native";
import { Colors } from "../../constants/colors";
import { FontFamily, FontSize } from "../../constants/typography";
import { Radius, Space } from "../../constants/spacing";
import { Header } from "../../components/layout/Header";
import { Button, Icon, BookingCard } from "../../components/ui";
import { MainTabNavigationProp } from "../../types/navigation";

type Tab = "active" | "history";

const MOCK_ACTIVE = [
  {
    id: "1",
    serviceName: "Vệ sinh máy lạnh",
    categoryKey: "airConditioning" as const,
    providerName: "Nguyễn Văn An",
    bookingStatus: "inProgress" as const,
    scheduledDate: "Hôm nay – 14:00",
    amount: 150000,
  },
  {
    id: "2",
    serviceName: "Sửa ống nước rò rỉ",
    categoryKey: "plumbing" as const,
    providerName: "Trần Minh Tuấn",
    bookingStatus: "confirmed" as const,
    scheduledDate: "24/09 – 09:00",
    amount: 200000,
  },
];

const MOCK_HISTORY = [
  {
    id: "3",
    serviceName: "Thay bóng đèn",
    categoryKey: "electrical" as const,
    providerName: "Lê Thị Hoa",
    bookingStatus: "completed" as const,
    scheduledDate: "15/09 – 10:00",
    amount: 100000,
  },
  {
    id: "4",
    serviceName: "Dọn dẹp nhà cửa",
    categoryKey: "cleaning" as const,
    providerName: "Phạm Đức Vinh",
    bookingStatus: "cancelled" as const,
    scheduledDate: "10/09 – 14:00",
    amount: 120000,
  },
];

type Props = {
  navigation: MainTabNavigationProp<"Bookings">;
};

export default function BookingHistoryScreen({ navigation }: Props) {
  const [activeTab, setActiveTab] = useState<Tab>("active");

  const data = activeTab === "active" ? MOCK_ACTIVE : MOCK_HISTORY;

  return (
    <SafeAreaView style={styles.safeArea}>
      <Header title="Lịch đặt dịch vụ" />

      {/* Tabs */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[
            styles.tabButton,
            activeTab === "active" && styles.tabButtonActive,
          ]}
          onPress={() => setActiveTab("active")}
        >
          <Text
            style={[
              styles.tabText,
              activeTab === "active" && styles.tabTextActive,
            ]}
          >
            Đang thực hiện
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.tabButton,
            activeTab === "history" && styles.tabButtonActive,
          ]}
          onPress={() => setActiveTab("history")}
        >
          <Text
            style={[
              styles.tabText,
              activeTab === "history" && styles.tabTextActive,
            ]}
          >
            Lịch sử
          </Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={data as any[]}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => (
          <BookingCard
            serviceName={item.serviceName}
            categoryKey={item.categoryKey}
            providerName={item.providerName}
            bookingStatus={item.bookingStatus}
            scheduledDate={item.scheduledDate}
            amount={item.amount}
          />
        )}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIconBg}>
              <Icon name="calendar" size={48} color={Colors.primary[500]} />
            </View>
            <Text style={styles.emptyTitle}>Chưa có lịch đặt nào</Text>
            <Text style={styles.emptyText}>
              Bạn hiện chưa có lịch hẹn nào. Hãy đặt dịch vụ ngay để trải nghiệm
              nhé!
            </Text>
            <Button
              label="Tìm dịch vụ"
              variant="outline"
              size="md"
              style={{ marginTop: Space.lg }}
              onPress={() => navigation.navigate("Home")}
            />
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.neutral[50],
  },
  tabContainer: {
    flexDirection: "row",
    padding: Space.md,
    backgroundColor: Colors.neutral[0],
    borderBottomWidth: 1,
    borderBottomColor: Colors.neutral[200],
  },
  tabButton: {
    flex: 1,
    paddingVertical: Space.sm,
    alignItems: "center",
    borderBottomWidth: 2,
    borderBottomColor: "transparent",
  },
  tabButtonActive: {
    borderBottomColor: Colors.primary[500],
  },
  tabText: {
    fontFamily: FontFamily.medium,
    fontSize: FontSize.md,
    color: Colors.neutral[500],
  },
  tabTextActive: {
    fontFamily: FontFamily.semiBold,
    color: Colors.primary[600],
  },
  listContent: {
    padding: Space.lg,
    gap: Space.md,
  },
  emptyContainer: {
    padding: Space.xl,
    alignItems: "center",
    justifyContent: "center",
    marginTop: Space["3xl"],
  },
  emptyIconBg: {
    width: 96,
    height: 96,
    borderRadius: Radius.full,
    backgroundColor: Colors.primary[50],
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Space.lg,
  },
  emptyTitle: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize.lg,
    color: Colors.neutral[900],
    marginBottom: Space.sm,
  },
  emptyText: {
    fontFamily: FontFamily.regular,
    fontSize: FontSize.md,
    color: Colors.neutral[500],
    textAlign: "center",
    lineHeight: 22,
  },
});
