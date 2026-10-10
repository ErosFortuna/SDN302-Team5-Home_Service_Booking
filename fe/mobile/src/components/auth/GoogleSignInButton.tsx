import React, { useState } from 'react';
import { Text, View, StyleSheet } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import { useIdTokenAuthRequest } from 'expo-auth-session/providers/google';
import { Button } from '../ui/Button';
import { Colors } from '../../constants/colors';
import { FontFamily, FontSize } from '../../constants/typography';
import { Space } from '../../constants/spacing';
import { googleClientConfig, hasGoogleClientConfig, loginWithGoogle } from '../../api/auth';
import { Role } from '../../types';
import { useAuthStore } from '../../store/useAuthStore';

WebBrowser.maybeCompleteAuthSession();

interface Props {
  role?: Role;
}

export function GoogleSignInButton({ role = 'customer' }: Props) {
  const [request, , promptAsync] = useIdTokenAuthRequest(googleClientConfig, {
    scheme: 'home-service-booking',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const login = useAuthStore((state) => state.login);

  const handleGoogleSignIn = async () => {
    setError('');
    if (!hasGoogleClientConfig) {
      setError('Google sign-in chưa được cấu hình. Hãy thêm Client ID vào fe/mobile/.env.');
      return;
    }
    if (!request) {
      setError('Đang chuẩn bị đăng nhập Google. Vui lòng thử lại sau giây lát.');
      return;
    }

    setLoading(true);
    try {
      const result = await promptAsync();
      if (result.type === 'cancel' || result.type === 'dismiss') return;
      if (result.type !== 'success') {
        throw new Error('Không thể đăng nhập bằng Google. Vui lòng thử lại.');
      }

      const idToken = result.params.id_token;
      if (!idToken) throw new Error('Google không trả về ID token. Kiểm tra OAuth Client ID.');

      const response = await loginWithGoogle(idToken, role);
      login(response.data.user, response.data.accessToken);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Đăng nhập Google thất bại.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View>
      <Button
        label="Tiếp tục với Google"
        variant="outline"
        size="lg"
        fullWidth
        loading={loading || (hasGoogleClientConfig && !request)}
        leftIcon={<Text style={styles.googleMark}>G</Text>}
        onPress={handleGoogleSignIn}
      />
      {!hasGoogleClientConfig && (
        <Text style={styles.hint}>Cần cấu hình Google OAuth Client ID để dùng tính năng này.</Text>
      )}
      {!!error && <Text accessibilityRole="alert" style={styles.error}>{error}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  googleMark: {
    color: '#4285F4',
    fontFamily: FontFamily.bold,
    fontSize: FontSize.lg,
  },
  hint: {
    color: Colors.neutral[500],
    fontFamily: FontFamily.regular,
    fontSize: FontSize.xs,
    marginTop: Space.sm,
    textAlign: 'center',
  },
  error: {
    color: Colors.semantic.error,
    fontFamily: FontFamily.medium,
    fontSize: FontSize.sm,
    marginTop: Space.sm,
  },
});