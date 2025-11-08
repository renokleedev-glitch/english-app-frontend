// src/app/exam/results/page.tsx
"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useExamStore } from "@/store/examStore"; // 🚨 Store는 clearResults용으로만 사용
import { ExamQuestion, UserGrammarAttempt } from "@/schemas"; // 🚨 UserGrammarAttempt 임포트
import { getTodayExamAttempts } from "@/lib/api"; // 🚨 [핵심] 서버 API 함수 임포트
import Link from "next/link";
import {
  CheckCircle,
  XCircle,
  ArrowLeft,
  RotateCw,
  Loader2,
} from "lucide-react"; // 🚨 Loader2 추가
import { toast } from "sonner";
import { motion } from "framer-motion";
import { format } from "date-fns"; // (설치 필요: npm install date-fns)

/**
 * 정답/오답을 판별하는 헬퍼 함수 (참고용)
 */
const checkAnswer = (question: ExamQuestion, userAnswer: string): boolean => {
  const correctAnswer = question.correct_answer || "";
  if (question.question_type === "MC") {
    return userAnswer === correctAnswer;
  }
  return userAnswer.trim().toLowerCase() === correctAnswer.trim().toLowerCase();
};

export default function ExamResultsPage() {
  const router = useRouter();
  // 🚨 [수정] Store에서는 clearResults만 사용
  const { clearResults } = useExamStore();

  // 🚨 [수정] API로 불러온 데이터를 저장할 상태
  const [attempts, setAttempts] = useState<UserGrammarAttempt[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // --- 1. 데이터 로딩 (Store -> API) ---
  useEffect(() => {
    // 🚨 [핵심 수정] 서버에서 오늘 푼 기록을 불러옵니다.
    const fetchAttempts = async () => {
      setIsLoading(true);
      try {
        const data = await getTodayExamAttempts();
        if (data.length === 0) {
          toast.error("오늘 푼 내신 문제 기록이 없습니다.");
          router.replace("/dashboard");
          return; // 데이터가 없으면 즉시 종료
        }
        setAttempts(data);
      } catch (e) {
        toast.error("결과를 불러오는 데 실패했습니다.");
        router.replace("/dashboard");
      } finally {
        setIsLoading(false);
      }
    };

    fetchAttempts();
  }, [router]); // 페이지 로드 시 1회 실행

  // --- 2. 결과 데이터 계산 ---
  const resultsData = useMemo(() => {
    const total_questions = attempts.length;
    const correct_count = attempts.filter((a) => a.is_correct).length;
    const incorrectAttempts = attempts.filter((a) => !a.is_correct);
    const isPassed =
      total_questions > 0 ? correct_count / total_questions >= 0.8 : false;

    return { correct_count, total_questions, incorrectAttempts, isPassed };
  }, [attempts]);

  const { correct_count, total_questions, incorrectAttempts, isPassed } =
    resultsData;

  // --- 3. 네비게이션 핸들러 ---
  const handleNavigation = (path: string) => {
    // 🚨 Store를 사용하지 않았더라도, 다시 풀기 시 Store를 비워줍니다.
    clearResults();

    // key 기반 강제 재시작 (다른 퀴즈와 일관성 유지)
    const targetPath =
      (path === "/exam" ? "/exam" : "/dashboard") + `?key=${Date.now()}`;
    router.push(targetPath);
  };

  /**
   * 오답 피드백 컴포넌트
   */
  const QuizFeedbackDetail = ({ attempt }: { attempt: UserGrammarAttempt }) => {
    const question = attempt.question; // JOIN된 문제 객체

    if (question.question_type === "MC") {
      // 객관식: 사용자가 선택한 답(ID)과 정답(ID)을 텍스트로 변환
      const userAnswerText =
        question.choices?.find((c) => String(c.id) === attempt.user_answer)
          ?.text || attempt.user_answer;
      const correctAnswerText =
        question.choices?.find((c) => String(c.id) === question.correct_answer)
          ?.text || question.correct_answer;

      return (
        <p className="text-sm text-red-500 dark:text-red-400 mt-1">
          <span className="font-semibold">내 답변:</span> {userAnswerText} /{" "}
          <span className="font-semibold">정답:</span> {correctAnswerText}
        </p>
      );
    }

    // 주관식 (CORRECT, CONSTRUCT)
    return (
      <p className="text-sm text-red-500 dark:text-red-400 mt-1">
        <span className="font-semibold">내 답변:</span>{" "}
        {attempt.user_answer || "(입력 안 함)"} /{" "}
        <span className="font-semibold">정답:</span> {question.correct_answer}
      </p>
    );
  };

  // --- 4. UI 렌더링 ---
  if (isLoading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-violet-500" />
        <p className="text-gray-500 dark:text-gray-400 ml-2">
          결과를 불러오는 중...
        </p>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
      className="max-w-3xl mx-auto py-8"
    >
      <h1 className="text-3xl font-bold mb-6 text-center text-violet-600 dark:text-violet-400">
        내신 문제 결과
      </h1>

      {/* 점수 요약 카드 */}
      <div
        className={`p-6 rounded-lg shadow-xl ${
          isPassed
            ? "bg-green-50 border-l-4 border-green-500"
            : "bg-red-50 border-l-4 border-red-500"
        }`}
      >
        <div className="flex items-center justify-center mb-3">
          {isPassed ? (
            <CheckCircle className="w-8 h-8 text-green-600 mr-2" />
          ) : (
            <XCircle className="w-8 h-8 text-red-600 mr-2" />
          )}
          <h2 className="text-3xl font-extrabold text-gray-800 dark:text-gray-100">
            {correct_count} / {total_questions} 정답!
          </h2>
        </div>
        <p className="text-center text-gray-600 dark:text-gray-400">
          {isPassed
            ? "훌륭합니다! 모든 문제를 완벽하게 이해하셨네요."
            : "오답을 확인하고 다시 도전해 보세요!"}
        </p>
      </div>

      {/* 오답 노트 섹션 */}
      <div className="mt-10">
        <h3 className="text-2xl font-semibold mb-4 border-b pb-2">
          오답 노트 ({incorrectAttempts.length}개)
        </h3>
        <div className="space-y-6 max-h-[60vh] overflow-y-auto pr-2">
          {incorrectAttempts.length > 0 ? (
            incorrectAttempts.map((attempt) => (
              <div
                key={attempt.id} // 👈 UserGrammarAttempt의 고유 ID 사용
                className="p-4 bg-white dark:bg-gray-800 border border-red-200 dark:border-red-700 rounded-md shadow-sm"
              >
                {/* 🚨 [수정] attempt.question (JOIN된 객체)에서 정보 가져오기 */}
                <p className="text-sm font-semibold text-violet-500">
                  {attempt.question.grammar_point}
                </p>
                <p className="text-lg font-medium text-gray-800 dark:text-gray-100 mt-1">
                  {attempt.question.question_text}
                </p>

                {/* 오답/정답 피드백 컴포넌트 호출 */}
                <QuizFeedbackDetail attempt={attempt} />

                {/* 해설 */}
                <p className="text-xs text-gray-600 dark:text-gray-400 mt-2 pt-2 border-t border-gray-200 dark:border-gray-700">
                  <span className="font-semibold">요점:</span>{" "}
                  {attempt.question.explanation}
                </p>
              </div>
            ))
          ) : (
            <p className="text-gray-500 text-center py-4">
              모든 문제를 맞췄습니다! 🎉
            </p>
          )}
        </div>
      </div>

      {/* 다음 행동 버튼 */}
      <div className="flex justify-between mt-10 space-x-4">
        <button
          onClick={() => handleNavigation(`/exam`)}
          className="flex-1 flex items-center justify-center p-3 text-white bg-blue-500 rounded-lg hover:bg-blue-600 transition"
        >
          <RotateCw size={18} className="mr-2" /> 다시 풀기
        </button>
        <button
          onClick={() => handleNavigation("/dashboard")}
          className="flex-1 flex items-center justify-center p-3 text-white bg-gray-500 rounded-lg hover:bg-gray-600 transition"
        >
          <ArrowLeft size={18} className="mr-2" /> 대시보드
        </button>
      </div>
    </motion.div>
  );
}
