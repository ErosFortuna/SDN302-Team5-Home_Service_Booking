import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ViewStyle } from 'react-native';
import { Colors, category } from '../../constants/colors';
import { FontFamily, FontSize } from '../../constants/typography';
import { Radius, Shadow, Space } from '../../constants/spacing';
import { Icon } from './Icon';

const categoryIconName = {
  plumbing:        'plumbing',
  airConditioning: 'acRepair',
  electrical:      'electrical',
  cleaning:        'cleaning',
  applianceRepair: 'appliance',
} as const;

type CategoryKey = keyof typeof category;

interface ServiceCardProps {
  categoryKey: CategoryKey;
  title:       string;
  subtitle?:   string;
  onPress?:    () => void;
  style?:      ViewStyle;
}

export function ServiceCategoryCard({ categoryKey, title, subtitle, onPress, style }: ServiceCardProps) {
  const cat = category[categoryKey];
  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={onPress}
      style={[styles.serviceCard, { backgroundColor: cat.bg }, Shadow.sm, style]}
    >
      <View style={[styles.serviceIconBg, { backgroundColor: cat.icon + '22' }]}>
        <Icon
          name={categoryIconName[categoryKey]}
          size={30}
          color={cat.icon}
        />
      </View>
      <Text style={[styles.serviceTitle, { color: Colors.neutral[800] }]} numberOfLines={2}>
        {title}
      </Text>
      {subtitle && (
        <Text style={[styles.serviceSubtitle]} numberOfLines={1}>{subtitle}</Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  serviceCard: {
    width:         140,
    padding:       Space.lg,
    borderRadius:  Radius.lg,
    gap:           Space.sm,
  },
  serviceIconBg: {
    width:         52,
    height:        52,
    borderRadius:  Radius.md,
    alignItems:    'center',
    justifyContent:'center',
  },
  serviceTitle: {
    fontFamily: FontFamily.semiBold,
    fontSize:   FontSize.md,
  },
  serviceSubtitle: {
    fontFamily: FontFamily.regular,
    fontSize:   FontSize.sm,
    color:      Colors.neutral[500],
  },
});
