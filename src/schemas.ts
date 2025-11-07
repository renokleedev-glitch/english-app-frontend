// src/schemas.ts

// 백엔드의 Word 모델/스키마에 대응하는 프론트엔드 타입
export interface Word {
  id: number;
  text: string; // 영어 단어
  meaning: string; // 한국어 뜻
  grade_level?: number | null; // 학년 (선택적)

  // 백엔드 모델에 있는 추가 필드들 (선택적)
  pronunciation?: string | null;
  english_audio_url?: string | null;
  korean_audio_url?: string | null;
  example_sentence_english?: string | null;
  example_sentence_korean?: string | null;
}

// 백엔드의 User 스키마에 대응하는 프론트엔드 타입
export interface User {
  id: number;
  email: string;
  daily_word_goal: number;
  // created_at 등 필요한 경우 추가
}

// --- 학습 진행도 관련 타입 ---
export interface UserWordProgress {
  id: number;
  user_id: number;
  word_id: number;
  english_listen_count: number;
  korean_listen_count: number;
  is_mastered: boolean;
  last_studied_at?: string | null; // 날짜/시간은 string으로 받는 것이 일반적
}

// --- 일일 활동 로그 관련 타입 ---
export interface DailyActivityLog {
  id: number;
  user_id: number;
  activity_type: string;
  completed_at: string; // Date는 string으로 받는 것이 일반적
  details?: any | null;
}

// --- 퀴즈 관련 타입 ---
export interface QuizOption {
  id: number; // 선택지의 고유 ID (단어 ID 또는 임시 ID)
  text: string; // 선택지 텍스트 (뜻 또는 예문 해석)
}

export interface MultipleChoiceQuiz {
  question_word: Word; // 발음할 단어 정보 (Word 타입 재사용)
  question_type: string; // 'meaning' 또는 'example'
  options: QuizOption[]; // 선택지 목록 (QuizOption 타입 배열)
  correct_option_id: number; // 정답 선택지의 ID
}

// ✅ [핵심 추가] 퀴즈 생성/요청 시 필요한 데이터 타입 (POST Body)
export interface QuizCreate {
  user_id: number; // 퀴즈 출제 기준이 되는 사용자 ID (인증 과정에서 추출)
  subject?: string; // (선택적) 과목/주제 (예: '수능', '내신')
  unit?: string; // (선택적) 세부 단위 (예: '1과', '2023년')
  isTest?: boolean; // (선택적) 시험 모드 여부
}

// --- ✅ [핵심 추가] O/X 퀴즈 관련 타입 ---
export interface OXQuiz {
  question_word: Word; // 발음할 단어 정보
  display_text: string; // 화면에 표시될 텍스트 (영어 또는 한국어)
  display_type: "text" | "meaning"; // 표시된 텍스트 유형
  correct_answer: boolean; // 정답 (True: 일치, False: 불일치)
}

// --- ✅ [핵심 추가] 오늘의 활동 완료 상태 타입 ---
export interface TodayActivityStatus {
  word_study: boolean; // 오늘의 단어 학습 완료 여부
  word_quiz: boolean; // 단어 퀴즈 완료 여부
  // grammar_quiz?: boolean; // 나중에 추가될 활동들
}

export interface QuizAttempt {
  question_word: Word; // 👈 Word 객체 전체 포함 (렌더링에 필수)
  is_correct: boolean;
  user_answer: string; // 사용자가 선택한 옵션의 텍스트
  correct_answer: string; // 정답 옵션의 텍스트
  quiz_type: string;
  user_selected_option_id?: number | null;
  correct_option_id?: number;
}

// 🚨 QuizAttemptDetailCreate 타입이 위에 정의되어 있어야 합니다. (이전에 추가 완료)
import { QuizAttemptDetailCreate } from "./schemas"; // 혹은 파일 내부에 정의되어 있다고 가정

/**
 * 퀴즈 결과 제출 시 사용할 전체 스키마 (백엔드 POST /api/quiz/submit-results용)
 * 현재는 DailyActivityLog 기록을 위한 최소 정보를 담습니다.
 */
export interface QuizResultsSubmission {
  activity_type: string;
  total_questions: number;
  correct_count: number;

  // ✅ [핵심 추가] 클라이언트 렌더링용 원본 시도 기록
  attempts: QuizAttempt[];

  // ✅ [핵심 추가] 서버 제출용 상세 기록 (ID와 텍스트만 포함)
  details: QuizAttemptDetailCreate[];
}
export interface QuizAttempt {
  question_word: Word; // 문제가 출제된 단어 전체 정보
  is_correct: boolean;

  // 🚨 [핵심 추가] 422 오류 해결 및 서버 제출을 위해 필요한 필드
  user_answer: string; // 사용자가 선택한 옵션의 텍스트 (뜻)
  correct_answer: string; // 정답 옵션의 텍스트 (뜻)
  quiz_type: string; // 'word_quiz' 또는 'ox_quiz'

  // (선택 사항: 객관식 또는 O/X 전용 필드는 optional)
  user_selected_option_id?: number | null;
  correct_option_id?: number;
  user_answer_ox?: boolean | null;
  correct_answer_ox?: boolean;
}
