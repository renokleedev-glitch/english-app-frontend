// src/app/quiz/results/page.tsx
"use client";

import React, { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuizStore } from "@/store/quizStore";
import { useAuthStore } from "@/store/authStore"; // 🚨 user ID 사용을 위해 임포트
import { CheckCircle, XCircle, ArrowLeft, RotateCw } from "lucide-react";
import { toast } from "sonner";
import { QuizAttempt } from "@/schemas"; // 🚨 QuizAttempt 타입을 사용합니다.
import { resetQuizCompletion } from "@/lib/api"; // 🚨 새 API 함수 임포트
import { format } from "date-fns"; // 날짜 포맷팅용

export default function QuizResultsPage() {
  const router = useRouter();
  const { quizResults, clearResults } = useQuizStore();
  const { user } = useAuthStore(); // user ID 사용을 위해 임포트

  useEffect(() => {
    if (!quizResults) {
      toast.error("퀴즈 결과가 없습니다. 다시 시작해 주세요.");
      router.replace("/dashboard");
    }
  }, [quizResults, router]);

  if (!quizResults) {
    return null;
  }

  // 🚨 [핵심] Store에 저장된 attempts 배열을 가져와 렌더링합니다.
  const { total_questions, correct_count, attempts, activity_type } =
    quizResults;

  const isPassed = correct_count >= total_questions * 0.8;

  // Store에 저장된 attempts 배열을 사용하여 필터링
  const incorrectAttempts = attempts.filter((attempt) => !attempt.is_correct);

  const handleNavigation = (path: string) => {
    clearResults();
    router.push(path);
  };

  // 🚀 [핵심 추가] 완료 기록을 삭제하고 다시 풀기를 시작하는 함수
  const handleResetAndRetry = async (activityType: string) => {
    if (!user?.id) {
      toast.error("사용자 정보가 없어 다시 풀기를 실행할 수 없습니다.");
      return;
    }

    // 🚨 [핵심] 확인창 띄우기
    if (
      !confirm(
        "정말 오늘 퀴즈 완료 기록을 삭제하고 다시 푸시겠습니까? (미션 상태가 초기화됩니다.)"
      )
    ) {
      return; // 사용자가 취소함
    }

    toast.loading("완료 상태를 초기화 중...");

    try {
      // 1. 서버의 DailyActivityLog 기록 삭제
      await resetQuizCompletion(activityType);

      // 2. Zustand Store 클리어
      clearResults();

      toast.dismiss();
      toast.success("초기화 완료! 새로운 퀴즈를 시작합니다.");

      // 3. 퀴즈 페이지로 이동 (쿼리 파라미터 필요 없음)
      router.replace(activityType === "word_quiz" ? "/quiz" : "/word-test");
    } catch (e) {
      toast.dismiss();
      toast.error("초기화 실패. 잠시 후 다시 시도해주세요.");
    }
  };

  const QuizFeedbackDetail = ({ attempt }: { attempt: QuizAttempt }) => {
    // 객관식 퀴즈 (word_quiz)의 경우
    if (attempt.quiz_type === "word_quiz") {
      return (
        <p className="text-red-500 ml-4 text-sm mt-1">
          <span className="font-semibold">내 답변:</span> {attempt.user_answer}{" "}
          / <span className="font-semibold">정답:</span>{" "}
          {attempt.correct_answer}
        </p>
      );
    }

    // O/X 퀴즈의 경우 (O/X 로직은 word-test 페이지 구현 시 최종 통합 필요)
    if (attempt.quiz_type === "ox_quiz") {
      const userAnswer = attempt.user_answer_ox ? "O" : "X";
      const correctAnswer = attempt.correct_answer_ox ? "O" : "X";
      return (
        <p className="text-red-500 ml-4 text-sm mt-1">
          <span className="font-semibold">내 답변:</span> {userAnswer} /{" "}
          <span className="font-semibold">정답:</span> {correctAnswer}
        </p>
      );
    }

    return null;
  };

  return (
    <div className="container mx-auto p-4 max-w-xl">
      <h1 className="text-3xl font-bold mb-6 text-center">
        {activity_type === "word_quiz" ? "단어 퀴즈 결과" : "O/X 테스트 결과"}
        {isPassed ? " 🎉" : " 🤔"}
      </h1>

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
          <h2 className="2xl font-extrabold text-gray-800 dark:text-gray-100">
            {correct_count} / {total_questions} 정답!
          </h2>
        </div>
        <p className="text-center text-gray-600 dark:text-gray-400">
          {isPassed
            ? "완벽해요! 다음 미션도 성공해 보세요."
            : "오답을 확인하고 다시 도전해 보세요!"}
        </p>
      </div>

      {/* 오답 노트 섹션 */}
      <div className="mt-8">
        <h3 className="text-xl font-semibold mb-4 border-b pb-2">
          오답 노트 ({incorrectAttempts.length}개)
        </h3>
        <div className="space-y-4 max-h-80 overflow-y-auto pr-2">
          {incorrectAttempts.length > 0 ? (
            incorrectAttempts.map((attempt, index) => (
              <div
                key={`${attempt.question_word.id}-${index}`}
                className="p-3 bg-white dark:bg-gray-800 border border-red-200 dark:border-red-700 rounded-md shadow-sm"
              >
                <p className="font-bold text-lg text-red-600">
                  {index + 1}. {attempt.question_word.text}{" "}
                  {/* ✅ 단어 텍스트 표시 */}
                </p>
                <p className="text-gray-700 dark:text-gray-300 ml-4 text-sm">
                  <span className="font-semibold">정답 뜻:</span>{" "}
                  {attempt.question_word.meaning}
                </p>
                <QuizFeedbackDetail attempt={attempt} />
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
          onClick={() => handleResetAndRetry(activity_type)} // 🚨 새로운 함수 호출
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
    </div>
  );
}
