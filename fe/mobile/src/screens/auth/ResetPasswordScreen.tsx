import React, { useEffect, useState } from 'react';
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
import { Button, Icon } from '../../components/ui';
import { Input } from '../../components/form/Input';
import { RootStackNavigationProp } from '../../types/navigation';
import { requestForgotPassword, resetPasswordWithCode } from '../../services/authService';

type Props = {
  navigation: RootStackNavigationProp<'ResetPassword'>;
  route: { params: { email: string } };
};

export default function ResetPasswordScreen({ navigation, route }: Props) {
  const email = route.params.email;
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(60);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setTimeout(() => setResendCooldown((val) => val - 1), 1000);
    return () => clearTimeout(timer);
  }, [resendCooldown]);

  const handleReset = async () => {
    const trimmedCode = code.trim();
    if (!/^\d{6}$/.test(trimmedCode)) {
      Alert.alert('Lỗi', 'Mã xác nhận phải gồm đúng 6 chữ số.');
      return;
    }

    if (!newPassword) {
      Alert.alert('Lỗi', 'Vui lòng nhập mật khẩu mới.');
      return;
    }

    if (newPassword.length < 10) {
      Alert.alert('Lỗi', 'Mật khẩu mới phải có ít nhất 10 ký tự.');
      return;
    }

    if (newPassword !== confirmPassword) {
      Alert.alert('Lỗi', 'Mật khẩu xác nhận không khớp.');
      return;
    }

    try {
      setIsLoading(true);
      const res = await resetPasswordWithCode({
        email,
        code: trimmedCode,
        newPassword,
      });

      Alert.alert(
        'Thành công',
        res.message || 'Đặt lại mật khẩu thành công! Vui lòng đăng nhập lại.',
        [
          {
            text: 'Đăng nhập',
            onPress: () => navigation.navigate('Login'),
          },
        ],
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Đặt lại mật khẩu thất bại.';
      Alert.alert('Lỗi', msg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendCode = async () => {
    if (resendCooldown > 0 || resending) return;
    try {
      setResending(true);
      const res = await requestForgotPassword(email);
      Alert.alert(
        'Thông báo',
        res.message || 'Mã xác nhận mới đã được gửi tới email của bạn.',
      );
      setResendCooldown(60);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Không thể gửi lại mã.';
      Alert.alert('Lỗi', msg);
    } finally {
      setResending(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => navigation.goBack()}
            >
              <Icon name="back" size={24} color={Colors.neutral[800]} />
            </TouchableOpacity>
            <View style={styles.iconCircle}>
              <Icon name="shieldCheck" size={32} color={Colors.primary[600]} />
            </View>
            <Text style={styles.title}>Đặt lại mật khẩu</Text>
            <Text style={styles.subtitle}>
              Nhập mã 6 chữ số đã gửi tới <Text style={styles.emailHighlight}>{email}</Text> và mật khẩu mới của bạn.
            </Text>
          </View>

          {/* Form */}
          <View style={styles.form}>
            <Input
              label="Mã xác nhận 6 số"
              placeholder="000000"
              leftIcon="shieldCheck"
              keyboardType="number-pad"
              maxLength={6}
              value={code}
              onChangeText={(val) => setCode(val.replace(/\D/g, '').slice(0, 6))}
            />

            <Input
              label="Mật khẩu mới"
              placeholder="Tối thiểu 10 ký tự"
              leftIcon="lock"
              isPassword
              value={newPassword}
              onChangeText={setNewPassword}
            />

            <Input
              label="Xác nhận mật khẩu mới"
              placeholder="Nhập lại mật khẩu mới"
              leftIcon="lock"
              isPassword
              value={confirmPassword}
              onChangeText={setConfirmPassword}
            />

            <Button
              label={isLoading ? 'Đang đặt lại...' : 'Xác nhận đặt lại mật khẩu'}
              variant="primary"
              size="lg"
              gradient
              fullWidth
              disabled={isLoading || code.length !== 6 || newPassword.length < 10}
              style={{ marginTop: Space.sm }}
              onPress={handleReset}
            />

            {/* Resend code */}
            <View style={styles.resendContainer}>
              <Text style={styles.resendNotice}>Chưa nhận được mã?</Text>
              <TouchableOpacity
                disabled={resendCooldown > 0 || resending}
                onPress={handleResendCode}
              >
                <Text
                  style={[
                    styles.resendAction,
                    resendCooldown > 0 && styles.resendDisabled,
                  ]}
                >
                  {resendCooldown > 0
                    ? `Gửi lại sau (${resendCooldown}s)`
                    : resending
                    ? 'Đang gửi...'
                    : 'Gửi lại mã'}
                </Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={styles.backToLoginBtn}
              onPress={() => navigation.navigate('Login')}
            >
              <Text style={styles.backToLoginText}>Quay lại đăng nhập</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.white,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: Space.xl,
    paddingTop: Space.lg,
    paddingBottom: Space['2xl'],
  },
  header: {
    alignItems: 'center',
    marginBottom: Space.xl,
  },
  backButton: {
    alignSelf: 'flex-start',
    padding: Space.xs,
    marginBottom: Space.md,
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: Radius.full,
    backgroundColor: Colors.primary[50],
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Space.md,
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
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: Space.sm,
  },
  emailHighlight: {
    fontFamily: FontFamily.semiBold,
    color: Colors.neutral[800],
  },
  form: {
    gap: Space.md,
  },
  resendContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: Space.xs,
    marginTop: Space.xs,
  },
  resendNotice: {
    fontFamily: FontFamily.regular,
    fontSize: FontSize.xs,
    color: Colors.neutral[500],
  },
  resendAction: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSize.xs,
    color: Colors.primary[600],
  },
  resendDisabled: {
    color: Colors.neutral[400],
  },
  backToLoginBtn: {
    alignItems: 'center',
    paddingVertical: Space.sm,
  },
  backToLoginText: {
    fontFamily: FontFamily.medium,
    fontSize: FontSize.sm,
    color: Colors.neutral[600],
  },
});
