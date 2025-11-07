// src/store/quizStore.ts
"use client";

import { create } from "zustand";
// 🚨 schemas 파일에서 QuizResultsSubmission 타입을 임포트해야 합니다.
import { QuizResultsSubmission } from "@/schemas";

/**
 * 퀴즈 결과를 일시적으로 저장하는 상태 타입
 */
interface QuizState {
  // 최종 제출할 퀴즈 결과를 저장합니다.
  quizResults: QuizResultsSubmission | null;

  /**
   * 퀴즈가 완료되었을 때 최종 결과를 저장합니다.
   */
  setResults: (results: QuizResultsSubmission) => void;

  /**
   * 퀴즈 결과를 초기화합니다 (예: 결과 페이지를 벗어나거나, 다시 풀기를 시작할 때)
   */
  clearResults: () => void;
}

/**
 * Zustand Store 생성: 퀴즈 결과 관리
 * (데이터는 세션 간 유지할 필요가 없으므로 persist 미들웨어는 사용하지 않습니다.)
 */
export const useQuizStore = create<QuizState>((set) => ({
  quizResults: null, // 초기 상태는 null

  setResults: (results) => {
    set({ quizResults: results });
    console.log("🟢 Quiz results saved to store.");
  },

  clearResults: () => {
    set({ quizResults: null });
    console.log("⚪ Quiz results cleared from store.");
  },
}));
