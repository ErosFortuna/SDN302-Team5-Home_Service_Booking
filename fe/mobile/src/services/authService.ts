import { apiRequest } from './apiClient';

export interface ForgotPasswordResponse {
  success: boolean;
  message?: string;
  data?: Record<string, unknown>;
}

export interface ResetPasswordPayload {
  email: string;
  code: string;
  newPassword: string;
}

export interface ResetPasswordResponse {
  success: boolean;
  message?: string;
  data?: Record<string, unknown>;
}

export async function changePassword(currentPassword: string, newPassword: string): Promise<void> {
  await apiRequest('/auth/change-password', {
    method: 'POST',
    body: JSON.stringify({ currentPassword, newPassword }),
  });
}

/**
 * Gửi yêu cầu đặt lại mật khẩu với mã 6 số tới email người dùng.
 */
export async function requestForgotPassword(email: string): Promise<ForgotPasswordResponse> {
  return apiRequest<Record<string, unknown>>('/auth/forgot-password', {
    method: 'POST',
    body: JSON.stringify({ email: email.trim().toLowerCase() }),
  });
}

/**
 * Đặt lại mật khẩu mới bằng mã xác thực 6 số.
 */
export async function resetPasswordWithCode(payload: ResetPasswordPayload): Promise<ResetPasswordResponse> {
  return apiRequest<Record<string, unknown>>('/auth/reset-password', {
    method: 'POST',
    body: JSON.stringify({
      email: payload.email.trim().toLowerCase(),
      code: payload.code.trim(),
      newPassword: payload.newPassword,
    }),
  });
}
