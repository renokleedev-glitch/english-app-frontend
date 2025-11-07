// src/app/study/words/page.tsx
"use client";

import { motion } from "framer-motion";
import { useAuthStore } from "@/store/authStore";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, useCallback } from "react";
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

  // 🚨 [핵심] URL에서 'review=true'를 읽습니다.
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

  // 🚨 [핵심 로직] isReviewMode 플래그를 API에 전달
  const fetchWords = useCallback(async () => {
    if (!user?.id) return;

    setIsLoading(true);
    setError(null);
    try {
      // 🚨 [핵심 수정] API 호출 시 isReviewMode 전달
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

  // 🔐 데이터 로딩 및 인증 확인
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

  // ✅ WordCard에서 학습 진행도 업데이트 시 호출될 콜백 함수
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

  // 🚀 개별 단어 학습이 완전히 완료되었을 때 호출되는 콜백
  const handleWordComplete = useCallback(
    async (wordId: number) => {
      const userId = user?.id;

      setCompletedWordIds((prevIds) => {
        if (prevIds.has(wordId)) {
          return prevIds;
        }

        const newCompletedIds = new Set(prevIds).add(wordId);

        // 복습 모드가 아닐 때만 미션 완료 API 호출을 시도합니다.
        if (!isReviewMode) {
          const allWordsCompleted =
            words.length > 0 &&
            words.every((word) => newCompletedIds.has(word.id));

          if (allWordsCompleted && !isStudyMissionComplete) {
            setIsStudyMissionComplete(true);
            if (!userId) {
              toast.error("사용자 정보가 없어 학습 완료를 기록할 수 없습니다.");
              return newCompletedIds;
            }
            try {
              markStudyCompleted(userId); // 🚨 API 호출
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
    [words.length, isStudyMissionComplete, user?.id, isReviewMode]
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
  // 복습 모드가 아니면서 단어가 없으면 미션 완료로 간주합니다.
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

      {/* 🆕 [핵심 수정] 제목과 목표 설명을 독립된 카드로 감싸기 */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        // ✅ 카드 스타일 적용 (다른 WordCard와 일관성 유지)
        className="p-6 mb-8 bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700 text-center"
      >
        <h1 className="text-3xl font-semibold text-blue-600 dark:text-blue-400 mb-2">
          {isReviewMode ? "단어 복습하기" : "오늘의 단어 학습"} 📖
        </h1>
        {/* 🚨 텍스트 색상을 카드의 배경색(dark:bg-gray-800)에 맞춰 dark:text-gray-100으로 설정 */}
        <p className="text-center text-gray-600 dark:text-gray-100">
          목표: {words.length}개 단어 / 각 단어별 영어, 한국어 3번 듣기
        </p>
      </motion.div>
      {/* ----------------------------------------------------------------- */}

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
