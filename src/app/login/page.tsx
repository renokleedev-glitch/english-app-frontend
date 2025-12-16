"use client";

import AuthForm from "@/components/AuthForm";
import { login } from "@/lib/auth"; // 👈 [변경] api.ts 대신 auth.ts의 login 사용
import { useAuthStore } from "@/store/authStore";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { Role } from "@/schemas";
import { Suspense, useEffect } from "react";

// 🧩 1. 실제 로직이 들어가는 내부 컴포넌트
function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // URL에서 파라미터 읽어오기 (?expired=true&next=/admin/users)
  const expired = searchParams.get("expired");
  const nextUrl = searchParams.get("next");

  // [기능 1] 세션 만료로 튕겨서 왔다면 안내 메시지 띄우기
  useEffect(() => {
    if (expired === "true") {
      toast.warning("로그인 정보가 만료되었습니다. 다시 로그인해주세요.", {
        id: "session-expired",
        duration: 4000,
      });
      // URL 정리 (선택 사항)
      // window.history.replaceState({}, "", "/login");
    }
  }, [expired]);

  const handleLogin = async (
    email: string,
    password: string,
    nickname?: string
  ) => {
    // 1️⃣ auth.ts의 login 함수 호출 (try-catch 제거)
    // login 함수 내부에서 토큰 저장 및 user fetch까지 완료됩니다.
    const result = await login(email, password);

    // 2️⃣ 결과에 따른 분기 처리
    if (result.success) {
      toast.success("로그인 되었습니다.");

      // 이미 auth.ts에서 fetchUser()를 했으므로 store에서 바로 user를 가져올 수 있습니다.
      const user = useAuthStore.getState().user;

      // 3️⃣ [기능 2] 똑똑한 리디렉션
      if (nextUrl) {
        // 원래 가려던 곳이 있으면 거기로 이동
        router.push(decodeURIComponent(nextUrl));
        return;
      }

      // 역할별 분기 로직 (Fallback)
      if (user && (user.role === Role.ADMIN || user.role === Role.TEACHER)) {
        router.push("/admin/users");
      } else {
        router.push("/dashboard");
      }
    } else {
      // 4️⃣ 실패 처리: auth.ts가 넘겨준 에러 메시지 표시
      // "이메일 또는 비밀번호를 확인해주세요" 등이 출력됨
      toast.error(result.error || "로그인에 실패했습니다.");
    }
  };

  return <AuthForm type="login" onSubmit={handleLogin} />;
}

// 🧩 2. 메인 페이지 (Suspense 필수)
export default function LoginPage() {
  return (
    <Suspense
      fallback={<div className="flex justify-center p-10">로딩 중...</div>}
    >
      <LoginContent />
    </Suspense>
  );
}
