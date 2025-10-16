"use client";

import { useEffect, useState } from "react";
import AuthForm from "@/components/AuthForm";
import { signup } from "@/lib/auth";
import { useAuthStore } from "@/store/authStore";
import { useRouter } from "next/navigation";

export default function SignupPage() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const setUser = useAuthStore((s) => s.setUser);
  const fetchUser = useAuthStore((s) => s.fetchUser);

  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // ✅ 로그인되어 있으면 이전 페이지 또는 홈으로 리디렉트
  useEffect(() => {
    if (!mounted) return;
    if (user) {
      if (window.history.length > 1) router.back();
      else router.replace("/");
    }
  }, [mounted, user, router]);

  const handleSignup = async (email: string, password: string) => {
    try {
      await signup(email, password);
      await fetchUser();
      setUser(useAuthStore.getState().user);
      alert("회원가입이 완료되었습니다!");
      router.replace("/");
    } catch (err: any) {
      console.error(err);
      alert("회원가입에 실패했습니다. 다시 시도해주세요.");
    }
  };

  // ✅ SSR-safe: 서버 렌더링 시 아무것도 표시하지 않음
  if (!mounted) return null;

  if (user) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center text-sm opacity-70">
        이미 로그인되어 있어요. 이전 페이지로 이동합니다…
      </div>
    );
  }

  return <AuthForm type="signup" onSubmit={handleSignup} />;
}
