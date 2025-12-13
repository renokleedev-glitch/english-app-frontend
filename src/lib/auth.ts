import { api } from "./api";
import { setToken, clearToken } from "./token";
import { useAuthStore } from "@/store/authStore";
import { loginUser } from "./api"; // 👈 [수정] 일관성을 위해 api.ts의 loginUser 사용 (선택 사항)

// 🚨 [수정] login 함수는 loginUser (api.ts) 또는 이 파일의 login (아래) 중 하나로 통일 필요
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

    // ✅ 로그인 후 홈으로 이동 + 완전 리로드 (이 부분은 login/page.tsx로 이동 권장)
    // window.location.replace("/");
  }

  return res.data;
}

export async function signup(
  email: string,
  password: string,
  nickname: string,
  phoneNumber?: string // 👈 1. 인자 추가 (선택 사항이므로 ? 붙임)
) {
  // 🚨 [핵심 수정] 백엔드로 보낼 데이터에 phone_number 포함
  // 백엔드 DB 컬럼명이 'phone_number'이므로, 키 이름을 맞춰주는 것이 중요합니다.
  const res = await api.post("/api/users/", {
    email,
    password,
    nickname,
    phone_number: phoneNumber, // 👈 2. 백엔드(snake_case) <-> 프론트(camelCase) 매핑
  });

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
