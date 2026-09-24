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
import { Checkbox } from '../../components/form/Checkbox';
import { Button } from '../../components/ui/Button';

type Role = 'customer' | 'provider';

import { RootStackNavigationProp } from '../../types/navigation';

type Props = {
  navigation: RootStackNavigationProp<'Register'>;
};

export default function RegisterScreen({ navigation }: Props) {
  const [role, setRole] = useState<Role>('customer');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [agree, setAgree] = useState(false);

  const handleRegister = () => {
    // Navigate to Login after register success (mock)
    navigation.navigate('Login');
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
            />
            <Input
              label="Email"
              placeholder="Nhập email"
              leftIcon="messages"
              keyboardType="email-address"
              value={email}
              onChangeText={setEmail}
            />
            <Input
              label="Số điện thoại"
              placeholder="Nhập số điện thoại"
              leftIcon="phone"
              keyboardType="phone-pad"
              value={phone}
              onChangeText={setPhone}
            />
            <Input
              label="Mật khẩu"
              placeholder="Nhập mật khẩu"
              leftIcon="lock"
              isPassword
              value={password}
              onChangeText={setPassword}
            />

            <Checkbox
              checked={agree}
              onChange={setAgree}
              label="Tôi đồng ý với các Điều khoản sử dụng & Chính sách bảo mật"
              style={{ marginTop: Space.sm }}
            />
          </View>

          {/* Actions */}
          <View style={styles.actionContainer}>
            <Button
              label={role === 'customer' ? 'Đăng ký ngay' : 'Đăng ký làm thợ'}
              variant="primary"
              size="lg"
              gradient
              fullWidth
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
