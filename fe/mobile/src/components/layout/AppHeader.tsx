import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Platform,
  StatusBar,
  Alert,
} from 'react-native';
import { Icon } from '../ui/Icon';
import { Colors } from '../../constants/colors';
import { FontFamily, FontSize } from '../../constants/typography';
import { Radius, Shadow, Space } from '../../constants/spacing';
import { useAuthStore } from '../../store/useAuthStore';
import { Role } from '../../types';

export function AppHeader() {
  const { role, setRole } = useAuthStore();
  const [isDark, setIsDark] = React.useState(false);

  const toggleDarkMode = () => {
    setIsDark(!isDark);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {/* Top row: Brand & Actions */}
        <View style={styles.topRow}>
          <View style={styles.brandRow}>
            <View style={styles.logoBox}>
              <Icon name="home" size={18} color={Colors.neutral[0]} />
            </View>
            <View>
              <Text style={styles.brandName}>Hom</Text>
              <Text style={styles.brandTagline}>Home services, on demand</Text>
            </View>
          </View>

          <View style={styles.actionsRow}>
            <TouchableOpacity
              style={styles.iconBtn}
              onPress={toggleDarkMode}
              accessibilityLabel="Đổi giao diện sáng/tối"
            >
              <Icon
                name={isDark ? 'sun' : 'moon'}
                size={18}
                color={Colors.neutral[700]}
              />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.iconBtn}
              onPress={() => Alert.alert('Thông báo', 'Bạn không có thông báo mới.')}
              accessibilityLabel="Thông báo"
            >
              <Icon name="notification" size={18} color={Colors.neutral[700]} />
              <View style={styles.notifDot} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Segmented Role Switcher */}
        <View style={styles.segmentedContainer}>
          {(['customer', 'provider'] as const).map((r) => {
            const isActive = role === r;
            const label = r === 'customer' ? 'Khách hàng' : 'Thợ sửa chữa';

            return (
              <TouchableOpacity
                key={r}
                style={[
                  styles.segmentedTab,
                  isActive && styles.segmentedTabActive,
                ]}
                onPress={() => setRole(r)}
                activeOpacity={0.8}
              >
                <Text
                  style={[
                    styles.segmentedText,
                    isActive && styles.segmentedTextActive,
                  ]}
                >
                  {label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: Colors.neutral[0],
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
  },
  container: {
    backgroundColor: Colors.neutral[0],
    borderBottomWidth: 1,
    borderBottomColor: Colors.neutral[200],
    paddingHorizontal: Space.md + 2,
    paddingTop: Space.xs,
    paddingBottom: Space.sm,
    gap: Space.sm,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Space.sm,
  },
  logoBox: {
    width: 32,
    height: 32,
    borderRadius: Radius.md,
    backgroundColor: Colors.primary[500],
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandName: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize.md,
    color: Colors.neutral[900],
    lineHeight: 18,
  },
  brandTagline: {
    fontFamily: FontFamily.medium,
    fontSize: 10,
    color: Colors.neutral[400],
    lineHeight: 12,
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Space.xs + 2,
  },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.neutral[200],
    backgroundColor: Colors.neutral[50],
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  notifDot: {
    position: 'absolute',
    top: 7,
    right: 7,
    width: 6,
    height: 6,
    borderRadius: Radius.full,
    backgroundColor: Colors.accent[500],
  },
  segmentedContainer: {
    flexDirection: 'row',
    backgroundColor: Colors.neutral[100],
    borderRadius: Radius.lg,
    padding: 3,
  },
  segmentedTab: {
    flex: 1,
    paddingVertical: 6,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmentedTabActive: {
    backgroundColor: Colors.neutral[0],
    ...Shadow.sm,
  },
  segmentedText: {
    fontFamily: FontFamily.medium,
    fontSize: FontSize.xs,
    color: Colors.neutral[500],
  },
  segmentedTextActive: {
    fontFamily: FontFamily.bold,
    color: Colors.primary[600],
  },
});
