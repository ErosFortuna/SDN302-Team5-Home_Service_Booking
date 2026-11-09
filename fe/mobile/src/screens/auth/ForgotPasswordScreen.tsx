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
import { Button, Icon } from '../../components/ui';
import { Input } from '../../components/form/Input';
import { RootStackNavigationProp } from '../../types/navigation';
import { requestForgotPassword } from '../../services/authService';

type Props = {
  navigation: RootStackNavigationProp<'ForgotPassword'>;
  route?: { params?: { email?: string } };
};

export default function ForgotPasswordScreen({ navigation, route }: Props) {
  const [email, setEmail] = useState(route?.params?.email || '');
  const [isLoading, setIsLoading] = useState(false);

  const handleSendCode = async () => {
    const targetEmail = email.trim().toLowerCase();
    if (!targetEmail || !targetEmail.includes('@')) {
      Alert.alert('Thông báo', 'Vui lòng nhập địa chỉ email hợp lệ.');
      return;
    }

    try {
      setIsLoading(true);
      const res = await requestForgotPassword(targetEmail);
      Alert.alert(
        'Thông báo',
        res.message || 'Mã xác nhận 6 số đã được gửi tới email của bạn (nếu tài khoản tồn tại).',
        [
          {
            text: 'Nhập mã xác nhận',
            onPress: () => navigation.navigate('ResetPassword', { email: targetEmail }),
          },
        ],
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Không thể gửi yêu cầu đặt lại mật khẩu.';
      Alert.alert('Lỗi', msg);
    } finally {
      setIsLoading(false);
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
              onPress={() => navigation.navigate('Login')}
            >
              <Icon name="back" size={24} color={Colors.neutral[800]} />
            </TouchableOpacity>
            <View style={styles.iconCircle}>
              <Icon name="lock" size={32} color={Colors.primary[600]} />
            </View>
            <Text style={styles.title}>Quên mật khẩu</Text>
            <Text style={styles.subtitle}>
              Nhập địa chỉ email của bạn để nhận mã xác nhận 6 số đặt lại mật khẩu.
            </Text>
          </View>

          {/* Form */}
          <View style={styles.form}>
            <Input
              label="Email"
              placeholder="Nhập địa chỉ email của bạn"
              leftIcon="email"
              keyboardType="email-address"
              autoCapitalize="none"
              value={email}
              onChangeText={setEmail}
            />

            <Button
              label={isLoading ? 'Đang gửi mã...' : 'Gửi mã xác nhận'}
              variant="primary"
              size="lg"
              gradient
              fullWidth
              disabled={isLoading || !email.trim()}
              style={{ marginTop: Space.sm }}
              onPress={handleSendCode}
            />

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
    paddingHorizontal: Space.md,
  },
  form: {
    gap: Space.md,
  },
  backToLoginBtn: {
    alignItems: 'center',
    paddingVertical: Space.sm,
    marginTop: Space.xs,
  },
  backToLoginText: {
    fontFamily: FontFamily.medium,
    fontSize: FontSize.sm,
    color: Colors.neutral[600],
  },
});
