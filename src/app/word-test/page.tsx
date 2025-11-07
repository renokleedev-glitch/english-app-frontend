// src/app/study/words/page.tsx
"use client";

import { motion } from "framer-motion";
import { useAuthStore } from "@/store/authStore";
import { useRouter } from "next/navigation";
import { useEffect, useState, useCallback } from "react";
import {
  getTodayWords,
  recordListenAction,
  markStudyCompleted,
} from "@/lib/api"; // 🚨 markStudyCompleted 임포트
import { Word } from "@/schemas";
import WordCard from "@/components/WordCard";
import { toast } from "sonner";
import Link from "next/link";
import { ArrowLeft, CheckCircle } from "lucide-react";

export default function WordStudyPage() {
  const { user } = useAuthStore();
  const router = useRouter();

  const [words, setWords] = useState<Word[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [progressMap, setProgressMap] = useState<
    Record<number, { en: number; ko: number }>
  >({});

  // 🚨 [핵심 추가] 학습 완료된 단어 ID를 추적하는 Set
  const [completedWordIds, setCompletedWordIds] = useState<Set<number>>(
    new Set()
  );
  const [isStudyMissionComplete, setIsStudyMissionComplete] = useState(false); // 최종 완료 상태

  // --- 데이터 로딩 및 완료 상태 확인 ---
  useEffect(() => {
    // 기존 로그인 확인 및 Hydration 로직 유지
    const unsub = useAuthStore.persist.onFinishHydration(() => {
      if (!useAuthStore.getState().user) router.push("/login");
    });
    if (useAuthStore.persist.hasHydrated() && !useAuthStore.getState().user) {
      router.push("/login");
    }

    // ✅ 오늘의 단어 가져오기
    const fetchWords = async () => {
      if (!useAuthStore.getState().user) return;

      setIsLoading(true);
      setError(null);
      try {
        const wordsData = await getTodayWords();
        setWords(wordsData);

        // TODO: 백엔드에서 실제 progress 가져오기 (현재는 0으로 초기화)
        const initialProgress = wordsData.reduce((acc, word) => {
          acc[word.id] = { en: 0, ko: 0 };
          return acc;
        }, {} as Record<number, { en: 0; ko: 0 }>);
        setProgressMap(initialProgress);

        // 새로운 학습 시작 시, 완료 Set 초기화
        setCompletedWordIds(new Set());
        setIsStudyMissionComplete(false);
      } catch (err: any) {
        console.error("단어 목록 로딩 실패:", err);
        setError("단어 목록을 불러오는 데 실패했습니다.");
        toast.error("단어 목록 로딩 실패");
      } finally {
        setIsLoading(false);
      }
    };

    if (useAuthStore.persist.hasHydrated() && useAuthStore.getState().user) {
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
  }, [router, user?.id]); // user?.id를 종속성에 추가하여 로그인 후 로드 보장

  // ✅ WordCard에서 학습 진행도 업데이트 시 호출될 콜백 함수 (카운터 추적용)
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

  // 🚀 [핵심 추가] 개별 단어 학습이 완전히 완료되었을 때 호출되는 콜백
  const handleWordComplete = useCallback(
    async (wordId: number) => {
      const newCompletedIds = new Set(completedWordIds).add(wordId);
      setCompletedWordIds(newCompletedIds);

      // 💡 모든 단어가 완료되었는지 검사
      const allWordsCompleted = words.every((word) =>
        newCompletedIds.has(word.id)
      );

      if (allWordsCompleted && !isStudyMissionComplete) {
        setIsStudyMissionComplete(true);
        const userId = user?.id;

        if (!userId) {
          toast.error("사용자 정보가 없어 학습 완료를 기록할 수 없습니다.");
          return;
        }

        try {
          // 🌐 API 호출: 오늘의 단어 학습 완료 기록
          await markStudyCompleted(userId);
          toast.success("🎉 오늘의 단어 학습 미션 완료! 퀴즈를 풀어보세요.");
          // UI가 자동으로 완료 메시지를 표시하고 퀴즈 풀기 버튼을 활성화합니다.
        } catch (e) {
          console.error("Failed to mark study completion:", e);
          toast.error("학습 완료 상태 기록에 실패했습니다.");
        }
      }
    },
    [completedWordIds, words, isStudyMissionComplete, user?.id]
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
  const finalMissionCompleted = isStudyMissionComplete || isNoWordsToStudy;

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

      <h1 className="text-3xl font-semibold text-blue-600 dark:text-blue-400 mb-4 text-center">
        오늘의 단어 학습 📖
      </h1>
      <p className="text-center text-gray-600 dark:text-gray-300 mb-8">
        목표: {words.length}개 단어 / 각 단어별 영어, 한국어 3번 듣기
      </p>

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
      {!finalMissionCompleted && words.length > 0 && (
        <div className="space-y-4">
          {words.map((word) => (
            <WordCard
              key={word.id}
              word={word}
              onProgressUpdate={handleProgressUpdate}
              onStudyComplete={handleWordComplete} // 🚨 단어 완료 콜백 연결
            />
          ))}
        </div>
      )}

      {/* 학습할 단어가 없는데 완료 메시지가 표시되지 않은 경우 */}
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
