// src/app/word-test/page.tsx
"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import {
  Volume2,
  XCircle,
  CheckSquare,
  ArrowLeft,
  Check,
  X,
} from "lucide-react";
import { useAuthStore } from "@/store/authStore";
import { useQuizStore } from "@/store/quizStore"; // 🚨 [추가] 퀴즈 Store
import {
  getOXQuizSet, // 🚨 [수정] Set API
  submitQuizResults, // 🚨 [수정] 결과 제출 API
  checkQuizCompletionStatus,
} from "@/lib/api";
import {
  OXQuiz,
  QuizAttempt, // 🚨 [추가]
  QuizResultsSubmission, // 🚨 [추가]
  QuizAttemptDetailCreate, // 🚨 [추가]
} from "@/schemas";
import { toast } from "sonner";
import Link from "next/link";

const QUIZ_ACTIVITY_TYPE = "ox_quiz"; // 🚨 O/X 퀴즈 타입

export default function WordTestPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const { setResults } = useQuizStore(); // 🚨 [추가] Store setter

  // 🚨 [추가] '다시 풀기' 로직
  const searchParams = useSearchParams();
  const isRetry =
    searchParams.get("retry") === "true" || searchParams.has("key");

  const [tests, setTests] = useState<OXQuiz[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedAnswer, setSelectedAnswer] = useState<boolean | null>(null);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [isProcessingResults, setIsProcessingResults] = useState(false);
  const [isAlreadyCompletedToday, setIsAlreadyCompletedToday] = useState<
    boolean | null
  >(null);

  // 🚨 [추가] 퀴즈 시도 기록
  const [quizAttempts, setQuizAttempts] = useState<QuizAttempt[]>([]);

  // --- 1. 데이터 로딩 (API 최적화) ---
  const loadTestData = useCallback(
    async (shouldSkipCheck: boolean) => {
      if (!user?.id) return;

      setIsLoading(true);
      setError(null);
      setIsAlreadyCompletedToday(null);

      try {
        if (!shouldSkipCheck) {
          const completed = await checkQuizCompletionStatus(QUIZ_ACTIVITY_TYPE);
          setIsAlreadyCompletedToday(completed);

          if (completed) {
            setIsLoading(false);
            return;
          }
        } else {
          setIsAlreadyCompletedToday(false);
        }

        // 🚨 [수정] O/X 퀴즈 세트 1회 호출
        const testResults = await getOXQuizSet();

        if (testResults && testResults.length > 0) {
          setTests(testResults);
          setCurrentIndex(0);
          setQuizAttempts([]);
        } else {
          setError("O/X 퀴즈를 생성할 수 없습니다.");
          toast.info("O/X 퀴즈를 생성할 수 없습니다.");
        }
      } catch (err: any) {
        setError(err.message || "O/X 퀴즈 로딩 중 오류 발생");
        toast.error(err.message || "O/X 퀴즈 로딩 중 오류 발생");
      } finally {
        setIsLoading(false);
      }
    },
    [user?.id]
  );

  // --- (useEffect 로직) ---
  useEffect(() => {
    const unsubAuth = useAuthStore.persist.onFinishHydration(() => {
      if (!useAuthStore.getState().user) router.push("/login");
    });
    if (useAuthStore.persist.hasHydrated() && !useAuthStore.getState().user) {
      router.push("/login");
    }

    if (user?.id) {
      // 🚨 '다시 풀기' 로직 반영
      const urlParams = new URLSearchParams(window.location.search);
      const shouldSkipCheck =
        urlParams.has("key") || urlParams.get("retry") === "true";
      loadTestData(shouldSkipCheck);
    }

    return () => unsubAuth();
  }, [router, user?.id, loadTestData]);

  // 🚨 [추가] 퀴즈 완료 및 결과 제출 핸들러
  const handleTestComplete = useCallback(
    async (finalAttempts: QuizAttempt[]) => {
      if (!user?.id) return;

      setIsProcessingResults(true);
      const correctCount = finalAttempts.filter((a) => a.is_correct).length;

      // 1. 서버 제출용 details 생성
      const submissionDetails: QuizAttemptDetailCreate[] = finalAttempts.map(
        (attempt) => ({
          question_word_id: attempt.question_word.id,
          is_correct: attempt.is_correct,
          user_answer: attempt.user_answer_ox ? "O" : "X",
          correct_answer: attempt.correct_answer_ox ? "O" : "X",
          quiz_type: "ox", // 🚨 Pydantic 리터럴 타입
        })
      );

      // 2. 최종 제출 객체 생성
      const finalResults: QuizResultsSubmission = {
        total_questions: finalAttempts.length,
        correct_count: correctCount,
        activity_type: QUIZ_ACTIVITY_TYPE,
        attempts: finalAttempts,
        details: submissionDetails,
      };

      // 3. 💾 Zustand Store에 결과 저장
      setResults(finalResults);

      try {
        // 4. 🌐 API 호출: 결과 제출
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

  // 현재 보여줄 퀴즈 문제
  const currentTest = tests[currentIndex];

  // --- 오디오 재생 핸들러 ---
  const handlePlayAudio = () => {
    if (!currentTest || isPlayingAudio) return;
    const textToSpeak = currentTest.question_word.text; // 발음은 항상 영어 단어 기준
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
          setIsPlayingAudio(false);
          toast.error(`발음 재생 오류: ${e.error}`);
        };
        window.speechSynthesis.speak(utterance);
      } else {
        setIsPlayingAudio(false);
        toast.error("음성 합성을 지원하지 않는 브라우저입니다.");
      }
    } catch (e) {
      setIsPlayingAudio(false);
      toast.error("발음 재생 중 오류가 발생했습니다.");
    }
  };

  // --- 🚨 [수정] 답변 선택 핸들러 (O 또는 X) ---
  const handleAnswer = (answer: boolean) => {
    // true: O, false: X
    if (selectedAnswer !== null || !currentTest || isProcessingResults) return;

    setSelectedAnswer(answer);
    const correct = answer === currentTest.correct_answer;
    setIsCorrect(correct);

    // 🚨 퀴즈 시도 기록 객체 생성 (전체)
    const attempt: QuizAttempt = {
      question_word: currentTest.question_word,
      is_correct: correct,
      user_answer: answer ? "O" : "X", // 텍스트
      correct_answer: currentTest.correct_answer ? "O" : "X", // 텍스트
      quiz_type: QUIZ_ACTIVITY_TYPE,
      user_answer_ox: answer, // Boolean
      correct_answer_ox: currentTest.correct_answer, // Boolean
    };

    if (correct) {
      toast.success("정답입니다! 🎉");
    } else {
      toast.error("오답입니다.");
    }

    setTimeout(() => {
      const nextIndex = currentIndex + 1;
      const updatedAttempts = [...quizAttempts, attempt];
      setQuizAttempts(updatedAttempts);

      if (nextIndex < tests.length) {
        setCurrentIndex(nextIndex);
        setSelectedAnswer(null);
        setIsCorrect(null);
      } else {
        // 🚨 [수정] 퀴즈 완료! 결과 처리 함수 호출
        handleTestComplete(updatedAttempts);
      }
    }, 1500);
  };

  // ⚠️ [제거] 퀴즈 완료 시 API 호출 useEffect (handleTestComplete로 통합)

  // --- UI 렌더링 ---
  if (isLoading && isAlreadyCompletedToday === null) {
    return (
      <div className="p-6 text-center animate-pulse text-gray-500 dark:text-gray-400">
        워드 테스트 상태 확인 중...
      </div>
    );
  }

  // 🚨 [수정] '다시 풀기' 로직 반영
  if (isAlreadyCompletedToday === true && !isRetry) {
    return (
      <div className="max-w-xl mx-auto p-6 text-center mt-8">
        <CheckSquare className="w-16 h-16 text-green-500 mx-auto mb-4" />
        <h2 className="text-2xl font-bold mb-4 text-green-600 dark:text-green-400">
          오늘의 워드 테스트 완료!
        </h2>
        <p className="text-gray-700 dark:text-gray-300 mb-6">
          이미 오늘 워드 테스트를 모두 푸셨습니다. 내일 다시 도전해주세요!
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

  if (error) return <div className="p-6 text-center text-red-500">{error}</div>;

  if (isLoading && tests.length === 0)
    return (
      <div className="p-6 text-center animate-pulse text-gray-500 dark:text-gray-400">
        워드 테스트 문제를 불러오는 중...
      </div>
    );

  if (isProcessingResults) {
    return (
      <div className="max-w-xl mx-auto p-6 text-center mt-8">
        <h2 className="text-2xl font-bold mb-4 text-violet-600 dark:text-violet-400 animate-pulse">
          결과를 기록하고 있습니다...
        </h2>
      </div>
    );
  }

  if (!currentTest)
    return (
      <div className="p-6 text-center text-red-500">
        오류: 퀴즈 문제를 찾을 수 없습니다. (데이터 부족)
      </div>
    );

  // --- O/X 퀴즈 진행 UI 렌더링 ---
  return (
    <div className="max-w-xl mx-auto mt-8 px-4 md:px-0">
      <div className="mb-4">
        <Link
          href="/dashboard"
          className="inline-flex items-center text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
        >
          <ArrowLeft size={16} className="mr-1" />
          대시보드로 돌아가기
        </Link>
      </div>

      {/* 진행 상황 표시 */}
      <div className="text-center mb-4 text-sm font-medium text-gray-500 dark:text-gray-400">
        문제 {currentIndex + 1} / {tests.length}
      </div>

      <motion.div
        key={currentTest.question_word.id}
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3 }}
        className="p-6 bg-white dark:bg-gray-800 rounded-lg shadow text-gray-900 dark:text-gray-100"
      >
        <h2 className="text-xl font-semibold mb-4 text-center text-gray-800 dark:text-gray-200">
          발음을 듣고, 제시된 내용과 일치하는지(O) / 일치하지 않는지(X)
          선택하세요.
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
          >
            <Volume2 size={24} />
          </motion.button>
        </div>

        {/* 제시된 텍스트 */}
        <div className="text-center mb-6 p-4 bg-gray-100 dark:bg-gray-700 rounded-md">
          <span className="text-xs text-gray-500 dark:text-gray-400">
            {currentTest.display_type === "text" ? "영어 단어" : "한국어 뜻"}
          </span>
          <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            {currentTest.display_text}
          </p>
        </div>

        {/* O / X 버튼 */}
        <div className="flex justify-center gap-4">
          {/* O 버튼 (true) */}
          <motion.button
            onClick={() => handleAnswer(true)}
            disabled={selectedAnswer !== null || isProcessingResults}
            className={`flex-1 p-4 rounded-lg border-2 font-bold transition-all duration-300
                    ${
                      selectedAnswer === null
                        ? "border-gray-300 dark:border-gray-600 hover:bg-green-50 dark:hover:bg-green-900 hover:border-green-400" // 기본
                        : (selectedAnswer === true && isCorrect === true) ||
                          (selectedAnswer !== true &&
                            currentTest.correct_answer === true) // 정답이 O일 때
                        ? "bg-green-100 dark:bg-green-800 border-green-500 text-green-800 dark:text-green-100" // 정답 (O)
                        : selectedAnswer === true && isCorrect === false
                        ? "bg-red-100 dark:bg-red-800 border-red-500 text-red-800 dark:text-red-100" // 선택한 오답 (O)
                        : "border-gray-300 dark:border-gray-600 opacity-50 cursor-not-allowed" // 미선택
                    }
                `}
            whileTap={selectedAnswer === null ? { scale: 0.95 } : {}}
          >
            <Check className="w-6 h-6 mx-auto" />O (일치)
          </motion.button>

          {/* X 버튼 (false) */}
          <motion.button
            onClick={() => handleAnswer(false)}
            disabled={selectedAnswer !== null || isProcessingResults}
            className={`flex-1 p-4 rounded-lg border-2 font-bold transition-all duration-300
                    ${
                      selectedAnswer === null
                        ? "border-gray-300 dark:border-gray-600 hover:bg-red-50 dark:hover:bg-red-900 hover:border-red-400" // 기본
                        : (selectedAnswer === false && isCorrect === true) ||
                          (selectedAnswer !== false &&
                            currentTest.correct_answer === false) // 정답이 X일 때
                        ? "bg-green-100 dark:bg-green-800 border-green-500 text-green-800 dark:text-green-100" // 정답 (X)
                        : selectedAnswer === false && isCorrect === false
                        ? "bg-red-100 dark:bg-red-800 border-red-500 text-red-800 dark:text-red-100" // 선택한 오답 (X)
                        : "border-gray-300 dark:border-gray-600 opacity-50 cursor-not-allowed" // 미선택
                    }
                `}
            whileTap={selectedAnswer === null ? { scale: 0.95 } : {}}
          >
            <X className="w-6 h-6 mx-auto" />X (불일치)
          </motion.button>
        </div>
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
