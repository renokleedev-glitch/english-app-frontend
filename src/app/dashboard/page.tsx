// src/app/dashboard/page.tsx
"use client";

import { motion } from "framer-motion";
import { useAuthStore } from "@/store/authStore";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { getTodayActivityStatus, resetQuizCompletion } from "@/lib/api";
import { TodayActivityStatus } from "@/schemas";
import Link from "next/link";
import { BookOpen, HelpCircle, CheckCircle, Lock } from "lucide-react";
import { toast } from "sonner";

export default function DashboardPage() {
  const { user } = useAuthStore();
  const router = useRouter();

  const [activityStatus, setActivityStatus] =
    useState<TodayActivityStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 🔐 로그인 상태 확인 및 오늘의 활동 상태 가져오기
  useEffect(() => {
    const unsub = useAuthStore.persist.onFinishHydration(() => {
      if (!useAuthStore.getState().user) router.push("/login");
    });
    if (useAuthStore.persist.hasHydrated() && !useAuthStore.getState().user) {
      router.push("/login");
    }

    const fetchStatus = async () => {
      if (!useAuthStore.getState().user) return;

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

    if (useAuthStore.persist.hasHydrated() && useAuthStore.getState().user) {
      fetchStatus();
    } else {
      const unsubHydration = useAuthStore.persist.onFinishHydration(() => {
        if (useAuthStore.getState().user) fetchStatus();
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

  // 🚀 [핵심 추가] 퀴즈 완료 기록 삭제 및 재시작 함수
  const handleResetAndRetry = async (activityType: string) => {
    if (!user?.id) {
      toast.error("사용자 정보가 없어 다시 풀기를 실행할 수 없습니다.");
      return;
    }

    if (!confirm("오늘 퀴즈 완료 기록을 삭제하고 다시 푸시겠습니까?")) {
      return; // 사용자가 취소함
    }

    toast.loading("완료 상태를 초기화 중...");

    try {
      // 1. 서버의 DailyActivityLog 기록 삭제
      await resetQuizCompletion(activityType);

      toast.dismiss();
      toast.success("초기화 완료! 퀴즈 페이지로 이동합니다.");

      // 2. 대시보드 상태 즉시 갱신
      setActivityStatus((prev) => ({ ...prev!, word_quiz: false }));

      // 3. 퀴즈 페이지로 이동
      router.push("/quiz");
    } catch (e) {
      toast.dismiss();
      toast.error("초기화 실패. 잠시 후 다시 시도해주세요.");
    }
  };

  // --- UI 렌더링 ---
  if (isLoading || activityStatus === null || !user) {
    if (error)
      return (
        <div className="min-h-[80vh] flex items-center justify-center">
          <p className="text-red-500">{error}</p>
        </div>
      );
    if (!user) return null; // 로그인 리디렉션 처리 중
    return (
      <div className="min-h-[80vh] flex items-center justify-center">
        <p className="text-gray-500 dark:text-gray-400 animate-pulse">
          오늘의 학습 상태를 불러오는 중...
        </p>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
      // 🚨 [핵심] 페이지 전체 컨테이너는 배경을 투명하게 하여 body의 색상을 상속받습니다.
      className="max-w-3xl mx-auto py-8 px-4 md:px-0 min-h-screen bg-transparent dark:bg-transparent"
    >
      {/* 🆕 [핵심 수정] 인사말 섹션을 명시적인 배경색을 가진 div로 감싸기 */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        // ✅ 배경색과 텍스트 색상 명시하여 대비 확보
        className="p-6 mb-8 bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700"
      >
        <h1 className="text-3xl font-semibold text-gray-800 dark:text-gray-100 mb-2">
          안녕하세요, {user?.email}님! 👋
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          오늘의 학습 목표를 확인하고 시작해보세요.
        </p>
      </motion.div>
      {/* ----------------------------------------------------------------- */}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* 미션 1: 오늘의 단어 학습 카드 */}
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
            {/* 🚨 텍스트 명시성 확보를 위해 dark:text-gray-400 -> dark:text-gray-100 수정 */}
            <p className="text-sm text-gray-600 dark:text-gray-100 mb-4">
              매일 꾸준히 단어를 학습하여 어휘력을 향상시키세요. 목표:{" "}
              <span className="font-medium">
                {user?.daily_word_goal || 10}개
              </span>
            </p>
          </div>

          {/* 학습 미션 버튼 로직 */}
          {activityStatus.word_study ? (
            <div className="flex flex-col mt-4">
              <div className="flex items-center text-green-600 dark:text-green-400 font-medium mb-3">
                <CheckCircle className="w-5 h-5 mr-1" />
                <span>오늘 학습 완료!</span>
              </div>
              <Link
                href="/study/words?review=true"
                className="inline-block px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 transition self-start"
              >
                복습하기 →
              </Link>
            </div>
          ) : (
            <Link
              href="/study/words"
              className="mt-4 inline-block px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 transition self-start"
            >
              학습 시작하기 →
            </Link>
          )}
        </motion.div>

        {/* 미션 2: 단어 퀴즈 카드 */}
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
            {/* 🚨 텍스트 명시성 확보를 위해 dark:text-gray-400 -> dark:text-gray-100 수정 */}
            <p className="text-sm text-gray-600 dark:text-gray-100 mb-4">
              학습한 단어를 퀴즈를 통해 복습하고 실력을 점검해보세요.
            </p>
          </div>

          {/* 🔑 퀴즈 잠금/해제 로직 적용 */}
          {activityStatus.word_quiz ? (
            // 상태 3: 퀴즈 완료 (다시 풀기 버튼에 연결)
            <div className="flex flex-col mt-4 self-start w-full">
              <div className="flex items-center text-green-600 dark:text-green-400 font-medium mb-3">
                <CheckCircle className="w-5 h-5 mr-1" />
                <span>오늘 퀴즈 완료!</span>
              </div>
              <div className="flex space-x-2">
                <Link
                  href="/wrong-note"
                  className="px-3 py-2 text-sm font-medium text-white bg-red-500 rounded-md hover:bg-red-600 transition"
                >
                  오답 노트 →
                </Link>
                <button
                  onClick={() => handleResetAndRetry("word_quiz")}
                  className="px-3 py-2 text-sm font-medium text-white bg-violet-600 rounded-md hover:bg-violet-700 transition"
                >
                  다시 풀기
                </button>
              </div>
            </div>
          ) : activityStatus.word_study ? (
            // 상태 2: 학습 완료, 퀴즈 해제 (Link 유지)
            <Link
              href="/quiz"
              className="mt-4 inline-block px-4 py-2 text-sm font-medium text-white bg-violet-600 rounded-md hover:bg-violet-700 transition self-start"
            >
              퀴즈 풀기 →
            </Link>
          ) : (
            // 상태 1: 학습 미완료, 퀴즈 잠금 (유지)
            <div className="mt-4 flex flex-col self-start">
              <button
                disabled
                className="px-4 py-2 text-sm font-medium text-white bg-gray-400 dark:bg-gray-600 rounded-md cursor-not-allowed self-start"
              >
                <Lock className="w-4 h-4 mr-1 inline-block" /> 퀴즈 풀기 (잠김)
              </button>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 flex items-center">
                오늘의 단어 학습을 먼저 완료해주세요.
              </p>
            </div>
          )}
        </motion.div>

        {/* TODO: 나중에 내신 문제 카드 등 추가 */}
      </div>
    </motion.div>
  );
}
