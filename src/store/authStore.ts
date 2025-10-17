// ✅ src/store/authStore.ts
"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { getMe } from "@/lib/api";
import { clearToken, getToken } from "@/lib/token";

export interface User {
  id?: number;
  email: string;
  [key: string]: any;
}

interface AuthState {
  user: User | null;
  loading: boolean;
  error: string | null;
  hydrated: boolean;

  /** 🔄 사용자 정보 새로고침 (/api/users/me) */
  fetchUser: () => Promise<void>;

  /** 👤 로그인 후 상태 수동 갱신 */
  setUser: (user: User | null) => void;

  /** 🚪 로그아웃 */
  logout: () => void;

  /** 💾 store 복원 완료 여부 표시 */
  setHydrated: (v: boolean) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      loading: false,
      error: null,
      hydrated: false,

      // 🔄 /api/users/me 호출
      fetchUser: async () => {
        const token = getToken();
        if (!token) {
          console.log("🚫 No token found. Skipping fetchUser.");
          set({ user: null });
          return;
        }

        console.log("🔵 fetchUser called");
        set({ loading: true, error: null });

        try {
          const data = await getMe();
          set({ user: data, loading: false });
          console.log("🟢 fetchUser success:", data);
        } catch (err: any) {
          console.log("🔴 fetchUser failed:", err?.message);
          clearToken();
          set({ user: null, loading: false, error: err?.message });
        }
      },

      // 로그인 직후 수동으로 user 저장
      setUser: (user) => set({ user }),

      // 로그아웃 시 전체 정리
      logout: () => {
        clearToken();
        set({ user: null, error: null });
        console.log("🚪 Logged out");
      },

      // hydration 완료 마킹
      setHydrated: (v) => set({ hydrated: v }),
    }),
    {
      name: "auth-storage",
      partialize: (state) => ({ user: state.user }),
      onRehydrateStorage: () => (state) => {
        // ✅ hydration 완료되면 표시
        state?.setHydrated(true);
      },
    }
  )
);
