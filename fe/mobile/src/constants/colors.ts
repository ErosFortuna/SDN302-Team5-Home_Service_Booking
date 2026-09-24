/**
 * Home Service Booking — Design Tokens: Colors
 * Primary: Teal #00B4A6  |  Accent CTA: Amber #FFC107
 */

// ─── PRIMARY — Teal ──────────────────────────────────────────────────────────
export const primary = {
  50: '#E6F7F5',
  100: '#B3E8E1',
  200: '#80D9CE',
  300: '#4DCABB',
  400: '#26BFB0',
  500: '#00B4A6', // ← MAIN BRAND COLOR
  600: '#009E91',
  700: '#008880',
  800: '#006B63',
  900: '#004E47',
} as const;

// ─── ACCENT — Amber (CTA) ────────────────────────────────────────────────────
export const accent = {
  50: '#FFF8E6',
  100: '#FFEDB3',
  200: '#FFE180',
  300: '#FFD54D',
  400: '#FFCC26',
  500: '#FFC107', // ← CTA: Book Now, Accept Quote
  600: '#E6AC00',
  700: '#CC9900',
} as const;

// ─── NEUTRALS — Warm Gray ────────────────────────────────────────────────────
export const neutral = {
  0: '#FFFFFF',
  50: '#F8F9FA',
  100: '#F0F2F3',
  200: '#E1E5E8',
  300: '#C8CDD2',
  400: '#9DA5AE',
  500: '#71798A',
  600: '#505767',
  700: '#363E4E',
  800: '#1E2435',
  900: '#0D1117',
} as const;

// ─── SEMANTIC ─────────────────────────────────────────────────────────────────
export const semantic = {
  success: '#10B981',
  successBg: '#ECFDF5',
  warning: '#F59E0B',
  warningBg: '#FFFBEB',
  error: '#EF4444',
  errorBg: '#FEF2F2',
  info: '#3B82F6',
  infoBg: '#EFF6FF',
} as const;

// ─── BOOKING STATUS MACHINE ───────────────────────────────────────────────────
export const status = {
  requested: { text: '#7C3AED', bg: '#F3EEFF', dot: '#7C3AED' },
  matching:  { text: '#2563EB', bg: '#EFF6FF', dot: '#2563EB' },
  quoting:   { text: '#D97706', bg: '#FFFBEB', dot: '#D97706' },
  confirmed: { text: '#059669', bg: '#ECFDF5', dot: '#059669' },
  inProgress:{ text: '#0284C7', bg: '#E0F2FE', dot: '#0284C7' },
  arrived:   { text: '#0EA5E9', bg: '#F0F9FF', dot: '#0EA5E9' },
  awaitingApproval: { text: '#9333EA', bg: '#FAF5FF', dot: '#9333EA' },
  completed: { text: '#16A34A', bg: '#F0FDF4', dot: '#16A34A' },
  closed:    { text: '#6B7280', bg: '#F3F4F6', dot: '#6B7280' },
  cancelled: { text: '#DC2626', bg: '#FEF2F2', dot: '#DC2626' },
  rejected:  { text: '#B91C1C', bg: '#FEE2E2', dot: '#B91C1C' },
  expired:   { text: '#9CA3AF', bg: '#F9FAFA', dot: '#9CA3AF' },
} as const;

// ─── SERVICE CATEGORY COLORS ─────────────────────────────────────────────────
export const category = {
  plumbing:        { icon: '#0284C7', bg: '#E0F2FE', emoji: '💧' },
  airConditioning: { icon: '#00B4A6', bg: '#E6F7F5', emoji: '❄️' },
  electrical:      { icon: '#D97706', bg: '#FFFBEB', emoji: '⚡' },
  cleaning:        { icon: '#059669', bg: '#ECFDF5', emoji: '🧹' },
  applianceRepair: { icon: '#7C3AED', bg: '#F3EEFF', emoji: '🔧' },
} as const;

// ─── DARK MODE SURFACES ───────────────────────────────────────────────────────
export const dark = {
  bgPrimary:  '#0D1117',
  bgCard:     '#1A2130',
  bgElevated: '#222D40',
  border:     '#2D3748',
  textPrimary:   '#F0F2F3',
  textSecondary: '#9DA5AE',
  textDisabled:  '#505767',
} as const;

// ─── LIGHT MODE SURFACES ──────────────────────────────────────────────────────
export const light = {
  bgPrimary:  '#F8F9FA',
  bgCard:     '#FFFFFF',
  bgElevated: '#FFFFFF',
  border:     '#E1E5E8',
  textPrimary:   '#0D1117',
  textSecondary: '#505767',
  textDisabled:  '#9DA5AE',
} as const;

// ─── GRADIENTS (use with expo-linear-gradient) ────────────────────────────────
export const gradients = {
  heroTeal:   ['#00B4A6', '#0284C7'] as const,
  ctaAmber:   ['#FFC107', '#F59E0B'] as const,
  darkHeader: ['#1A2130', '#0D1117'] as const,
  cardOverlay:['rgba(0,0,0,0)', 'rgba(0,0,0,0.6)'] as const,
  inProgress: ['#0284C7', '#00B4A6'] as const,
} as const;

// ─── TRANSPARENT (Opacities) ────────────────────────────────────────────────
export const transparent = {
  white20: 'rgba(255,255,255,0.2)',
  white70: 'rgba(255,255,255,0.7)',
  white85: 'rgba(255,255,255,0.85)',
  white90: 'rgba(255,255,255,0.9)',
  black15: 'rgba(0,0,0,0.15)',
  black60: 'rgba(0,0,0,0.6)',
} as const;

// ─── SHORTHAND ALIASES (most used) ───────────────────────────────────────────
export const Colors = {
  // Brand
  brand:        primary[500],
  brandLight:   primary[50],
  brandDark:    primary[900],
  cta:          accent[500],
  ctaDark:      accent[600],

  // Text
  textDark:     neutral[900],
  textMuted:    neutral[500],
  textLight:    neutral[0],

  // Surfaces
  white:        neutral[0],
  bgLight:      neutral[50],
  bgCard:       neutral[0],
  border:       neutral[200],

  // Semantic
  success:      semantic.success,
  warning:      semantic.warning,
  error:        semantic.error,
  info:         semantic.info,

  // Raw palettes (for full access)
  primary,
  accent,
  neutral,
  semantic,
  status,
  category,
  dark,
  light,
  gradients,
  transparent,
} as const;

export type ColorKey = keyof typeof Colors;
