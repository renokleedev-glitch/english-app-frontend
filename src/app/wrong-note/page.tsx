// src/app/wrong-note/page.tsx
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/authStore";
import { getWrongQuizDetails, QuizAttemptDetail } from "@/lib/api"; // 🚨 새 API 함수 및 타입 임포트
import Link from "next/link";
import { ArrowLeft, BookOpen, Clock, Zap } from "lucide-react";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { format } from "date-fns"; // 날짜 포맷팅을 위해 date-fns 설치가 필요할 수 있습니다.

// 오답을 표시할 최대 개수
const WRONG_NOTE_LIMIT = 50;

export default function WrongNotePage() {
  const router = useRouter();
  const { user } = useAuthStore();

  const [wrongDetails, setWrongDetails] = useState<QuizAttemptDetail[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 🔐 인증 확인 및 데이터 로딩
  useEffect(() => {
    const userId = user?.id;
    // 인증 확인 (로직은 다른 페이지와 동일)
    if (!useAuthStore.persist.hasHydrated() || !userId) {
      if (useAuthStore.persist.hasHydrated()) router.replace("/login");
      return;
    }

    const fetchWrongAnswers = async () => {
      setIsLoading(true);
      setError(null);
      try {
        // 🌐 오답 상세 기록 API 호출
        const data = await getWrongQuizDetails();
        setWrongDetails(data);
      } catch (err: any) {
        console.error("오답 노트 로딩 실패:", err);
        setError("오답 기록을 불러오는 데 실패했습니다.");
        toast.error("오답 노트 로딩 실패");
      } finally {
        setIsLoading(false);
      }
    };

    fetchWrongAnswers();
  }, [user?.id, router]);

  // --- UI 렌더링 ---
  if (isLoading) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center">
        <p className="text-gray-500 dark:text-gray-400 animate-pulse">
          오답 노트를 불러오는 중...
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

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
      className="max-w-3xl mx-auto py-8 px-4"
    >
      <div className="mb-6">
        <Link
          href="/dashboard"
          className="inline-flex items-center text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
        >
          <ArrowLeft size={16} className="mr-1" />
          대시보드로 돌아가기
        </Link>
      </div>

      <h1 className="text-3xl font-semibold text-red-600 dark:text-red-400 mb-4 flex items-center">
        <BookOpen className="w-8 h-8 mr-2" /> 오답 노트
      </h1>
      <p className="text-gray-600 dark:text-gray-400 mb-8">
        최근 틀린 문제 {wrongDetails.length}개를 확인하고 다시 학습하세요.
      </p>

      {wrongDetails.length === 0 ? (
        <div className="text-center p-8 bg-white dark:bg-gray-800 rounded-lg shadow border border-green-300 dark:border-green-700">
          <Zap className="w-10 h-10 text-green-500 mx-auto mb-3" />
          <p className="text-lg font-semibold text-gray-700 dark:text-gray-300">
            🎉 멋져요! 최근 오답 기록이 없습니다.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {wrongDetails.map((detail, index) => (
            <motion.div
              key={detail.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2, delay: index * 0.05 }}
              className="p-4 bg-white dark:bg-gray-800 rounded-lg shadow-md border-l-4 border-red-500"
            >
              <div className="flex justify-between items-start mb-2">
                <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100">
                  {/* 단어 텍스트는 Word 모델에서 가져와야 하지만, 현재는 ID만 있으므로 임시로 표시 */}
                  단어 ID: {detail.question_word_id} (단어명은 백엔드 Join 필요)
                </h3>
                <span className="text-xs text-gray-500 dark:text-gray-400 flex items-center whitespace-nowrap">
                  <Clock size={14} className="mr-1" />
                  {/* 날짜 포맷팅을 위해 date-fns 설치가 필요할 수 있습니다. */}
                  {detail.attempted_at
                    ? format(new Date(detail.attempted_at), "yyyy.MM.dd HH:mm")
                    : "날짜 알 수 없음"}
                </span>
              </div>

              <div className="space-y-1 ml-2 text-sm">
                <p>
                  <span className="font-semibold text-red-600 dark:text-red-400">
                    내 답변:
                  </span>{" "}
                  {detail.user_answer}
                </p>
                <p>
                  <span className="font-semibold text-green-600 dark:text-green-400">
                    정답:
                  </span>{" "}
                  {detail.correct_answer}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-500">
                  유형:{" "}
                  {detail.quiz_type === "multiple_choice"
                    ? "객관식"
                    : "O/X 테스트"}
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* TODO: 오답만 모아 다시 풀기 기능 추가 */}
      <div className="mt-8 text-center">
        <Link
          href="/dashboard"
          className="px-6 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 transition"
        >
          대시보드로 돌아가기
        </Link>
      </div>
    </motion.div>
  );
}
