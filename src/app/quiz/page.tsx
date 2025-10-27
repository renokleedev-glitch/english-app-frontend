"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Volume2, XCircle, CheckSquare, Link, ArrowLeft } from "lucide-react";
import { useAuthStore } from "@/store/authStore";
import {
  getMultipleChoiceQuiz,
  markQuizCompleted,
  checkQuizCompletionStatus,
} from "@/lib/api";
import { MultipleChoiceQuiz, QuizOption } from "@/schemas";
import { toast } from "sonner";

const QUIZ_LENGTH = 10;

export default function QuizPage() {
  const router = useRouter();
  const { user } = useAuthStore();

  const [quizzes, setQuizzes] = useState<MultipleChoiceQuiz[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedOptionId, setSelectedOptionId] = useState<number | null>(null);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [quizCompleted, setQuizCompleted] = useState(false);
  const [isAlreadyCompletedToday, setIsAlreadyCompletedToday] = useState<
    boolean | null
  >(null);

  // --- 데이터 로딩 및 완료 상태 확인 ---
  useEffect(() => {
    // 로그인 상태 확인
    const unsubAuth = useAuthStore.persist.onFinishHydration(() => {
      // Hydration 완료 후 사용자 없으면 로그인 페이지로
      if (!useAuthStore.getState().user) {
        console.log("QuizPage: Not logged in after hydration, redirecting...");
        router.push("/login");
      }
    });
    // Hydration 전에 이미 사용자 없으면 로그인 페이지로
    if (useAuthStore.persist.hasHydrated() && !useAuthStore.getState().user) {
      console.log("QuizPage: Not logged in initially, redirecting...");
      router.push("/login");
    }

    const loadQuizData = async () => {
      // ✅ 사용자 정보가 로드된 후에만 진행 (로그인 확인 강화)
      if (!useAuthStore.getState().user) {
        console.log("QuizPage: User not available, skipping quiz load.");
        setIsLoading(false); // 로딩 종료
        return;
      }

      setIsLoading(true);
      setError(null);
      setIsAlreadyCompletedToday(null);

      try {
        const completed = await checkQuizCompletionStatus("word_quiz");
        setIsAlreadyCompletedToday(completed);

        if (completed) {
          console.log("오늘 단어 퀴즈를 이미 완료했습니다.");
          setIsLoading(false);
          return;
        }

        // ⚠️ TODO: 백엔드 API 수정 필요 (QUIZ_LENGTH 만큼 문제 반환하도록)
        const quizPromises = Array(QUIZ_LENGTH)
          .fill(0)
          .map(() => getMultipleChoiceQuiz());
        const quizResults = await Promise.all(quizPromises);
        const validQuizzes = quizResults.filter(
          (q) => q !== null
        ) as MultipleChoiceQuiz[];

        if (validQuizzes.length > 0) {
          setQuizzes(validQuizzes);
          setCurrentQuestionIndex(0);
          setQuizCompleted(false);
        } else {
          // 퀴즈 문제 자체를 못 받아온 경우 (출제할 단어 부족 등)
          setError(
            "퀴즈를 생성할 수 없습니다. 학습할 단어가 부족하거나 모두 마스터했습니다."
          );
          toast.info("퀴즈를 생성할 수 없습니다."); // 사용자에게도 알림
        }
      } catch (err: any) {
        setError(err.message || "퀴즈 로딩 중 오류 발생");
        toast.error(err.message || "퀴즈 로딩 중 오류 발생");
      } finally {
        setIsLoading(false);
      }
    };

    // 사용자 확인 후 퀴즈 로드 시작
    if (useAuthStore.persist.hasHydrated() && useAuthStore.getState().user) {
      loadQuizData();
    } else {
      const unsubHydration = useAuthStore.persist.onFinishHydration(() => {
        if (useAuthStore.getState().user) loadQuizData();
        // 사용자가 여전히 없으면 로그인 페이지로 리디렉션 (이중 확인)
        else if (
          !useAuthStore.getState().user &&
          useAuthStore.persist.hasHydrated()
        ) {
          router.push("/login");
        }
      });
      return () => {
        unsubAuth();
        unsubHydration();
      };
    }
    return () => unsubAuth();
  }, [router]); // 최초 로드 시 한 번 실행

  // --- 핸들러 함수들 (handlePlayAudio, handleOptionSelect) ---
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
        // 목소리 설정 (선택 사항)
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
    if (selectedOptionId !== null || !currentQuiz) return;

    setSelectedOptionId(optionId);
    const correct = optionId === currentQuiz.correct_option_id;
    setIsCorrect(correct);

    if (correct) {
      toast.success("정답입니다! 🎉");
      // TODO: 정답 처리 로직 (예: 점수 기록)
    } else {
      toast.error("오답입니다.");
      // TODO: 오답 처리 로직 (예: 오답 노트 추가)
    }

    // 잠시 후 다음 문제로 이동 또는 완료 처리
    setTimeout(() => {
      const nextIndex = currentQuestionIndex + 1;
      if (nextIndex < quizzes.length) {
        setCurrentQuestionIndex(nextIndex);
        setSelectedOptionId(null);
        setIsCorrect(null);
      } else {
        setQuizCompleted(true); // 퀴즈 완료 상태 변경
        toast.info("✨ 모든 퀴즈를 완료했습니다!");
      }
    }, 1500);
  };

  // --- 퀴즈 완료 시 API 호출 ---
  useEffect(() => {
    if (quizCompleted) {
      markQuizCompleted("word_quiz") // activity_type 지정
        .then((activityLog) => {
          console.log("Quiz completion marked successfully:", activityLog);
        })
        .catch((err) => {
          console.error("Failed to mark quiz completion:", err);
          toast.error("퀴즈 완료 상태를 기록하는 데 실패했습니다.");
        });
    }
  }, [quizCompleted]);

  // --- UI 렌더링 ---
  if (isLoading && isAlreadyCompletedToday === null) {
    return (
      <div className="p-6 text-center animate-pulse text-gray-500 dark:text-gray-400">
        퀴즈 상태 확인 중...
      </div>
    );
  }

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

  if (quizCompleted) {
    return (
      <div className="max-w-xl mx-auto p-6 text-center mt-8">
        <h2 className="text-2xl font-bold mb-4 text-green-600 dark:text-green-400">
          퀴즈 완료!
        </h2>
        <p className="text-gray-700 dark:text-gray-300 mb-6">
          수고하셨습니다. 모든 문제를 다 풀었습니다.
        </p>
        <button
          onClick={() => router.push("/dashboard")}
          className="px-4 py-2 bg-violet-600 text-white rounded hover:bg-violet-700 transition" // 스타일 명시
        >
          대시보드로 돌아가기
        </button>
      </div>
    );
  }

  if (!currentQuiz && !isLoading)
    return (
      <div className="p-6 text-center text-gray-500 dark:text-gray-400">
        퀴즈를 표시할 수 없습니다. (생성 실패 또는 데이터 없음)
      </div>
    );

  if (!currentQuiz)
    return (
      <div className="p-6 text-center text-red-500">
        오류: 현재 퀴즈 문제를 찾을 수 없습니다.
      </div>
    );

  // --- 퀴즈 진행 UI 렌더링 ---
  return (
    <div className="max-w-xl mx-auto mt-8">
      {/* 진행 상황 표시 */}
      {/* ✅ 대시보드로 돌아가기 링크 추가 */}
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
        exit={{ opacity: 0, scale: 0.95 }} // AnimatePresence와 함께 사용 시 유효
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
              disabled={selectedOptionId !== null}
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
