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
} from 'react-native';
import { Colors } from '../../constants/colors';
import { FontFamily, FontSize } from '../../constants/typography';
import { Radius, Space } from '../../constants/spacing';
import { Input } from '../../components/form/Input';
import { Checkbox } from '../../components/form/Checkbox';
import { Button } from '../../components/ui/Button';

import { RootStackNavigationProp } from '../../types/navigation';
import { registerWithPassword } from '../../api/auth';

type Props = {
  navigation: RootStackNavigationProp<'Register'>;
};

export default function RegisterScreen({ navigation }: Props) {
  const [role, setRole] = useState<'customer' | 'provider'>('customer');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [address, setAddress] = useState('');
  const [identityCard, setIdentityCard] = useState('');
  const [skills, setSkills] = useState('Điện nước, Điện lạnh');
  const [experience, setExperience] = useState('3');
  const [agree, setAgree] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleRegister = async () => {
    const trimmedName = name.trim();
    const trimmedEmail = email.trim().toLowerCase();
    const trimmedPhone = phone.trim();
    const trimmedPassword = password;
    const trimmedAddress = address.trim();

    if (!trimmedName || trimmedName.length < 2) {
      Alert.alert('Thông báo', 'Vui lòng nhập họ và tên (tối thiểu 2 ký tự).');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!trimmedEmail || !emailRegex.test(trimmedEmail)) {
      Alert.alert('Thông báo', 'Vui lòng nhập địa chỉ email hợp lệ.');
      return;
    }

    const phoneRegex = /^(0|\+84)(3|5|7|8|9)[0-9]{8}$/;
    if (!trimmedPhone || !phoneRegex.test(trimmedPhone)) {
      Alert.alert('Thông báo', 'Vui lòng nhập số điện thoại Việt Nam hợp lệ (10 chữ số).');
      return;
    }

    if (!trimmedPassword || trimmedPassword.length < 8) {
      Alert.alert('Thông báo', 'Mật khẩu phải có ít nhất 8 ký tự.');
      return;
    }

    if (!agree) {
      Alert.alert('Thông báo', 'Vui lòng đồng ý với các Điều khoản sử dụng & Chính sách bảo mật.');
      return;
    }

    try {
      setIsLoading(true);
      const res = await registerWithPassword({
        fullName: trimmedName,
        email: trimmedEmail,
        phone: trimmedPhone,
        password: trimmedPassword,
        role,
        address: trimmedAddress || undefined,
      });

      if (res.data?.verificationRequired) {
        Alert.alert(
          'Đăng ký thành công',
          'Vui lòng nhập mã OTP 6 chữ số đã được gửi đến hộp thư email để kích hoạt tài khoản.',
          [
            {
              text: 'Nhập mã xác minh',
              onPress: () => {
                navigation.navigate('VerifyEmail', { email: trimmedEmail });
              },
            },
          ]
        );
      } else {
        Alert.alert(
          'Đăng ký thành công',
          'Tài khoản đã sẵn sàng. Vui lòng đăng nhập để tiếp tục.',
          [
            {
              text: 'Đăng nhập ngay',
              onPress: () => {
                navigation.navigate('Login');
              },
            },
          ]
        );
      }
    } catch (err: any) {
      Alert.alert('Đăng ký không thành công', err.message || 'Kiểm tra lại thông tin và kết nối mạng.');
    } finally {
      setIsLoading(false);
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
            />
            <Input
              label="Email"
              placeholder="Nhập email"
              leftIcon="messages"
              keyboardType="email-address"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
            />
            <Input
              label="Số điện thoại"
              placeholder="0901234567"
              leftIcon="phone"
              keyboardType="phone-pad"
              value={phone}
              onChangeText={setPhone}
            />
            <Input
              label="Mật khẩu"
              placeholder="Nhập mật khẩu (tối thiểu 8 ký tự)"
              leftIcon="lock"
              isPassword
              value={password}
              onChangeText={setPassword}
            />
            <Input
              label="Địa chỉ (Quận / Huyện)"
              placeholder="vd: 45 Nguyễn Huệ, Quận 1, TP.HCM"
              leftIcon="location"
              value={address}
              onChangeText={setAddress}
            />

            {role === 'provider' && (
              <>
                <Input
                  label="Lĩnh vực chuyên môn"
                  placeholder="vd: Điện nước, Điện lạnh"
                  leftIcon="services"
                  value={skills}
                  onChangeText={setSkills}
                />
                <Input
                  label="Số năm kinh nghiệm"
                  placeholder="vd: 3"
                  leftIcon="profile"
                  keyboardType="numeric"
                  value={experience}
                  onChangeText={setExperience}
                />
                <Input
                  label="Số CCCD / CMND"
                  placeholder="079095001234"
                  leftIcon="document"
                  keyboardType="numeric"
                  value={identityCard}
                  onChangeText={setIdentityCard}
                />
              </>
            )}

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
              loading={isLoading}
              disabled={isLoading}
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
