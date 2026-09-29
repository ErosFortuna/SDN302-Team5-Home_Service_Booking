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
import { Colors } from '../../constants/colors';
import { FontFamily, FontSize } from '../../constants/typography';
import { Radius, Space } from '../../constants/spacing';
import { Input } from '../../components/form/Input';
import { Button } from '../../components/ui/Button';
import { Role } from '../../types';
import { RootStackNavigationProp } from '../../types/navigation';
import { registerWithPassword } from '../../api/auth';
import { useAuthStore } from '../../store/useAuthStore';

type Props = {
  navigation: RootStackNavigationProp<'Register'>;
};

export default function RegisterScreen({ navigation }: Props) {
  const [role, setRole] = useState<Role>('customer');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const login = useAuthStore((state) => state.login);

  const handleRegister = async () => {
    setError('');
    setLoading(true);
    try {
      const response = await registerWithPassword({
        fullName: name,
        email: email.trim(),
        phone: phone.trim(),
        password,
        role,
      });
      login(response.data.user, response.data.accessToken);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Đăng ký thất bại. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          
          <View style={styles.header}>
            <Text style={styles.title}>Tạo tài khoản mới</Text>
            <Text style={styles.subtitle}>Điền thông tin để tham gia nền tảng</Text>
          </View>

          {/* Role Selector */}
          <View style={styles.roleSelector}>
            <TouchableOpacity
              activeOpacity={0.8}
              style={[styles.roleTab, role === 'customer' && styles.roleTabActive]}
              onPress={() => setRole('customer')}
            >
              <Text style={[styles.roleText, role === 'customer' && styles.roleTextActive]}>
                Khách hàng
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              activeOpacity={0.8}
              style={[styles.roleTab, role === 'provider' && styles.roleTabActive]}
              onPress={() => setRole('provider')}
            >
              <Text style={[styles.roleText, role === 'provider' && styles.roleTextActive]}>
                Trở thành Thợ
              </Text>
            </TouchableOpacity>
          </View>

          {/* Form Fields */}
          <View style={styles.formContainer}>
            <Input
              label="Họ và tên"
              placeholder="Nhập họ và tên"
              leftIcon="profile"
              value={name}
              onChangeText={setName}
              autoComplete="name"
            />
            <Input
              label="Email"
              placeholder="Nhập email"
              leftIcon="messages"
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
              value={email}
              onChangeText={setEmail}
            />
            <Input
              label="Số điện thoại"
              placeholder="Nhập số điện thoại"
              leftIcon="phone"
              keyboardType="phone-pad"
              autoComplete="tel"
              value={phone}
              onChangeText={setPhone}
            />
            <Input
              label="Mật khẩu"
              placeholder="Ít nhất 8 ký tự"
              leftIcon="lock"
              isPassword
              autoComplete="new-password"
              value={password}
              onChangeText={setPassword}
            />
            {!!error && <Text accessibilityRole="alert" style={styles.errorMessage}>{error}</Text>}
          </View>

          {/* Actions */}
          <View style={styles.actionContainer}>
            <Button
              label={role === 'customer' ? 'Đăng ký ngay' : 'Đăng ký làm thợ'}
              variant="primary"
              size="lg"
              gradient
              fullWidth
              loading={loading}
              disabled={!name.trim() || !email.trim() || !phone.trim() || !password}
              onPress={handleRegister}
            />
            <View style={styles.footerRow}>
              <Text style={styles.footerText}>Đã có tài khoản? </Text>
              <TouchableOpacity onPress={() => navigation.navigate('Login')}>
                <Text style={styles.footerLink}>Đăng nhập</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.neutral[0],
  },
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: Space.xl,
    flexGrow: 1,
    justifyContent: 'center',
  },
  header: {
    marginBottom: Space.xl,
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
  roleSelector: {
    flexDirection: 'row',
    backgroundColor: Colors.neutral[100],
    padding: 4,
    borderRadius: Radius.full,
    marginBottom: Space.xl,
  },
  roleTab: {
    flex: 1,
    paddingVertical: Space.md,
    alignItems: 'center',
    borderRadius: Radius.full,
  },
  roleTabActive: {
    backgroundColor: Colors.neutral[0],
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  roleText: {
    fontFamily: FontFamily.medium,
    fontSize: FontSize.md,
    color: Colors.neutral[500],
  },
  roleTextActive: {
    fontFamily: FontFamily.semiBold,
    color: Colors.primary[600],
  },
  formContainer: {
    gap: Space.md,
    marginBottom: Space.xl,
  },
  actionContainer: {
    gap: Space.lg,
    marginTop: 'auto',
  },
  errorMessage: {
    color: Colors.semantic.error,
    fontFamily: FontFamily.medium,
    fontSize: FontSize.sm,
    marginTop: Space.xs,
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  footerText: {
    fontFamily: FontFamily.regular,
    fontSize: FontSize.md,
    color: Colors.neutral[500],
  },
  footerLink: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSize.md,
    color: Colors.primary[500],
  },
});
