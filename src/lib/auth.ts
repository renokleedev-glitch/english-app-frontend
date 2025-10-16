import { api } from "./api";
import { setToken, clearToken } from "./token";
import { useAuthStore } from "@/store/authStore";

export async function login(email: string, password: string) {
  const params = new URLSearchParams();
  params.append("username", email);
  params.append("password", password);

  const res = await api.post("/api/login/token", params, {
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
  });

  const token = res.data?.access_token;
  if (token) {
    setToken(token);
    const fetchUser = useAuthStore.getState().fetchUser;
    await fetchUser();

    // ✅ 로그인 후 홈으로 이동 + 완전 리로드
    window.location.replace("/");
  }

  return res.data;
}

export async function signup(email: string, password: string) {
  const res = await api.post("/api/users/", { email, password });

  // ✅ 회원가입 성공 시 자동 로그인 + 상태 갱신
  if (res.status === 200 || res.status === 201) {
    await login(email, password);
  }

  return res.data;
}

export function logout() {
  clearToken();
  useAuthStore.getState().logout();
}
