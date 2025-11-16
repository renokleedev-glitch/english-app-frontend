// src/app/admin/roles/page.tsx
"use client";

import { useState, useEffect, ChangeEvent } from "react";
import { User, Role } from "@/schemas";
import { adminGetUsers, adminUpdateUserRole } from "@/lib/api";
import { toast } from "sonner";
import {
  Loader2,
  AlertCircle,
  UserCheck,
  Search,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

const PAGE_LIMIT = 10; // 페이지 당 표시할 항목 수

/**
 * 개별 사용자 행(Row) 컴포넌트
 */
function RoleRow({ user }: { user: User }) {
  const [role, setRole] = useState<Role>(user.role);
  const [isSaving, setIsSaving] = useState(false);

  const handleRoleChange = async (newRole: Role) => {
    if (user.role === newRole) return;

    if (
      !confirm(
        `${user.email}의 역할을 ${newRole.toUpperCase()}로 변경하시겠습니까?`
      )
    ) {
      setRole(user.role); // 👈 취소 시 원래 역할로 되돌리기
      return;
    }

    setIsSaving(true);
    toast.loading("역할을 변경 중입니다...");
    try {
      await adminUpdateUserRole(user.id, newRole);
      setRole(newRole); // UI 즉시 업데이트
      toast.dismiss();
      toast.success(
        `${user.email}의 역할이 ${newRole.toUpperCase()}(으)로 변경되었습니다.`
      );
    } catch (e: any) {
      toast.dismiss();
      toast.error(`역할 변경 실패: ${e.message}`);
      setRole(user.role); // 👈 실패 시 원래 역할로 되돌리기
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <tr className="bg-white dark:bg-gray-800 border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700">
      <td className="px-4 py-3 font-medium text-gray-900 dark:text-white whitespace-nowrap">
        {user.email}
      </td>
      <td className="px-4 py-3 w-40">
        {/* 역할(Role) 선택 드롭다운 */}
        <select
          value={role}
          onChange={(e) => handleRoleChange(e.target.value as Role)}
          disabled={isSaving}
          className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white"
        >
          <option value={Role.STUDENT}>STUDENT</option>
          <option value={Role.TEACHER}>TEACHER</option>
          <option value={Role.ADMIN}>ADMIN</option>
        </select>
      </td>
    </tr>
  );
}

/**
 * (어드민) 역할 관리 메인 페이지
 */
export default function AdminRolesPage() {
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
        // 🚨 [핵심] API 호출 시 'role' 인자를 생략하여 모든 사용자 조회
        const data = await adminGetUsers(
          currentPage,
          PAGE_LIMIT,
          searchTerm
          // role: undefined
        );
        setUsers(data.users);
        setTotalPages(Math.ceil(data.total_count / PAGE_LIMIT));
      } catch (e: any) {
        setError(e.message);
        toast.error(`사용자 목록 로드 실패: ${e.message}`);
      } finally {
        setIsLoading(false);
      }
    };

    // 0.5초 디바운스(debounce)
    const timer = setTimeout(() => {
      fetchUsers();
    }, 500);

    return () => clearTimeout(timer);
  }, [currentPage, searchTerm]); // 의존성 배열

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
        (어드민) 역할 관리
      </h1>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
        사용자의 역할을 변경합니다. &apos;TEACHER&apos;는 학생 목표량을 수정할
        수 있고, &apos;ADMIN&apos;은 모든 권한을 가집니다.
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
            placeholder="이메일로 검색..."
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
              <th scope="col" className="px-4 py-3 w-40">
                역할 (Role)
              </th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <RoleRow key={user.id} user={user} />
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
