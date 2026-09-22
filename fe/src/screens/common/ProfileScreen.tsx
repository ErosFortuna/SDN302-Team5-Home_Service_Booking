import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { Colors } from '../../constants/colors';
import { FontFamily, FontSize } from '../../constants/typography';
import { Radius, Shadow, Space } from '../../constants/spacing';
import { Icon, AppIconKey } from '../../components/ui/Icon';
import { Header } from '../../components/layout/Header';

const SETTINGS_MENU = [
  { id: 'history', title: 'Lịch sử hoạt động', icon: 'history' as AppIconKey },
  { id: 'payment', title: 'Phương thức thanh toán', icon: 'payment' as AppIconKey },
  { id: 'favorite', title: 'Thợ yêu thích', icon: 'favorite' as AppIconKey },
  { id: 'support', title: 'Trung tâm trợ giúp', icon: 'info' as AppIconKey },
  { id: 'settings', title: 'Cài đặt tài khoản', icon: 'settings' as AppIconKey },
];

export default function ProfileScreen() {
  return (
    <SafeAreaView style={styles.safe}>
      <Header title="Hồ sơ cá nhân" rightIcon="settings" />

      <ScrollView contentContainerStyle={styles.scroll}>
        {/* ── User Info ── */}
        <View style={styles.profileCard}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>M</Text>
          </View>
          <View style={styles.info}>
            <Text style={styles.name}>Nguyễn Văn Minh</Text>
            <Text style={styles.email}>minh.nguyen@email.com</Text>
            <View style={styles.roleTag}>
              <Text style={styles.roleText}>Khách hàng</Text>
            </View>
          </View>
          <TouchableOpacity style={styles.editBtn}>
            <Icon name="edit" size={20} color={Colors.primary[600]} />
          </TouchableOpacity>
        </View>

        {/* ── Stats ── */}
        <View style={styles.statsContainer}>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>12</Text>
            <Text style={styles.statLabel}>Đã hoàn thành</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statBox}>
            <Text style={styles.statValue}>3</Text>
            <Text style={styles.statLabel}>Đang yêu cầu</Text>
          </View>
        </View>

        {/* ── Menu ── */}
        <View style={styles.menuContainer}>
          {SETTINGS_MENU.map((item, index) => (
            <TouchableOpacity key={item.id} style={[
              styles.menuItem,
              index === SETTINGS_MENU.length - 1 && { borderBottomWidth: 0 }
            ]}>
              <View style={styles.menuIconBg}>
                <Icon name={item.icon} size={20} color={Colors.neutral[700]} />
              </View>
              <Text style={styles.menuTitle}>{item.title}</Text>
              <Icon name="chevronRight" size={20} color={Colors.neutral[400]} />
            </TouchableOpacity>
          ))}
        </View>

        {/* ── Logout ── */}
        <TouchableOpacity style={styles.logoutBtn}>
          <Icon name="logout" size={20} color={Colors.semantic.error} />
          <Text style={styles.logoutText}>Đăng xuất</Text>
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
    padding: Space.xl,
    paddingBottom: Space['3xl'],
  },

  // Profile Card
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.neutral[0],
    padding: Space.lg,
    borderRadius: Radius.lg,
    marginBottom: Space.lg,
    borderWidth: 1,
    borderColor: Colors.neutral[200],
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: Radius.full,
    backgroundColor: Colors.primary[100],
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Space.md,
  },
  avatarText: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize['2xl'],
    color: Colors.primary[700],
  },
  info: {
    flex: 1,
  },
  name: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSize.lg,
    color: Colors.neutral[900],
    marginBottom: Space.xs,
  },
  email: {
    fontFamily: FontFamily.regular,
    fontSize: FontSize.sm,
    color: Colors.neutral[500],
    marginBottom: Space.xs,
  },
  roleTag: {
    alignSelf: 'flex-start',
    backgroundColor: Colors.primary[50],
    paddingHorizontal: Space.sm,
    paddingVertical: Space.xs,
    borderRadius: Radius.sm,
  },
  roleText: {
    fontFamily: FontFamily.medium,
    fontSize: FontSize.xs,
    color: Colors.primary[700],
  },
  editBtn: {
    padding: Space.sm,
    backgroundColor: Colors.primary[50],
    borderRadius: Radius.full,
  },

  // Stats
  statsContainer: {
    flexDirection: 'row',
    backgroundColor: Colors.neutral[0],
    borderRadius: Radius.lg,
    paddingVertical: Space.md,
    marginBottom: Space['2xl'],
    borderWidth: 1,
    borderColor: Colors.neutral[200],
  },
  statBox: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize.xl,
    color: Colors.neutral[900],
  },
  statLabel: {
    fontFamily: FontFamily.regular,
    fontSize: FontSize.sm,
    color: Colors.neutral[500],
  },
  statDivider: {
    width: 1,
    backgroundColor: Colors.neutral[200],
  },

  // Menu
  menuContainer: {
    backgroundColor: Colors.neutral[0],
    borderRadius: Radius.lg,
    paddingHorizontal: Space.lg,
    marginBottom: Space['2xl'],
    borderWidth: 1,
    borderColor: Colors.neutral[200],
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Space.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.neutral[100],
  },
  menuIconBg: {
    width: 40,
    height: 40,
    borderRadius: Radius.full,
    backgroundColor: Colors.neutral[50],
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Space.md,
  },
  menuTitle: {
    flex: 1,
    fontFamily: FontFamily.medium,
    fontSize: FontSize.md,
    color: Colors.neutral[800],
  },

  // Logout
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Space.sm,
    paddingVertical: Space.md,
    backgroundColor: Colors.semantic.errorBg,
    borderRadius: Radius.md,
  },
  logoutText: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSize.md,
    color: Colors.semantic.error,
  },
});
