// src/app/admin/layout.tsx
"use client";

import { ReactNode, useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { logout } from "@/lib/auth";
import { useAuthStore } from "@/store/authStore";
import { useThemeStore } from "@/store/themeStore"; // 🚨 [핵심 추가] 1. Theme Store 임포트
import { Role } from "@/schemas";
import {
  Users,
  BookText,
  FileText,
  Settings,
  Menu,
  X,
  LogOut,
  LayoutDashboard,
  Loader2,
  UserCheck,
  Sun, // 🚨 [핵심 추가] 2. Sun/Moon 아이콘
  Moon,
} from "lucide-react";
import { toast } from "sonner";

// ------------------------------------------------------------------
// 어드민 사이드바 네비게이션 링크
// ------------------------------------------------------------------
const adminNavLinks = [
  { href: "/admin/users", label: "학생 관리", icon: Users },
  { href: "/admin/words", label: "단어 관리", icon: BookText },
  { href: "/admin/exam", label: "내신 문제 관리", icon: FileText },
];

/**
 * 사이드바 링크 아이템
 */
function NavLink({ href, children }: { href: string; children: ReactNode }) {
  const pathname = usePathname();
  const isActive = pathname.startsWith(href);

  return (
    <Link
      href={href}
      className={`
        flex items-center px-3 py-2 rounded-md text-sm font-medium
        transition-colors
        ${
          isActive
            ? "bg-violet-600 text-white"
            : "text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
        }
      `}
    >
      {children}
    </Link>
  );
}

/**
 * 🚨 [수정] 사이드바 콘텐츠 컴포넌트
 */
function SidebarContent() {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const { theme, toggleTheme } = useThemeStore(); // 🚨 [핵심 추가] 3. Theme Store 사용

  const handleLogout = () => {
    logout();
    router.push("/login");
  };

  return (
    <div className="flex flex-col justify-between h-full">
      <div>
        {/* ... (관리자 메뉴, 역할 표시, 네비게이션 링크 유지) ... */}
        <h2 className="text-xl font-semibold mb-1 text-gray-800 dark:text-gray-100">
          <Settings className="inline-block w-5 h-5 mr-2" />
          관리자 메뉴
        </h2>
        <span className="text-xs text-violet-500 font-medium ml-1">
          {user?.role === Role.ADMIN ? "최고 관리자" : "선생님"}
        </span>

        <nav className="space-y-2 mt-4">
          {adminNavLinks.map((link) => (
            <NavLink key={link.href} href={link.href}>
              <link.icon className="w-4 h-4 mr-3" />
              {link.label}
            </NavLink>
          ))}

          {user?.role === Role.ADMIN && (
            <NavLink href="/admin/roles">
              <UserCheck className="w-4 h-4 mr-3" />
              권한 관리
            </NavLink>
          )}
        </nav>
      </div>

      {/* 사이드바 하단 메뉴 (메인사이트 / 로그아웃) */}
      <nav className="space-y-2 border-t border-gray-200 dark:border-gray-700 pt-4">
        <NavLink href="/dashboard">
          <LayoutDashboard className="w-4 h-4 mr-3" />
          메인 사이트
        </NavLink>

        {/* 🚨 [핵심 추가] 4. 다크 모드 토글 버튼 */}
        <button
          onClick={toggleTheme}
          className="flex items-center px-3 py-2 rounded-md text-sm font-medium w-full
                     text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
        >
          {theme === "light" ? (
            <Moon className="w-4 h-4 mr-3" />
          ) : (
            <Sun className="w-4 h-4 mr-3" />
          )}
          {theme === "light" ? "다크 모드" : "라이트 모드"}
        </button>

        <button
          onClick={handleLogout}
          className="flex items-center px-3 py-2 rounded-md text-sm font-medium w-full
                     text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
        >
          <LogOut className="w-4 h-4 mr-3" />
          로그아웃
        </button>
      </nav>
    </div>
  );
}
// ------------------------------------------------------------------
// 어드민 전용 레이아웃
// ------------------------------------------------------------------
export default function AdminLayout({ children }: { children: ReactNode }) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const router = useRouter();

  const user = useAuthStore((state) => state.user);
  const hydrated = useAuthStore((state) => state.hydrated);
  const [isAuthorized, setIsAuthorized] = useState(false);

  // 권한 확인 로직
  useEffect(() => {
    if (!hydrated) {
      return;
    }
    if (!user) {
      router.replace("/login");
      return;
    }
    if (user.role === Role.STUDENT) {
      toast.error("접근 권한이 없습니다.");
      router.replace("/dashboard");
      return;
    }
    setIsAuthorized(true);
  }, [user, hydrated, router]);

  // 권한 확인 중 로딩 UI
  if (!isAuthorized) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-gray-900">
        <Loader2 className="w-10 h-10 animate-spin text-violet-500" />
        <p className="ml-3 text-gray-600 dark:text-gray-300">
          권한을 확인 중입니다...
        </p>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen">
      {/* --- 1. 모바일 사이드바 (숨겨진 상태) --- */}
      <aside
        className={`
          fixed inset-y-0 left-0 z-50 w-64 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 p-4
          transform transition-transform duration-300 ease-in-out
          ${isSidebarOpen ? "translate-x-0" : "-translate-x-full"}
          md:hidden 
          h-full
        `}
      >
        <button
          onClick={() => setIsSidebarOpen(false)}
          className="absolute top-4 right-4 text-gray-500 hover:text-gray-800 dark:hover:text-gray-200 md:hidden"
        >
          <X size={24} />
        </button>
        <SidebarContent />
      </aside>

      {/* 모바일 오버레이 (사이드바 열렸을 때) */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          onClick={() => setIsSidebarOpen(false)}
        ></div>
      )}

      {/* --- 2. 데스크탑 사이드바 (항상 보임) --- */}
      <aside
        className="
          hidden md:block 
          w-64 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 p-4 
          fixed top-0 h-screen
        "
      >
        <SidebarContent />
      </aside>

      {/* --- 3. 메인 콘텐츠 --- */}
      <main className="flex-1 p-8 bg-gray-50 dark:bg-gray-900 md:ml-64">
        {/* 햄버거 버튼 (모바일) */}
        <button
          onClick={() => setIsSidebarOpen(true)}
          className={`
            p-2 mb-4 text-gray-700 dark:text-gray-200 border rounded-md md:hidden
            ${isSidebarOpen ? "hidden" : "block"}
          `}
        >
          <Menu size={24} />
        </button>

        {children}
      </main>
    </div>
  );
}
