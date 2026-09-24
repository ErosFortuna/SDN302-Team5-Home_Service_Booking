import { create } from 'zustand';

export type Role = 'customer' | 'provider';

interface AuthState {
  isLoggedIn: boolean;
  role: Role;
  login: (role: Role) => void;
  logout: () => void;
  toggleRole: () => void;
  setRole: (role: Role) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  isLoggedIn: true,
  role: 'customer',
  login: (role) => set({ isLoggedIn: true, role }),
  logout: () => set({ isLoggedIn: false }),
  toggleRole: () => set((state) => ({ role: state.role === 'customer' ? 'provider' : 'customer' })),
  setRole: (role) => set({ role }),
}));
