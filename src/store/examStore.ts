// src/store/examStore.ts
"use client";

import { create } from "zustand";
import { ExamQuestion } from "@/schemas";

/**
 * 내신 문제(Exam) 퀴즈 결과를 임시 저장하는 상태 타입
 */
interface ExamResultState {
  questions: ExamQuestion[];
  userAnswers: string[];
  setResults: (questions: ExamQuestion[], userAnswers: string[]) => void;
  clearResults: () => void;
}

/**
 * Zustand Store 생성: 내신 문제 결과 관리
 */
export const useExamStore = create<ExamResultState>((set) => ({
  questions: [],
  userAnswers: [],

  setResults: (questions, userAnswers) =>
    set({
      questions: questions,
      userAnswers: userAnswers,
    }),

  clearResults: () => set({ questions: [], userAnswers: [] }),
}));
