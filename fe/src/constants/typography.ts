import { Platform } from 'react-native';

// ─── FONT FAMILY ──────────────────────────────────────────────────────────────
// Native: uses expo-font asset name  |  Web: uses Google Fonts CSS 'Inter'
const isWeb = Platform.OS === 'web';

export const FontFamily = {
  thin:       isWeb ? 'Inter' : 'Inter_100Thin',
  extraLight: isWeb ? 'Inter' : 'Inter_200ExtraLight',
  light:      isWeb ? 'Inter' : 'Inter_300Light',
  regular:    isWeb ? 'Inter' : 'Inter_400Regular',
  medium:     isWeb ? 'Inter' : 'Inter_500Medium',
  semiBold:   isWeb ? 'Inter' : 'Inter_600SemiBold',
  bold:       isWeb ? 'Inter' : 'Inter_700Bold',
  extraBold:  isWeb ? 'Inter' : 'Inter_800ExtraBold',
  black:      isWeb ? 'Inter' : 'Inter_900Black',
} as const;

// ─── FONT SIZE (sp — scale-independent pixels) ───────────────────────────────
export const FontSize = {
  xs:   10,
  sm:   12,
  md:   14,
  lg:   16,
  xl:   18,
  '2xl': 20,
  '3xl': 24,
  '4xl': 28,
  '5xl': 32,
  '6xl': 40,
} as const;

// ─── LINE HEIGHT ─────────────────────────────────────────────────────────────
export const LineHeight = {
  tight:  1.2,
  snug:   1.375,
  normal: 1.5,
  relaxed:1.625,
} as const;

// ─── LETTER SPACING ──────────────────────────────────────────────────────────
export const LetterSpacing = {
  tighter: -0.5,
  tight:   -0.25,
  normal:  0,
  wide:    0.5,
  wider:   1,
  widest:  1.5,
} as const;

// ─── TYPOGRAPHY PRESETS ──────────────────────────────────────────────────────
export const TextStyle = {
  // Display
  displayXL: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize['5xl'],       // 32
    lineHeight: FontSize['5xl'] * 1.2,
    letterSpacing: LetterSpacing.tight,
  },
  displayLG: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize['4xl'],       // 28
    lineHeight: FontSize['4xl'] * 1.2,
    letterSpacing: LetterSpacing.tight,
  },

  // Headings
  h1: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSize['3xl'],       // 24
    lineHeight: FontSize['3xl'] * 1.3,
  },
  h2: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSize['2xl'],       // 20
    lineHeight: FontSize['2xl'] * 1.3,
  },
  h3: {
    fontFamily: FontFamily.medium,
    fontSize: FontSize.xl,           // 18
    lineHeight: FontSize.xl * 1.4,
  },
  h4: {
    fontFamily: FontFamily.medium,
    fontSize: FontSize.lg,           // 16
    lineHeight: FontSize.lg * 1.4,
  },

  // Body
  bodyLG: {
    fontFamily: FontFamily.regular,
    fontSize: FontSize.lg,           // 16
    lineHeight: FontSize.lg * 1.5,
  },
  bodyMD: {
    fontFamily: FontFamily.regular,
    fontSize: FontSize.md,           // 14
    lineHeight: FontSize.md * 1.5,
  },
  bodySM: {
    fontFamily: FontFamily.regular,
    fontSize: FontSize.sm,           // 12
    lineHeight: FontSize.sm * 1.5,
  },

  // Special
  label: {
    fontFamily: FontFamily.medium,
    fontSize: FontSize.xs,           // 10
    lineHeight: FontSize.xs * 1.4,
    letterSpacing: LetterSpacing.widest,
    textTransform: 'uppercase' as const,
  },
  caption: {
    fontFamily: FontFamily.regular,
    fontSize: FontSize.sm,           // 12
    lineHeight: FontSize.sm * 1.4,
  },
  button: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSize.md,           // 14
    lineHeight: FontSize.md * 1.2,
    letterSpacing: LetterSpacing.wide,
  },
  buttonLG: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize.lg,           // 16
    lineHeight: FontSize.lg * 1.2,
    letterSpacing: LetterSpacing.wide,
  },
  mono: {
    fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace',
    fontSize: FontSize.md,
    lineHeight: FontSize.md * 1.5,
  },
} as const;
