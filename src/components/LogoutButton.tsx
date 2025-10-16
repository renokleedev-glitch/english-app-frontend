"use client";

import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";

export default function LogoutButton() {
  const router = useRouter();

  const handleLogout = () => {
    router.push("/logout"); // ✅ 로그아웃 페이지로 이동
  };

  return (
    <button
      onClick={handleLogout}
      className="flex items-center gap-1 text-sm text-red-500 hover:text-red-600 dark:text-red-400 dark:hover:text-red-300 transition"
    >
      <LogOut className="w-4 h-4" />
      로그아웃
    </button>
  );
}
