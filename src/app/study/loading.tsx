// src/app/study/loading.tsx
import React from "react";

// 🚨 이 파일은 서버 컴포넌트로 정의됩니다.
export default function Loading() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <p className="text-gray-500 dark:text-gray-400 animate-pulse">
        단어 학습 페이지를 불러오는 중...
      </p>
    </div>
  );
}
