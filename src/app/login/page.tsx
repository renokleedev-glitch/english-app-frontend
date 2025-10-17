"use client";

import AuthForm from "@/components/AuthForm";
import { loginUser } from "@/lib/api";
import { setToken } from "@/lib/token";
import { useAuthStore } from "@/store/authStore";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const fetchUser = useAuthStore((s) => s.fetchUser);

  const handleLogin = async (email: string, password: string) => {
    try {
      const data = await loginUser(email, password);

      // ✅ 클라이언트에서만 실행 보장
      if (typeof window !== "undefined") {
        setToken(data.access_token);
      }

      await fetchUser();

      alert("로그인되었습니다!");
      setTimeout(() => {
        window.location.href = "/";
      }, 500);
      // router.push("/");
    } catch (err) {
      alert("로그인 실패");
      console.error(err);
    }
  };

  return <AuthForm type="login" onSubmit={handleLogin} />;
}
