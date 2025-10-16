"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X } from "lucide-react";
import { useAuthStore } from "@/store/authStore";
import { useThemeStore } from "@/store/themeStore";
import DarkModeToggle from "@/components/DarkModeToggle";
import UserAvatar from "@/components/UserAvatar";
import LogoutButton from "@/components/LogoutButton";

export default function Navbar() {
  const user = useAuthStore((s) => s.user); // ✅ selector로 리렌더 보장
  const { theme } = useThemeStore();

  const [isOpen, setIsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [rehydrated, setRehydrated] = useState(false);

  useEffect(() => {
    setMounted(true);

    // ✅ persist rehydration 감지
    const unsub = useAuthStore.persist.onFinishHydration(() => {
      setRehydrated(true);
    });
    if (useAuthStore.persist.hasHydrated()) setRehydrated(true);

    return () => unsub();
  }, []);

  const toggleMenu = () => setIsOpen((prev) => !prev);

  console.log("Navbar render:", {
    user: useAuthStore.getState().user,
    hydrated: useAuthStore.persist.hasHydrated(),
  });
  // SSR 또는 hydration 전에는 렌더하지 않음
  if (!mounted || !rehydrated) return null;

  return (
    <nav className="border-b dark:border-gray-700 bg-white dark:bg-gray-900 fixed w-full top-0 left-0 z-50">
      <div className="flex justify-between items-center px-6 py-3">
        {/* 로고 */}
        <h1 className="font-semibold text-lg text-violet-600 dark:text-violet-400">
          Hans English
        </h1>

        {/* 데스크탑 메뉴 */}
        <div className="hidden md:flex items-center gap-4">
          <DarkModeToggle />
          {user ? (
            <>
              <UserAvatar email={user.email} />
              <span className="text-sm">{user.email}</span>
              <LogoutButton />
            </>
          ) : (
            <>
              <a
                href="/signup"
                className="text-sm text-violet-600 hover:underline dark:text-violet-400"
              >
                회원가입
              </a>
              <a
                href="/login"
                className="text-sm text-violet-600 hover:underline dark:text-violet-400"
              >
                로그인
              </a>
            </>
          )}
        </div>

        {/* 모바일 햄버거 버튼 */}
        <button
          className="md:hidden p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
          onClick={toggleMenu}
        >
          {isOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* 모바일 메뉴 */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="md:hidden flex flex-col items-center gap-3 py-4 border-t dark:border-gray-700 bg-gray-50 dark:bg-gray-800"
          >
            <DarkModeToggle />
            {user ? (
              <>
                <div className="flex items-center gap-2">
                  <UserAvatar email={user.email} />
                  <span className="text-sm">{user.email}</span>
                </div>
                <LogoutButton />
              </>
            ) : (
              <>
                <a
                  href="/signup"
                  className="text-sm text-violet-600 hover:underline dark:text-violet-400"
                  onClick={() => setIsOpen(false)}
                >
                  회원가입
                </a>
                <a
                  href="/login"
                  className="text-sm text-violet-600 hover:underline dark:text-violet-400"
                  onClick={() => setIsOpen(false)}
                >
                  로그인
                </a>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
}
