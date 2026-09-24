import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, gradients } from '../../constants/colors';
import { FontFamily, FontSize } from '../../constants/typography';
import { Radius, Shadow, Space } from '../../constants/spacing';

// ─── INFO CARD (generic container) ───────────────────────────────────────────
interface InfoCardProps {
  children: React.ReactNode;
  style?:   ViewStyle;
  variant?: 'default' | 'teal' | 'amber' | 'elevated';
}

export function Card({ children, style, variant = 'default' }: InfoCardProps) {
  const bgMap = {
    default:  Colors.neutral[0],
    teal:     Colors.primary[50],
    amber:    Colors.accent[50],
    elevated: Colors.neutral[0],
  };
  return (
    <View style={[
      styles.card,
      { backgroundColor: bgMap[variant] },
      variant === 'elevated' ? Shadow.md : Shadow.sm,
      style,
    ]}>
      {children}
    </View>
  );
}

// ─── GRADIENT HERO CARD ───────────────────────────────────────────────────────
interface HeroCardProps {
  title:    string;
  subtitle?: string;
  children?: React.ReactNode;
  style?:   ViewStyle;
}

export function HeroCard({ title, subtitle, children, style }: HeroCardProps) {
  return (
    <LinearGradient
      colors={gradients.heroTeal}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[styles.heroCard, Shadow.xl, style]}
    >
      <Text style={styles.heroTitle}>{title}</Text>
      {subtitle && <Text style={styles.heroSubtitle}>{subtitle}</Text>}
      {children}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  // Generic card
  card: {
    borderRadius: Radius.lg,
    padding:      Space.lg,
  },

  // Hero card
  heroCard: {
    borderRadius: Radius.xl,
    padding:      Space.xl,
  },
  heroTitle: {
    fontFamily: FontFamily.bold,
    fontSize:   FontSize['3xl'],
    color:      '#FFFFFF',
  },
  heroSubtitle: {
    fontFamily: FontFamily.regular,
    fontSize:   FontSize.lg,
    color:      'rgba(255,255,255,0.85)',
    marginTop:  Space.sm,
  },
});
