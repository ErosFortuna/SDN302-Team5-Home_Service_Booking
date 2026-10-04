/**
 * Home Service Booking — Design Tokens: Spacing, Sizing & Border Radius
 * Based on 8pt grid system
 */

// ─── SPACING (8pt grid) ──────────────────────────────────────────────────────
export const Spacing = {
  0:    0,
  px:   1,
  '0.5': 2,
  1:    4,   // xs
  2:    8,   // sm
  3:    12,  // md
  4:    16,  // lg  ← base unit
  5:    20,
  6:    24,  // xl
  7:    28,
  8:    32,  // 2xl
  9:    36,
  10:   40,
  12:   48,  // 3xl
  14:   56,
  16:   64,
  20:   80,
  24:   96,
} as const;

// ─── NAMED ALIASES ───────────────────────────────────────────────────────────
export const Space = {
  xs:   Spacing[1],    // 4
  sm:   Spacing[2],    // 8
  md:   Spacing[3],    // 12
  lg:   Spacing[4],    // 16
  xl:   Spacing[6],    // 24
  '2xl': Spacing[8],   // 32
  '3xl': Spacing[12],  // 48
} as const;

// ─── BORDER RADIUS ───────────────────────────────────────────────────────────
export const Radius = {
  none:   0,
  xs:     4,
  sm:     6,    // tag, small chip
  md:     12,   // card
  lg:     16,   // bottom sheet, modal, large card
  xl:     24,   // hero card
  '2xl':  32,
  full:   9999, // pill/chip, avatar
} as const;

// ─── SHADOW PRESETS ───────────────────────────────────────────────────────────
export const Shadow = {
  none: {
    shadowColor: 'transparent',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  },
  // Micro shadow — subtle lift, card sits just above surface
  sm: {
    shadowColor: '#1E2435',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.10,
    shadowRadius: 4,
    elevation: 2,
  },
  // Standard card shadow — clear depth, tight edge
  md: {
    shadowColor: '#1E2435',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.14,
    shadowRadius: 6,
    elevation: 4,
  },
  // Elevated panel shadow
  lg: {
    shadowColor: '#1E2435',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.16,
    shadowRadius: 10,
    elevation: 8,
  },
  xl: {
    shadowColor: '#1E2435',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.18,
    shadowRadius: 16,
    elevation: 16,
  },
  // Teal glow (for active/brand elements)
  brandGlow: {
    shadowColor: '#00B4A6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 6,
  },
  // Amber glow (for CTA buttons)
  ctaGlow: {
    shadowColor: '#FFC107',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.40,
    shadowRadius: 10,
    elevation: 6,
  },
} as const;

// ─── ICON SIZES ───────────────────────────────────────────────────────────────
export const IconSize = {
  xs:  16,
  sm:  20,
  md:  24,  // default
  lg:  32,
  xl:  40,
  '2xl': 48,
  '3xl': 64,
} as const;

// ─── AVATAR SIZES ─────────────────────────────────────────────────────────────
export const AvatarSize = {
  xs:  28,
  sm:  36,
  md:  44,
  lg:  56,
  xl:  72,
  '2xl': 96,
} as const;

// ─── Z-INDEX ──────────────────────────────────────────────────────────────────
export const ZIndex = {
  base:    0,
  raised:  10,
  dropdown:20,
  sticky:  30,
  overlay: 40,
  modal:   50,
  toast:   60,
} as const;

// ─── TOUCHABLE HIT SLOP (accessibility) ───────────────────────────────────────
export const HitSlop = {
  sm: { top: 4, bottom: 4, left: 4, right: 4 },
  md: { top: 8, bottom: 8, left: 8, right: 8 },
  lg: { top: 12, bottom: 12, left: 12, right: 12 },
} as const;
