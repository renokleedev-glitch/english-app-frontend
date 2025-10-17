"use client";

import { useEffect, useState } from "react";
import AuthForm from "@/components/AuthForm";
import { loginUser } from "@/lib/api";
import { setToken, waitForTokenSync } from "@/lib/token";
import { useAuthStore } from "@/store/authStore";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const fetchUser = useAuthStore((s) => s.fetchUser);

  const handleLogin = async (email: string, password: string) => {
    const data = await loginUser(email, password);
    setToken(data.access_token);

    // ✅ localStorage 반영 직후 살짝 대기
    await waitForTokenSync();

    await fetchUser();
    alert("로그인 성공!");
    window.location.href = "/";
  };

  return <AuthForm type="login" onSubmit={handleLogin} />;
}
