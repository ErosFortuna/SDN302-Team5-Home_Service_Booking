import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { NavigationContainer, useNavigationContainerRef } from "@react-navigation/native";
import { ActivityIndicator, View, Text, StyleSheet } from "react-native";

import { Colors } from "../constants/colors";
import { FontFamily, FontSize } from "../constants/typography";
import { Radius, Shadow, Space } from "../constants/spacing";
import { Icon, AppIconKey } from "../components/ui/Icon";
import { AppHeader } from "../components/layout/AppHeader";
import { RootStackParamList } from "../types/navigation";
import { MainTabParamList } from "../types/navigation";
import { useAuthStore } from "../store/useAuthStore";
import { useAppStore } from "../store/useAppStore";
import { apiRequest, clearAllAuthTokens, getStoredToken } from "../services/apiClient";

// --- SCREENS ---
// Auth
import LoginScreen from "../screens/auth/LoginScreen";
import RegisterScreen from "../screens/auth/RegisterScreen";
import VerifyEmailScreen from "../screens/auth/VerifyEmailScreen";
import ForgotPasswordScreen from "../screens/auth/ForgotPasswordScreen";
import ResetPasswordScreen from "../screens/auth/ResetPasswordScreen";

// Customer
import HomeScreen from "../screens/customer/HomeScreen";
import BookingScreen from "../screens/customer/BookingScreen";
import ServiceListScreen from "../screens/customer/ServiceListScreen";
import BookingHistoryScreen from "../screens/customer/BookingHistoryScreen";

import RecommendedProvidersScreen from "../screens/customer/RecommendedProvidersScreen";

// Provider
import ProviderDashboard from "../screens/provider/ProviderDashboard";
import JobDetailScreen from "../screens/provider/JobDetailScreen";
import JobBoardScreen from "../screens/provider/JobBoardScreen";
import ProviderWorkHistoryScreen from "../screens/provider/ProviderWorkHistoryScreen";
import ProviderReportsScreen from "../screens/provider/ProviderReportsScreen";

import PendingBookingsScreen from "../screens/provider/PendingBookingsScreen";
import BookingRequestDetailScreen from "../screens/provider/BookingRequestDetailScreen";
import MembershipScreen from "../screens/provider/MembershipScreen";
import ProviderProfileScreen from "../screens/provider/ProviderProfileScreen";

// Common
import ProfileScreen from "../screens/common/ProfileScreen";
import ChatScreen from "../screens/common/ChatScreen";
import ComplaintListScreen from "../screens/common/ComplaintListScreen";
import ComplaintDetailScreen from "../screens/common/ComplaintDetailScreen";
import CreateComplaintScreen from "../screens/customer/CreateComplaintScreen";
import NotificationListScreen from "../screens/common/NotificationListScreen";

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<MainTabParamList>();

// ─── TAB NAVIGATOR ────────────────────────────────────────────────────────────
function MainTabs() {
  const role = useAuthStore((state) => state.role);
  const bookings = useAppStore((state) => state.bookings);
  const isCustomer = role === "customer";
  const isProvider = role === "provider";

  const pendingCount = bookings.filter((b) => b.status === "pending" || b.status === "pending_confirmation").length;

  return (
    <Tab.Navigator
      screenOptions={{
        header: () => <AppHeader />,
        headerShown: true,
        tabBarActiveTintColor: Colors.primary[500],
        tabBarInactiveTintColor: Colors.neutral[400],
        tabBarStyle: styles.tabBar,
        tabBarLabelStyle: styles.tabLabel,
      }}
    >
      {/* Tab 1: Home / Dashboard */}
      <Tab.Screen
        name="Home"
        component={isCustomer ? HomeScreen : ProviderDashboard}
        options={{
          tabBarLabel: isProvider ? "Tổng quan" : "Trang chủ",
          tabBarIcon: ({ color, size }) => (
            <Icon
              name={isCustomer ? "home" : "dashboard"}
              size={22}
              color={color}
            />
          ),
        }}
      />

      {/* Tab 2: Bookings (Customer) OR Jobs (Provider) */}
      {!isCustomer ? (
        <Tab.Screen
          name="JobBoardTab"
          component={JobBoardScreen}
          options={{
            tabBarLabel: "Việc mới",
            tabBarIcon: ({ color }) => (
              <Icon name="jobs" size={22} color={color} />
            ),
          }}
        />
      ) : (
        <Tab.Screen
          name="Bookings"
          component={BookingHistoryScreen}
          options={{
            tabBarLabel: "Lịch đặt",
            tabBarIcon: ({ color }) => (
              <View style={styles.iconWithBadge}>
                <Icon name="bookings" size={22} color={color} />
                {pendingCount > 0 && (
                  <View style={styles.badgePill}>
                    <Text style={styles.badgePillText}>{pendingCount}</Text>
                  </View>
                )}
              </View>
            ),
          }}
        />
      )}

      {isProvider && (
        <Tab.Screen
          name="WorkHistory"
          component={ProviderWorkHistoryScreen}
          options={{
            tabBarLabel: "Lịch sử",
            tabBarIcon: ({ color }) => (
              <Icon name="history" size={22} color={color} />
            ),
          }}
        />
      )}

      {isProvider && (
        <Tab.Screen
          name="Reports"
          component={ProviderReportsScreen}
          options={{
            tabBarLabel: "Báo cáo",
            tabBarIcon: ({ color }) => <Icon name="earnings" size={22} color={color} />,
          }}
        />
      )}

      {/* Profile */}
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          tabBarLabel: "Tài khoản",
          tabBarIcon: ({ color }) => (
            <Icon name="profile" size={22} color={color} />
          ),
        }}
      />
    </Tab.Navigator>
  );
}

// ─── ROOT NAVIGATOR ───────────────────────────────────────────────────────────
export default function RootNavigator() {
  const isLoggedIn = useAuthStore((state) => state.isLoggedIn);
  const isInitializing = useAuthStore((state) => state.isInitializing);
  const login = useAuthStore((state) => state.login);
  const finishInitialization = useAuthStore((state) => state.finishInitialization);
  const navigationRef = useNavigationContainerRef<RootStackParamList>();
  const wasLoggedIn = React.useRef(isLoggedIn);

  React.useEffect(() => {
    let active = true;
    const restoreSession = async () => {
      try {
        const token = await getStoredToken();
        if (token) {
          const response = await apiRequest<any>('/auth/me');
          const user = response.data;
          const role = user?.role?.toLowerCase();
          if (user && (role === 'customer' || role === 'provider') && active) {
            login(role, {
              name: user.fullName,
              email: user.email,
              phone: user.phone || '',
              address: user.address || '',
              role,
            });
          } else if (user && role !== 'customer' && role !== 'provider') {
            await clearAllAuthTokens();
          }
        }
      } catch {
        // Keep the user signed out when the saved session cannot be verified.
      } finally {
        if (active) finishInitialization();
      }
    };
    void restoreSession();
    return () => { active = false; };
  }, [finishInitialization, login]);

  React.useEffect(() => {
    if (wasLoggedIn.current && !isLoggedIn && navigationRef.isReady()) {
      navigationRef.resetRoot({ index: 0, routes: [{ name: "Login" }] });
    }
    wasLoggedIn.current = isLoggedIn;
  }, [isLoggedIn, navigationRef]);

  if (isInitializing) {
    return (
      <View style={styles.initializing}>
        <ActivityIndicator size="large" color={Colors.primary[500]} />
      </View>
    );
  }

  return (
    <NavigationContainer ref={navigationRef}>
      <Stack.Navigator
        initialRouteName={isLoggedIn ? "MainTabs" : "Login"}
        screenOptions={{
          headerShown: false,
          animation: "slide_from_right",
        }}
      >
        {/* Auth Group */}
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen name="Register" component={RegisterScreen} />
        <Stack.Screen name="VerifyEmail" component={VerifyEmailScreen} />
        <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
        <Stack.Screen name="ResetPassword" component={ResetPasswordScreen} />

        {/* Main Tab Group */}
        <Stack.Screen name="MainTabs" component={MainTabs} />

        {/* Customer Screens */}
        <Stack.Screen name="Booking" component={BookingScreen} />
        <Stack.Screen name="ServiceList" component={ServiceListScreen} />

        <Stack.Screen name="RecommendedProviders" component={RecommendedProvidersScreen} />

        {/* Provider Screens */}
        <Stack.Screen name="JobBoard" component={JobBoardScreen} />
        <Stack.Screen name="JobDetail" component={JobDetailScreen} />

        <Stack.Screen name="PendingBookings" component={PendingBookingsScreen} />
        <Stack.Screen name="BookingRequestDetail" component={BookingRequestDetailScreen} />
        <Stack.Screen name="ProviderMembership" component={MembershipScreen} />
        <Stack.Screen name="ProviderProfile" component={ProviderProfileScreen} />

        {/* Chat Detail (when opened from contact or outside tabs) */}
        <Stack.Screen name="Chat" component={ChatScreen} />

        {/* Complaints (KAN-13, KAN-19, KAN-26) */}
        <Stack.Screen name="ComplaintList" component={ComplaintListScreen} />
        <Stack.Screen name="CreateComplaint" component={CreateComplaintScreen} />
        <Stack.Screen name="ComplaintDetail" component={ComplaintDetailScreen} />
        <Stack.Screen name="Notifications" component={NotificationListScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

// ─── STYLES ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  initializing: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.neutral[0] },
  tabBar: {
    backgroundColor: Colors.neutral[0],
    borderTopWidth: 1,
    borderTopColor: Colors.neutral[200],
    height: 60,
    paddingBottom: 6,
    paddingTop: 6,
    ...Shadow.sm,
  },
  tabLabel: {
    fontFamily: FontFamily.semiBold,
    fontSize: 10,
    letterSpacing: 0.2,
  },
  iconWithBadge: {
    position: "relative",
    alignItems: "center",
    justifyContent: "center",
  },
  badgePill: {
    position: "absolute",
    top: -4,
    right: -8,
    backgroundColor: Colors.accent[500],
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: Radius.full,
    minWidth: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  badgePillText: {
    fontFamily: FontFamily.bold,
    fontSize: 9,
    color: Colors.neutral[900],
  },
});
