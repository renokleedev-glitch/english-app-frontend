// src/app/admin/roles/page.tsx (신규 파일)
"use client";

import { useState, useEffect } from "react";
import { User, Role } from "@/schemas";
import { adminGetUsers, adminUpdateUserRole } from "@/lib/api"; // 👈 API 함수 임포트
import { toast } from "sonner";
import { Loader2, AlertCircle, UserCheck } from "lucide-react";

/**
 * 개별 학생 행(Row) 컴포넌트
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
      <td className="px-4 py-3">
        {/* (기존 단어/문제 목표 칸은 이 페이지에서 제거됨) */}
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
    return (
      <div className="flex items-center justify-center h-40">
        <Loader2 className="w-8 h-8 animate-spin text-violet-500" />
      </div>
    );
  }

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

      <div className="relative overflow-x-auto shadow-md rounded-lg">
        <table className="w-full text-sm text-left text-gray-500 dark:text-gray-400">
          <thead className="text-xs text-gray-700 uppercase bg-gray-100 dark:bg-gray-700 dark:text-gray-400">
            <tr>
              <th scope="col" className="px-4 py-3">
                이메일 (Email)
              </th>
              <th scope="col" className="px-4 py-3 w-40">
                역할 (Role)
              </th>
              <th scope="col" className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <RoleRow key={user.id} user={user} />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
