import React from 'react';
// ← Truyền icon vào qua leftIcon/rightIcon props:
// import { Icon, AppIcons } from './Icon';
// <Button leftIcon={<Icon name={AppIcons.add} size={20} color="#000" />} label="Thêm" />
import {
  TouchableOpacity,
  Text,
  ActivityIndicator,
  StyleSheet,
  ViewStyle,
  TextStyle,
  TouchableOpacityProps,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, gradients } from '../../constants/colors';
import { FontFamily, FontSize } from '../../constants/typography';
import { Radius, Shadow, Space, HitSlop } from '../../constants/spacing';

// ─── TYPES ───────────────────────────────────────────────────────────────────
type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
type ButtonSize    = 'sm' | 'md' | 'lg';

interface ButtonProps extends TouchableOpacityProps {
  variant?:  ButtonVariant;
  size?:     ButtonSize;
  label:     string;
  loading?:  boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  fullWidth?: boolean;
  gradient?: boolean; // use gradient background for primary/cta
}

// ─── VARIANT CONFIG ──────────────────────────────────────────────────────────
const variantConfig: Record<ButtonVariant, {
  bg: string; text: string; border?: string; shadow?: object;
}> = {
  primary:   { bg: Colors.cta,           text: Colors.neutral[900], shadow: Shadow.ctaGlow },
  secondary: { bg: Colors.brand,         text: Colors.neutral[0],            shadow: Shadow.brandGlow },
  outline:   { bg: 'transparent',        text: Colors.brand,         border: Colors.brand },
  ghost:     { bg: 'transparent',        text: Colors.brand },
  danger:    { bg: Colors.semantic.error, text: Colors.neutral[0] },
};

const sizeConfig: Record<ButtonSize, {
  height: number; px: number; fontSize: number; radius: number; iconGap: number;
}> = {
  sm: { height: 36, px: Space.md, fontSize: FontSize.sm,  radius: Radius.sm, iconGap: 4 },
  md: { height: 48, px: Space.lg, fontSize: FontSize.md,  radius: Radius.md, iconGap: 6 },
  lg: { height: 56, px: Space.xl, fontSize: FontSize.lg,  radius: Radius.lg, iconGap: 8 },
};

// ─── COMPONENT ───────────────────────────────────────────────────────────────
export function Button({
  variant   = 'primary',
  size      = 'md',
  label,
  loading   = false,
  leftIcon,
  rightIcon,
  fullWidth = false,
  gradient  = false,
  disabled,
  style,
  ...rest
}: ButtonProps) {
  const v = variantConfig[variant];
  const s = sizeConfig[size];
  const isDisabled = disabled || loading;

  const containerStyle: ViewStyle = {
    height:          s.height,
    paddingHorizontal: s.px,
    borderRadius:    s.radius,
    flexDirection:   'row',
    alignItems:      'center',
    justifyContent:  'center',
    ...(v.border ? { borderWidth: 1.5, borderColor: isDisabled ? Colors.neutral[300] : v.border } : {}),
    ...(isDisabled ? {} : v.shadow ?? {}),
    ...(fullWidth ? { width: '100%' } : { alignSelf: 'flex-start' }),
    opacity: isDisabled ? 0.5 : 1,
  };

  const labelStyle: TextStyle = {
    fontFamily: FontFamily.semiBold,
    fontSize:   s.fontSize,
    color:      v.text,
    letterSpacing: 0.3,
  };

  const content = (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: s.iconGap }}>
      {leftIcon && !loading && leftIcon}
      {loading ? (
        <ActivityIndicator size="small" color={v.text} />
      ) : (
        <Text style={labelStyle} numberOfLines={1}>{label}</Text>
      )}
      {rightIcon && !loading && rightIcon}
    </View>
  );

  // Gradient variant (primary CTA with amber gradient)
  if (gradient && (variant === 'primary' || variant === 'secondary') && !isDisabled) {
    const grad = variant === 'primary' ? gradients.ctaAmber : gradients.heroTeal;
    return (
      <TouchableOpacity
        activeOpacity={0.85}
        disabled={isDisabled}
        hitSlop={HitSlop.sm}
        style={[{ borderRadius: s.radius, overflow: 'hidden' }, fullWidth && { width: '100%' }, style as ViewStyle]}
        {...rest}
      >
        <LinearGradient
          colors={grad}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={[containerStyle, { ...(v.shadow ?? {}) }]}
        >
          {content}
        </LinearGradient>
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity
      activeOpacity={0.8}
      disabled={isDisabled}
      hitSlop={HitSlop.sm}
      style={[containerStyle, { backgroundColor: isDisabled ? Colors.neutral[200] : v.bg }, style as ViewStyle]}
      {...rest}
    >
      {content}
    </TouchableOpacity>
  );
}
