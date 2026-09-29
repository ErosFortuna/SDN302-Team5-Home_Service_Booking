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

type Props = {
  navigation: RootStackNavigationProp<'Login'>;
};

export default function LoginScreen({ navigation }: Props) {
  const login = useAuthStore((state) => state.login);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    setError('');
    setLoading(true);
    try {
      const response = await loginWithPassword(email.trim(), password);
      login(response.data.user, response.data.accessToken);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Đăng nhập thất bại. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
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
              autoComplete="email"
              textContentType="emailAddress"
              value={email}
              onChangeText={setEmail}
            />
            <Input
              label="Mật khẩu"
              placeholder="Nhập mật khẩu"
              leftIcon="lock"
              isPassword
              autoComplete="password"
              textContentType="password"
              value={password}
              onChangeText={setPassword}
            />

            {!!error && <Text accessibilityRole="alert" style={styles.errorMessage}>{error}</Text>}

            <Button
              label="Đăng nhập"
              variant="primary"
              size="lg"
              gradient
              fullWidth
              loading={loading}
              disabled={!email.trim() || !password}
              style={{ marginTop: Space.md }}
              onPress={handleLogin}
            />
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
  errorMessage: {
    color: Colors.semantic.error,
    fontFamily: FontFamily.medium,
    fontSize: FontSize.sm,
    marginBottom: Space.sm,
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
