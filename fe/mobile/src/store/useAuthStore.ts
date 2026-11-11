import { create } from 'zustand';

export type Role = 'customer' | 'provider' | 'staff' | 'admin';

export interface UserProfile {
  name: string;
  email: string;
  phone: string;
  role: Role;
  skills?: string[];
  experienceYears?: number;
  identityCard?: string;
  address?: string;
}

interface AuthState {
  isInitializing: boolean;
  isLoggedIn: boolean;
  role: Role;
  currentUser: UserProfile | null;
  login: (role: Role, user?: Partial<UserProfile>) => void;
  finishInitialization: () => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  isInitializing: true,
  isLoggedIn: false,
  role: 'customer',
  currentUser: null,
  login: (role, user) =>
    set({
      isLoggedIn: true,
      isInitializing: false,
      role,
      currentUser: {
        name: user?.name || '',
        email: user?.email || '',
        phone: user?.phone || '',
        role,
        ...user,
      },
    }),
  finishInitialization: () => set({ isInitializing: false }),
  logout: () => set({ isLoggedIn: false, currentUser: null }),
}));
