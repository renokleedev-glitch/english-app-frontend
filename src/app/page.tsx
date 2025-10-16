"use client";

import { useAuthStore } from "@/store/authStore";

export default function HomePage() {
  const user = useAuthStore((s) => s.user);
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-2">홈 페이지</h1>
      {user ? (
        <p>
          환영합니다, <b>{user.email}</b> 님 👋
        </p>
      ) : (
        <p>로그인 후 이용해주세요.</p>
      )}
    </div>
  );
}
