import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Colors } from '../../../constants/colors';
import { FontFamily, FontSize } from '../../../constants/typography';
import { Space } from '../../../constants/spacing';
import { BookingCard } from '../../../components/ui';
import { Icon } from '../../../components/ui/Icon';
import { RECENT_BOOKINGS } from './mockData';
import { MainTabNavigationProp } from '../../../types/navigation';

export function RecentBookingsSection({ navigation }: { navigation: MainTabNavigationProp<'Home'> }) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
          <Icon name="bookings" size={24} color={Colors.primary[600]} />
          <Text style={styles.sectionTitle}>Lịch gần đây</Text>
        </View>
        <TouchableOpacity
          style={{ flexDirection: "row", alignItems: "center" }}
          onPress={() => navigation.navigate("Bookings")}
        >
          <Text style={styles.seeAll}>Xem tất cả</Text>
          <Icon name="chevronRight" size={16} color={Colors.primary[500]} />
        </TouchableOpacity>
      </View>
      <View style={{ gap: Space.md, paddingHorizontal: Space.lg }}>
        {RECENT_BOOKINGS.map((b) => (
          <BookingCard
            key={b.id}
            serviceName={b.serviceName}
            categoryKey={b.categoryKey}
            providerName={b.providerName}
            bookingStatus={b.bookingStatus}
            scheduledDate={b.scheduledDate}
            amount={b.amount}
            onPress={() => navigation.navigate("Booking")}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    backgroundColor: Colors.neutral[50],
    paddingTop: Space.xl,
    paddingBottom: Space.lg,
    marginTop: 2,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: Space.xl,
    marginBottom: Space.lg,
    borderLeftWidth: 3,
    borderLeftColor: Colors.primary[500],
    paddingLeft: Space.lg,
    marginLeft: Space.md,
    marginRight: Space.md,
  },
  sectionTitle: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize.xl,
    color: Colors.neutral[900],
  },
  seeAll: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSize.sm,
    color: Colors.primary[500],
  },
});
