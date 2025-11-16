// src/app/admin/users/page.tsx
"use client";

import { useState, useEffect, ChangeEvent } from "react";
import { User, Role } from "@/schemas"; // Role Enum 임포트
import { adminGetUsers, adminUpdateUserGoals } from "@/lib/api";
import { toast } from "sonner";
import {
  Loader2,
  AlertCircle,
  Save,
  UserCheck,
  Search,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

// 페이지 당 표시할 항목 수
const PAGE_LIMIT = 10;

/**
 * 개별 학생 행(Row) 컴포넌트
 * (역할 관리 기능 제거됨)
 */
function UserRow({ user }: { user: User }) {
  const [wordGoal, setWordGoal] = useState(user.daily_word_goal || 0);
  const [examGoal, setExamGoal] = useState(user.daily_exam_goal || 0);
  const [isSaving, setIsSaving] = useState(false);

  const handleSaveGoals = async () => {
    setIsSaving(true);
    toast.loading("목표량을 저장 중입니다...");
    try {
      await adminUpdateUserGoals(user.id, {
        daily_word_goal: wordGoal,
        daily_exam_goal: examGoal,
      });
      toast.dismiss();
      toast.success(`${user.email}의 목표량을 저장했습니다.`);
    } catch (e: any) {
      toast.dismiss();
      toast.error(`저장 실패: ${e.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <tr className="bg-white dark:bg-gray-800 border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700">
      <td className="px-4 py-3 font-medium text-gray-900 dark:text-white whitespace-nowrap">
        {user.email}
      </td>
      <td className="px-4 py-3">
        {/* 일일 단어 수 */}
        <input
          type="number"
          value={wordGoal}
          onChange={(e) => setWordGoal(Number(e.target.value))}
          disabled={isSaving}
          className="w-12 p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600"
        />
      </td>
      <td className="px-4 py-3">
        {/* 일일 내신 문제 수 */}
        <input
          type="number"
          value={examGoal}
          onChange={(e) => setExamGoal(Number(e.target.value))}
          disabled={isSaving}
          className="w-12 p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600"
        />
      </td>
      <td className="px-4 py-3">
        <button
          onClick={handleSaveGoals}
          disabled={isSaving}
          className="px-3 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          <Save size={16} />
        </button>
      </td>
    </tr>
  );
}

/**
 * 학생 관리 메인 페이지
 */
export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 페이지네이션 및 검색 상태
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");

  // --- 데이터 로딩 ---
  useEffect(() => {
    const fetchUsers = async () => {
      setIsLoading(true);
      setError(null);
      try {
        // 🚨 [핵심] '학생' 역할(Role.STUDENT)로 필터링하여 API 호출
        const data = await adminGetUsers(
          currentPage,
          PAGE_LIMIT,
          searchTerm,
          Role.STUDENT // 👈 학생만 필터링
        );

        setUsers(data.users);
        setTotalPages(Math.ceil(data.total_count / PAGE_LIMIT));
      } catch (e: any) {
        setError(e.message);
        toast.error(`학생 목록 로드 실패: ${e.message}`);
      } finally {
        setIsLoading(false);
      }
    };

    // 0.5초 디바운스(debounce) 적용
    const timer = setTimeout(() => {
      fetchUsers();
    }, 500);

    return () => clearTimeout(timer);
  }, [currentPage, searchTerm]); // currentPage나 searchTerm이 바뀌면 재호출

  const handleSearchChange = (e: ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
    setCurrentPage(1); // 검색 시 1페이지로 리셋
  };

  if (error) {
    return (
      <div className="flex items-center justify-center h-40 text-red-500">
        <AlertCircle className="w-6 h-6 mr-2" />
        <p>{error}</p>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6 flex items-center">
        <UserCheck className="mr-3" />
        학생 관리
      </h1>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
        학생의 일일 학습 목표량을 수정합니다. (역할 관리는 &apos;(어드민) 역할
        관리&apos; 탭에서 수행합니다.)
      </p>

      {/* 검색창 */}
      <div className="mb-4">
        <label htmlFor="search" className="sr-only">
          검색
        </label>
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="w-5 h-5 text-gray-400" />
          </div>
          <input
            type="text"
            id="search"
            value={searchTerm}
            onChange={handleSearchChange}
            className="w-full p-2 pl-10 border rounded-md dark:bg-gray-700 dark:border-gray-600"
            placeholder="학생 이메일로 검색..."
          />
        </div>
      </div>

      {/* 테이블 및 로딩 오버레이 */}
      <div className="relative overflow-x-auto shadow-md rounded-lg">
        {isLoading && (
          <div className="absolute inset-0 bg-white/50 dark:bg-gray-800/50 flex items-center justify-center z-10">
            <Loader2 className="w-8 h-8 animate-spin text-violet-500" />
          </div>
        )}

        <table className="w-full text-sm text-left text-gray-500 dark:text-gray-400">
          <thead className="text-xs text-gray-700 uppercase bg-gray-100 dark:bg-gray-700 dark:text-gray-400">
            <tr>
              <th scope="col" className="px-4 py-3">
                이메일 (Email)
              </th>
              <th scope="col" className="px-4 py-3 w-20">
                단어 목표
              </th>
              <th scope="col" className="px-4 py-3 w-20">
                문제 목표
              </th>
              <th scope="col" className="px-4 py-3">
                저장
              </th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <UserRow key={user.id} user={user} />
            ))}
          </tbody>
        </table>
      </div>

      {/* 페이지네이션 UI */}
      <div className="flex justify-between items-center mt-4">
        <span className="text-sm text-gray-700 dark:text-gray-400">
          페이지 {currentPage} / {totalPages}
        </span>
        <div className="inline-flex space-x-2">
          <button
            onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
            disabled={currentPage === 1 || isLoading}
            className="px-3 py-1 text-sm font-medium bg-white dark:bg-gray-700 border rounded-md hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50"
          >
            <ChevronLeft size={16} />
          </button>
          <button
            onClick={() =>
              setCurrentPage((prev) => Math.min(prev + 1, totalPages))
            }
            disabled={currentPage === totalPages || isLoading}
            className="px-3 py-1 text-sm font-medium bg-white dark:bg-gray-700 border rounded-md hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
