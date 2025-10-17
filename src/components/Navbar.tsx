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
  const { user } = useAuthStore();
  const { theme } = useThemeStore();

  const [isOpen, setIsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [visible, setVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);

  const toggleMenu = () => setIsOpen((prev) => !prev);

  useEffect(() => setMounted(true), []);

  /** ✅ 스크롤 시 Navbar 숨김/표시 */
  useEffect(() => {
    if (typeof window === "undefined") return;
    const handleScroll = () => {
      const currentY = window.scrollY;
      if (Math.abs(currentY - lastScrollY) < 20) return;
      if (currentY > lastScrollY && currentY > 80) setVisible(false);
      else setVisible(true);
      setLastScrollY(currentY);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, [lastScrollY]);

  if (!mounted) return null;

  return (
    <motion.nav
      initial={{ y: 0 }}
      animate={{ y: visible ? 0 : -80 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className={`
        fixed top-0 left-0 w-full z-50 border-b
        transition-all duration-300 backdrop-blur-md shadow-sm
        ${
          theme === "dark"
            ? "border-gray-800 bg-gray-900 text-gray-100"
            : "border-gray-200 bg-gradient-to-b from-white/80 to-white/50 text-gray-800"
        }
      `}
    >
      <div className="flex justify-between items-center px-5 py-3 max-w-6xl mx-auto">
        {/* 로고 */}
        <h1 className="font-bold text-lg text-violet-600 dark:text-violet-400 tracking-tight">
          Hans English
        </h1>

        {/* 오른쪽 영역 */}
        <div className="flex items-center gap-3 md:gap-4">
          {/* ✅ 다크모드 토글 항상 표시 */}
          <DarkModeToggle />

          {/* 데스크탑 메뉴 */}
          <div className="hidden md:flex items-center gap-4">
            {user ? (
              <>
                <UserAvatar email={user.email} />
                <span className="text-sm text-gray-700 dark:text-gray-100 font-medium">
                  {user.email}
                </span>
                <LogoutButton />
              </>
            ) : (
              <>
                <a
                  href="/signup"
                  className="text-sm text-violet-600 hover:text-violet-700 dark:text-violet-400 dark:hover:text-violet-300 transition-colors"
                >
                  회원가입
                </a>
                <a
                  href="/login"
                  className="text-sm text-violet-600 hover:text-violet-700 dark:text-violet-400 dark:hover:text-violet-300 transition-colors"
                >
                  로그인
                </a>
              </>
            )}
          </div>

          {/* 모바일 햄버거 버튼 */}
          <button
            className="md:hidden p-2 rounded-lg hover:bg-gray-100/60 dark:hover:bg-gray-800/70 transition-colors"
            onClick={toggleMenu}
            aria-label="메뉴 열기"
          >
            {isOpen ? (
              <X className="w-5 h-5 text-gray-900 dark:text-gray-100" />
            ) : (
              <Menu className="w-5 h-5 text-gray-900 dark:text-gray-100" />
            )}
          </button>
        </div>
      </div>

      {/* ✅ 모바일 드롭다운 */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: "easeInOut" }}
            className={`
              md:hidden overflow-hidden border-t
              ${
                theme === "dark"
                  ? "border-gray-800 bg-gray-900 text-gray-100"
                  : "border-gray-200 bg-gray-50/95 text-gray-800"
              }
            `}
          >
            <div className="flex flex-col gap-3 px-6 py-4">
              {user ? (
                <>
                  <div className="flex items-center gap-3">
                    <UserAvatar email={user.email} />
                    <span className="text-sm font-medium">{user.email}</span>
                  </div>
                  <LogoutButton />
                </>
              ) : (
                <>
                  <a
                    href="/signup"
                    className="text-sm text-violet-600 hover:text-violet-700 dark:text-violet-400 dark:hover:text-violet-300 transition-colors"
                    onClick={() => setIsOpen(false)}
                  >
                    회원가입
                  </a>
                  <a
                    href="/login"
                    className="text-sm text-violet-600 hover:text-violet-700 dark:text-violet-400 dark:hover:text-violet-300 transition-colors"
                    onClick={() => setIsOpen(false)}
                  >
                    로그인
                  </a>
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.nav>
  );
}
