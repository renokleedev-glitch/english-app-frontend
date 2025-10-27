"use client";

import { motion } from "framer-motion";
import { useAuthStore } from "@/store/authStore";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { getTodayWords, recordListenAction } from "@/lib/api";
import { Word } from "@/schemas";
import WordCard from "@/components/WordCard";
import { toast } from "sonner"; // 알림
import Link from "next/link"; // ✅ Link 컴포넌트 임포트
import { ArrowLeft } from "lucide-react"; // ✅ 아이콘 임포트

export default function WordStudyPage() {
  const { user } = useAuthStore();
  const router = useRouter();

  const [words, setWords] = useState<Word[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [progressMap, setProgressMap] = useState<
    Record<number, { en: number; ko: number }>
  >({});

  // 🔐 로그인 상태 확인 및 리디렉션
  useEffect(() => {
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
        const initialProgress = wordsData.reduce((acc, word) => {
          // TODO: 백엔드에서 실제 progress 가져오기
          acc[word.id] = { en: 0, ko: 0 };
          return acc;
        }, {} as Record<number, { en: number; ko: number }>);
        setProgressMap(initialProgress);
      } catch (err: any) {
        console.error("단어 목록 로딩 실패:", err);
        setError("단어 목록을 불러오는 데 실패했습니다.");
        toast.error("단어 목록 로딩 실패");
      } finally {
        setIsLoading(false);
      }
    };

    // 사용자 확인 후 단어 가져오기
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
  }, [router]);

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
    // TODO: 모든 단어 학습 완료 시 'word_study' 완료 API 호출 로직 추가
  };

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

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
      className="max-w-2xl mx-auto py-8"
    >
      {/* ✅ 대시보드로 돌아가기 링크 추가 */}
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

      {words.length === 0 ? (
        <div className="text-center p-6 bg-white dark:bg-gray-800 rounded-lg shadow">
          <p className="text-green-600 dark:text-green-400 font-semibold mb-4">
            🎉 학습할 단어가 없거나 이미 목표를 완료했습니다!
          </p>
          <Link href="/dashboard" className="text-blue-600 hover:underline">
            대시보드로 돌아가기
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {words.map((word) => (
            <WordCard
              key={word.id}
              word={word}
              // ✅ initialProgress 전달 수정 (WordCard 내부에서 처리하도록 변경 가능)
              // initialProgress={progressMap[word.id]}
              onProgressUpdate={handleProgressUpdate}
            />
          ))}
          {/* TODO: 모든 학습 완료 시 완료 버튼 또는 메시지 표시 */}
        </div>
      )}
    </motion.div>
  );
}
