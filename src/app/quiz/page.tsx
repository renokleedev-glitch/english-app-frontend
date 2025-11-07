// src/app/quiz/page.tsx
"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { Volume2, ArrowLeft, CheckSquare } from "lucide-react";
import { useAuthStore } from "@/store/authStore";
import { useQuizStore } from "@/store/quizStore";
import {
  getMultipleChoiceQuizSet,
  submitQuizResults,
  checkQuizCompletionStatus,
} from "@/lib/api";
import {
  MultipleChoiceQuiz,
  QuizAttempt,
  QuizResultsSubmission,
  QuizAttemptDetailCreate,
} from "@/schemas";
import { toast } from "sonner";
import { XCircle } from "lucide-react";

const QUIZ_ACTIVITY_TYPE = "word_quiz";

export default function QuizPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const { setResults } = useQuizStore();

  const [quizzes, setQuizzes] = useState<MultipleChoiceQuiz[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedOptionId, setSelectedOptionId] = useState<number | null>(null);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [isProcessingResults, setIsProcessingResults] = useState(false);

  // 서버에서 확인한 오늘 완료 상태
  const [isAlreadyCompletedToday, setIsAlreadyCompletedToday] = useState<
    boolean | null
  >(null);

  const [quizAttempts, setQuizAttempts] = useState<QuizAttempt[]>([]);

  // 🚀 [핵심 로직] loadQuizData 함수: 항상 서버 상태를 확인하고 퀴즈 로드를 시도합니다.
  const loadQuizData = useCallback(async () => {
    const currentUserId = user?.id;

    if (!currentUserId) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);
    setIsAlreadyCompletedToday(null); // 로딩 시작 시 상태 초기화

    try {
      // 1. 서버에 완료 상태 확인
      const completed = await checkQuizCompletionStatus(QUIZ_ACTIVITY_TYPE);
      setIsAlreadyCompletedToday(completed); // 🚨 서버 응답으로 상태 업데이트

      // 2. 완료했으면 여기서 중단
      if (completed) {
        setIsLoading(false);
        return;
      }

      // 3. 완료하지 않았으면 퀴즈 로드 시작
      const quizResults = await getMultipleChoiceQuizSet();

      if (quizResults && quizResults.length > 0) {
        setQuizzes(quizResults);
        setCurrentQuestionIndex(0);
        setQuizAttempts([]);
      } else {
        setError(
          "퀴즈를 생성할 수 없습니다. 학습할 단어가 부족하거나 모두 마스터했습니다."
        );
        toast.info("퀴즈를 생성할 수 없습니다.");
      }
    } catch (err: any) {
      setError(err.message || "퀴즈 로딩 중 오류 발생");
      toast.error(err.message || "퀴즈 로딩 중 오류 발생");
    } finally {
      setIsLoading(false);
    }
  }, [user?.id]); // 🚨 user?.id만 의존

  // --- 데이터 로딩 및 완료 상태 확인 ---
  useEffect(() => {
    const unsubAuth = useAuthStore.persist.onFinishHydration(() => {
      if (!useAuthStore.getState().user) router.push("/login");
    });
    if (useAuthStore.persist.hasHydrated() && !useAuthStore.getState().user) {
      router.push("/login");
    }

    if (user?.id) {
      loadQuizData(); // 인자 없이 호출
    }

    return () => unsubAuth();
  }, [router, user?.id, loadQuizData]); // 🚨 user?.id와 loadQuizData만 의존

  // --- 퀴즈 완료 및 결과 제출 핸들러 ---
  const handleQuizComplete = useCallback(
    async (finalAttempts: QuizAttempt[]) => {
      const currentUserId = user?.id;
      if (!currentUserId) return;

      setIsProcessingResults(true);
      const correctCount = finalAttempts.filter((a) => a.is_correct).length;

      // 1. 서버 제출용 상세 기록 (details) 리스트 생성
      const submissionDetails: QuizAttemptDetailCreate[] = finalAttempts.map(
        (attempt) => ({
          question_word_id: attempt.question_word.id,
          is_correct: attempt.is_correct,
          user_answer: attempt.user_answer,
          correct_answer: attempt.correct_answer,
          quiz_type: "multiple_choice",
        })
      );

      // 2. 최종 제출/Store 저장 객체 생성
      const finalResults: QuizResultsSubmission = {
        total_questions: finalAttempts.length,
        correct_count: correctCount,
        activity_type: QUIZ_ACTIVITY_TYPE,
        attempts: finalAttempts, // 렌더링용 원본 attempts 저장
        details: submissionDetails, // 서버 제출용 details 저장
      };

      // 3. 💾 Zustand Store에 결과 저장
      setResults(finalResults);

      try {
        // 4. 🌐 백엔드 API 호출: 결과 제출 및 활동 완료 기록 (DailyActivityLog 기록)
        await submitQuizResults(finalResults);

        toast.success("퀴즈 완료! 결과를 확인합니다.");

        // 5. ➡️ 결과 페이지로 이동
        router.replace("/quiz/results");
      } catch (error) {
        console.error("🔴 퀴즈 결과 제출 실패:", error);
        toast.error("결과 기록 중 오류 발생. 로컬 결과만 표시됩니다.");
        router.replace("/quiz/results");
      } finally {
        setIsProcessingResults(false);
      }
    },
    [user?.id, router, setResults]
  );

  // --- 핸들러 함수들 ---
  const currentQuiz = quizzes[currentQuestionIndex];

  const handlePlayAudio = () => {
    if (!currentQuiz || isPlayingAudio) return;
    const textToSpeak = currentQuiz.question_word.text;
    if (!textToSpeak) {
      toast.error("발음할 단어 정보가 없습니다.");
      return;
    }
    setIsPlayingAudio(true);
    try {
      if ("speechSynthesis" in window) {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(textToSpeak);
        utterance.lang = "en-US";
        utterance.rate = 0.9;

        const setVoice = () => {
          const voices = window.speechSynthesis.getVoices();
          const targetVoice = voices.find((v) =>
            v.lang.startsWith(utterance.lang.split("-")[0])
          );
          if (targetVoice) utterance.voice = targetVoice;
        };
        if (window.speechSynthesis.getVoices().length > 0) {
          setVoice();
        } else {
          window.speechSynthesis.onvoiceschanged = setVoice;
        }

        utterance.onend = () => setIsPlayingAudio(false);
        utterance.onerror = (e) => {
          console.error("Speech error:", e.error);
          toast.error(`발음 재생 오류: ${e.error}`);
          setIsPlayingAudio(false);
        };
        window.speechSynthesis.speak(utterance);
      } else {
        toast.error("음성 합성을 지원하지 않는 브라우저입니다.");
        setIsPlayingAudio(false);
      }
    } catch (e) {
      console.error("Audio playback error:", e);
      toast.error("발음 재생 중 오류가 발생했습니다.");
      setIsPlayingAudio(false);
    }
  };

  const handleOptionSelect = (optionId: number) => {
    if (selectedOptionId !== null || !currentQuiz || isProcessingResults)
      return;

    setSelectedOptionId(optionId);
    const correct = optionId === currentQuiz.correct_option_id;
    setIsCorrect(correct);

    const correctOption = currentQuiz.options.find(
      (opt) => opt.id === currentQuiz.correct_option_id
    );
    const userOption = currentQuiz.options.find((opt) => opt.id === optionId);

    // 퀴즈 시도 기록 객체 생성
    const attempt: QuizAttempt = {
      question_word: currentQuiz.question_word,
      is_correct: correct,

      user_answer: userOption?.text || "미선택",
      correct_answer: correctOption?.text || "정답 정보 없음",
      quiz_type: QUIZ_ACTIVITY_TYPE,

      user_selected_option_id: optionId,
      correct_option_id: currentQuiz.correct_option_id,
    };

    if (correct) {
      toast.success("정답입니다! 🎉");
    } else {
      toast.error("오답입니다.");
    }

    setTimeout(() => {
      const nextIndex = currentQuestionIndex + 1;
      const updatedAttempts = [...quizAttempts, attempt];
      setQuizAttempts(updatedAttempts);

      if (nextIndex < quizzes.length) {
        setCurrentQuestionIndex(nextIndex);
        setSelectedOptionId(null);
        setIsCorrect(null);
      } else {
        handleQuizComplete(updatedAttempts);
      }
    }, 1500);
  };

  // --- UI 렌더링 ---
  if (isLoading && isAlreadyCompletedToday === null) {
    return (
      <div className="p-6 text-center animate-pulse text-gray-500 dark:text-gray-400">
        퀴즈 상태 확인 중...
      </div>
    );
  }

  // 🚨 [핵심] 퀴즈 완료 UI 표시 조건
  if (isAlreadyCompletedToday === true) {
    return (
      <div className="max-w-xl mx-auto p-6 text-center mt-8">
        <CheckSquare className="w-16 h-16 text-green-500 mx-auto mb-4" />
        <h2 className="text-2xl font-bold mb-4 text-green-600 dark:text-green-400">
          오늘의 퀴즈 완료!
        </h2>
        <p className="text-gray-700 dark:text-gray-300 mb-6">
          이미 오늘 단어 퀴즈를 모두 푸셨습니다. 내일 다시 도전해주세요!
        </p>
        <button
          onClick={() => router.push("/dashboard")}
          className="px-4 py-2 bg-violet-600 text-white rounded hover:bg-violet-700 transition"
        >
          대시보드로 돌아가기
        </button>
      </div>
    );
  }

  if (error) return <div className="p-6 text-center text-red-500">{error}</div>;

  if (isLoading && quizzes.length === 0)
    return (
      <div className="p-6 text-center animate-pulse text-gray-500 dark:text-gray-400">
        퀴즈 세트를 불러오는 중...
      </div>
    );

  if (isProcessingResults) {
    return (
      <div className="max-w-xl mx-auto p-6 text-center mt-8">
        <h2 className="text-2xl font-bold mb-4 text-violet-600 dark:text-violet-400 animate-pulse">
          결과를 기록하고 있습니다...
        </h2>
        <p className="text-gray-700 dark:text-gray-300 mb-6">
          잠시만 기다려 주세요. 곧 결과 화면으로 이동합니다.
        </p>
      </div>
    );
  }

  if (!currentQuiz)
    return (
      <div className="p-6 text-center text-red-500">
        오류: 퀴즈 문제를 찾을 수 없습니다. (데이터 부족)
      </div>
    );

  // --- 퀴즈 진행 UI 렌더링 ---
  return (
    <div className="max-w-xl mx-auto mt-8">
      {/* 진행 상황 표시 */}
      <div className="mb-4">
        <Link
          href="/dashboard"
          className="inline-flex items-center text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
        >
          <ArrowLeft size={16} className="mr-1" />
          대시보드로 돌아가기
        </Link>
      </div>
      <div className="text-center mb-4 text-sm font-medium text-gray-500 dark:text-gray-400">
        문제 {currentQuestionIndex + 1} / {quizzes.length}
      </div>

      <motion.div
        key={currentQuiz.question_word.id}
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ duration: 0.3 }}
        className="p-6 bg-white dark:bg-gray-800 rounded-lg shadow text-gray-900 dark:text-gray-100"
      >
        <h2 className="text-xl font-semibold mb-4 text-center text-gray-800 dark:text-gray-200">
          다음 발음을 듣고 알맞은 뜻을 고르세요
        </h2>

        {/* 발음 듣기 버튼 */}
        <div className="flex justify-center mb-6">
          <motion.button
            onClick={handlePlayAudio}
            disabled={isPlayingAudio}
            className={`p-4 rounded-full text-white ${
              isPlayingAudio
                ? "bg-gray-400 dark:bg-gray-600"
                : "bg-violet-600 hover:bg-violet-700 dark:bg-violet-500 dark:hover:bg-violet-600"
            } transition`}
            whileTap={{ scale: 0.9 }}
            aria-label="단어 발음 듣기"
          >
            <Volume2 size={24} />
          </motion.button>
        </div>

        {/* 선택지 목록 */}
        <div className="space-y-3">
          {currentQuiz.options.map((option) => (
            <motion.button
              key={option.id}
              onClick={() => handleOptionSelect(option.id)}
              disabled={selectedOptionId !== null || isProcessingResults}
              className={`w-full p-3 text-left rounded-md border transition-all duration-300 text-gray-900 dark:text-gray-100 ${
                selectedOptionId === null
                  ? "border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600" // 기본 상태
                  : option.id === currentQuiz.correct_option_id
                  ? "bg-green-100 dark:bg-green-800 border-green-500 text-green-800 dark:text-green-100 font-semibold" // 정답
                  : option.id === selectedOptionId
                  ? "bg-red-100 dark:bg-red-800 border-red-500 text-red-800 dark:text-red-100" // 선택한 오답
                  : "border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 opacity-50 cursor-not-allowed" // 선택되지 않은 오답
              }`}
              whileHover={selectedOptionId === null ? { scale: 1.03 } : {}}
              whileTap={selectedOptionId === null ? { scale: 0.98 } : {}}
            >
              {option.text}
            </motion.button>
          ))}
        </div>

        {/* 정답/오답 피드백 */}
        {selectedOptionId !== null && (
          <p
            className={`mt-4 text-center font-semibold ${
              isCorrect
                ? "text-green-600 dark:text-green-400"
                : "text-red-600 dark:text-red-400"
            }`}
          >
            {isCorrect ? "맞았습니다!" : "틀렸습니다!"}
          </p>
        )}
      </motion.div>
      {/* 퀴즈 종료 버튼 */}
      <div className="text-center mt-6">
        <button
          onClick={() => router.push("/dashboard")}
          className="text-xs text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 flex items-center gap-1 mx-auto"
        >
          <XCircle size={14} /> 퀴즈 종료하기
        </button>
      </div>
    </div>
  );
}
