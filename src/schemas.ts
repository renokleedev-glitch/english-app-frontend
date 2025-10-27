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

// --- ❓ [핵심 추가] 퀴즈 관련 타입 ---

// 퀴즈 선택지 타입
export interface QuizOption {
  id: number; // 선택지의 고유 ID (단어 ID 또는 임시 ID)
  text: string; // 선택지 텍스트 (뜻 또는 예문 해석)
}

// 객관식 퀴즈 문제 타입
export interface MultipleChoiceQuiz {
  question_word: Word; // 발음할 단어 정보 (Word 타입 재사용)
  question_type: string; // 'meaning' 또는 'example'
  options: QuizOption[]; // 선택지 목록 (QuizOption 타입 배열)
  correct_option_id: number; // 정답 선택지의 ID
}

// 필요에 따라 다른 타입 정의들을 이곳에 추가할 수 있습니다.
