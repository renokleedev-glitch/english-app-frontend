// "use client";

// import AuthForm from "@/components/AuthForm";
// import { loginUser } from "@/lib/api";
// import { setToken, waitForTokenSync } from "@/lib/token";
// import { useAuthStore } from "@/store/authStore";
// import { useRouter } from "next/navigation";
// import { toast } from "sonner";
// import { Role } from "@/schemas"; // 🚨 [핵심 추가] Role Enum 임포트

// export default function LoginPage() {
//   const router = useRouter();
//   const fetchUser = useAuthStore((s) => s.fetchUser);

//   const handleLogin = async (email: string, password: string) => {
//     const data = await loginUser(email, password);
//     setToken(data.access_token);
//     await waitForTokenSync();
//     await useAuthStore.getState().fetchUser(); // ✅ 바로 세션 복구
//     alert("로그인 되었습니다. ");
//     // toast.success("로그인 되었습니다."); // ⬅️ 이렇게 사용합니다.

//     // window.location.href = "/"; // 새로고침으로 Navbar 반영
//     router.push("/dashboard");
//   };
//   return <AuthForm type="login" onSubmit={handleLogin} />;
// }

// src/app/login/page.tsx
"use client";

import AuthForm from "@/components/AuthForm";
import { loginUser } from "@/lib/api";
import { setToken, waitForTokenSync } from "@/lib/token";
import { useAuthStore } from "@/store/authStore";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Role } from "@/schemas"; // 🚨 [핵심 추가] Role Enum 임포트

export default function LoginPage() {
  const router = useRouter();
  // 🚨 [수정] fetchUser 함수를 store에서 직접 가져오지 않습니다.

  const handleLogin = async (email: string, password: string) => {
    try {
      const data = await loginUser(email, password);
      setToken(data.access_token);

      // 100ms 정도 대기하여 localStorage 동기화를 보장합니다 (선택적)
      await waitForTokenSync();

      // 1. 🚨 [핵심] 로그인 직후 사용자 정보를 즉시 가져옵니다.
      await useAuthStore.getState().fetchUser();

      // 2. 🚨 [핵심] Store에서 방금 가져온 사용자 정보를 가져옵니다.
      const user = useAuthStore.getState().user;

      toast.success("로그인 되었습니다.");

      // 3. 🚨 [핵심] 역할(Role)에 따라 리디렉션 경로를 분기합니다.
      if (user && (user.role === Role.ADMIN || user.role === Role.TEACHER)) {
        // 관리자 또는 선생님은 /admin으로 이동
        router.push("/admin/users"); // (또는 /admin)
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
