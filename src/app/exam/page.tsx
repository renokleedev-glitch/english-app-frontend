// src/app/exam/page.tsx
"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/authStore";
// 🚨 [수정] submitExamAttempts 임포트
import { getDailyExamSet, submitExamAttempts } from "@/lib/api";
import { ExamQuestion, QuestionOption, GrammarAttemptCreate } from "@/schemas";
import { toast } from "sonner";
import Link from "next/link";
import { ArrowLeft, Loader2, AlertCircle, CheckCircle } from "lucide-react";
import { motion } from "framer-motion";
import { useExamStore } from "@/store/examStore"; // 🚨 [핵심] 새 Store 임포트

// ------------------------------------------------------------------
// 1. 퀴즈 카드 컴포넌트 (문제 유형별 UI 분리)
// ------------------------------------------------------------------
interface ExamQuestionCardProps {
  question: ExamQuestion;
  onAnswerSubmit: (answer: string) => void;
}

function ExamQuestionCard({ question, onAnswerSubmit }: ExamQuestionCardProps) {
  const [selectedAnswer, setSelectedAnswer] = useState<string>("");
  const [inputText, setInputText] = useState<string>("");

  const handleSubmit = () => {
    let answerToSubmit = "";
    if (question.question_type === "MC") {
      answerToSubmit = selectedAnswer;
    } else {
      answerToSubmit = inputText;
    }

    if (!answerToSubmit) {
      toast.error("답을 선택하거나 입력해주세요.");
      return;
    }

    onAnswerSubmit(answerToSubmit);

    // 상태 초기화
    setSelectedAnswer("");
    setInputText("");
  };

  return (
    <motion.div
      key={question.id}
      initial={{ opacity: 0, x: 50 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -50 }}
      transition={{ duration: 0.3 }}
      className="p-6 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700"
    >
      {/* 🚨 [수정] category 대신 grammar_point 사용 */}
      <p className="text-sm font-semibold text-violet-500">
        {question.grammar_point}
      </p>
      <p className="mt-2 text-lg text-gray-800 dark:text-gray-100">
        {question.question_text}
      </p>

      {/* 2-1. 객관식 (MC) 렌더링 */}
      {question.question_type === "MC" && question.choices && (
        <div className="space-y-3 mt-4">
          {question.choices.map((option) => (
            <button
              key={option.id}
              onClick={() => setSelectedAnswer(String(option.id))}
              className={`w-full p-3 text-left rounded-md border transition-all 
                ${
                  selectedAnswer === String(option.id)
                    ? "bg-violet-100 dark:bg-violet-900 border-violet-500 ring-2 ring-violet-300"
                    : "border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700"
                }`}
            >
              {option.id}. {option.text}
            </button>
          ))}
        </div>
      )}

      {/* 2-2. 문장 수정 (CORRECT) 렌더링 */}
      {question.question_type === "CORRECT" && (
        <div className="mt-4">
          <label className="text-sm text-gray-600 dark:text-gray-400">
            정답 문장 입력:
          </label>
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            className="w-full p-2 mt-1 border rounded-md dark:bg-gray-700 dark:border-gray-600"
            placeholder="수정된 문장 전체를 입력하세요."
          />
        </div>
      )}

      {/* 2-3. 영작 (CONSTRUCT) 렌더링 */}
      {question.question_type === "CONSTRUCT" && (
        <div className="mt-4">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            제시 단어: {question.scrambled_words?.join(" / ")}
          </p>
          <label className="text-sm text-gray-600 dark:text-gray-400 mt-2">
            영작 문장 입력:
          </label>
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            className="w-full p-2 mt-1 border rounded-md dark:bg-gray-700 dark:border-gray-600"
            placeholder="단어를 배열하여 문장을 완성하세요."
          />
        </div>
      )}

      {/* 답안 제출 버튼 */}
      <button
        onClick={handleSubmit}
        className="w-full p-3 mt-6 bg-violet-600 text-white rounded-lg hover:bg-violet-700 transition font-semibold"
      >
        답안 제출하기
      </button>
    </motion.div>
  );
}
// ------------------------------------------------------------------

// ------------------------------------------------------------------
// 2. 메인 페이지 컴포넌트
// ------------------------------------------------------------------
const EXAM_ACTIVITY_TYPE = "exam_quiz";

export default function ExamPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const { setResults } = useExamStore(); // 🚨 Store setter 가져오기

  const [questions, setQuestions] = useState<ExamQuestion[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [userAnswers, setUserAnswers] = useState<string[]>([]);
  const [isQuizComplete, setIsQuizComplete] = useState(false);

  // --- 1. 데이터 로딩 ---
  useEffect(() => {
    // (인증 확인 로직 유지)
    const unsubAuth = useAuthStore.persist.onFinishHydration(() => {
      if (!useAuthStore.getState().user) router.push("/login");
    });
    if (useAuthStore.persist.hasHydrated() && !useAuthStore.getState().user) {
      router.push("/login");
    }

    const loadExamData = async () => {
      if (!user?.id) return;
      setIsLoading(true);
      setError(null);
      try {
        const data = await getDailyExamSet();
        if (data.length === 0) {
          toast.info("오늘의 단어와 연관된 내신 문제를 찾을 수 없습니다.");
        }
        setQuestions(data);
      } catch (err: any) {
        setError(err.message || "문제 로딩 중 오류 발생");
        toast.error(err.message || "문제 로딩 중 오류 발생");
      } finally {
        setIsLoading(false);
      }
    };

    if (user?.id) {
      loadExamData();
    }
  }, [user?.id, router]);

  // 답안 저장 및 다음 문제 이동 핸들러
  const handleAnswerSubmit = (answer: string) => {
    const newAnswers = [...userAnswers, answer];
    setUserAnswers(newAnswers);

    const nextIndex = currentQuestionIndex + 1;
    if (nextIndex < questions.length) {
      setCurrentQuestionIndex(nextIndex);
    } else {
      setIsQuizComplete(true);
      handleQuizComplete(newAnswers);
    }
  };

  // 🚨 [핵심 수정] 최종 결과 제출 로직 (try/catch 정리)
  const handleQuizComplete = async (finalAnswers: string[]) => {
    toast.loading("결과를 제출 중입니다...");

    try {
      // 1. 서버 제출용 GrammarAttemptCreate 배열 생성
      const submissionAttempts: GrammarAttemptCreate[] = questions.map(
        (q, index) => {
          const userAnswer = finalAnswers[index] || "";
          const correctAnswer = q.correct_answer || "";
          let isCorrect = false;

          if (q.question_type === "MC") {
            isCorrect = userAnswer === correctAnswer;
          } else {
            isCorrect =
              userAnswer.trim().toLowerCase() ===
              correctAnswer.trim().toLowerCase();
          }

          return {
            question_id: q.id,
            user_answer: userAnswer,
            is_correct: isCorrect,
          };
        }
      );

      // 2. 💾 Zustand Store에 결과 저장 (결과 페이지에서 사용)
      setResults(questions, finalAnswers);

      // 3. 🌐 API 호출 (백그라운드에서 실행)
      await submitExamAttempts(submissionAttempts);

      // 4. (선택적) DailyActivityLog에 'exam_quiz' 완료 기록
      // TODO: submitExamAttempts가 완료 기록까지 처리하게 하거나,
      // 별도의 markQuizCompleted('exam_quiz') API를 호출합니다.

      toast.dismiss();
      toast.success("제출 완료! 결과 페이지로 이동합니다.");

      // 5. ➡️ [핵심] 대시보드 대신 결과 페이지로 이동
      router.replace("/exam/results"); // 👈 결과 페이지로 이동
    } catch (e) {
      toast.dismiss();
      toast.error("결과 제출에 실패했습니다. 다시 시도해주세요.");
      setIsQuizComplete(false);
    }
  };

  // --- (로딩, 오류, 문제 없음 UI는 기존과 동일) ---
  if (isLoading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-violet-500" />
        <p className="text-gray-500 dark:text-gray-400 ml-2">
          오늘의 내신 문제를 불러오는 중...
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center text-red-500">
        <AlertCircle className="w-6 h-6 mr-2" />
        <p>{error}</p>
      </div>
    );
  }

  if (questions.length === 0 && !isLoading) {
    return (
      <div className="max-w-2xl mx-auto py-8 text-center">
        <h1 className="text-2xl font-semibold mb-4">내신 문제 📝</h1>
        <p className="text-gray-600 dark:text-gray-400 mb-6">
          오늘은 학습할 내신 문제가 없습니다.
        </p>
        <Link
          href="/dashboard"
          className="px-4 py-2 bg-violet-600 text-white rounded hover:bg-violet-700 transition"
        >
          대시보드로 돌아가기
        </Link>
      </div>
    );
  }

  const currentQuestion = questions[currentQuestionIndex];

  // --- 4. 퀴즈 진행 UI ---
  return (
    <div className="max-w-3xl mx-auto py-8">
      <div className="mb-6">
        <Link
          href="/dashboard"
          className="inline-flex items-center text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
        >
          <ArrowLeft size={16} className="mr-1" />
          대시보드로 돌아가기
        </Link>
      </div>

      <h1 className="text-3xl font-semibold text-violet-600 dark:text-violet-400 mb-6 text-center">
        오늘의 내신 문제
      </h1>

      <div className="text-center mb-4 text-sm font-medium text-gray-500 dark:text-gray-400">
        문제 {currentQuestionIndex + 1} / {questions.length}
      </div>

      {isQuizComplete ? (
        // 5. 퀴즈 완료 화면
        <div className="p-6 bg-white dark:bg-gray-800 rounded-lg shadow-lg text-center">
          <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
          <h2 className="text-2xl font-semibold mb-3">제출 완료!</h2>
          <p className="text-gray-600 dark:text-gray-300">
            수고하셨습니다. 잠시 후 대시보드로 이동합니다.
          </p>
        </div>
      ) : (
        // 4. 퀴즈 진행 화면
        currentQuestion && (
          <ExamQuestionCard
            question={currentQuestion}
            onAnswerSubmit={handleAnswerSubmit}
          />
        )
      )}
    </div>
  );
}
