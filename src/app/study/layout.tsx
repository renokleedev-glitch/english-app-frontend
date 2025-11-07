// src/app/study/layout.tsx (Suspense 수정)
"use client";

import { Suspense } from "react";
// import Loading from './loading'; 👈 이 임포트는 이제 불필요할 수 있습니다.

export default function StudyLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    // 🚨 fallback에 Loading 컴포넌트나 간단한 div를 넣습니다.
    <Suspense
      fallback={<div className="p-4 text-center">페이지 로딩 중...</div>}
    >
      {children}
    </Suspense>
  );
}
