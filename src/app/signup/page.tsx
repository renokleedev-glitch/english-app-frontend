"use client";

import AuthForm from "@/components/AuthForm";
import { signup, login } from "@/lib/auth";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useAuthStore } from "@/store/authStore";
import { Role } from "@/schemas";

export default function SignupPage() {
  const router = useRouter();

  // 🚨 [수정 1] 인자에 phoneNumber 추가
  const handleSignUp = async (
    email: string,
    password: string,
    nickname?: string,
    phoneNumber?: string // 👈 전화번호 추가 (선택 사항일 수 있으므로 ?)
  ) => {
    // 1. 닉네임 유효성 검사
    if (!nickname) {
      throw new Error("닉네임을 입력해야 합니다.");
    }

    // 2. 회원가입 API 호출 (phoneNumber 전달)
    // 🚨 [수정 2] signup 함수에도 phoneNumber를 넘겨줘야 함
    await signup(email, password, nickname, phoneNumber);

    // 3. 회원가입 성공 시, 즉시 로그인 처리
    await login(email, password);

    // 4. 사용자 정보 가져오기 (Store 갱신)
    const user = useAuthStore.getState().user;

    toast.success("회원가입이 완료되었습니다. 환영합니다!");

    // 5. 역할(Role)에 따라 리디렉션
    if (user && (user.role === Role.ADMIN || user.role === Role.TEACHER)) {
      router.push("/admin/users");
    } else {
      router.push("/dashboard");
    }
  };

  return <AuthForm type="signup" onSubmit={handleSignUp} />;
}
