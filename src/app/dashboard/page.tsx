"use client";

import { motion } from "framer-motion";
import { useAuthStore } from "@/store/authStore";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
// ✅ [수정] getTodayWords 대신 getTodayActivityStatus 임포트
import { getTodayActivityStatus } from "@/lib/api";
// ✅ [수정] Word 타입 대신 TodayActivityStatus 타입 임포트
import { TodayActivityStatus } from "@/schemas";
import Link from "next/link"; // 페이지 이동을 위한 Link 컴포넌트
import { BookOpen, HelpCircle, CheckCircle } from "lucide-react"; // 아이콘 추가

export default function DashboardPage() {
  const { user } = useAuthStore();
  const router = useRouter();

  // ✅ [수정] words 상태 대신 activityStatus 상태 추가
  const [activityStatus, setActivityStatus] =
    useState<TodayActivityStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 🔐 로그인 상태 확인 및 리디렉션
  useEffect(() => {
    // ... (이전과 동일한 로그인 확인 로직)
    const unsub = useAuthStore.persist.onFinishHydration(() => {
      if (!useAuthStore.getState().user) router.push("/login");
    });
    if (useAuthStore.persist.hasHydrated() && !useAuthStore.getState().user) {
      router.push("/login");
    }

    // ✅ [수정] 오늘의 활동 상태 가져오기
    const fetchStatus = async () => {
      if (!useAuthStore.getState().user) return; // 사용자가 없으면 중단

      setIsLoading(true);
      setError(null);
      try {
        const statusData = await getTodayActivityStatus();
        setActivityStatus(statusData);
      } catch (err: any) {
        console.error("활동 상태 로딩 실패:", err);
        setError("오늘의 학습 상태를 불러오는 데 실패했습니다.");
      } finally {
        setIsLoading(false);
      }
    };

    // 사용자 확인 후 상태 가져오기
    if (useAuthStore.persist.hasHydrated() && useAuthStore.getState().user) {
      fetchStatus();
    } else {
      const unsubHydration = useAuthStore.persist.onFinishHydration(() => {
        if (useAuthStore.getState().user) fetchStatus();
        // 사용자가 여전히 없으면 로그인 페이지로 리디렉션
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
  }, [router]); // user 상태 변경 시 재호출 불필요 (최초 로드 시 한 번)

  // --- UI 렌더링 ---
  if (isLoading) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center">
        <p className="text-gray-500 dark:text-gray-400 animate-pulse">
          오늘의 학습 상태를 불러오는 중...
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

  // 로그인되지 않았거나 상태 로드 실패 시 (이론상 도달하기 어려움)
  if (!user || activityStatus === null) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center">
        <p className="text-gray-500 dark:text-gray-400">
          사용자 정보를 불러올 수 없습니다.
        </p>
      </div>
    );
  }

  // ✅ [수정] 대시보드 요약 UI
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
      className="max-w-3xl mx-auto py-8 px-4 md:px-0" // 패딩 조정
    >
      <h1 className="text-3xl font-semibold text-gray-800 dark:text-gray-100 mb-2">
        안녕하세요, {user?.email}님! 👋
      </h1>
      <p className="text-gray-600 dark:text-gray-400 mb-8">
        오늘의 학습 목표를 확인하고 시작해보세요.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* 오늘의 단어 학습 카드 */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.1 }}
          className="p-6 bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700 flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center mb-3">
              <BookOpen className="w-6 h-6 text-blue-500 mr-2" />
              <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-100">
                오늘의 단어 학습
              </h2>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              매일 꾸준히 단어를 학습하여 어휘력을 향상시키세요. 목표:{" "}
              {user?.daily_word_goal || 10}개
            </p>
          </div>
          {/* ⚠️ 'word_study' 완료 상태는 아직 기록 로직이 없으므로 항상 미완료로 보일 수 있습니다. */}
          {activityStatus.word_study ? (
            <div className="flex items-center text-green-600 dark:text-green-400 font-medium mt-4">
              <CheckCircle className="w-5 h-5 mr-1" />
              <span>오늘 학습 완료!</span>
            </div>
          ) : (
            <Link
              href="/study/words" // ✅ 단어 학습 페이지 경로 (새로 만들어야 함)
              className="mt-4 inline-block px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 transition self-start" // self-start 추가
            >
              학습 시작하기 →
            </Link>
          )}
        </motion.div>

        {/* 단어 퀴즈 카드 */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.2 }}
          className="p-6 bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700 flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center mb-3">
              <HelpCircle className="w-6 h-6 text-violet-500 mr-2" />
              <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-100">
                단어 퀴즈
              </h2>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              학습한 단어를 퀴즈를 통해 복습하고 실력을 점검해보세요.
            </p>
          </div>
          {activityStatus.word_quiz ? (
            <div className="flex items-center text-green-600 dark:text-green-400 font-medium mt-4">
              <CheckCircle className="w-5 h-5 mr-1" />
              <span>오늘 퀴즈 완료!</span>
            </div>
          ) : (
            <Link
              href="/quiz" // ✅ 기존 퀴즈 페이지 경로
              className="mt-4 inline-block px-4 py-2 text-sm font-medium text-white bg-violet-600 rounded-md hover:bg-violet-700 transition self-start"
            >
              퀴즈 풀기 →
            </Link>
          )}
        </motion.div>

        {/* TODO: 나중에 내신 문제 카드 등 추가 */}
      </div>
    </motion.div>
  );
}
