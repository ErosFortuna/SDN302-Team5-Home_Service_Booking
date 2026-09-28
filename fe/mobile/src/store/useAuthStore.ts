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
  isLoggedIn: boolean;
  role: Role;
  currentUser: UserProfile | null;
  login: (role: Role, user?: Partial<UserProfile>) => void;
  logout: () => void;
  toggleRole: () => void;
  setRole: (role: Role) => void;
  registerCustomer: (data: { name: string; email: string; phone: string; address?: string }) => void;
  registerProvider: (data: { name: string; email: string; phone: string; skills: string[]; experienceYears: number; identityCard: string; address?: string }) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  isLoggedIn: true,
  role: 'customer',
  currentUser: {
    name: 'Alex Tran',
    email: 'customer@homehero.vn',
    phone: '0912 345 678',
    role: 'customer',
    address: 'Quận 1, TP.HCM',
  },
  login: (role, user) =>
    set({
      isLoggedIn: true,
      role,
      currentUser: {
        name: user?.name || (role === 'customer' ? 'Alex Tran' : role === 'provider' ? 'AquaFix Plumbing' : role === 'staff' ? 'Trần Thị Staff' : 'Lê Hoàng Admin'),
        email: user?.email || `${role}@homehero.vn`,
        phone: user?.phone || '0901 234 567',
        role,
        ...user,
      },
    }),
  logout: () => set({ isLoggedIn: false, currentUser: null }),
  toggleRole: () =>
    set((state) => ({
      role: state.role === 'customer' ? 'provider' : 'customer',
    })),
  setRole: (role) => set({ role }),
  registerCustomer: (data) =>
    set({
      isLoggedIn: true,
      role: 'customer',
      currentUser: {
        name: data.name,
        email: data.email,
        phone: data.phone,
        address: data.address || 'Quận 1, TP.HCM',
        role: 'customer',
      },
    }),
  registerProvider: (data) =>
    set({
      isLoggedIn: true,
      role: 'provider',
      currentUser: {
        name: data.name,
        email: data.email,
        phone: data.phone,
        skills: data.skills,
        experienceYears: data.experienceYears,
        identityCard: data.identityCard,
        address: data.address || 'TP.HCM',
        role: 'provider',
      },
    }),
}));
