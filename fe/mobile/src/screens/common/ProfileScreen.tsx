import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors } from '../../constants/colors';
import { FontFamily, FontSize } from '../../constants/typography';
import { Radius, Shadow, Space } from '../../constants/spacing';
import { Icon, AppIconKey } from '../../components/ui/Icon';
import { useAuthStore } from '../../store/useAuthStore';
import { useAppStore } from '../../store/useAppStore';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../types/navigation';
import { apiRequest, removeStoredToken } from '../../services/apiClient';
import { Input } from '../../components/form/Input';
import { changePassword } from '../../services/authService';

interface MenuItem {
  id: string;
  title: string;
  icon: AppIconKey;
  badge?: string;
}

const SERVICE_MENU: MenuItem[] = [
  { id: 'complaint', title: 'Khiếu nại dịch vụ (Complain)', icon: 'warning', badge: 'Mới' },
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
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { role, setRole, logout, currentUser } = useAuthStore();
  const { bookings } = useAppStore();
  const [currentPassword, setCurrentPassword] = React.useState('');
  const [newPassword, setNewPassword] = React.useState('');
  const [confirmPassword, setConfirmPassword] = React.useState('');
  const [isChangingPassword, setIsChangingPassword] = React.useState(false);
  const [passwordError, setPasswordError] = React.useState('');
  const isProvider = role === 'provider';

  const completedCount = bookings.filter((b) => b.status === 'completed').length;
  const activeCount = bookings.filter((b) => b.status === 'pending' || b.status === 'in_progress').length;

  const displayName = currentUser?.name || (isProvider ? 'Thợ đối tác' : 'Khách hàng');
  const displayEmail = currentUser?.email || 'user@homecare.local';
  const displayPhone = currentUser?.phone || '0901234567';
  const initials = displayName
    .split(' ')
    .filter(Boolean)
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase() || (isProvider ? 'TH' : 'KH');

  const user = isProvider
    ? {
        name: displayName,
        email: displayEmail,
        phone: displayPhone,
        initials,
        tag: 'Thợ đối tác hệ thống',
        stat1: { label: 'Việc hoàn thành', val: String(completedCount) },
        stat2: { label: 'Việc đang nhận', val: String(activeCount) },
        stat3: { label: 'Trạng thái', val: 'Sẵn sàng' },
      }
    : {
        name: displayName,
        email: displayEmail,
        phone: displayPhone,
        initials,
        tag: 'Khách hàng',
        stat1: { label: 'Đơn hoàn thành', val: String(completedCount) },
        stat2: { label: 'Đang xử lý', val: String(activeCount) },
        stat3: { label: 'Tổng số đơn', val: String(bookings.length) },
      };

  const handleChangePassword = async () => {
    setPasswordError('');
    if ([...newPassword].length < 10 || new TextEncoder().encode(newPassword).length > 72) {
      setPasswordError('Mật khẩu mới phải có ít nhất 10 ký tự và tối đa 72 byte.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('Mật khẩu xác nhận không khớp.');
      return;
    }
    setIsChangingPassword(true);
    try {
      await changePassword(currentPassword, newPassword);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      await removeStoredToken();
      logout();
      Alert.alert('Đổi mật khẩu thành công', 'Phiên đăng nhập đã bị thu hồi. Vui lòng đăng nhập lại.');
      navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
    } catch (error) {
      setPasswordError(error instanceof Error ? error.message : 'Không thể đổi mật khẩu. Vui lòng thử lại.');
    } finally {
      setIsChangingPassword(false);
    }
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
            colors={[Colors.primary[500], Colors.primary[800]]}
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
          {(isProvider
            ? [
                { id: 'provider-profile', title: 'Hồ sơ thợ', icon: 'profile' as const },
                { id: 'membership', title: 'Gói thành viên', icon: 'payment' as const },
                ...SERVICE_MENU,
              ]
            : SERVICE_MENU
          ).map((item, index, menuItems) => (
            <TouchableOpacity
              key={item.id}
              style={[
                styles.menuItem,
                index === menuItems.length - 1 && { borderBottomWidth: 0 },
              ]}
              onPress={() => {
                if (item.id === 'complaint') {
                  navigation.navigate('ComplaintList');
                } else if (item.id === 'membership') {
                  navigation.navigate('ProviderMembership');
                } else if (item.id === 'provider-profile') {
                  navigation.navigate('ProviderProfile');
                } else {
                  Alert.alert(item.title, 'Tính năng đang được phát triển.');
                }
              }}
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

        <View style={styles.passwordCard}>
          <Text style={styles.sectionHeader}>Đổi mật khẩu</Text>
          <Input label="Mật khẩu hiện tại" value={currentPassword} onChangeText={setCurrentPassword} isPassword autoCapitalize="none" />
          <Input label="Mật khẩu mới" value={newPassword} onChangeText={setNewPassword} isPassword autoCapitalize="none" />
          <Input label="Xác nhận mật khẩu mới" value={confirmPassword} onChangeText={setConfirmPassword} isPassword autoCapitalize="none" />
          {!!passwordError && <Text accessibilityRole="alert" style={styles.passwordError}>{passwordError}</Text>}
          <TouchableOpacity style={styles.passwordButton} onPress={handleChangePassword} disabled={isChangingPassword} activeOpacity={0.8}>
            {isChangingPassword ? <ActivityIndicator color={Colors.neutral[0]} /> : <Text style={styles.passwordButtonText}>Đổi mật khẩu</Text>}
          </TouchableOpacity>
          <Text style={styles.passwordHint}>Sau khi đổi, phiên đăng nhập hiện tại và các phiên khác sẽ bị thu hồi.</Text>
        </View>

        {/* Logout Button */}
        <TouchableOpacity
          style={styles.logoutBtn}
          onPress={() =>
            Alert.alert('Đăng xuất', 'Bạn có chắc chắn muốn đăng xuất tài khoản?', [
              { text: 'Hủy', style: 'cancel' },
              {
                text: 'Đăng xuất',
                style: 'destructive',
                onPress: async () => {
                  try {
                    await apiRequest('/auth/logout', { method: 'POST' });
                  } catch (error) {
                    console.warn('Failed to call logout API:', error);
                  } finally {
                    await removeStoredToken();
                    logout();
                    navigation.reset({
                      index: 0,
                      routes: [{ name: 'Login' }],
                    });
                  }
                },
              },
            ])
          }
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
  passwordCard: {
    backgroundColor: Colors.neutral[0],
    borderRadius: Radius.xl,
    padding: Space.md,
    borderWidth: 1,
    borderColor: Colors.neutral[200],
    ...Shadow.sm,
  },
  passwordError: {
    color: Colors.semantic.error,
    fontFamily: FontFamily.medium,
    fontSize: FontSize.xs,
    marginBottom: Space.sm,
  },
  passwordButton: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 46,
    backgroundColor: Colors.primary[600],
    borderRadius: Radius.lg,
  },
  passwordButtonText: {
    color: Colors.neutral[0],
    fontFamily: FontFamily.bold,
    fontSize: FontSize.sm,
  },
  passwordHint: {
    marginTop: Space.sm,
    color: Colors.neutral[500],
    fontFamily: FontFamily.regular,
    fontSize: 10,
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
