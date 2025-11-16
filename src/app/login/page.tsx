// src/app/login/page.tsx
"use client";

import AuthForm from "@/components/AuthForm";
import { loginUser } from "@/lib/api"; // 👈 lib/api.ts의 loginUser 사용
import { setToken, waitForTokenSync } from "@/lib/token";
import { useAuthStore } from "@/store/authStore";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Role } from "@/schemas"; // 🚨 [핵심 추가] Role Enum 임포트

export default function LoginPage() {
  const router = useRouter();

  const handleLogin = async (
    email: string, // (AuthForm에서 'admin' 단축키 입력 가능)
    password: string,
    nickname?: string // (로그인 시 닉네임은 사용하지 않음)
  ) => {
    try {
      // 1. 로그인 API 호출 (email 변수에 'admin' 또는 실제 이메일이 담김)
      const data = await loginUser(email, password);
      setToken(data.access_token);

      await waitForTokenSync();

      // 2. 로그인 직후 사용자 정보를 즉시 가져와 Store에 저장
      await useAuthStore.getState().fetchUser();

      // 3. Store에서 방금 가져온 사용자 정보 확인
      const user = useAuthStore.getState().user;

      toast.success("로그인 되었습니다.");

      // 4. 역할(Role)에 따라 리디렉션 경로 분기
      if (user && (user.role === Role.ADMIN || user.role === Role.TEACHER)) {
        // 관리자 또는 선생님은 /admin으로 이동
        router.push("/admin/users");
      } else {
        // 학생은 /dashboard로 이동
        router.push("/dashboard");
      }
    } catch (err: any) {
      console.error("Login failed:", err);
      toast.error(`로그인 실패: ${err.message || "알 수 없는 오류"}`);
    }
  };

  return <AuthForm type="login" onSubmit={handleLogin} />;
}
