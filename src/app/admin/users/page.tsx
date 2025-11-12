// src/app/admin/users/page.tsx
"use client";

import { useState, useEffect, FormEvent } from "react";
import { User, UserUpdateGoals, Role } from "@/schemas";
// 🚨 [수정] adminUpdateUserRole 임포트 제거
import { adminGetUsers, adminUpdateUserGoals } from "@/lib/api";
import { toast } from "sonner";
import { Loader2, AlertCircle, Save, UserCheck } from "lucide-react";

/**
 * 개별 학생 행(Row) 컴포넌트
 */
function UserRow({ user }: { user: User }) {
  const [wordGoal, setWordGoal] = useState(user.daily_word_goal || 0);
  const [examGoal, setExamGoal] = useState(user.daily_exam_goal || 0);
  // 🚨 [제거] Role 관련 상태 제거
  // const [role, setRole] = useState<Role>(user.role);
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

  // 🚨 [제거] handleRoleChange 함수 제거
  // const handleRoleChange = async ...

  return (
    <tr className="bg-white dark:bg-gray-800 border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700">
      <td className="px-4 py-3 font-medium text-gray-900 dark:text-white whitespace-nowrap">
        {user.email}
      </td>

      {/* 🚨 [제거] 역할(Role) 선택 드롭다운 UI 제거 */}

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

  useEffect(() => {
    const fetchUsers = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const data = await adminGetUsers();
        setUsers(data);
      } catch (e: any) {
        setError(e.message);
        toast.error(`학생 목록 로드 실패: ${e.message}`);
      } finally {
        setIsLoading(false);
      }
    };
    fetchUsers();
  }, []);

  if (isLoading) {
    /* ... 로딩 UI ... */
  }
  if (error) {
    /* ... 에러 UI ... */
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

      <div className="relative overflow-x-auto shadow-md rounded-lg">
        <table className="w-full text-sm text-left text-gray-500 dark:text-gray-400">
          <thead className="text-xs text-gray-700 uppercase bg-gray-100 dark:bg-gray-700 dark:text-gray-400">
            <tr>
              <th scope="col" className="px-4 py-3">
                이메일 (Email)
              </th>
              {/* 🚨 [제거] 역할(Role) th 제거 */}
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
    </div>
  );
}
