import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { CompositeNavigationProp, NavigatorScreenParams } from '@react-navigation/native';

export type RootStackParamList = {
  // Auth
  Login: undefined;
  Register: undefined;
  VerifyEmail: { email: string };
  ForgotPassword: { email?: string } | undefined;
  ResetPassword: { email: string };
  
  // Main
  MainTabs: NavigatorScreenParams<MainTabParamList> | undefined;
  
  // Details (No Tab Bar)
  Booking: { presetCategory?: string; presetProvider?: { id: string; name: string } } | undefined;
  ServiceList: { categoryKey?: string; title?: string };
  JobDetail: { jobId?: string };
  Chat: { name?: string } | undefined;


  JobBoard: undefined;

  // Provider Confirmation / Decline (UC-14)
  PendingBookings: undefined;
  BookingRequestDetail: { bookingId: string };

  // Recommendations
  RecommendedProviders: { requestId: string; title?: string };

  // Complaints (KAN-13, KAN-19, KAN-26)
  ComplaintList: undefined;
  CreateComplaint: { bookingId?: string; bookingTitle?: string } | undefined;
  ComplaintDetail: { complaintId: string };
  Notifications: undefined;
  ProviderMembership: undefined;
  ProviderProfile: undefined;
};

export type MainTabParamList = {
  Home: undefined;
  Bookings: { focusBookingId?: string } | undefined;
  JobBoardTab?: undefined;
  Chat: { name?: string } | undefined;
  Messages?: undefined;
  Profile: undefined;
};

// Types for screens
export type RootStackNavigationProp<T extends keyof RootStackParamList> = NativeStackNavigationProp<RootStackParamList, T>;
export type MainTabNavigationProp<T extends keyof MainTabParamList> = CompositeNavigationProp<
  BottomTabNavigationProp<MainTabParamList, T>,
  NativeStackNavigationProp<RootStackParamList>
>;
