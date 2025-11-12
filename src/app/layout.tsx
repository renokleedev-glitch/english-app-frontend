// src/app/layout.tsx
"use client";

import "./globals.css";
import { useEffect, useState } from "react";
import Navbar from "@/components/Navbar";
import { useThemeStore } from "@/store/themeStore";
import { useAuthStore } from "@/store/authStore";
import { getToken } from "@/lib/token";
import { Toaster } from "sonner";
import { usePathname } from "next/navigation"; // 🚨 [핵심 추가] 1. usePathname 임포트

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const fetchUser = useAuthStore((s) => s.fetchUser);
  const { theme, setTheme } = useThemeStore();
  const [mounted, setMounted] = useState(false);

  const pathname = usePathname(); // 🚨 [핵심 추가] 2. 현재 경로 확인
  const isAdminPage = pathname.startsWith("/admin"); // 🚨 /admin 경로 여부

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
  }, [mounted, theme, setTheme]); // 🚨 [핵심 추가] theme, setTheme

  // useEffect(() => {
  //   if (!mounted) return;
  //   document.documentElement.classList.toggle("dark", theme === "dark");
  // }, [mounted, theme]);

  return (
    <html lang="ko" suppressHydrationWarning>
      <body className="bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 transition-colors">
        {/* 🚨 [핵심 수정] 3. admin 페이지가 아닐 때만 상단 Navbar 렌더링 */}
        {mounted && !isAdminPage && <Navbar />}

        {/* 🚨 [핵심 수정] 4. admin 페이지가 아닐 때만 상단 여백(mt-16) 적용 */}
        <main
          className={`px-6 py-4 min-h-screen ${!isAdminPage ? "mt-16" : ""}`}
        >
          {children}
        </main>

        <Toaster position="top-right" richColors />
      </body>
    </html>
  );
}
