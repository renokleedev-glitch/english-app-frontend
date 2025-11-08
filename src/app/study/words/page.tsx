// src/app/study/words/page.tsx
"use client";

import { motion } from "framer-motion";
import { useAuthStore } from "@/store/authStore";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, useCallback } from "react";
// 🚨 [수정] markStudyCompleted 임포트 (인수 없음)
import { getTodayWords, markStudyCompleted } from "@/lib/api";
import { Word } from "@/schemas";
import WordCard from "@/components/WordCard";
import { toast } from "sonner";
import Link from "next/link";
import { ArrowLeft, CheckCircle } from "lucide-react";

export default function WordStudyPage() {
  const { user } = useAuthStore();
  const router = useRouter();
  const searchParams = useSearchParams();

  const isReviewMode = searchParams.get("review") === "true";

  const [words, setWords] = useState<Word[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [progressMap, setProgressMap] = useState<
    Record<number, { en: number; ko: number }>
  >({});

  const [completedWordIds, setCompletedWordIds] = useState<Set<number>>(
    new Set()
  );
  const [isStudyMissionComplete, setIsStudyMissionComplete] = useState(false);

  const fetchWords = useCallback(async () => {
    if (!user?.id) return;

    setIsLoading(true);
    setError(null);
    try {
      const wordsData = await getTodayWords(isReviewMode);
      setWords(wordsData);

      const initialProgress = wordsData.reduce((acc, word) => {
        acc[word.id] = { en: 0, ko: 0 };
        return acc;
      }, {} as Record<number, { en: number; ko: number }>);

      setProgressMap(initialProgress);
      setCompletedWordIds(new Set());
      setIsStudyMissionComplete(false);
    } catch (err: any) {
      console.error("단어 목록 로딩 실패:", err);
      setError("단어 목록을 불러오는 데 실패했습니다.");
      toast.error("단어 목록 로딩 실패");
    } finally {
      setIsLoading(false);
    }
  }, [user?.id, isReviewMode]);

  useEffect(() => {
    const unsub = useAuthStore.persist.onFinishHydration(() => {
      if (!useAuthStore.getState().user) router.push("/login");
    });
    if (useAuthStore.persist.hasHydrated() && !useAuthStore.getState().user) {
      router.push("/login");
    }

    if (user?.id) {
      fetchWords();
    } else {
      const unsubHydration = useAuthStore.persist.onFinishHydration(() => {
        if (useAuthStore.getState().user) fetchWords();
        else if (
          !useAuthStore.getState().user &&
          useAuthStore.persist.hasHydrated()
        ) {
          router.push("/login");
        }
      });
      return () => {
        unsub();
        unsubHydration();
      };
    }
    return () => unsub();
  }, [router, user?.id, fetchWords]);

  const handleProgressUpdate = (
    wordId: number,
    lang: "en" | "ko",
    count: number
  ) => {
    setProgressMap((prev) => ({
      ...prev,
      [wordId]: {
        ...prev[wordId],
        [lang]: count,
      },
    }));
  };

  const handleWordComplete = useCallback(
    async (wordId: number) => {
      // 🚨 [핵심 수정] userId 변수가 더 이상 필요하지 않습니다.
      // const userId = user?.id;

      setCompletedWordIds((prevIds) => {
        if (prevIds.has(wordId)) {
          return prevIds;
        }

        const newCompletedIds = new Set(prevIds).add(wordId);

        if (!isReviewMode) {
          const allWordsCompleted =
            words.length > 0 &&
            words.every((word) => newCompletedIds.has(word.id));

          if (allWordsCompleted && !isStudyMissionComplete) {
            setIsStudyMissionComplete(true);

            // 🚨 [핵심 수정] user?.id 확인 로직 제거 (API가 토큰으로 확인)
            try {
              markStudyCompleted(); // 🚨 userId 인수 없이 호출
              toast.success(
                "🎉 오늘의 단어 학습 미션 완료! 퀴즈를 풀어보세요."
              );
            } catch (e) {
              console.error("Failed to mark study completion:", e);
              toast.error("학습 완료 상태 기록에 실패했습니다.");
            }
          }
        }
        return newCompletedIds;
      });
    },
    [words.length, isStudyMissionComplete, user?.id, isReviewMode] // 🚨 [수정] words -> words.length
  );

  // --- UI 렌더링 ---
  if (isLoading) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center">
        <p className="text-gray-500 dark:text-gray-400 animate-pulse">
          오늘의 학습 단어를 불러오는 중...
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center">
        <p className="text-red-500">{error}</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center">
        <p className="text-gray-500 dark:text-gray-400">
          사용자 정보를 불러올 수 없습니다.
        </p>
      </div>
    );
  }

  const isNoWordsToStudy = !isLoading && words.length === 0;
  const finalMissionCompleted =
    isStudyMissionComplete || (isNoWordsToStudy && !isReviewMode);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
      className="max-w-2xl mx-auto py-8"
    >
      {/* 대시보드로 돌아가기 링크 */}
      <div className="mb-6">
        <Link
          href="/dashboard"
          className="inline-flex items-center text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
        >
          <ArrowLeft size={16} className="mr-1" />
          대시보드로 돌아가기
        </Link>
      </div>

      {/* 🆕 제목/목표 설명 카드 */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="p-6 mb-8 bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700 text-center"
      >
        <h1 className="text-3xl font-semibold text-blue-600 dark:text-blue-400 mb-2">
          {isReviewMode ? "단어 복습하기" : "오늘의 단어 학습"} 📖
        </h1>
        <p className="text-center text-gray-600 dark:text-gray-100">
          목표: {words.length}개 단어 / 각 단어별 영어, 한국어 3번 듣기
        </p>
      </motion.div>

      {/* 학습 완료 메시지 및 다음 단계 버튼 */}
      {finalMissionCompleted && (
        <div className="text-center p-6 bg-green-100 dark:bg-green-900 border-l-4 border-green-500 rounded-lg shadow mb-8">
          <CheckCircle className="w-8 h-8 text-green-600 mx-auto mb-3" />
          <p className="text-lg font-semibold text-green-700 dark:text-green-300 mb-3">
            {isNoWordsToStudy ? "학습할 단어가 없습니다!" : "오늘의 학습 완료!"}
          </p>
          <Link
            href="/quiz"
            className="inline-block px-6 py-2 text-white bg-violet-600 rounded-md hover:bg-violet-700 transition"
          >
            퀴즈 풀러 가기 →
          </Link>
        </div>
      )}

      {/* 단어 목록 렌더링 */}
      {words.length > 0 && (!finalMissionCompleted || isReviewMode) && (
        <div className="space-y-4">
          {words.map((word) => (
            <WordCard
              key={word.id}
              word={word}
              onProgressUpdate={handleProgressUpdate}
              onStudyComplete={handleWordComplete}
            />
          ))}
        </div>
      )}

      {/* 학습할 단어가 없는데 미션 완료 상태가 아닌 경우 */}
      {words.length === 0 && !isLoading && !finalMissionCompleted && (
        <div className="text-center p-6 bg-white dark:bg-gray-800 rounded-lg shadow">
          <p className="text-red-600 dark:text-red-400 font-semibold mb-4">
            단어 목록을 불러올 수 없거나, 오늘 학습할 단어가 없습니다.
          </p>
          <Link href="/dashboard" className="text-blue-600 hover:underline">
            대시보드로 돌아가기
          </Link>
        </div>
      )}
    </motion.div>
  );
}
