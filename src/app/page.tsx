import Link from "next/link"; // 페이지 간 이동을 위한 Link 컴포넌트

export default function HomePage() {
  return (
    <main className="flex flex-col items-center justify-center min-h-screen bg-gray-50">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">
          중학생 영어 학습 앱에 오신 것을 환영합니다!
        </h1>
        <p className="text-lg text-gray-600 mb-8">
          로그인하고 학습을 시작해보세요.
        </p>
        <Link
          href="/login"
          className="px-6 py-3 font-semibold text-white bg-indigo-600 rounded-md shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
        >
          로그인 페이지로 이동
        </Link>
      </div>
    </main>
  );
}
