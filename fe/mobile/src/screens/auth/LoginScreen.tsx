import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, gradients } from '../../constants/colors';
import { FontFamily, FontSize } from '../../constants/typography';
import { Radius, Space } from '../../constants/spacing';
import { Button, Icon } from '../../components/ui';
import { Input } from '../../components/form/Input';
import { RootStackNavigationProp } from '../../types/navigation';
import { useAuthStore } from '../../store/useAuthStore';
import { loginWithPassword } from '../../api/auth';
import { setStoredToken } from '../../services/apiClient';

type Props = {
  navigation: RootStackNavigationProp<'Login'>;
};

export default function LoginScreen({ navigation }: Props) {
  const login = useAuthStore((state) => state.login);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (loginEmail?: string, loginPassword?: string) => {
    const targetEmail = (loginEmail || email).trim();
    const targetPassword = loginPassword || password;

    if (!targetEmail || !targetPassword) {
      Alert.alert('Thông báo', 'Vui lòng nhập đầy đủ email và mật khẩu.');
      return;
    }

    try {
      setIsLoading(true);
      const res = await loginWithPassword(targetEmail, targetPassword);
      if (res.data?.accessToken) {
        await setStoredToken(res.data.accessToken);
        const user = res.data.user;
        const role = user.role.toLowerCase() as 'customer' | 'provider';
        login(role, {
          name: user.fullName,
          email: user.email,
          phone: user.phone || '',
          role,
        });
        navigation.navigate('MainTabs');
      } else {
        throw new Error(res.message || 'Đăng nhập không thành công.');
      }
    } catch (err: any) {
      Alert.alert('Đăng nhập thất bại', err.message || 'Kiểm tra lại thông tin đăng nhập.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickLogin = (role: 'customer' | 'provider' | 'staff' | 'admin') => {
    if (__DEV__) {
      const demoAccounts: Record<string, { email: string; pass: string }> = {
        customer: { email: 'customer.demo@homecare.local', pass: 'Demo123!' },
        provider: { email: 'provider.demo@homecare.local', pass: 'Demo123!' },
        staff: { email: 'staff.demo@homecare.local', pass: 'Demo123!' },
        admin: { email: 'admin.demo@homecare.local', pass: 'Demo123!' },
      };
      const cred = demoAccounts[role];
      setEmail(cred.email);
      setPassword(cred.pass);
      handleLogin(cred.email, cred.pass);
      return;
    }

    Alert.alert('Thông báo', 'Đăng nhập nhanh chỉ khả dụng trong bản phát triển.');
  };

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
              value={email}
              onChangeText={setEmail}
            />
            <Input
              label="Mật khẩu"
              placeholder="Nhập mật khẩu"
              leftIcon="lock"
              isPassword
              value={password}
              onChangeText={setPassword}
            />
            
            <TouchableOpacity style={styles.forgotBtn}>
              <Text style={styles.forgotText}>Quên mật khẩu?</Text>
            </TouchableOpacity>

            <Button
              label={isLoading ? 'Đang đăng nhập...' : 'Đăng nhập'}
              variant="primary"
              size="lg"
              gradient
              fullWidth
              disabled={isLoading}
              style={{ marginTop: Space.md }}
              onPress={() => handleLogin()}
            />

            {__DEV__ && (
              <View style={styles.demoSection}>
                <Text style={styles.demoTitle}>Tài khoản thử nghiệm (chỉ ở bản phát triển):</Text>
                <View style={styles.demoGrid}>
                  <TouchableOpacity
                    style={styles.demoChip}
                    onPress={() => handleQuickLogin('customer')}
                  >
                    <Text style={styles.demoChipText}>Khách hàng demo</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.demoChip}
                    onPress={() => handleQuickLogin('provider')}
                  >
                    <Text style={styles.demoChipText}>Thợ demo</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
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
  header: {
    alignItems: 'center',
    marginBottom: Space['2xl'],
  },
  iconWrapper: {
    marginBottom: Space.md,
  },
  iconBg: {
    width: 64,
    height: 64,
    borderRadius: Radius['2xl'],
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize['2xl'],
    color: Colors.neutral[900],
    marginBottom: Space.xs,
  },
  subtitle: {
    fontFamily: FontFamily.regular,
    fontSize: FontSize.sm,
    color: Colors.neutral[500],
  },
  form: {
    gap: Space.md,
  },
  forgotBtn: {
    alignSelf: 'flex-end',
  },
  forgotText: {
    fontFamily: FontFamily.medium,
    fontSize: FontSize.xs,
    color: Colors.primary[600],
  },
  demoSection: {
    marginTop: Space.sm,
    gap: Space.xs,
  },
  demoTitle: {
    fontFamily: FontFamily.regular,
    fontSize: FontSize.xs,
    color: Colors.neutral[400],
    textAlign: 'center',
  },
  demoGrid: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: Space.sm,
  },
  demoChip: {
    backgroundColor: Colors.neutral[100],
    paddingHorizontal: Space.sm + 4,
    paddingVertical: 6,
    borderRadius: Radius.full,
  },
  demoChipText: {
    fontFamily: FontFamily.medium,
    fontSize: FontSize.xs,
    color: Colors.neutral[700],
  },
  socialSection: {
    marginTop: Space.xl,
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Space.md,
    marginBottom: Space.lg,
  },
  divider: {
    flex: 1,
    height: 1,
    backgroundColor: Colors.neutral[200],
  },
  dividerText: {
    fontFamily: FontFamily.regular,
    fontSize: FontSize.xs,
    color: Colors.neutral[400],
  },
  socialButtons: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: Space.lg,
  },
  socialBtn: {
    width: 52,
    height: 52,
    borderRadius: Radius.xl,
    borderWidth: 1,
    borderColor: Colors.neutral[200],
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.neutral[0],
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: Space.xl,
  },
  footerText: {
    fontFamily: FontFamily.regular,
    fontSize: FontSize.sm,
    color: Colors.neutral[500],
  },
  footerLink: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize.sm,
    color: Colors.primary[600],
  },
});
