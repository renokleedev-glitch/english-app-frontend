// src/app/layout.tsx
"use client";

import "./globals.css";
import { useEffect, useState } from "react";
import Navbar from "@/components/Navbar";
import { useThemeStore } from "@/store/themeStore";
import { useAuthStore } from "@/store/authStore";
import { getToken } from "@/lib/token";
import { Toaster } from "sonner";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const fetchUser = useAuthStore((s) => s.fetchUser);
  const { theme, setTheme } = useThemeStore();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);

    // persist 복원 이후에만 사용자 불러오기 (중복/401 방지)
    const unsub = useAuthStore.persist.onFinishHydration(() => {
      if (getToken()) fetchUser().catch(console.error);
    });
    if (useAuthStore.persist.hasHydrated() && getToken()) {
      fetchUser().catch(console.error);
    }
    return () => unsub();
  }, [fetchUser]);

  // 테마는 hydrate 후에만 DOM에 반영 (SSR/CSR 불일치 방지)
  useEffect(() => {
    if (!mounted) return;
    const prefersDark = window.matchMedia(
      "(prefers-color-scheme: dark)"
    ).matches;
    const initial = theme || (prefersDark ? "dark" : "light");
    setTheme(initial);
    document.documentElement.classList.toggle("dark", initial === "dark");
  }, [mounted]);

  useEffect(() => {
    if (!mounted) return;
    document.documentElement.classList.toggle("dark", theme === "dark");
  }, [mounted, theme]);

  return (
    // ✅ 동적 class 빼고, 경고 억제 플래그만
    <html lang="ko" suppressHydrationWarning>
      {/* 🚨 [핵심 수정 1] body에서 min-h-screen을 제거하고, 
             Tailwind 색상 클래스를 유지하여 CSS 변수가 작동하도록 합니다. */}
      <body className="bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 transition-colors">
        {mounted && <Navbar />}
        {/* 🚨 [핵심 수정 2] min-h-screen을 main 태그로 이동하여 콘텐츠 높이를 확보합니다. */}
        <main className="px-6 py-4 mt-16 min-h-screen">{children}</main>
      </body>
    </html>
  );
}
