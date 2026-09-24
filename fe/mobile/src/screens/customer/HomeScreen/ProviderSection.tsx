import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { Colors } from '../../../constants/colors';
import { FontFamily, FontSize } from '../../../constants/typography';
import { Space } from '../../../constants/spacing';
import { ProviderCard } from '../../../components/ui';
import { Icon } from '../../../components/ui/Icon';
import { PROVIDERS } from './mockData';

export function ProviderSection() {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Thợ gần bạn</Text>
        <TouchableOpacity
          style={{ flexDirection: "row", alignItems: "center" }}
        >
          <Text style={styles.seeAll}>Xem tất cả</Text>
          <Icon name="chevronRight" size={16} color={Colors.primary[500]} />
        </TouchableOpacity>
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.hScroll}
        contentContainerStyle={styles.hScrollContent}
      >
        {PROVIDERS.map((p) => (
          <ProviderCard
            key={p.id}
            name={p.name}
            rating={p.rating}
            reviewCount={p.reviewCount}
            distance={p.distance}
            verified={p.verified}
            style={{ marginRight: Space.lg }}
          />
        ))}
      </ScrollView>
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
  hScroll: {
    paddingLeft: Space.lg,
    backgroundColor: "transparent",
  },
  hScrollContent: {
    paddingRight: Space.xl,
    paddingBottom: Space.sm,
    paddingTop: Space.lg,
  },
});
