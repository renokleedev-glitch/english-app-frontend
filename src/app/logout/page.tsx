"use client";

import { useEffect, useState } from "react";
import { logout } from "@/lib/auth";
import { useRouter } from "next/navigation";

export default function LogoutPage() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    (async () => {
      try {
        logout();
        alert("로그아웃되었습니다!");
      } catch (e) {
        console.error(e);
      } finally {
        router.replace("/");
      }
    })();
  }, [mounted, router]);

  // SSR-safe: 서버 단계에서는 아무것도 렌더하지 않음
  if (!mounted) return null;

  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center text-sm opacity-70">
      로그아웃 중입니다…
    </div>
  );
}
