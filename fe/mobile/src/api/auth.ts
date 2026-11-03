import { Platform } from "react-native";
import { Role } from "../types";

type ApiRole = "CUSTOMER" | "PROVIDER";

export interface AuthUser {
  id: string;
  fullName: string;
  email: string;
  phone?: string;
  role: ApiRole;
  status: "ACTIVE" | "INACTIVE" | "BLOCKED";
  emailVerified: boolean;
}

interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
}

const developmentHost = Platform.OS === "android" ? "192.168.1.13" : "localhost";
const apiBaseUrl = process.env.EXPO_PUBLIC_API_URL || `http://${developmentHost}:5000/api`;

export const googleClientConfig = {
  androidClientId: process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID,
  iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
  webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
};

export const hasGoogleClientConfig = Boolean(
  Platform.OS === 'android'
    ? googleClientConfig.androidClientId
    : Platform.OS === 'ios'
      ? googleClientConfig.iosClientId
      : googleClientConfig.webClientId,
);

async function sendAuthRequest<T>(
  endpoint: "register" | "login" | "google" | "verify-email" | "resend-verification",
  payload: Record<string, string>,
): Promise<ApiResponse<T>> {
  let response: Response;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20_000);
  try {
    response = await fetch(`${apiBaseUrl}/auth/${endpoint}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
  } catch (error) {
    const timedOut = error instanceof Error && error.name === "AbortError";
    throw new Error(
      timedOut
        ? `The request timed out while contacting ${apiBaseUrl}. Check the API URL and backend logs.`
        : `Cannot reach the API at ${apiBaseUrl}. Check that the backend is running and EXPO_PUBLIC_API_URL is reachable from this device.`,
    );
  } finally {
    clearTimeout(timeout);
  }

  const result = (await response.json().catch(() => null)) as
    | (Partial<ApiResponse<T>> & {
        errors?: Array<{ field?: string; message?: string }>;
      })
    | null;

  if (!response.ok || !result?.data) {
    const validationMessages = result?.errors
      ?.map(({ message }) => message)
      .filter(Boolean);
    throw new Error(
      validationMessages?.length
        ? validationMessages.join("\n")
        : result?.message || "Authentication failed. Please try again.",
    );
  }

  return result as ApiResponse<T>;
}

export async function loginWithPassword(email: string, password: string) {
  return sendAuthRequest<{ user: AuthUser; accessToken: string }>("login", { email, password });
}

export async function registerWithPassword(input: {
  fullName: string;
  email: string;
  phone: string;
  password: string;
  role: Role;
}) {
  return sendAuthRequest<{ email: string; verificationRequired: boolean }>("register", {
    ...input,
    role: input.role.toUpperCase() as ApiRole,
  });
}

export async function verifyEmailCode(email: string, code: string) {
  return sendAuthRequest<{ user: AuthUser; accessToken: string }>("verify-email", {
    email,
    code,
  });
}

export async function resendEmailVerification(email: string) {
  return sendAuthRequest<Record<string, never>>("resend-verification", { email });
}

export async function loginWithGoogle(idToken: string, role: Role = "customer") {
  return sendAuthRequest<{ user: AuthUser; accessToken: string }>("google", {
    idToken,
    role: role.toUpperCase() as ApiRole,
  });
}