// ✅ src/lib/api.ts
import axios, { AxiosError } from "axios";
import { getToken, clearToken } from "@/lib/token";

/* =====================================================
🧩 1. 안전한 BASE_URL 설정 (환경별)
===================================================== */
let BASE_URL: string;

if (process.env.NODE_ENV === "production") {
  BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL ?? "";
  if (!BASE_URL) {
    console.error("❌ Missing NEXT_PUBLIC_BACKEND_URL in Production!");
  }
} else {
  BASE_URL = "http://localhost:8000"; // 개발 환경 기본값
}

// ✅ 슬래시 정리
BASE_URL = BASE_URL.replace(/\/$/, "");

// ✅ 디버깅 로그 (Vercel에서도 콘솔에 표시됨)
console.log("🌍 Using API Base URL:", BASE_URL);

/* =====================================================
⚙️ 2. Axios 인스턴스
===================================================== */
export const api = axios.create({
  baseURL: BASE_URL,
  headers: { "Content-Type": "application/json" },
  // withCredentials: true, // 필요 시 쿠키 인증용
});

/* =====================================================
🔐 3. Interceptors (토큰 자동 첨부 + 401 처리)
===================================================== */

// 요청 시 토큰 자동 추가
api.interceptors.request.use((config) => {
  const token = getToken();
  if (token) {
    config.headers = config.headers ?? {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// 응답 에러 처리 (401 시 자동 로그아웃)
api.interceptors.response.use(
  (res) => res,
  (err: AxiosError<any>) => {
    const status = err.response?.status;
    if (status === 401) {
      clearToken();
      console.warn("⚠️ Token invalid or expired — cleared from storage.");
    }
    return Promise.reject(err);
  }
);

/* =====================================================
🧩 4. Error 메시지 헬퍼
===================================================== */
function toErrorMessage(e: any): string {
  const data = e?.response?.data ?? e?.data ?? e;
  const detail = data?.detail ?? data?.message ?? data?.error ?? data;

  if (Array.isArray(detail)) {
    return detail
      .map((it: any) => it?.msg || it?.message || JSON.stringify(it))
      .join("\n");
  }
  if (typeof detail === "object") {
    return detail?.msg || detail?.message || JSON.stringify(detail);
  }
  if (typeof detail === "string") return detail;

  return e?.message || "Unknown error";
}

/* =====================================================
🚀 5. API 함수들
===================================================== */

// 회원가입
export async function registerUser(email: string, password: string) {
  try {
    const { data } = await api.post("/api/users/", { email, password });
    return data;
  } catch (e) {
    throw new Error(toErrorMessage(e));
  }
}

// 로그인
export async function loginUser(email: string, password: string) {
  try {
    const params = new URLSearchParams();
    params.append("username", email);
    params.append("password", password);

    const { data } = await api.post("/api/login/token", params, {
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
    });
    return data; // { access_token, token_type, ... }
  } catch (e) {
    throw new Error(toErrorMessage(e));
  }
}

// 내 정보 (/api/users/me)
export async function getMe() {
  try {
    const { data } = await api.get("/api/users/me");
    return data;
  } catch (e) {
    throw new Error(toErrorMessage(e));
  }
}
