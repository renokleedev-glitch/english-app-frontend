// ✅ src/lib/api.ts
import axios, { AxiosError } from "axios";
import { getToken, clearToken } from "@/lib/token";
import { toErrorMessage } from "@/lib/errors";
// ✅ 필요한 타입들 임포트
import {
  DailyActivityLog,
  User,
  Word,
  UserWordProgress,
  MultipleChoiceQuiz,
  TodayActivityStatus,
} from "@/schemas"; // TodayActivityStatus 임포트 추가

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
  // 로컬 개발 환경 기본값 (http 사용)
  BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";
}
BASE_URL = BASE_URL.replace(/\/$/, "");
console.log("🌍 Using API Base URL:", BASE_URL);

/* =====================================================
⚙️ 2. Axios 인스턴스
===================================================== */
export const api = axios.create({
  baseURL: BASE_URL,
  headers: { "Content-Type": "application/json" },
});

/* =====================================================
🔐 3. Interceptors (토큰 자동 첨부 + 401 처리)
===================================================== */
api.interceptors.request.use((config) => {
  const token = getToken();
  if (token) {
    config.headers = config.headers ?? {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err: AxiosError<any>) => {
    const status = err.response?.status;
    if (status === 401) {
      clearToken();
      console.warn("⚠️ Token invalid or expired — cleared from storage.");
      if (typeof window !== "undefined") {
        // Zustand 스토어를 통해 로그아웃 상태 업데이트 트리거 (선택적)
        // import { useAuthStore } from '@/store/authStore'; // 최상위 레벨 불가, 함수 내부에서 호출
        // useAuthStore.getState().logout();
        // 로그인 페이지로 리디렉션 (하드 리프레시 대신 라우터 사용 권장)
        // window.location.href = '/login';
      }
    }
    return Promise.reject(err);
  }
);

/* =====================================================
🚀 5. API 함수들
===================================================== */

// --- Auth ---
export async function registerUser(
  email: string,
  password: string
): Promise<User> {
  try {
    const { data } = await api.post("/api/users/", { email, password });
    return data;
  } catch (e) {
    throw new Error(toErrorMessage(e));
  }
}
export async function loginUser(
  email: string,
  password: string
): Promise<{ access_token: string; token_type: string }> {
  try {
    const params = new URLSearchParams();
    params.append("username", email);
    params.append("password", password);
    const { data } = await api.post("/api/login/token", params, {
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
    });
    return data;
  } catch (e) {
    throw new Error(toErrorMessage(e));
  }
}
export async function getMe(): Promise<User | null> {
  try {
    const { data } = await api.get("/api/users/me");
    return data;
  } catch (e) {
    if ((e as AxiosError).response?.status !== 401) {
      throw new Error(toErrorMessage(e));
    }
    return null;
  }
}
// ✅ [핵심 추가] 오늘의 활동 완료 상태 조회 API 호출 함수
export async function getTodayActivityStatus(): Promise<TodayActivityStatus> {
  try {
    const { data } = await api.get<TodayActivityStatus>(
      "/api/users/me/today-status"
    );
    return data; // { word_study: boolean, word_quiz: boolean } 형태의 객체 반환
  } catch (e) {
    // 401 에러는 인터셉터에서 처리됨
    if ((e as AxiosError).response?.status !== 401) {
      console.error(`Failed to get today's activity status:`, e);
      // 에러 발생 시 모든 활동이 완료되지 않은 것으로 간주 (기본값)
      return { word_study: false, word_quiz: false };
    }
    // 401 에러 시에도 기본값 반환 (로그인 페이지로 리디렉션 될 것임)
    return { word_study: false, word_quiz: false };
  }
}

// --- Words ---
export async function getTodayWords(): Promise<Word[]> {
  try {
    const { data } = await api.get("/api/words/today");
    return data;
  } catch (e) {
    if ((e as AxiosError).response?.status !== 401) {
      if ((e as AxiosError).response?.status === 404) {
        return [];
      }
      throw new Error(toErrorMessage(e));
    }
    return [];
  }
}
export async function recordListenAction(
  wordId: number,
  language: "en" | "ko"
): Promise<UserWordProgress> {
  try {
    const { data } = await api.post(`/api/words/listen/${wordId}`, null, {
      params: { lang: language },
    });
    return data;
  } catch (e) {
    console.error(
      `Failed to record listen action for word ${wordId} (${language}):`,
      e
    );
    throw new Error(toErrorMessage(e));
  }
}

// --- Quiz ---
export async function getMultipleChoiceQuiz(): Promise<MultipleChoiceQuiz | null> {
  try {
    const { data } = await api.get("/api/quiz/multiple-choice");
    return data;
  } catch (e) {
    if ((e as AxiosError).response?.status !== 401) {
      if ((e as AxiosError).response?.status === 404) {
        return null;
      }
      throw new Error(toErrorMessage(e));
    }
    return null;
  }
}
export async function markQuizCompleted(
  activityType: string
): Promise<DailyActivityLog> {
  try {
    const { data } = await api.post("/api/quiz/complete", {
      activity_type: activityType,
    });
    return data;
  } catch (e) {
    console.error(`Failed to mark quiz completion for ${activityType}:`, e);
    throw new Error(toErrorMessage(e));
  }
}
export async function checkQuizCompletionStatus(
  activityType: string = "word_quiz"
): Promise<boolean> {
  try {
    const { data } = await api.get<{ completed_today: boolean }>(
      "/api/quiz/completion-status",
      { params: { activity_type: activityType } }
    );
    return data.completed_today;
  } catch (e) {
    if ((e as AxiosError).response?.status !== 401) {
      console.error(
        `Failed to check quiz completion status for ${activityType}:`,
        e
      );
      return false;
    }
    return false;
  }
}
