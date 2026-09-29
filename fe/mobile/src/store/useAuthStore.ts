import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { AuthUser } from "../api/auth";
import { Role } from "../types";

interface AuthState {
  isLoggedIn: boolean;
  role: Role;
  accessToken: string | null;
  user: AuthUser | null;
  hasHydrated: boolean;
  login: (user: AuthUser, accessToken: string) => void;
  logout: () => void;
  toggleRole: () => void;
  setRole: (role: Role) => void;
  setHasHydrated: (hasHydrated: boolean) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      isLoggedIn: false,
      role: "customer",
      accessToken: null,
      user: null,
      hasHydrated: false,
      login: (user, accessToken) =>
        set({
          isLoggedIn: true,
          role: user.role.toLowerCase() as Role,
          user,
          accessToken,
        }),
      logout: () =>
        set({ isLoggedIn: false, accessToken: null, user: null }),
      toggleRole: () =>
        set((state) => ({
          role: state.role === "customer" ? "provider" : "customer",
        })),
      setRole: (role) => set({ role }),
      setHasHydrated: (hasHydrated) => set({ hasHydrated }),
    }),
    {
      name: "@hsb_auth",
      storage: createJSONStorage(() => AsyncStorage),
      onRehydrateStorage: () => (state) => {
        if (state) state.setHasHydrated(true);
      },
    },
  ),
);
