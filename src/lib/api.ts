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
  QuizResultsSubmission,
  ExamQuestion,
  GrammarAttemptCreate,
  UserGrammarAttempt, // 🚨 내신 문제용 스키마 임포트
  QuizAttemptDetail,
  Role,
  WordQuestionLinkCreate,
  WordQuestionLink,
  GrammarQuestionUpdate,
  GrammarQuestionCreate,
  WordUpdate,
  UserUpdateGoals,
  WordCreate,
} from "@/schemas";
import { toast } from "sonner";

/* =====================================================
🧩 1. 안전한 BASE_URL 설정 (환경별)
===================================================== */
let BASE_URL: string;

if (process.env.NODE_ENV === "production") {
  BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL_V2 ?? "";
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

export async function getTodayActivityStatus(): Promise<TodayActivityStatus> {
  try {
    const { data } = await api.get<TodayActivityStatus>(
      "/api/users/me/today-status",
      {
        // 🚨 [핵심 수정] Vercel/브라우저 캐시를 무효화하여 항상 최신 상태를 가져옵니다.
        headers: { "Cache-Control": "no-cache" },
      }
    );
    return data;
  } catch (e) {
    if ((e as AxiosError).response?.status !== 401) {
      console.error(`Failed to get today's activity status:`, e);
      return { word_study: false, word_quiz: false, exam_quiz: false }; // 🚨 exam_quiz 추가
    }
    return { word_study: false, word_quiz: false, exam_quiz: false }; // 🚨 exam_quiz 추가
  }
}

// --- Words ---
export async function getTodayWords(
  isReview: boolean = false
): Promise<Word[]> {
  try {
    const { data } = await api.get("/api/words/today", {
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

/**
 * 🆕 [핵심 수정] 오늘의 단어 학습 (듣기 3회) 완료 상태를 서버에 기록
 * (POST /api/words/study/complete)
 */
export async function markStudyCompleted(): Promise<void> {
  // 🚨 userId 인수 제거
  try {
    // 🚨 [핵심 수정] 백엔드는 토큰에서 user_id를 읽으므로 Body를 null로 전송
    await api.post("/api/words/study/complete", null);
    console.log("Word study completion logged successfully.");
  } catch (e) {
    console.error("Failed to log study completion:", e);
    throw new Error(toErrorMessage(e));
  }
}

// --- Quiz (Word Quiz) ---
export async function getMultipleChoiceQuizSet(): Promise<
  MultipleChoiceQuiz[]
> {
  try {
    const { data: quizSet } = await api.post<MultipleChoiceQuiz[]>(
      "/api/quiz/multiple-choice-set",
      null // Body 없음
    );
    return quizSet;
  } catch (e) {
    if ((e as AxiosError).response?.status === 404) {
      return [];
    }
    throw new Error(toErrorMessage(e));
  }
}

export async function checkQuizCompletionStatus(
  activityType: string = "word_quiz"
): Promise<boolean> {
  try {
    const { data } = await api.get<{ completed_today: boolean }>(
      "/api/quiz/completion-status",
      {
        params: { activity_type: activityType },
        headers: { "Cache-Control": "no-cache" }, // 🚨 캐시 무효화
      }
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

// 🆕 (Word Quiz) 푼 결과를 서버에 제출
export async function submitQuizResults(
  results: QuizResultsSubmission
): Promise<void> {
  try {
    await api.post("/api/quiz/submit-details", results);
    console.log(
      "Quiz results submitted and quiz completion logged successfully."
    );
  } catch (e) {
    console.error("Failed to submit quiz results:", e);
    throw new Error(toErrorMessage(e));
  }
}

// 🆕 (Word Quiz) 오답 노트 조회
export async function getWrongQuizDetails(): Promise<QuizAttemptDetail[]> {
  try {
    const { data } = await api.get<QuizAttemptDetail[]>(
      "/api/quiz/wrong-answers"
    );
    return data;
  } catch (e) {
    if ((e as AxiosError).response?.status !== 401) {
      console.error("Failed to fetch wrong quiz details:", e);
      throw new Error(toErrorMessage(e));
    }
    return [];
  }
}

// 🆕 (Word Quiz) 완료 기록 삭제 (다시 풀기)
export async function resetQuizCompletion(activityType: string): Promise<void> {
  try {
    await api.delete(`/api/quiz/reset-completion`, {
      params: { activity_type: activityType },
    });
    console.log(`${activityType} completion record deleted.`);
  } catch (e) {
    console.error(`Failed to reset completion status for ${activityType}:`, e);
    throw new Error(toErrorMessage(e));
  }
}

// --- 내신 문제 (Exam Questions) ---

// 🆕 (Exam Quiz) 문제 세트 가져오기
export async function getDailyExamSet(): Promise<ExamQuestion[]> {
  try {
    const { data } = await api.get<ExamQuestion[]>("/api/exam/daily-set");
    return data;
  } catch (e) {
    if ((e as AxiosError).response?.status === 404) {
      toast.info("오늘의 단어와 연관된 내신 문제를 찾을 수 없습니다.");
      return [];
    }
    console.error("Failed to fetch daily exam set:", e);
    throw new Error(toErrorMessage(e));
  }
}

// 🆕 (Exam Quiz) 푼 결과를 서버에 제출
export async function submitExamAttempts(
  attempts: GrammarAttemptCreate[]
): Promise<void> {
  try {
    await api.post("/api/exam/submit-details", attempts);
    console.log("Exam results submitted and completion logged successfully.");
  } catch (e) {
    console.error("Failed to submit exam results:", e);
    throw new Error(toErrorMessage(e));
  }
}

// 🆕 [핵심 추가 2] O/X 퀴즈 세트(10문제) 가져오기
export async function getOXQuizSet(): Promise<OXQuiz[]> {
  try {
    const { data: quizSet } = await api.post<OXQuiz[]>(
      "/api/quiz/ox-test-set",
      null // Body 없음
    );
    return quizSet;
  } catch (e) {
    console.error(`Failed to fetch OX quiz set:`, e);
    if ((e as AxiosError).response?.status === 404) {
      return [];
    }
    throw new Error(toErrorMessage(e));
  }
}
// src/lib/api.ts (파일 하단, 내신 문제 섹션)

// ... (기존 getDailyExamSet, submitExamAttempts 함수 유지)

// 🚨 [핵심 추가] 오늘 푼 '내신 문제' 기록 조회 API
// (GET /api/exam/attempts/today)
export async function getTodayExamAttempts(): Promise<UserGrammarAttempt[]> {
  try {
    // 🚨 UserGrammarAttempt 스키마에 대한 타입 임포트가 필요합니다.
    const { data } = await api.get<UserGrammarAttempt[]>(
      "/api/exam/attempts/today"
    );
    return data;
  } catch (e) {
    if ((e as AxiosError).response?.status === 404) {
      // 푼 기록이 없음
      return [];
    }
    console.error("Failed to fetch today's exam attempts:", e);
    throw new Error(toErrorMessage(e));
  }
}

// --- 💎 어드민 API (Admin) ---

/**
 * (어드민) 모든 학생 목록을 조회합니다.
 * (GET /api/admin/users)
 */
export async function adminGetUsers(): Promise<User[]> {
  try {
    const { data } = await api.get<User[]>("/api/admin/users");
    return data;
  } catch (e) {
    console.error("Failed to fetch users:", e);
    throw new Error(toErrorMessage(e));
  }
}

/**
 * (어드민) 특정 학생의 학습 목표량을 수정합니다.
 * (PUT /api/admin/users/{user_id}/goals)
 */
export async function adminUpdateUserGoals(
  userId: number,
  goals: UserUpdateGoals
): Promise<User> {
  try {
    const { data } = await api.put<User>(
      `/api/admin/users/${userId}/goals`,
      goals
    );
    return data;
  } catch (e) {
    console.error(`Failed to update goals for user ${userId}:`, e);
    throw new Error(toErrorMessage(e));
  }
}

/**
 * (어드민) 특정 학생의 역할을 수정합니다.
 * (PUT /api/admin/users/{user_id}/role)
 */
export async function adminUpdateUserRole(
  userId: number,
  role: Role
): Promise<User> {
  try {
    const { data } = await api.put<User>(
      `/api/admin/users/${userId}/role`,
      { role: role } // 👈 UserUpdateRole 스키마에 맞게 객체로 전송
    );
    return data;
  } catch (e) {
    console.error(`Failed to update role for user ${userId}:`, e);
    throw new Error(toErrorMessage(e));
  }
}

/**
 * (어드민) 모든 단어 목록을 조회합니다.
 * (GET /api/admin/words)
 */
export async function adminGetWords(): Promise<Word[]> {
  try {
    const { data } = await api.get<Word[]>("/api/admin/words");
    return data;
  } catch (e) {
    console.error("Failed to fetch words:", e);
    throw new Error(toErrorMessage(e));
  }
}
// ,,
/**
 * (어드민) 새 단어를 생성합니다.
 * (POST /api/admin/words)
 */
export async function adminCreateWord(wordData: WordCreate): Promise<Word> {
  try {
    const { data } = await api.post<Word>("/api/admin/words", wordData);
    return data;
  } catch (e) {
    console.error("Failed to create word:", e);
    throw new Error(toErrorMessage(e));
  }
}

/**
 * (어드민) 특정 단어를 수정합니다.
 * (PUT /api/admin/words/{word_id})
 */
export async function adminUpdateWord(
  wordId: number,
  wordData: WordUpdate
): Promise<Word> {
  try {
    const { data } = await api.put<Word>(
      `/api/admin/words/${wordId}`,
      wordData
    );
    return data;
  } catch (e) {
    console.error(`Failed to update word ${wordId}:`, e);
    throw new Error(toErrorMessage(e));
  }
}

/**
 * (어드민) 특정 단어를 삭제합니다.
 * (DELETE /api/admin/words/{word_id})
 */
export async function adminDeleteWord(wordId: number): Promise<void> {
  try {
    await api.delete(`/api/admin/words/${wordId}`);
  } catch (e) {
    console.error(`Failed to delete word ${wordId}:`, e);
    throw new Error(toErrorMessage(e));
  }
}

/**
 * (어드민) 모든 내신 문제 목록을 조회합니다.
 * (GET /api/admin/exam)
 */
export async function adminGetExamQuestions(): Promise<ExamQuestion[]> {
  try {
    const { data } = await api.get<ExamQuestion[]>("/api/admin/exam");
    return data;
  } catch (e) {
    console.error("Failed to fetch exam questions:", e);
    throw new Error(toErrorMessage(e));
  }
}

/**
 * (어드민) 새 내신 문제를 생성합니다.
 * (POST /api/admin/exam)
 */
export async function adminCreateExamQuestion(
  questionData: GrammarQuestionCreate
): Promise<ExamQuestion> {
  try {
    const { data } = await api.post<ExamQuestion>(
      "/api/admin/exam",
      questionData
    );
    return data;
  } catch (e) {
    console.error("Failed to create exam question:", e);
    throw new Error(toErrorMessage(e));
  }
}

/**
 * (어드민) 특정 내신 문제를 수정합니다.
 * (PUT /api/admin/exam/{question_id})
 */
export async function adminUpdateExamQuestion(
  questionId: number,
  questionData: GrammarQuestionUpdate
): Promise<ExamQuestion> {
  try {
    const { data } = await api.put<ExamQuestion>(
      `/api/admin/exam/${questionId}`,
      questionData
    );
    return data;
  } catch (e) {
    console.error(`Failed to update exam question ${questionId}:`, e);
    throw new Error(toErrorMessage(e));
  }
}

/**
 * (어드민) 특정 내신 문제를 삭제합니다.
 * (DELETE /api/admin/exam/{question_id})
 */
export async function adminDeleteExamQuestion(
  questionId: number
): Promise<void> {
  try {
    await api.delete(`/api/admin/exam/${questionId}`);
  } catch (e) {
    console.error(`Failed to delete exam question ${questionId}:`, e);
    throw new Error(toErrorMessage(e));
  }
}

/**
 * (어드민) 모든 '단어-문제' 연결 목록을 조회합니다.
 * (GET /api/admin/links)
 */
export async function adminGetWordQuestionLinks(): Promise<WordQuestionLink[]> {
  try {
    const { data } = await api.get<WordQuestionLink[]>("/api/admin/links");
    return data;
  } catch (e) {
    console.error("Failed to fetch word-question links:", e);
    throw new Error(toErrorMessage(e));
  }
}

/**
 * (어드민) 단어와 내신 문제를 연결합니다.
 * (POST /api/admin/links)
 */
export async function adminCreateWordQuestionLink(
  linkData: WordQuestionLinkCreate
): Promise<WordQuestionLinkCreate> {
  try {
    const { data } = await api.post<WordQuestionLinkCreate>(
      "/api/admin/links",
      linkData
    );
    return data;
  } catch (e) {
    console.error("Failed to create word-question link:", e);
    throw new Error(toErrorMessage(e));
  }
}

/**
 * (어드민) 단어와 내신 문제 연결을 해제합니다.
 * (DELETE /api/admin/links)
 */
export async function adminDeleteWordQuestionLink(
  linkData: WordQuestionLinkCreate
): Promise<void> {
  try {
    // 🚨 DELETE 요청은 Body 대신 data 속성에 payload를 넣습니다 (Axios config)
    await api.delete("/api/admin/links", { data: linkData });
  } catch (e) {
    console.error("Failed to delete word-question link:", e);
    throw new Error(toErrorMessage(e));
  }
}
