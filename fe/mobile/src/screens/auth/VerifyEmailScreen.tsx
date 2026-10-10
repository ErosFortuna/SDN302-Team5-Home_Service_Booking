import React, { useEffect, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Colors } from '../../constants/colors';
import { FontFamily, FontSize } from '../../constants/typography';
import { Space } from '../../constants/spacing';
import { Input } from '../../components/form/Input';
import { Button } from '../../components/ui/Button';
import { verifyEmailCode, resendEmailVerification } from '../../api/auth';
import { useAuthStore } from '../../store/useAuthStore';
import { RootStackNavigationProp } from '../../types/navigation';

type Props = {
  navigation: RootStackNavigationProp<'VerifyEmail'>;
  route: { params: { email: string } };
};

export default function VerifyEmailScreen({ navigation, route }: Props) {
  const email = route.params.email;
  const login = useAuthStore((state) => state.login);
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setTimeout(() => setResendCooldown((value) => value - 1), 1000);
    return () => clearTimeout(timer);
  }, [resendCooldown]);

  const handleVerify = async () => {
    if (!/^\d{6}$/.test(code.trim())) {
      setError('Vui lòng nhập đủ 6 chữ số.');
      return;
    }
    setError('');
    setLoading(true);
    try {
      const response = await verifyEmailCode(email, code.trim());
      login(response.data.user, response.data.accessToken);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Không thể xác minh email.');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setError('');
    setNotice('');
    setResending(true);
    try {
      await resendEmailVerification(email);
      setNotice('Nếu tài khoản cần xác minh, mã mới đã được gửi.');
      setResendCooldown(60);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Không thể gửi lại mã.');
    } finally {
      setResending(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <View style={styles.heading}>
            <Text style={styles.eyebrow}>KÍCH HOẠT TÀI KHOẢN</Text>
            <Text style={styles.title}>Kiểm tra hộp thư</Text>
            <Text style={styles.subtitle}>Nhập mã 6 chữ số đã gửi tới</Text>
            <Text style={styles.email}>{email}</Text>
          </View>

          <Input
            label="Mã xác minh"
            placeholder="000000"
            keyboardType="number-pad"
            maxLength={6}
            value={code}
            onChangeText={(value) => setCode(value.replace(/\D/g, '').slice(0, 6))}
            autoComplete="one-time-code"
          />

          {!!error && <Text accessibilityRole="alert" style={styles.error}>{error}</Text>}
          {!!notice && <Text style={styles.notice}>{notice}</Text>}

          <Button
            label="Xác minh và tiếp tục"
            size="lg"
            gradient
            fullWidth
            loading={loading}
            disabled={code.length !== 6}
            onPress={handleVerify}
          />

          <View style={styles.resendRow}>
            <Text style={styles.resendText}>Chưa nhận được mã? </Text>
            <TouchableOpacity
              disabled={resending || resendCooldown > 0}
              onPress={handleResend}
            >
              <Text style={styles.resendAction}>
                {resending ? 'Đang gửi…' : resendCooldown ? `Gửi lại sau ${resendCooldown}s` : 'Gửi lại mã'}
              </Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity onPress={() => navigation.navigate('Register')} style={styles.back}>
            <Text style={styles.backText}>Quay lại đăng ký</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.neutral[0] },
  flex: { flex: 1 },
  scroll: { flexGrow: 1, justifyContent: 'center', padding: Space.xl },
  heading: { marginBottom: Space.xl },
  eyebrow: { color: Colors.primary[700], fontFamily: FontFamily.bold, fontSize: FontSize.xs, marginBottom: Space.sm },
  title: { color: Colors.neutral[900], fontFamily: FontFamily.bold, fontSize: FontSize['3xl'], marginBottom: Space.xs },
  subtitle: { color: Colors.neutral[500], fontFamily: FontFamily.regular, fontSize: FontSize.md },
  email: { color: Colors.neutral[800], fontFamily: FontFamily.semiBold, fontSize: FontSize.md, marginTop: Space.xs },
  error: { color: Colors.semantic.error, fontFamily: FontFamily.medium, fontSize: FontSize.sm, marginBottom: Space.md },
  notice: { color: Colors.semantic.success, fontFamily: FontFamily.medium, fontSize: FontSize.sm, marginBottom: Space.md },
  resendRow: { flexDirection: 'row', justifyContent: 'center', marginTop: Space.xl },
  resendText: { color: Colors.neutral[500], fontFamily: FontFamily.regular, fontSize: FontSize.sm },
  resendAction: { color: Colors.primary[700], fontFamily: FontFamily.semiBold, fontSize: FontSize.sm },
  back: { alignSelf: 'center', marginTop: Space.xl, padding: Space.sm },
  backText: { color: Colors.neutral[600], fontFamily: FontFamily.medium, fontSize: FontSize.sm },
});