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

// 🚨 [핵심 수정] signup 함수가 nickname을 받도록 변경
export async function signup(
  email: string,
  password: string,
  nickname: string
) {
  // 🚨 [핵심 수정] api.post 요청 본문에 nickname 추가
  const res = await api.post("/api/users/", { email, password, nickname });

  // ✅ 회원가입 성공 시 자동 로그인 + 상태 갱신
  if (res.status === 200 || res.status === 201) {
    // (주의: login 함수는 email을 ID로 사용합니다)
    await login(email, password);
  }

  return res.data;
}

export function logout() {
  clearToken();
  useAuthStore.getState().logout();
}
