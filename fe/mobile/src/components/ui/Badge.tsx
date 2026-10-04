import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors, status } from '../../constants/colors';
import { FontFamily, FontSize } from '../../constants/typography';
import { Radius, Space } from '../../constants/spacing';

export type AnyBookingStatus =
  | keyof typeof status
  | 'pending'
  | 'quoted'
  | 'in_progress';

interface BadgeProps {
  bookingStatus: AnyBookingStatus;
  showDot?: boolean;
  size?: 'sm' | 'md';
}

const statusNormalized: Record<string, keyof typeof status> = {
  pending: 'matching',
  quoted: 'quoting',
  in_progress: 'inProgress',
};

const statusLabel: Record<string, string> = {
  requested: 'Đã gửi yêu cầu',
  matching: 'Đang tìm thợ',
  pending: 'Chờ thợ báo giá',
  quoting: 'Đang báo giá',
  quoted: 'Đã có báo giá',
  confirmed: 'Đã xác nhận',
  inProgress: 'Đang thực hiện',
  in_progress: 'Đang thực hiện',
  arrived: 'Thợ đã đến',
  awaitingApproval: 'Chờ xác nhận',
  completed: 'Hoàn thành',
  closed: 'Đã đóng',
  cancelled: 'Đã hủy',
  rejected: 'Bị từ chối',
  expired: 'Hết hạn',
};

export function StatusBadge({ bookingStatus, showDot = true, size = 'md' }: BadgeProps) {
  const normalizedKey = statusNormalized[bookingStatus] || (bookingStatus as keyof typeof status);
  const s = status[normalizedKey] || status.requested;
  const isSmall = size === 'sm';

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: s.bg, paddingHorizontal: isSmall ? Space.sm : Space.md },
      ]}
    >
      {showDot && (
        <View
          style={[
            styles.dot,
            { backgroundColor: s.dot, width: isSmall ? 5 : 6, height: isSmall ? 5 : 6 },
          ]}
        />
      )}
      <Text
        style={[
          styles.label,
          { color: s.text, fontSize: isSmall ? FontSize.xs : FontSize.sm },
        ]}
      >
        {statusLabel[bookingStatus] || String(bookingStatus)}
      </Text>
    </View>
  );
}

interface GenericBadgeProps {
  label: string;
  color: string;
  bgColor: string;
  size?: 'sm' | 'md';
  showDot?: boolean;
}

export function Badge({ label, color, bgColor, size = 'md', showDot = false }: GenericBadgeProps) {
  const isSmall = size === 'sm';
  return (
    <View
      style={[
        styles.container,
        { backgroundColor: bgColor, paddingHorizontal: isSmall ? Space.sm : Space.md },
      ]}
    >
      {showDot && <View style={[styles.dot, { backgroundColor: color }]} />}
      <Text
        style={[
          styles.label,
          { color, fontSize: isSmall ? FontSize.xs : FontSize.sm },
        ]}
      >
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingVertical: 4,
    borderRadius: Radius.full,
    alignSelf: 'flex-start',
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: Radius.full,
  },
  label: {
    fontFamily: FontFamily.medium,
    fontSize: FontSize.sm,
    letterSpacing: 0.3,
  },
});
