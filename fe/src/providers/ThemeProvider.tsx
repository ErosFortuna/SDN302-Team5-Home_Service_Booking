import React, { createContext, useContext, useState, useEffect } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Colors, dark, light } from '../constants/colors';

// ─── THEME TYPES ─────────────────────────────────────────────────────────────
type ThemeMode = 'light' | 'dark' | 'system';

interface ThemeColors {
  // Surfaces
  bgPrimary:     string;
  bgCard:        string;
  bgElevated:    string;
  border:        string;
  // Text
  textPrimary:   string;
  textSecondary: string;
  textDisabled:  string;
  textInverse:   string;
  // Brand (same in both modes)
  brand:         string;
  brandLight:    string;
  cta:           string;
  ctaDark:       string;
}

interface ThemeContextValue {
  mode:        ThemeMode;
  isDark:      boolean;
  colors:      ThemeColors;
  setMode:     (mode: ThemeMode) => void;
  toggleTheme: () => void;
}

// ─── THEME COLOR MAP ─────────────────────────────────────────────────────────
const lightThemeColors: ThemeColors = {
  bgPrimary:     light.bgPrimary,
  bgCard:        light.bgCard,
  bgElevated:    light.bgElevated,
  border:        light.border,
  textPrimary:   light.textPrimary,
  textSecondary: light.textSecondary,
  textDisabled:  light.textDisabled,
  textInverse:   '#FFFFFF',
  brand:         Colors.brand,
  brandLight:    Colors.brandLight,
  cta:           Colors.cta,
  ctaDark:       Colors.ctaDark,
};

const darkThemeColors: ThemeColors = {
  bgPrimary:     dark.bgPrimary,
  bgCard:        dark.bgCard,
  bgElevated:    dark.bgElevated,
  border:        dark.border,
  textPrimary:   dark.textPrimary,
  textSecondary: dark.textSecondary,
  textDisabled:  dark.textDisabled,
  textInverse:   '#0D1117',
  brand:         Colors.brand,
  brandLight:    Colors.primary[900],
  cta:           Colors.cta,
  ctaDark:       Colors.ctaDark,
};

// ─── CONTEXT ─────────────────────────────────────────────────────────────────
const ThemeContext = createContext<ThemeContextValue>({
  mode:        'light',
  isDark:      false,
  colors:      lightThemeColors,
  setMode:     () => {},
  toggleTheme: () => {},
});

const STORAGE_KEY = '@hsb_theme_mode';

// ─── PROVIDER ────────────────────────────────────────────────────────────────
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const systemScheme = useColorScheme();
  const [mode, setModeState] = useState<ThemeMode>('light'); // default: light

  // Load persisted preference
  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((saved) => {
      if (saved === 'light' || saved === 'dark' || saved === 'system') {
        setModeState(saved);
      }
    });
  }, []);

  const setMode = (newMode: ThemeMode) => {
    setModeState(newMode);
    AsyncStorage.setItem(STORAGE_KEY, newMode);
  };

  const toggleTheme = () => {
    const next = isDark ? 'light' : 'dark';
    setMode(next);
  };

  // Resolve actual dark/light
  const isDark =
    mode === 'dark' || (mode === 'system' && systemScheme === 'dark');

  const colors = isDark ? darkThemeColors : lightThemeColors;

  return (
    <ThemeContext.Provider value={{ mode, isDark, colors, setMode, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

// ─── HOOK ────────────────────────────────────────────────────────────────────
export const useTheme = () => useContext(ThemeContext);
