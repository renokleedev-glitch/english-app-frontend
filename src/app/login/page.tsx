"use client";

import AuthForm from "@/components/AuthForm";
import { loginUser } from "@/lib/api";
import { setToken, waitForTokenSync } from "@/lib/token";
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

  // 🆕 [기능 1] 세션 만료로 튕겨서 왔다면 안내 메시지 띄우기
  useEffect(() => {
    if (expired === "true") {
      // 이미 뜬 토스트가 있으면 중복 방지 (선택사항)
      toast.warning("로그인 정보가 만료되었습니다. 다시 로그인해주세요.", {
        id: "session-expired", // ID를 주면 중복 호출 방지됨
        duration: 4000,
      });

      // 깔끔하게 URL 정리 (뒤에 ?expired=true 없애기)
      // window.history.replaceState({}, "", "/login");
    }
  }, [expired]);

  const handleLogin = async (
    email: string,
    password: string,
    nickname?: string
  ) => {
    try {
      const data = await loginUser(email, password);
      setToken(data.access_token);
      await waitForTokenSync();

      // 사용자 정보 Fetch
      await useAuthStore.getState().fetchUser();
      const user = useAuthStore.getState().user;

      toast.success("로그인 되었습니다.");

      // 🆕 [기능 2] 똑똑한 리디렉션 (원래 가려던 곳이 있으면 거기로, 없으면 역할별 이동)
      if (nextUrl) {
        // next 파라미터가 있으면 디코딩해서 이동
        router.push(decodeURIComponent(nextUrl));
        return;
      }

      // 기존 역할별 분기 로직 (Fallback)
      if (user && (user.role === Role.ADMIN || user.role === Role.TEACHER)) {
        router.push("/admin/users");
      } else {
        router.push("/dashboard");
      }
    } catch (err: any) {
      console.error("Login failed:", err);
      // 에러 메시지 가공 (사용자 친화적)
      let msg = err.message || "알 수 없는 오류";
      if (msg.includes("401"))
        msg = "이메일 또는 비밀번호가 일치하지 않습니다.";

      toast.error(`로그인 실패: ${msg}`);
    }
  };

  return <AuthForm type="login" onSubmit={handleLogin} />;
}

// 🧩 2. 메인 페이지 (Suspense로 감싸기 필수)
// useSearchParams를 쓰면 빌드 타임에 에러가 날 수 있어 Suspense가 필요합니다.
export default function LoginPage() {
  return (
    <Suspense
      fallback={<div className="flex justify-center p-10">로딩 중...</div>}
    >
      <LoginContent />
    </Suspense>
  );
}
