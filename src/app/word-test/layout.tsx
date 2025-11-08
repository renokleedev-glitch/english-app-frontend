// src/app/word-test/layout.tsx
"use client";

import { Suspense } from "react";

// 간단한 로딩 UI
function LoadingFallback() {
  return (
    <div className="p-6 text-center animate-pulse text-gray-500 dark:text-gray-400">
      O/X 퀴즈 로딩 중...
    </div>
  );
}

export default function WordTestLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <Suspense fallback={<LoadingFallback />}>{children}</Suspense>;
}
