import { Platform } from "react-native";
import { Role } from "../types";

type ApiRole = "CUSTOMER" | "PROVIDER";

export interface AuthUser {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  role: ApiRole;
  status: "ACTIVE" | "INACTIVE" | "BLOCKED";
}

interface AuthResponse {
  success: boolean;
  message: string;
  data: {
    user: AuthUser;
    accessToken: string;
  };
}

const developmentHost = Platform.OS === "android" ? "192.168.1.13" : "localhost";
const apiBaseUrl = process.env.EXPO_PUBLIC_API_URL || `http://${developmentHost}:5000/api`;

async function sendAuthRequest(
  endpoint: "register" | "login",
  payload: Record<string, string>,
): Promise<AuthResponse> {
  let response: Response;
  try {
    response = await fetch(`${apiBaseUrl}/auth/${endpoint}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  } catch {
    throw new Error(
      `Cannot reach the API at ${apiBaseUrl}. Check that the backend is running and EXPO_PUBLIC_API_URL is reachable from this device.`,
    );
  }

  const result = (await response.json().catch(() => null)) as
    | (Partial<AuthResponse> & {
        errors?: Array<{ field?: string; message?: string }>;
      })
    | null;

  if (!response.ok || !result?.data?.accessToken || !result.data.user) {
    const validationMessages = result?.errors
      ?.map(({ message }) => message)
      .filter(Boolean);
    throw new Error(
      validationMessages?.length
        ? validationMessages.join("\n")
        : result?.message || "Authentication failed. Please try again.",
    );
  }

  return result as AuthResponse;
}

export async function loginWithPassword(email: string, password: string) {
  return sendAuthRequest("login", { email, password });
}

export async function registerWithPassword(input: {
  fullName: string;
  email: string;
  phone: string;
  password: string;
  role: Role;
}) {
  return sendAuthRequest("register", {
    ...input,
    role: input.role.toUpperCase() as ApiRole,
  });
}