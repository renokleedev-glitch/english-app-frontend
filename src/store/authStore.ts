"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { getMe } from "@/lib/api";
import { clearToken } from "@/lib/token";

export interface User {
  email: string;
  id?: number;
  daily_word_goal?: number;
}

interface AuthState {
  user: User | null;
  loading: boolean;
  error: string | null;
  hydrated: boolean; // ✅ persist 복원 완료 플래그

  fetchUser: () => Promise<void>;
  setUser: (user: User | null) => void;
  logout: () => void;
  setHydrated: (value: boolean) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      loading: false,
      error: null,
      hydrated: false,

      fetchUser: async () => {
        set({ loading: true, error: null });
        try {
          console.log("🔵 fetchUser called");
          const data = await getMe();
          console.log("🟢 fetchUser success:", data);
          set({ user: data, loading: false });
        } catch (err: any) {
          console.error("🔴 fetchUser failed:", err);
          clearToken();
          set({ user: null, loading: false });
        }
      },

      setUser: (user) => set({ user }),
      logout: () => {
        clearToken();
        set({ user: null, error: null });
      },
      setHydrated: (v) => set({ hydrated: v }),
    }),
    {
      name: "auth-storage",
      onRehydrateStorage: () => (state) => {
        state?.setHydrated(true);
      },
      partialize: (state) => ({ user: state.user }),
    }
  )
);
