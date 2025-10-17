"use client";

import AuthForm from "@/components/AuthForm";
import { loginUser } from "@/lib/api";
import { setToken, waitForTokenSync } from "@/lib/token";
import { useAuthStore } from "@/store/authStore";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const fetchUser = useAuthStore((s) => s.fetchUser);

  const handleLogin = async (email: string, password: string) => {
    const data = await loginUser(email, password);
    setToken(data.access_token);
    await waitForTokenSync();
    await useAuthStore.getState().fetchUser(); // ✅ 바로 세션 복구
    window.location.href = "/"; // 새로고침으로 Navbar 반영
  };
  return <AuthForm type="login" onSubmit={handleLogin} />;
}
