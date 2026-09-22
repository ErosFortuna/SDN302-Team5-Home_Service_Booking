import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, gradients } from '../../constants/colors';
import { FontFamily, FontSize } from '../../constants/typography';
import { Radius, Space } from '../../constants/spacing';
import { Button, Icon } from '../../components/ui';
import { Input } from '../../components/form/Input';
import { RootStackNavigationProp } from '../../types/navigation';
import { useAuthStore } from '../../store/useAuthStore';

type Props = {
  navigation: RootStackNavigationProp<'Login'>;
};

export default function LoginScreen({ navigation }: Props) {
  const login = useAuthStore((state) => state.login);
  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.scroll}>
          {/* ── Header ── */}
          <View style={styles.header}>
            <View style={styles.iconWrapper}>
              <LinearGradient
                colors={gradients.heroTeal}
                style={styles.iconBg}
              >
                <Icon name="wrench" size={32} color={Colors.neutral[0]} />
              </LinearGradient>
            </View>
            <Text style={styles.title}>Chào mừng trở lại</Text>
            <Text style={styles.subtitle}>Đăng nhập để đặt dịch vụ ngay</Text>
          </View>

          {/* ── Form ── */}
          <View style={styles.form}>
            <Input
              label="Email"
              placeholder="Nhập email của bạn"
              leftIcon="email"
              keyboardType="email-address"
              autoCapitalize="none"
            />
            <Input
              label="Mật khẩu"
              placeholder="Nhập mật khẩu"
              leftIcon="lock"
              isPassword
            />
            
            <TouchableOpacity style={styles.forgotBtn}>
              <Text style={styles.forgotText}>Quên mật khẩu?</Text>
            </TouchableOpacity>

            <Button
              label="Đăng nhập (Khách hàng)"
              variant="primary"
              size="lg"
              gradient
              fullWidth
              style={{ marginTop: Space.md }}
              onPress={() => {
                login('customer');
                navigation.navigate('MainTabs');
              }}
            />
            <Button
              label="Đăng nhập (Thợ)"
              variant="outline"
              size="lg"
              fullWidth
              style={{ marginTop: Space.md }}
              onPress={() => {
                login('provider');
                navigation.navigate('MainTabs');
              }}
            />
          </View>

          {/* ── Social Login ── */}
          <View style={styles.socialSection}>
            <View style={styles.dividerRow}>
              <View style={styles.divider} />
              <Text style={styles.dividerText}>Hoặc tiếp tục với</Text>
              <View style={styles.divider} />
            </View>

            <View style={styles.socialButtons}>
              <TouchableOpacity style={styles.socialBtn}>
                <Text style={{ fontFamily: FontFamily.bold, fontSize: 24, color: '#DB4437' }}>G</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.socialBtn}>
                <Text style={{ fontFamily: FontFamily.bold, fontSize: 24, color: '#1877F2' }}>f</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* ── Footer ── */}
          <View style={{ flex: 1 }} />
          <View style={styles.footer}>
            <Text style={styles.footerText}>Chưa có tài khoản? </Text>
            <TouchableOpacity onPress={() => navigation.navigate('Register')}>
              <Text style={styles.footerLink}>Đăng ký ngay</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: Colors.neutral[0],
  },
  scroll: {
    flexGrow: 1,
    paddingHorizontal: Space.xl,
    paddingTop: Space['3xl'],
    paddingBottom: Space.xl,
  },
  
  // Header
  header: {
    alignItems: 'center',
    marginBottom: Space['2xl'],
  },
  iconWrapper: {
    marginBottom: Space.lg,
  },
  iconBg: {
    width: 64,
    height: 64,
    borderRadius: Radius.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize['3xl'],
    color: Colors.neutral[900],
    marginBottom: Space.xs,
  },
  subtitle: {
    fontFamily: FontFamily.regular,
    fontSize: FontSize.md,
    color: Colors.neutral[500],
  },

  // Form
  form: {
    marginBottom: Space['2xl'],
  },
  forgotBtn: {
    alignSelf: 'flex-end',
    marginBottom: Space.md,
  },
  forgotText: {
    fontFamily: FontFamily.medium,
    fontSize: FontSize.sm,
    color: Colors.primary[600],
  },

  // Social
  socialSection: {
    marginBottom: Space['2xl'],
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Space.xl,
  },
  divider: {
    flex: 1,
    height: 1,
    backgroundColor: Colors.neutral[200],
  },
  dividerText: {
    fontFamily: FontFamily.regular,
    fontSize: FontSize.sm,
    color: Colors.neutral[400],
    paddingHorizontal: Space.md,
  },
  socialButtons: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: Space.lg,
  },
  socialBtn: {
    width: 56,
    height: 56,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: Colors.neutral[200],
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.neutral[50],
  },

  // Footer
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: Space.lg,
  },
  footerText: {
    fontFamily: FontFamily.regular,
    fontSize: FontSize.md,
    color: Colors.neutral[500],
  },
  footerLink: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSize.md,
    color: Colors.primary[600],
  },
});
