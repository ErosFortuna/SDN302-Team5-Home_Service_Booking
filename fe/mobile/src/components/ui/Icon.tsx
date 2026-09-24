/**
 * Icon wrapper — Lucide React Native
 */
import React from 'react';
import {
  Home,
  ListTodo,
  MessageSquare,
  User,
  Search,
  SlidersHorizontal,
  Plus,
  ArrowLeft,
  ArrowRight,
  X,
  Edit2,
  Trash2,
  Share2,
  MoreVertical,
  ClipboardList,
  Calendar,
  Clock,
  MapPin,
  Phone,
  CreditCard,
  Receipt,
  FileText,
  Target,
  History,
  BadgeCheck,
  Star,
  StarHalf,
  Wrench,
  Hammer,
  CalendarDays,
  Wallet,
  Bell,
  BellOff,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Info,
  AlertCircle,
  Clock3,
  Droplets,
  Zap,
  Sparkles,
  Fan,
  Refrigerator,
  Camera,
  Image as ImageIcon,
  Paperclip,
  Mail,
  Lock,
  Eye,
  EyeOff,
  LogOut,
  Star as ReviewIcon,
  MessageCircle,
  Headset,
  Settings,
  LayoutDashboard,
  BarChart3,
  ShieldCheck,
  Send,
  FileBarChart,
  Heart,
  Map,
  ChevronRight,
  ChevronLeft,
  ChevronDown,
  ChevronUp,
  Briefcase,
  TrendingUp,
  WashingMachine,
  PaintRoller,
  Sun,
  Moon,
  type LucideIcon,
} from 'lucide-react-native';

// ─── ICON MAP — Toàn bộ icon dùng trong app ───────────────────────────────────
export const AppIcons = {
  // Navigation tabs
  home:         Home,
  bookings:     ClipboardList,
  messages:     MessageCircle,
  chat:         MessageCircle,
  profile:      User,
  dashboard:    LayoutDashboard,
  jobs:         Briefcase,

  // Actions
  search:       Search,
  filter:       SlidersHorizontal,
  add:          Plus,
  back:         ArrowLeft,
  forward:      ArrowRight,
  close:        X,
  edit:         Edit2,
  delete:       Trash2,
  share:        Share2,
  more:         MoreVertical,
  send:         Send,

  // Booking & Service
  request:      ClipboardList,
  calendar:     Calendar,
  clock:        Clock,
  location:     MapPin,
  phone:        Phone,
  payment:      CreditCard,
  receipt:      Receipt,
  quote:        FileText,
  track:        Target,
  history:      History,

  // Provider
  verified:     BadgeCheck,
  shieldCheck:  ShieldCheck,
  star:         Star,
  starHalf:     StarHalf,
  wrench:       Wrench,
  tool:         Hammer,
  schedule:     CalendarDays,
  earnings:     Wallet,
  briefcase:    Briefcase,
  trendingUp:   TrendingUp,

  // Notifications & Status
  notification: Bell,
  notifOff:     BellOff,
  check:        CheckCircle2,
  cancel:       XCircle,
  warning:      AlertTriangle,
  info:         Info,
  error:        AlertCircle,
  pending:      Clock3,

  // Service Categories
  plumbing:     Droplets,
  electrical:   Zap,
  cleaning:     Sparkles,
  acRepair:     Fan,
  appliance:    WashingMachine,
  painting:     PaintRoller,

  // Media
  camera:       Camera,
  image:        ImageIcon,
  attach:       Paperclip,

  // Auth & Theme
  email:        Mail,
  lock:         Lock,
  visibility:   Eye,
  visibilityOff:EyeOff,
  person:       User,
  logout:       LogOut,
  sun:          Sun,
  moon:         Moon,

  // Misc
  settings:     Settings,
  favorite:     Heart,
  map:          Map,
  chevronRight: ChevronRight,
  chevronLeft:  ChevronLeft,
  chevronDown:  ChevronDown,
  chevronUp:    ChevronUp,
} as const;

export type AppIconKey = keyof typeof AppIcons;

interface IconProps {
  name: AppIconKey;
  size?: number;
  color?: string;
  style?: object;
}

export function Icon({ name, size = 24, color = '#000', style }: IconProps) {
  const LucideComponent = AppIcons[name] as LucideIcon;
  if (!LucideComponent) return null;
  return <LucideComponent size={size} color={color} style={style} />;
}
