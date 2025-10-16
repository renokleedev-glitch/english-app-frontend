// src/lib/api.ts
import axios, { AxiosError } from "axios";
import { getToken, clearToken } from "@/lib/token";

/** ------- Base URL ------- */
export const BASE_URL = (
  process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:8000"
).replace(/\/$/, ""); // 끝 슬래시 제거

/** ------- Axios instance ------- */
export const api = axios.create({
  baseURL: BASE_URL,
  headers: { "Content-Type": "application/json" },
  // withCredentials: true, // 쿠키 인증 쓸 때만 켜기
});

/** ------- Interceptors ------- */
// 요청: 토큰 자동 첨부
api.interceptors.request.use((config) => {
  const token = getToken();
  if (token) {
    config.headers = config.headers ?? {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// 응답: 401 등 공통 처리
api.interceptors.response.use(
  (res) => res,
  (err: AxiosError<any>) => {
    const status = err.response?.status;
    if (status === 401) {
      // 토큰 만료/무효 → 로그아웃 처리
      clearToken();
      // 필요 시 여기서 로그인 페이지로 이동 트리거 가능
      // window.location.href = "/login";
    }
    return Promise.reject(err);
  }
);

/** ------- Error message helper (옵션) ------- */
function toErrorMessage(e: any): string {
  const data = e?.response?.data ?? e?.data ?? e;
  const detail = data?.detail ?? data?.message ?? data?.error ?? data;

  if (Array.isArray(detail)) {
    const msgs = detail
      .map((it: any) => it?.msg || it?.message || JSON.stringify(it))
      .filter(Boolean);
    return msgs.join("\n");
  }
  if (typeof detail === "object") {
    return detail?.msg || detail?.message || JSON.stringify(detail);
  }
  if (typeof detail === "string") return detail;

  return e?.message || "Unknown error";
}

/** ------- High-level API helpers ------- */

/** 회원가입: JSON 바디 */
export async function registerUser(email: string, password: string) {
  try {
    const { data } = await api.post("/api/users/", { email, password });
    return data;
  } catch (e) {
    throw new Error(toErrorMessage(e));
  }
}

/** 로그인: x-www-form-urlencoded (FastAPI OAuth2PasswordRequestForm 호환) */
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

/** 내 정보 */
export async function getMe() {
  try {
    const { data } = await api.get("/api/users/me");
    return data; // { email, ... }
  } catch (e) {
    throw new Error(toErrorMessage(e));
  }
}
