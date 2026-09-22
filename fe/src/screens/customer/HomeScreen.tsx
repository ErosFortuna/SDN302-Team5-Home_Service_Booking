import React from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  SafeAreaView,
  TextInput,
  TouchableOpacity,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Colors, gradients } from "../../constants/colors";
import { FontFamily, FontSize } from "../../constants/typography";
import { Radius, Shadow, Space } from "../../constants/spacing";
import { Button } from "../../components/ui";
import { Icon } from "../../components/ui/Icon";
import { MainTabNavigationProp } from '../../types/navigation';

import { StatsStrip } from "./HomeScreen/StatsStrip";
import { ServiceSection } from "./HomeScreen/ServiceSection";
import { ProviderSection } from "./HomeScreen/ProviderSection";
import { RecentBookingsSection } from "./HomeScreen/RecentBookingsSection";

type Props = {
  navigation: MainTabNavigationProp<'Home'>;
};

export default function HomeScreen({ navigation }: Props) {
  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Header ── */}
        <LinearGradient
          colors={gradients.heroTeal}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.header}
        >
          <View style={styles.headerTop}>
            <View>
              <Text style={styles.greeting}>Xin chào, Minh 👋</Text>
              <Text style={styles.subGreeting}>Bạn cần sửa gì hôm nay?</Text>
            </View>
            <TouchableOpacity style={styles.notifBtn} accessibilityLabel="Thông báo">
              <Icon name="notification" size={24} color={Colors.neutral[0]} />
            </TouchableOpacity>
          </View>

          {/* Search bar */}
          <View style={styles.searchBar}>
            <Icon name="search" size={20} color={Colors.neutral[400]} />
            <TextInput
              placeholder="Tìm dịch vụ, thợ..."
              placeholderTextColor={Colors.neutral[400]}
              style={styles.searchInput}
            />
          </View>
        </LinearGradient>

        {/* ── Quick stats strip ── */}
        <StatsStrip />

        {/* ── Service Categories ── */}
        <ServiceSection navigation={navigation} />

        {/* ── Divider ── */}
        <View style={styles.sectionDivider} />

        {/* ── Nearby Providers ── */}
        <ProviderSection />

        {/* ── Divider ── */}
        <View style={styles.sectionDivider} />

        {/* ── Recent Bookings ── */}
        <RecentBookingsSection navigation={navigation} />

        {/* ── Divider ── */}
        <View style={styles.sectionDivider} />

        {/* ── CTA ── */}
        <View style={styles.ctaSection}>
          <Button
            label="Đặt dịch vụ mới"
            variant="primary"
            size="lg"
            gradient
            fullWidth
            leftIcon={<Icon name="add" size={22} color={Colors.neutral[900]} />}
            onPress={() => navigation.navigate("ServiceList", {})}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── STYLES ──────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: Colors.neutral[50],
  },
  scroll: { flex: 1 },
  content: { paddingBottom: 80 },

  // Header
  header: {
    paddingTop: 16,
    paddingHorizontal: Space.xl,
    paddingBottom: Space.xl + Space.lg,
    gap: Space.lg,
    borderBottomLeftRadius: Radius.xl,
    borderBottomRightRadius: Radius.xl,
  },
  headerTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  greeting: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize["3xl"],
    color: Colors.neutral[0],
    marginBottom: Space.xs,
  },
  subGreeting: {
    fontFamily: FontFamily.regular,
    fontSize: FontSize.md,
    color: Colors.transparent.white85,
  },
  notifBtn: {
    backgroundColor: Colors.transparent.white20,
    borderRadius: Radius.full,
    padding: Space.sm,
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.neutral[0],
    borderRadius: Radius.full,
    paddingHorizontal: Space.lg,
    paddingVertical: Space.sm + 2,
    gap: Space.sm,
    ...Shadow.sm,
  },
  searchInput: {
    flex: 1,
    fontFamily: FontFamily.regular,
    fontSize: FontSize.md,
    color: Colors.neutral[800],
  },

  // Sections
  sectionDivider: {
    height: 6,
    backgroundColor: Colors.neutral[200],
  },

  // CTA
  ctaSection: {
    backgroundColor: Colors.neutral[0],
    paddingHorizontal: Space.xl,
    paddingVertical: Space.xl,
    marginTop: 2,
  },
});
