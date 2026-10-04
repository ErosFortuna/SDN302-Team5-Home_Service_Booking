import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors } from '../../../constants/colors';
import { FontFamily, FontSize } from '../../../constants/typography';
import { Radius, Shadow, Space } from '../../../constants/spacing';
import { Icon, AppIcons } from '../../../components/ui/Icon';
import { STATS } from './mockData';

export function StatsStrip() {
  return (
    <View style={styles.statsStrip}>
      {STATS.map((item, i) => (
        <View key={i} style={styles.statItem}>
          <Icon
            name={item.icon as keyof typeof AppIcons}
            size={22}
            color={item.color}
          />
          <Text style={[styles.statLabel, { color: item.color }]}>
            {item.label}
          </Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  statsStrip: {
    flexDirection: "row",
    justifyContent: "space-around",
    backgroundColor: Colors.neutral[0],
    marginHorizontal: Space.xl,
    marginTop: -Space.xl,
    borderRadius: Radius.xl,
    paddingVertical: Space.lg + Space.xs,
    ...Shadow.sm,
    borderWidth: 1,
    borderColor: Colors.neutral[100],
  },
  statItem: { alignItems: "center", gap: 4 },
  statLabel: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSize.sm,
  },
});
