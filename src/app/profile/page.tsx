// src/app/profile/page.tsx
"use client";

import { useState, useEffect, FormEvent } from "react";
import { useAuthStore } from "@/store/authStore";
import { useRouter } from "next/navigation";
import { Loader2, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { updateMe } from "@/lib/api";
import { UserUpdateProfile } from "@/schemas";

export default function ProfilePage() {
  const router = useRouter();
  const { user, fetchUser } = useAuthStore();

  const [nickname, setNickname] = useState("");
  // 🆕 [추가 1] 전화번호 상태 추가
  const [phoneNumber, setPhoneNumber] = useState("");
  

  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // 1. 사용자 정보가 로드되면 닉네임과 전화번호 필드를 채웁니다.
  useEffect(() => {
    if (user) {
      setNickname(user.nickname);
      // 🆕 [수정 1] 기존 전화번호로 상태 초기화 (nullable일 수 있으므로 || '' 처리)
      setPhoneNumber(user.phone_number || "");
    }
  }, [user]);

  // 2. 🚨 [핵심 수정] 폼 제출 핸들러
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    // 닉네임 유효성 검사
    if (!nickname.trim()) {
      toast.error("닉네임을 입력해야 합니다.");
      return;
    }

    // 비밀번호 유효성 검사
    if (password && password !== passwordConfirm) {
      toast.error("새 비밀번호가 일치하지 않습니다.");
      return;
    }
    if (password && password.length < 6) {
      toast.error("비밀번호는 6자 이상이어야 합니다.");
      return;
    }

    setIsLoading(true);
    toast.loading("프로필을 업데이트 중입니다...");

    try {
      const payload: UserUpdateProfile = {
        nickname: nickname.trim(),
        // 🆕 [핵심 추가 2] 전화번호를 payload에 추가 (빈 문자열도 서버로 보냄)
        phone_number: phoneNumber.trim() || null,
      };

      // 비밀번호 필드가 채워진 경우에만 payload에 추가
      if (password) {
        payload.password = password;
      }

      await updateMe(payload);

      // 🚨 [핵심] Store의 사용자 정보를 새로고침
      await fetchUser();

      toast.dismiss();
      toast.success("프로필이 성공적으로 업데이트되었습니다.");

      // 비밀번호 필드 초기화
      setPassword("");
      setPasswordConfirm("");
    } catch (err: any) {
      toast.dismiss();
      toast.error(`업데이트 실패: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  if (!user) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto py-8">
      <div className="mb-6">
        <Link
          href="/dashboard"
          className="inline-flex items-center text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
        >
          <ArrowLeft size={16} className="mr-1" />
          대시보드로 돌아가기
        </Link>
      </div>

      <div className="bg-white dark:bg-gray-800 p-8 rounded-lg shadow border dark:border-gray-700">
        <h1 className="text-3xl font-bold mb-6 text-center">프로필 수정</h1>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* 닉네임 */}
          <div>
            <label
              htmlFor="nickname"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300"
            >
              닉네임 (Nickname)
            </label>
            <div className="mt-1">
              <input
                id="nickname"
                type="text"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                required
                className="w-full p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600"
              />
            </div>
          </div>

          {/* 🆕 [추가 3] 전화번호 입력 필드 */}
          <div>
            <label
              htmlFor="phoneNumber"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300"
            >
              전화번호 (Phone Number)
            </label>
            <div className="mt-1">
              <input
                id="phoneNumber"
                type="tel"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                className="w-full p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600"
                placeholder="선택 사항"
              />
            </div>
          </div>

          {/* 이메일 (표시만, 수정 불가) */}
          <div>
            <label
              htmlFor="email"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300"
            >
              아이디 (이메일)
            </label>
            <div className="mt-1">
              <input
                id="email"
                type="email"
                value={user.email}
                disabled
                className="w-full p-2 border rounded-md bg-gray-100 dark:bg-gray-700 dark:border-gray-600 opacity-70"
              />
            </div>
          </div>

          {/* 새 비밀번호 */}
          <div>
            <label
              htmlFor="password"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300"
            >
              새 비밀번호 (변경 시에만 입력)
            </label>
            <div className="mt-1">
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600"
                placeholder="6자 이상"
              />
            </div>
          </div>

          {/* 새 비밀번호 확인 */}
          <div>
            <label
              htmlFor="passwordConfirm"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300"
            >
              새 비밀번호 확인
            </label>
            <div className="mt-1">
              <input
                id="passwordConfirm"
                type="password"
                value={passwordConfirm}
                onChange={(e) => setPasswordConfirm(e.target.value)}
                className="w-full p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600"
              />
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={isLoading}
              className="flex w-full justify-center rounded-md border border-transparent bg-violet-600 py-2 px-4 text-sm font-medium text-white shadow-sm hover:bg-violet-700 disabled:opacity-50"
            >
              {isLoading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                "저장하기"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
