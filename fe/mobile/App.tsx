import React from 'react';
import { View, ActivityIndicator, Platform } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { ThemeProvider } from './src/providers/ThemeProvider';
import RootNavigator from './src/navigation/RootNavigator';
import { Colors } from './src/constants/colors';

// Load Inter fonts only on native (web uses system-ui fallback)
let useFonts: any = () => [true];
let fontMap: any = {};

if (Platform.OS !== 'web') {
  const interFonts = require('@expo-google-fonts/inter');
  useFonts = require('expo-font').useFonts;
  fontMap = {
    Inter_100Thin:       interFonts.Inter_100Thin,
    Inter_200ExtraLight: interFonts.Inter_200ExtraLight,
    Inter_300Light:      interFonts.Inter_300Light,
    Inter_400Regular:    interFonts.Inter_400Regular,
    Inter_500Medium:     interFonts.Inter_500Medium,
    Inter_600SemiBold:   interFonts.Inter_600SemiBold,
    Inter_700Bold:       interFonts.Inter_700Bold,
    Inter_800ExtraBold:  interFonts.Inter_800ExtraBold,
    Inter_900Black:      interFonts.Inter_900Black,
  };
} else {
  // Web: inject CSS import for Inter from Google Fonts
  if (typeof document !== 'undefined') {
    const link = document.createElement('link');
    link.rel  = 'stylesheet';
    link.href = 'https://fonts.googleapis.com/css2?family=Inter:wght@100;200;300;400;500;600;700;800;900&display=swap';
    document.head.appendChild(link);
  }
}

export default function App() {
  const [fontsLoaded] = useFonts(fontMap);

  if (!fontsLoaded) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.neutral[0] }}>
        <ActivityIndicator size="large" color={Colors.primary[500]} />
      </View>
    );
  }

  return (
    <ThemeProvider>
      <StatusBar style="auto" />
      <RootNavigator />
    </ThemeProvider>
  );
}
