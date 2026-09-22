import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { NavigationContainer } from '@react-navigation/native';
import { View, Text, StyleSheet } from 'react-native';

import { Colors } from '../constants/colors';
import { FontFamily, FontSize } from '../constants/typography';
import { Radius, Shadow, Space } from '../constants/spacing';
import { Icon, AppIconKey } from '../components/ui/Icon';

// --- SCREENS ---
// Auth
import LoginScreen from '../screens/auth/LoginScreen';
import RegisterScreen from '../screens/auth/RegisterScreen';

// Customer
import HomeScreen from '../screens/customer/HomeScreen';
import BookingScreen from '../screens/customer/BookingScreen';
import ServiceListScreen from '../screens/customer/ServiceListScreen';
import BookingHistoryScreen from '../screens/customer/BookingHistoryScreen';

// Provider
import ProviderDashboard from '../screens/provider/ProviderDashboard';
import JobDetailScreen from '../screens/provider/JobDetailScreen';

// Common
import ProfileScreen from '../screens/common/ProfileScreen';
import MessageListScreen from '../screens/common/MessageListScreen';
import ChatScreen from '../screens/common/ChatScreen';

export type RootStackParamList = {
  // Auth
  Login: undefined;
  Register: undefined;
  
  // Main
  MainTabs: undefined; // The tab bar
  
  // Details (No Tab Bar)
  Booking: undefined;
  ServiceList: { categoryKey?: string; title?: string };
  JobDetail: { jobId?: string };
  Chat: { name?: string };
};

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator();

// ─── TAB NAVIGATOR ────────────────────────────────────────────────────────────
type TabName = 'Home' | 'Bookings' | 'Messages' | 'Profile';
const TAB_ICON_MAP: Record<TabName, { active: AppIconKey; inactive: AppIconKey }> = {
  Home:     { active: 'home',     inactive: 'home'     },
  Bookings: { active: 'bookings', inactive: 'bookings' },
  Messages: { active: 'messages', inactive: 'messages' },
  Profile:  { active: 'profile',  inactive: 'profile'  },
};

import { useAuthStore } from '../store/useAuthStore';

function MainTabs() {
  const role = useAuthStore((state) => state.role);
  const isProvider = role === 'provider';

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarIcon: ({ focused, color }) => {
          const iconName = TAB_ICON_MAP[route.name as TabName]?.[focused ? 'active' : 'inactive'];
          return (
            <View style={styles.tabIconContainer}>
              <Icon name={iconName ?? 'home'} size={24} color={color} />
              {focused && <View style={styles.tabIndicator} />}
            </View>
          );
        },
        tabBarActiveTintColor: Colors.primary[500],
        tabBarInactiveTintColor: Colors.neutral[400],
        tabBarStyle: styles.tabBar,
        tabBarLabelStyle: styles.tabLabel,
      })}
    >
      <Tab.Screen 
        name="Home" 
        component={isProvider ? ProviderDashboard : HomeScreen} 
        options={{ tabBarLabel: 'Trang chủ' }} 
      />
      <Tab.Screen 
        name="Bookings" 
        component={BookingHistoryScreen} 
        options={{ tabBarLabel: 'Lịch đặt' }} 
      />
      <Tab.Screen 
        name="Messages" 
        component={MessageListScreen} 
        options={{ tabBarLabel: 'Tin nhắn' }} 
      />
      <Tab.Screen 
        name="Profile" 
        component={ProfileScreen} 
        options={{ tabBarLabel: 'Tài khoản' }} 
      />
    </Tab.Navigator>
  );
}

// ─── ROOT NAVIGATOR ───────────────────────────────────────────────────────────
export default function RootNavigator() {
  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName="Login" // Start at Login
        screenOptions={{
          headerShown: false,
          animation: 'slide_from_right',
        }}
      >
        {/* Auth Group */}
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen name="Register" component={RegisterScreen} />

        {/* Main Tab Group */}
        <Stack.Screen name="MainTabs" component={MainTabs} />

        {/* Detail Screens (Without Tabs) */}
        <Stack.Screen name="Booking" component={BookingScreen} />
        <Stack.Screen name="ServiceList" component={ServiceListScreen} />
        <Stack.Screen name="JobDetail" component={JobDetailScreen} />
        <Stack.Screen name="Chat" component={ChatScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

// ─── STYLES ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: Colors.neutral[0],
    borderTopWidth: 1,
    borderTopColor: Colors.neutral[200],
    height: 64,
    paddingBottom: Space.sm,
    paddingTop: Space.sm,
    ...Shadow.sm,
  },
  tabLabel: {
    fontFamily: FontFamily.medium,
    fontSize: FontSize.xs,
  },
  tabIconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    height: 32,
    width: 48,
  },
  tabIndicator: {
    position: 'absolute',
    top: -8,
    width: 24,
    height: 3,
    backgroundColor: Colors.primary[500],
    borderBottomLeftRadius: Radius.sm,
    borderBottomRightRadius: Radius.sm,
  },
});
