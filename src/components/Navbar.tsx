"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X, Settings } from "lucide-react";
import { useAuthStore } from "@/store/authStore";
import { useThemeStore } from "@/store/themeStore";
import DarkModeToggle from "@/components/DarkModeToggle";
import UserAvatar from "@/components/UserAvatar";
import LogoutButton from "@/components/LogoutButton";
import { Role } from "@/schemas";
import Link from "next/link";

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

  const isPrivilegedUser =
    user && (user.role === Role.ADMIN || user.role === Role.TEACHER);

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
          <Link href="/">Hans English</Link>
        </h1>

        {/* 오른쪽 영역 */}
        <div className="flex items-center gap-3 md:gap-4">
          <DarkModeToggle />

          {/* 데스크탑 메뉴 */}
          <div className="hidden md:flex items-center gap-4">
            {user ? (
              <>
                {/* 관리자 페이지 링크 (데스크탑) */}
                {isPrivilegedUser && (
                  <Link
                    href="/admin/users"
                    className="flex items-center text-sm font-medium text-violet-600 hover:text-violet-700 dark:text-violet-400 dark:hover:text-violet-300 transition-colors"
                  >
                    <Settings size={16} className="mr-1" />
                    관리자
                  </Link>
                )}

                {/* 🚨 [핵심 수정] UserAvatar를 /profile 링크로 감싸기 */}
                <Link
                  href="/profile"
                  className="rounded-full focus:outline-none focus:ring-2 focus:ring-violet-500 focus:ring-offset-2"
                  aria-label="프로필 페이지로 이동"
                >
                  <UserAvatar email={user.email} />
                </Link>

                {/* 🚨 [핵심 수정] 닉네임 텍스트 링크 제거 */}

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
            {isOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      {/* ✅ 모바일 드롭다운 (모바일에서는 닉네임 텍스트 링크 유지) */}
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
            <div className="flex flex-col gap-4 px-6 py-4">
              {user ? (
                <>
                  {/* 🚨 [핵심 수정] <div>를 <Link>로 변경하고, Avatar와 닉네임을 그 안에 배치합니다. */}
                  <Link
                    href="/profile"
                    className="flex items-center gap-3 text-sm font-medium text-gray-700 dark:text-gray-200 hover:text-violet-600 dark:hover:text-violet-400 transition-colors"
                    onClick={() => setIsOpen(false)} // 👈 메뉴 닫기
                  >
                    <UserAvatar email={user.email} />
                    <span>{user.nickname}</span>
                  </Link>

                  {/* 관리자 페이지 링크 (모바일) */}
                  {isPrivilegedUser && (
                    <Link
                      href="/admin/users"
                      className="flex items-center text-sm font-medium text-violet-600 hover:text-violet-700 dark:text-violet-400 dark:hover:text-violet-300 transition-colors"
                      onClick={() => setIsOpen(false)}
                    >
                      <Settings size={16} className="mr-2" />
                      관리자 페이지
                    </Link>
                  )}

                  <LogoutButton />
                </>
              ) : (
                <>
                  <a href="/signup" /* ... */ onClick={() => setIsOpen(false)}>
                    회원가입
                  </a>
                  <a href="/login" /* ... */ onClick={() => setIsOpen(false)}>
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
