// src/app/study/layout.tsx
"use client";

import { Suspense } from "react";
import { Loader2 } from "lucide-react"; // 로딩 아이콘 (선택 사항)

// 간단한 로딩 UI
function LoadingFallback() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <Loader2 className="w-8 h-8 animate-spin text-violet-500" />
      <p className="ml-3 text-gray-600 dark:text-gray-300">
        학습 페이지 로딩 중...
      </p>
    </div>
  );
}

export default function StudyLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    // 🚨 [핵심] Suspense로 children을 감싸고 fallback을 제공
    <Suspense fallback={<LoadingFallback />}>{children}</Suspense>
  );
}
