"use client";

import AuthForm from "@/components/AuthForm";
import { signup } from "@/lib/auth"; // 👈 [변경] login은 signup 내부에서 자동 처리되므로 제거
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useAuthStore } from "@/store/authStore";
import { Role } from "@/schemas";

export default function SignupPage() {
  const router = useRouter();

  const handleSignUp = async (
    email: string,
    password: string,
    nickname?: string,
    phoneNumber?: string
  ) => {
    // 1. 닉네임 유효성 검사 (간단한 프론트 검증)
    if (!nickname) {
      toast.error("닉네임을 입력해야 합니다.");
      return;
    }

    // 2. 회원가입 API 호출
    // 🚨 [변경] try-catch 제거. result.success로 판단
    // signup 함수 내부에서 '회원가입 -> 로그인 -> 유저정보 fetch'까지 모두 완료됨
    const result = await signup(email, password, nickname, phoneNumber);

    // 3. 결과 분기 처리
    if (result && result.success) {
      // ✅ 성공 처리
      toast.success("회원가입이 완료되었습니다. 환영합니다!");

      // 스토어에 이미 유저 정보가 들어있으므로 바로 꺼내옵니다.
      const user = useAuthStore.getState().user;

      // 4. 역할(Role)에 따라 리디렉션
      if (user && (user.role === Role.ADMIN || user.role === Role.TEACHER)) {
        router.push("/admin/users");
      } else {
        router.push("/dashboard");
      }
    } else {
      // ❌ 실패 처리
      // auth.ts에서 "이미 존재하는 아이디입니다" 등의 메시지를 result.error에 담아줍니다.
      toast.error(result?.error || "회원가입에 실패했습니다.");
    }
  };

  return <AuthForm type="signup" onSubmit={handleSignUp} />;
}
