import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { Icon, AppIconKey } from './Icon';
import { ServiceCategory } from '../../types';
import { Radius } from '../../constants/spacing';

const CATEGORY_CONFIG: Record<
  ServiceCategory,
  { icon: AppIconKey; color: string; bgColor: string }
> = {
  Cleaning: { icon: 'cleaning', color: '#00B4A6', bgColor: '#E4F7F4' },
  Electrical: { icon: 'electrical', color: '#D97706', bgColor: '#FEF3C7' },
  Plumbing: { icon: 'plumbing', color: '#0284C7', bgColor: '#E0F2FE' },
  Appliance: { icon: 'appliance', color: '#7C3AED', bgColor: '#EDE9FE' },
  Painting: { icon: 'painting', color: '#E11D48', bgColor: '#FFE4E6' },
};

interface Props {
  category: ServiceCategory;
  size?: number;
  style?: ViewStyle;
}

export function CategoryIcon({ category, size = 44, style }: Props) {
  const cfg = CATEGORY_CONFIG[category] || CATEGORY_CONFIG.Cleaning;
  const iconSize = Math.round(size * 0.52);

  return (
    <View
      style={[
        styles.container,
        {
          width: size,
          height: size,
          backgroundColor: cfg.bgColor,
        },
        style,
      ]}
    >
      <Icon name={cfg.icon} size={iconSize} color={cfg.color} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: Radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
