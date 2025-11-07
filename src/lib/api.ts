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
  OXQuiz,
  QuizCreate,
  QuizResultsSubmission, // 👈 이 타입을 추가해야 합니다.
} from "@/schemas";

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
export async function getTodayWords(
  isReview: boolean = false
): Promise<Word[]> {
  try {
    const { data } = await api.get("/api/words/today", {
      // 🚨 쿼리 파라미터로 is_review 전달
      params: { is_review: isReview },
    });
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

// **
//  * 🆕 [핵심 추가] 오늘의 단어 학습 (듣기 3회) 완료 상태를 서버에 기록
//  * POST /api/words/study/complete 엔드포인트를 호출합니다.
//  * @param userId - 완료 상태를 기록할 사용자 ID
//  */
export async function markStudyCompleted(userId: number): Promise<void> {
  try {
    // 백엔드에서 user_id를 body로 받도록 라우터를 설정했다고 가정합니다.
    await api.post("/api/words/study/complete", { user_id: userId });
    console.log("Word study completion logged successfully.");
  } catch (e) {
    console.error("Failed to log study completion:", e);
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

// 🆕 [핵심 추가 1] 객관식 퀴즈 세트(10문제) 가져오기
export async function getMultipleChoiceQuizSet(): Promise<
  MultipleChoiceQuiz[]
> {
  try {
    const { data: quizSet } = await api.post<MultipleChoiceQuiz[]>(
      "/api/quiz/multiple-choice-set", // 👈 /api/quiz 유지
      null // Body 없음
    );
    return quizSet;
  } catch (e) {
    console.error(`Failed to fetch multiple choice quiz set:`, e);
    // 404 에러 시 빈 배열 반환
    if ((e as AxiosError).response?.status === 404) {
      return [];
    }
    throw new Error(toErrorMessage(e));
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

// ✅ [핵심 추가] O/X 퀴즈 문제 가져오기 API 호출 함수
export async function getOXQuiz(): Promise<OXQuiz | null> {
  try {
    const { data } = await api.get<OXQuiz>("/api/quiz/ox-test");
    return data;
  } catch (e) {
    if ((e as AxiosError).response?.status !== 401) {
      if ((e as AxiosError).response?.status === 404) {
        // 퀴즈 생성할 단어가 없는 경우
        return null;
      }
      throw new Error(toErrorMessage(e));
    }
    return null;
  }
}

// 🆕 [핵심 추가 2] O/X 퀴즈 세트(10문제) 가져오기
export async function getOXQuizSet(): Promise<OXQuiz[]> {
  try {
    const { data: quizSet } = await api.post<OXQuiz[]>(
      "/api/quiz/ox-test-set",
      null // 👈 Body를 null로 설정
    );
    return quizSet;
  } catch (e) {
    console.error(`Failed to fetch OX quiz set:`, e);
    // 404 에러 시 빈 배열 반환
    if ((e as AxiosError).response?.status === 404) {
      return [];
    }
    throw new Error(toErrorMessage(e));
  }
}

// 서버에서 가져올 오답 상세 기록의 타입 정의
export type QuizAttemptDetail = {
  id: number;
  user_id: number;
  question_word_id: number;
  is_correct: boolean;
  user_answer: string; // 사용자가 고른 뜻
  correct_answer: string; // 정답 뜻
  attempted_at: string;
  quiz_type: "multiple_choice" | "ox";
};

/**
 * 🆕 [수정] 퀴즈 결과를 서버에 제출하고 상세 기록 및 완료 상태를 기록
 * POST /api/quiz/submit-details 엔드포인트를 호출합니다.
 * @param results - QuizResultsSubmission 타입의 퀴즈 결과 객체 (details 포함)
 */
export async function submitQuizResults(
  results: QuizResultsSubmission
): Promise<void> {
  try {
    // ⚠️ 수정: 경로를 백엔드의 새로운 상세 기록 제출 엔드포인트로 변경하고,
    // 퀴즈 결과 객체 전체 (상세 기록 details 포함)를 요청 본문으로 보냅니다.
    await api.post("/api/quiz/submit-details", results);

    console.log(
      "Quiz results submitted and quiz completion logged successfully."
    );
  } catch (e) {
    console.error("Failed to submit quiz results:", e);
    throw new Error(toErrorMessage(e));
  }
}

// 🆕 오답 상세 기록을 가져오는 새 API 함수
// GET /api/quiz/wrong-answers 엔드포인트를 호출합니다.
export async function getWrongQuizDetails(): Promise<QuizAttemptDetail[]> {
  try {
    const { data } = await api.get<QuizAttemptDetail[]>(
      "/api/quiz/wrong-answers"
    );
    return data;
  } catch (e) {
    // 401 에러는 인터셉터에서 처리됨.
    // 그 외 에러는 콘솔에 기록하고 빈 배열 반환 또는 에러 throw
    if ((e as AxiosError).response?.status !== 401) {
      console.error("Failed to fetch wrong quiz details:", e);
      // 오답 기록이 없을 경우 백엔드에서 빈 배열을 반환해야 하지만,
      // 클라이언트 측 방어를 위해 에러 시 빈 배열을 반환할 수 있습니다.
      // 여기서는 명확한 에러 처리를 위해 throw를 유지합니다.
      throw new Error(toErrorMessage(e));
    }
    return [];
  }
}
export async function resetQuizCompletion(activityType: string): Promise<void> {
  try {
    // 🚨 [핵심 수정] 쿼리 파라미터를 params 객체에 넣어 전송합니다.
    await api.delete(`/api/quiz/reset-completion`, {
      params: { activity_type: activityType },
    });

    console.log(`${activityType} completion record deleted.`);
  } catch (e) {
    console.error(`Failed to reset completion status for ${activityType}:`, e);
    throw new Error(toErrorMessage(e));
  }
}
