import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors } from '../../constants/colors';
import { FontFamily, FontSize } from '../../constants/typography';
import { Radius, Shadow, Space } from '../../constants/spacing';
import { Icon, AppIconKey } from '../../components/ui/Icon';
import { useAuthStore } from '../../store/useAuthStore';

interface MenuItem {
  id: string;
  title: string;
  icon: AppIconKey;
  badge?: string;
}

const SERVICE_MENU: MenuItem[] = [
  { id: 'address', title: 'Địa chỉ đã lưu', icon: 'location' },
  { id: 'payment', title: 'Phương thức thanh toán', icon: 'earnings' },
  { id: 'favorite', title: 'Thợ yêu thích', icon: 'star' },
  { id: 'history', title: 'Lịch sử giao dịch', icon: 'history' },
];

const SETTINGS_MENU: MenuItem[] = [
  { id: 'notification', title: 'Cài đặt thông báo', icon: 'notification' },
  { id: 'support', title: 'Trung tâm trợ giúp 24/7', icon: 'info' },
  { id: 'security', title: 'Chính sách & Bảo mật', icon: 'shieldCheck' },
];

export default function ProfileScreen() {
  const { role, setRole } = useAuthStore();
  const isProvider = role === 'provider';

  const user = isProvider
    ? {
        name: 'Thợ Nguyễn Văn An',
        email: 'an.nguyen@proservices.vn',
        phone: '0908 123 456',
        initials: 'NA',
        tag: 'Thợ đối tác uy tín',
        stat1: { label: 'Việc hoàn thành', val: '128' },
        stat2: { label: 'Tỉ lệ phản hồi', val: '98%' },
        stat3: { label: 'Điểm uy tín', val: '4.9 ★' },
      }
    : {
        name: 'Alex Trần',
        email: 'alex.tran@gmail.com',
        phone: '0912 345 678',
        initials: 'AT',
        tag: 'Khách hàng thành viên',
        stat1: { label: 'Đơn hoàn thành', val: '12' },
        stat2: { label: 'Đang xử lý', val: '2' },
        stat3: { label: 'Đã tiết kiệm', val: '350K' },
      };

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* In-page Screen Header matching ai-fe */}
        <View style={styles.header}>
          <Text style={styles.screenTitle}>Tài khoản</Text>
          <Text style={styles.screenSub}>Quản lý thông tin cá nhân và chế độ sử dụng</Text>
        </View>

        {/* User Info Card matching ai-fe */}
        <View style={styles.profileCard}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{user.initials}</Text>
          </View>
          <View style={styles.info}>
            <View style={styles.nameRow}>
              <Text style={styles.name}>{user.name}</Text>
              <Icon name="shieldCheck" size={16} color={Colors.primary[600]} />
            </View>
            <Text style={styles.email}>{user.email}</Text>
            <View style={styles.roleTag}>
              <Text style={styles.roleText}>{user.tag}</Text>
            </View>
          </View>
        </View>

        {/* Quick Role Switcher matching ai-fe */}
        <View style={styles.switcherCard}>
          <View style={styles.switcherTopRow}>
            <View>
              <Text style={styles.switcherTitle}>Chế độ giao diện</Text>
              <Text style={styles.switcherDesc}>
                Đang ở vai trò: <Text style={styles.switcherBold}>{isProvider ? 'Thợ sửa chữa' : 'Khách hàng'}</Text>
              </Text>
            </View>
          </View>
          <View style={styles.segmentedContainer}>
            <TouchableOpacity
              style={[styles.segmentedBtn, !isProvider && styles.segmentedBtnActive]}
              onPress={() => setRole('customer')}
              activeOpacity={0.8}
            >
              <Text style={[styles.segmentedBtnText, !isProvider && styles.segmentedBtnTextActive]}>
                Khách hàng
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.segmentedBtn, isProvider && styles.segmentedBtnActive]}
              onPress={() => setRole('provider')}
              activeOpacity={0.8}
            >
              <Text style={[styles.segmentedBtnText, isProvider && styles.segmentedBtnTextActive]}>
                Thợ sửa chữa
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* 3-Column Stats Strip matching ai-fe */}
        <View style={styles.statsContainer}>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>{user.stat1.val}</Text>
            <Text style={styles.statLabel}>{user.stat1.label}</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statBox}>
            <Text style={styles.statValue}>{user.stat2.val}</Text>
            <Text style={styles.statLabel}>{user.stat2.label}</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statBox}>
            <Text style={[styles.statValue, { color: Colors.primary[600] }]}>{user.stat3.val}</Text>
            <Text style={styles.statLabel}>{user.stat3.label}</Text>
          </View>
        </View>

        {/* Promo Voucher banner for Customer */}
        {!isProvider && (
          <LinearGradient
            colors={['#00B4A6', '#0E7490']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.voucherCard}
          >
            <View style={styles.voucherLeft}>
              <View style={styles.voucherBadge}>
                <Text style={styles.voucherBadgeText}>VOUCHER 30%</Text>
              </View>
              <Text style={styles.voucherTitle}>Ưu đãi dịch vụ tháng này</Text>
              <Text style={styles.voucherCode}>Mã: HOM30OFF · Hạn dùng: 30/10</Text>
            </View>
            <TouchableOpacity
              style={styles.voucherBtn}
              onPress={() => Alert.alert('Đã sao chép mã', 'Mã HOM30OFF đã được lưu vào bộ nhớ tạm.')}
            >
              <Text style={styles.voucherBtnText}>Sao chép</Text>
            </TouchableOpacity>
          </LinearGradient>
        )}

        {/* Service Menu Section */}
        <Text style={styles.sectionHeader}>Dịch vụ & Tiện ích</Text>
        <View style={styles.menuContainer}>
          {SERVICE_MENU.map((item, index) => (
            <TouchableOpacity
              key={item.id}
              style={[
                styles.menuItem,
                index === SERVICE_MENU.length - 1 && { borderBottomWidth: 0 },
              ]}
              onPress={() => Alert.alert(item.title, 'Tính năng đang được phát triển.')}
              activeOpacity={0.7}
            >
              <View style={styles.menuIconBg}>
                <Icon name={item.icon} size={18} color={Colors.primary[600]} />
              </View>
              <Text style={styles.menuTitle}>{item.title}</Text>
              <Icon name="chevronRight" size={16} color={Colors.neutral[400]} />
            </TouchableOpacity>
          ))}
        </View>

        {/* Settings Menu Section */}
        <Text style={styles.sectionHeader}>Cài đặt hệ thống</Text>
        <View style={styles.menuContainer}>
          {SETTINGS_MENU.map((item, index) => (
            <TouchableOpacity
              key={item.id}
              style={[
                styles.menuItem,
                index === SETTINGS_MENU.length - 1 && { borderBottomWidth: 0 },
              ]}
              onPress={() => Alert.alert(item.title, 'Tính năng đang được phát triển.')}
              activeOpacity={0.7}
            >
              <View style={styles.menuIconBg}>
                <Icon name={item.icon} size={18} color={Colors.neutral[700]} />
              </View>
              <Text style={styles.menuTitle}>{item.title}</Text>
              <Icon name="chevronRight" size={16} color={Colors.neutral[400]} />
            </TouchableOpacity>
          ))}
        </View>

        {/* Logout Button */}
        <TouchableOpacity
          style={styles.logoutBtn}
          onPress={() => Alert.alert('Đăng xuất', 'Bạn có chắc chắn muốn đăng xuất tài khoản?')}
          activeOpacity={0.8}
        >
          <Icon name="logout" size={18} color={Colors.semantic.error} />
          <Text style={styles.logoutText}>Đăng xuất tài khoản</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: Colors.neutral[50],
  },
  scroll: {
    paddingHorizontal: Space.md + 2,
    paddingTop: Space.md,
    paddingBottom: 40,
    gap: Space.md,
  },
  header: {
    paddingBottom: Space.xs,
  },
  screenTitle: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize.xl,
    color: Colors.neutral[900],
    letterSpacing: -0.3,
  },
  screenSub: {
    fontFamily: FontFamily.regular,
    fontSize: FontSize.xs,
    color: Colors.neutral[500],
    marginTop: 2,
  },
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.neutral[0],
    padding: Space.md,
    borderRadius: Radius.xl,
    borderWidth: 1,
    borderColor: Colors.neutral[200],
    ...Shadow.sm,
  },
  avatar: {
    width: 54,
    height: 54,
    borderRadius: Radius.full,
    backgroundColor: Colors.primary[50],
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Space.md,
  },
  avatarText: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize.lg,
    color: Colors.primary[700],
  },
  info: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  name: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize.md,
    color: Colors.neutral[900],
  },
  email: {
    fontFamily: FontFamily.regular,
    fontSize: FontSize.xs,
    color: Colors.neutral[500],
    marginTop: 1,
    marginBottom: 4,
  },
  roleTag: {
    alignSelf: 'flex-start',
    backgroundColor: Colors.primary[50],
    paddingHorizontal: Space.sm,
    paddingVertical: 2,
    borderRadius: Radius.full,
  },
  roleText: {
    fontFamily: FontFamily.semiBold,
    fontSize: 10,
    color: Colors.primary[700],
  },
  // Switcher
  switcherCard: {
    backgroundColor: Colors.neutral[0],
    padding: Space.md,
    borderRadius: Radius.xl,
    borderWidth: 1,
    borderColor: Colors.neutral[200],
    gap: Space.sm,
    ...Shadow.sm,
  },
  switcherTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  switcherTitle: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize.xs,
    color: Colors.neutral[900],
  },
  switcherDesc: {
    fontFamily: FontFamily.regular,
    fontSize: 11,
    color: Colors.neutral[500],
    marginTop: 1,
  },
  switcherBold: {
    fontFamily: FontFamily.semiBold,
    color: Colors.primary[700],
  },
  segmentedContainer: {
    flexDirection: 'row',
    backgroundColor: Colors.neutral[100],
    borderRadius: Radius.lg,
    padding: 3,
  },
  segmentedBtn: {
    flex: 1,
    paddingVertical: 6,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmentedBtnActive: {
    backgroundColor: Colors.neutral[0],
    ...Shadow.sm,
  },
  segmentedBtnText: {
    fontFamily: FontFamily.medium,
    fontSize: FontSize.xs,
    color: Colors.neutral[500],
  },
  segmentedBtnTextActive: {
    fontFamily: FontFamily.bold,
    color: Colors.primary[600],
  },
  // Stats
  statsContainer: {
    flexDirection: 'row',
    backgroundColor: Colors.neutral[0],
    borderRadius: Radius.xl,
    paddingVertical: Space.md,
    borderWidth: 1,
    borderColor: Colors.neutral[200],
    ...Shadow.sm,
  },
  statBox: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize.lg,
    color: Colors.neutral[900],
  },
  statLabel: {
    fontFamily: FontFamily.regular,
    fontSize: 10,
    color: Colors.neutral[500],
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    backgroundColor: Colors.neutral[200],
  },
  // Voucher
  voucherCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Space.md,
    borderRadius: Radius.xl,
    ...Shadow.sm,
  },
  voucherLeft: {
    flex: 1,
  },
  voucherBadge: {
    alignSelf: 'flex-start',
    backgroundColor: Colors.accent[500],
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: Radius.full,
    marginBottom: 4,
  },
  voucherBadgeText: {
    fontFamily: FontFamily.bold,
    fontSize: 9,
    color: Colors.neutral[900],
  },
  voucherTitle: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize.sm,
    color: Colors.neutral[0],
  },
  voucherCode: {
    fontFamily: FontFamily.regular,
    fontSize: 10,
    color: Colors.transparent.white85,
    marginTop: 2,
  },
  voucherBtn: {
    backgroundColor: Colors.neutral[0],
    paddingHorizontal: Space.md,
    paddingVertical: 6,
    borderRadius: Radius.lg,
  },
  voucherBtnText: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize.xs,
    color: Colors.primary[700],
  },
  // Section Headers & Menus
  sectionHeader: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize.xs,
    color: Colors.neutral[600],
    marginTop: Space.xs,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  menuContainer: {
    backgroundColor: Colors.neutral[0],
    borderRadius: Radius.xl,
    paddingHorizontal: Space.md,
    borderWidth: 1,
    borderColor: Colors.neutral[200],
    ...Shadow.sm,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Space.md - 2,
    borderBottomWidth: 1,
    borderBottomColor: Colors.neutral[100],
  },
  menuIconBg: {
    width: 32,
    height: 32,
    borderRadius: Radius.md,
    backgroundColor: Colors.neutral[50],
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Space.md,
  },
  menuTitle: {
    flex: 1,
    fontFamily: FontFamily.medium,
    fontSize: FontSize.xs,
    color: Colors.neutral[800],
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Space.sm,
    paddingVertical: Space.md - 2,
    backgroundColor: Colors.semantic.errorBg,
    borderRadius: Radius.xl,
    marginTop: Space.xs,
  },
  logoutText: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSize.xs,
    color: Colors.semantic.error,
  },
});
