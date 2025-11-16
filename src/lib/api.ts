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
  UserUpdateProfile,
} from "@/schemas";
import { toast } from "sonner";

/* =====================================================
🧩 1. 안전한 BASE_URL 설정 (환경별)
===================================================== */
let BASE_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL_V2 ||
  process.env.NEXT_PUBLIC_BACKEND_URL ||
  "";

if (!BASE_URL) {
  // 환경변수 없을 때 fallback
  BASE_URL =
    process.env.NODE_ENV === "production"
      ? "https://english-app-backend-production-caa7.up.railway.app"
      : "http://localhost:8000";
}

// 항상 슬래시 제거
BASE_URL = BASE_URL.replace(/\/$/, "");

// 페이지네이션 응답을 위한 타입 (schemas.ts와 일치)
export interface PaginatedUsers {
  total_count: number;
  users: User[];
}

// 페이지네이션 응답을 위한 타입
export interface PaginatedWords {
  total_count: number;
  words: Word[];
}

// 페이지네이션 응답을 위한 타입
export interface PaginatedExamQuestions {
  total_count: number;
  questions: ExamQuestion[];
}

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
    console.log("22222 Using API Base URL:", BASE_URL);
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
  password: string,
  nickname: string // 👈 [핵심 추가]
): Promise<User> {
  try {
    // 👈 [핵심 수정] nickname을 API Body에 포함
    const { data } = await api.post("/api/users/", {
      email,
      password,
      nickname,
    });
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
    console.log(data);
    return data;
  } catch (e) {
    throw new Error(toErrorMessage(e));
  }
}
export async function getMe(): Promise<User | null> {
  try {
    const { data } = await api.get("/api/users/me");
    console.log(data);
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

// src/lib/api.ts (adminGetUsers 함수 수정)

/**
 * (어드민) 사용자 목록을 페이지네이션 및 검색어로 조회합니다.
 * (GET /api/admin/users)
 * @param page 현재 페이지
 * @param limit 페이지 당 개수
 * @param search 검색어
 * @param role (선택) 필터링할 역할
 */
export async function adminGetUsers(
  page: number = 1,
  limit: number = 10,
  search: string = "",
  role?: Role // 👈 [수정] role을 선택적(optional) 맨 뒤 파라미터로 변경
): Promise<PaginatedUsers> {
  // 👈 [수정] 반환 타입 PaginatedUsers
  try {
    const params: any = {
      // 👈 [수정] params 객체 생성
      skip: (page - 1) * limit,
      limit: limit,
      search: search,
    };

    // 👈 role이 전달된 경우에만 params에 추가
    if (role) {
      params.role = role;
    }

    const { data } = await api.get<PaginatedUsers>("/api/admin/users", {
      params,
    });
    return data;
  } catch (e) {
    console.error("Failed to fetch users:", e);
    throw new Error(toErrorMessage(e));
  }
}

/** (어드민) 학생 목표량 수정 */
export async function adminUpdateUserGoals(
  userId: number,
  goals: UserUpdateGoals
): Promise<User> {
  const { data } = await api.put<User>(
    `/api/admin/users/${userId}/goals/`,
    goals
  );
  return data;
}

/** (어드민) 학생 역할 수정 */
export async function adminUpdateUserRole(
  userId: number,
  role: Role
): Promise<User> {
  const { data } = await api.put<User>(`/api/admin/users/${userId}/role/`, {
    role,
  });
  return data;
}

/**
 * (어드민) 모든 단어 목록을 페이지네이션 및 검색어로 조회합니다.
 * (GET /api/admin/words)
 */
export async function adminGetWords(
  page: number = 1,
  limit: number = 10,
  search: string = ""
): Promise<PaginatedWords> {
  // 👈 [수정] 반환 타입 변경
  try {
    const params = {
      skip: (page - 1) * limit,
      limit: limit,
      search: search,
    };

    const { data } = await api.get<PaginatedWords>("/api/admin/words", {
      params,
    });
    return data;
  } catch (e) {
    console.error("Failed to fetch words:", e);
    throw new Error(toErrorMessage(e));
  }
}

/** (어드민) 새 단어 생성 */
export async function adminCreateWord(wordData: WordCreate): Promise<Word> {
  const { data } = await api.post<Word>("/api/admin/words/", wordData);
  return data;
}

/** (어드민) 단어 수정 */
export async function adminUpdateWord(
  wordId: number,
  wordData: WordUpdate
): Promise<Word> {
  const { data } = await api.put<Word>(`/api/admin/words/${wordId}/`, wordData);
  return data;
}

/** (어드민) 단어 삭제 */
export async function adminDeleteWord(wordId: number): Promise<void> {
  await api.delete(`/api/admin/words/${wordId}/`);
}

/**
 * (어드민) 모든 내신 문제 목록을 페이지네이션 및 검색어로 조회합니다.
 * (GET /api/admin/exam)
 */
export async function adminGetExamQuestions(
  page: number = 1,
  limit: number = 10,
  search: string = ""
): Promise<PaginatedExamQuestions> {
  // 👈 [수정] 반환 타입 변경
  try {
    const params = {
      skip: (page - 1) * limit,
      limit: limit,
      search: search,
    };

    const { data } = await api.get<PaginatedExamQuestions>("/api/admin/exam", {
      params,
    });
    return data;
  } catch (e) {
    console.error("Failed to fetch exam questions:", e);
    throw new Error(toErrorMessage(e));
  }
}
/** (어드민) 새 내신 문제 생성 */
export async function adminCreateExamQuestion(
  questionData: GrammarQuestionCreate
): Promise<ExamQuestion> {
  const { data } = await api.post<ExamQuestion>(
    "/api/admin/exam/",
    questionData
  );
  return data;
}

/** (어드민) 내신 문제 수정 */
export async function adminUpdateExamQuestion(
  questionId: number,
  questionData: GrammarQuestionUpdate
): Promise<ExamQuestion> {
  const { data } = await api.put<ExamQuestion>(
    `/api/admin/exam/${questionId}/`,
    questionData
  );
  return data;
}

/** (어드민) 내신 문제 삭제 */
export async function adminDeleteExamQuestion(
  questionId: number
): Promise<void> {
  await api.delete(`/api/admin/exam/${questionId}/`);
}

/**
 * (어드민) 단어 벌크 임포트용 CSV 템플릿을 다운로드합니다.
 * (GET /api/admin/words/template)
 */
export async function adminGetWordTemplate(): Promise<Blob> {
  try {
    const { data } = await api.get("/api/admin/words/template", {
      responseType: "blob", // 👈 [핵심] 응답을 Blob(파일)으로 받음
    });
    return data;
  } catch (e) {
    console.error("Failed to download word template:", e);
    throw new Error(toErrorMessage(e));
  }
}

/**
 * (어드민) CSV 파일을 업로드하여 단어를 대량 생성합니다.
 * (POST /api/admin/words/bulk-upload)
 */
// export async function adminBulkUploadWords(file: File): Promise<any> {
//   try {
//     const formData = new FormData();
//     formData.append("file", file); // 👈 백엔드 API의 file 파라미터 이름과 일치

//     const { data } = await api.post("/api/admin/words/bulk-upload", formData, {
//       headers: {
//         // 🚨 [핵심] 파일 업로드는 'multipart/form-data'로 설정
//         "Content-Type": "multipart/form-data",
//       },
//     });
//     return data;
//   } catch (e) {
//     console.error("Failed to bulk upload words:", e);
//     throw new Error(toErrorMessage(e));
//   }
// }

export async function adminBulkUploadWords(file: File): Promise<any> {
  try {
    const formData = new FormData();
    formData.append("file", file); // 👈 백엔드 API의 file 파라미터 이름과 일치

    const { data } = await api.post("/api/admin/words/bulk-upload", formData, {
      // 🚨 [핵심 수정] 글로벌 헤더(application/json)를 덮어쓰고
      // Axios가 FormData를 자동 감지하도록 Content-Type을 undefined로 설정합니다.
      headers: {
        "Content-Type": undefined,
      },
    });
    return data;
  } catch (e) {
    console.error("Failed to bulk upload words:", e);
    throw new Error(toErrorMessage(e));
  }
}

/**
 * (사용자) 현재 로그인된 사용자의 프로필(닉네임/비밀번호)을 수정합니다.
 * (PUT /api/users/me)
 */
export async function updateMe(profileData: UserUpdateProfile): Promise<User> {
  try {
    const { data } = await api.put<User>("/api/users/me", profileData);
    return data;
  } catch (e) {
    console.error("Failed to update profile:", e);
    throw new Error(toErrorMessage(e));
  }
}
