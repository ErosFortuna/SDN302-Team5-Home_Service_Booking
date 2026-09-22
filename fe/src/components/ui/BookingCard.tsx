import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ViewStyle } from 'react-native';
import { Colors, category } from '../../constants/colors';
import { FontFamily, FontSize } from '../../constants/typography';
import { Radius, Shadow, Space } from '../../constants/spacing';
import { Icon } from './Icon';
import { StatusBadge } from './Badge';

type BookingStatus = keyof typeof import('../../constants/colors').status;
type CategoryKey = keyof typeof category;

interface BookingCardProps {
  serviceName:  string;
  categoryKey:  CategoryKey;
  providerName: string;
  bookingStatus: BookingStatus;
  scheduledDate?: string;
  amount?:       number;
  onPress?:      () => void;
  style?:        ViewStyle;
}

export function BookingCard({
  serviceName, categoryKey, providerName, bookingStatus, scheduledDate, amount, onPress, style,
}: BookingCardProps) {
  const cat = category[categoryKey];
  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={onPress}
      style={[styles.bookingCard, Shadow.sm, style]}
    >
      <View style={[styles.bookingAccent, { backgroundColor: cat.icon }]} />

      <View style={styles.bookingContent}>
        <View style={styles.bookingHeader}>
          <View style={styles.bookingTitleRow}>
            <Text style={{ fontSize: 18 }}>{cat.emoji}</Text>
            <Text style={styles.bookingTitle} numberOfLines={1}>{serviceName}</Text>
          </View>
          <StatusBadge bookingStatus={bookingStatus} size="sm" />
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          <Icon name="tool" size={14} color={Colors.neutral[400]} />
          <Text style={styles.bookingProvider}>{providerName}</Text>
        </View>

        <View style={styles.bookingFooter}>
          {scheduledDate && (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <Icon name="calendar" size={13} color={Colors.neutral[400]} />
              <Text style={styles.bookingDate}>{scheduledDate}</Text>
            </View>
          )}
          {amount !== undefined && (
            <Text style={styles.bookingAmount}>
              {amount.toLocaleString('vi-VN')}đ
            </Text>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  bookingCard: {
    flexDirection:   'row',
    backgroundColor: Colors.neutral[0],
    borderRadius:    Radius.lg,
    overflow:        'hidden',
  },
  bookingAccent: { width: 4 },
  bookingContent: {
    flex:    1,
    padding: Space.lg,
    gap:     Space.sm,
  },
  bookingHeader: {
    flexDirection:  'row',
    alignItems:     'flex-start',
    justifyContent: 'space-between',
    gap:            Space.sm,
  },
  bookingTitleRow: {
    flexDirection: 'row',
    alignItems:    'center',
    gap:           Space.sm,
    flex:          1,
  },
  bookingTitle: {
    fontFamily: FontFamily.semiBold,
    fontSize:   FontSize.md,
    color:      Colors.neutral[800],
    flex:       1,
  },
  bookingProvider: {
    fontFamily: FontFamily.regular,
    fontSize:   FontSize.sm,
    color:      Colors.neutral[500],
  },
  bookingFooter: {
    flexDirection:  'row',
    justifyContent: 'space-between',
    alignItems:     'center',
  },
  bookingDate: {
    fontFamily: FontFamily.regular,
    fontSize:   FontSize.sm,
    color:      Colors.neutral[400],
  },
  bookingAmount: {
    fontFamily: FontFamily.bold,
    fontSize:   FontSize.md,
    color:      Colors.primary[600],
  },
});
