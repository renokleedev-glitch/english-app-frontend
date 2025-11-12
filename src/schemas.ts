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

// 역할(Role) Enum
export enum Role {
  STUDENT = "student",
  TEACHER = "teacher",
  ADMIN = "admin",
}

// User 인터페이스에 role 및 daily_exam_goal 추가
export interface User {
  id: number;
  email: string;
  daily_word_goal: number;
  daily_exam_goal: number; // 👈 이 필드 추가
  role: Role; // 👈 이 필드 추가
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

  exam_quiz: boolean; // 내신 문제 완료 여부
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

// // 🚨 QuizAttemptDetailCreate 타입이 위에 정의되어 있어야 합니다. (이전에 추가 완료)
// import { QuizAttemptDetailCreate } from "./schemas"; // 혹은 파일 내부에 정의되어 있다고 가정

// 1. 상세 기록 생성 기본 스키마 (QuizAttemptDetailCreate가 상속받는 기본 클래스)
export interface QuizAttemptDetailBase {
  // 🚨 export가 있어야 합니다.
  question_word_id: number;
  is_correct: boolean;
  user_answer: string;
  correct_answer: string;
  quiz_type: string;
}

// 2. 퀴즈 상세 기록 생성 스키마
export interface QuizAttemptDetailCreate extends QuizAttemptDetailBase {
  // 🚨 export가 있어야 합니다.
  // Base를 상속받거나, 직접 필드 정의
  quiz_type: "multiple_choice" | "ox"; // Literal 타입 사용 시 재정의
}

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

// --- 내신 문제 (ExamQuestion) 관련 타입 ---

/**
 * 🆕 객관식(MC) 문제의 선택지 (보기)
 */
export interface QuestionOption {
  id: number;
  text: string;
}

/**
 * 🆕 API로부터 받아올 내신 문제(ExamQuestion)의 타입
 */
export interface ExamQuestion {
  id: number;
  grammar_point: string | null;
  question_type: "MC" | "CORRECT" | "CONSTRUCT";
  question_text: string;
  explanation: string | null;
  correct_answer: string;

  grade_level: number; // 👈 [핵심 추가] 이 필드를 추가합니다.

  choices: QuestionOption[] | null;
  scrambled_words: string[] | null;
}

/**
 * 🆕 [내신 문제] 풀이 기록 '조회'용 스키마 (API 응답 모델)
 * (UserGrammarAttempt 모델 대응)
 */
export interface UserGrammarAttempt extends GrammarAttemptCreate {
  id: number;
  user_id: number;
  attempted_at: string; // 날짜/시간은 string으로 받습니다.

  // 🚨 [핵심] JOIN된 'ExamQuestion' (문제) 정보를 포함합니다.
  question: ExamQuestion;
}

/**
 * 🆕 [내신 문제] 답안 제출용 스키마 (UserGrammarAttempt 모델 대응)
 * (이 타입을 export 해야 exam/page.tsx에서 import하여 사용할 수 있습니다.)
 */
export interface GrammarAttemptCreate {
  question_id: number;
  user_answer: string;
  is_correct: boolean;
}

/**
 * 🆕 [단어 퀴즈] 오답 노트 '조회'용 스키마 (API 응답 모델)
 * (QuizAttemptDetail 모델 대응)
 */
export interface QuizAttemptDetail extends QuizAttemptDetailBase {
  id: number;
  user_id: number;
  attempted_at: string;

  // 🚨 [핵심] JOIN된 'Word' (단어) 정보를 포함합니다.
  question_word: Word;
}

// --- (어드민) 관련 스키마 ---

// 학생 목표량 수정용
export interface UserUpdateGoals {
  daily_word_goal: number;
  daily_exam_goal: number;
}

// 학생 역할 수정용
export interface UserUpdateRole {
  role: Role;
}

// 🆕 [핵심 추가] 단어 생성을 위한 타입 (seed.py와 호환)
export interface WordCreate {
  text: string;
  meaning: string;
  grade_level?: number | null;
  pronunciation?: string | null;
  english_audio_url?: string | null;
  korean_audio_url?: string | null;
  example_sentence_english?: string | null;
  example_sentence_korean?: string | null;
}

// 🆕 [핵심 추가] 단어 수정을 위한 타입 (모든 필드 선택적)
export interface WordUpdate {
  text?: string;
  meaning?: string;
  grade_level?: number | null;
  pronunciation?: string | null;
  english_audio_url?: string | null;
  korean_audio_url?: string | null;
  example_sentence_english?: string | null;
  example_sentence_korean?: string | null;
}

// (어드민) 내신 문제 관리 Schema
export interface GrammarQuestionCreate {
  grade_level: number;
  grammar_point: string;
  question_type: "MC" | "CORRECT" | "CONSTRUCT";
  question_text: string;
  choices: any | null; // JSON 필드는 any 또는 구체적인 타입
  correct_answer: string;
  explanation: string | null;
  scrambled_words: string[] | null;
}

export interface GrammarQuestionUpdate {
  grade_level?: number;
  grammar_point?: string;
  question_type?: "MC" | "CORRECT" | "CONSTRUCT";
  question_text?: string;
  choices?: any | null;
  correct_answer?: string;
  explanation?: string | null;
  scrambled_words?: string[] | null;
}

// --- (어드민) 단어-문제 연결 Schema ---

// 🆕 [핵심 추가] 단어와 내신 문제를 연결하기 위한 스키마
export interface WordQuestionLinkCreate {
  grammar_question_id: number;
  word_id: number;
}

// 🆕 [핵심 추가] 단어-문제 연결 '조회'용 스키마 (API 응답)
// (Word 및 ExamQuestion 타입이 이 파일 위에 이미 정의되어 있어야 함)
export interface WordQuestionLink extends WordQuestionLinkCreate {
  word: Word;
  question: ExamQuestion;
}
