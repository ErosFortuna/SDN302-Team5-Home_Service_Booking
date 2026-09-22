import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { CompositeNavigationProp } from '@react-navigation/native';

export type RootStackParamList = {
  // Auth
  Login: undefined;
  Register: undefined;
  
  // Main
  MainTabs: undefined;
  
  // Details (No Tab Bar)
  Booking: undefined;
  ServiceList: { categoryKey?: string; title?: string };
  JobDetail: { jobId?: string };
  Chat: { name?: string };
};

export type MainTabParamList = {
  Home: undefined;
  Bookings: undefined;
  Messages: undefined;
  Profile: undefined;
};

// Types for screens
export type RootStackNavigationProp<T extends keyof RootStackParamList> = NativeStackNavigationProp<RootStackParamList, T>;
export type MainTabNavigationProp<T extends keyof MainTabParamList> = CompositeNavigationProp<
  BottomTabNavigationProp<MainTabParamList, T>,
  NativeStackNavigationProp<RootStackParamList>
>;
