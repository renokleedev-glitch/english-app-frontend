// src/components/AuthForm.tsx
"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2 } from "lucide-react"; // 🚨 [추가] 로딩 아이콘

interface AuthFormProps {
  type: "login" | "signup";
  // 🚨 [핵심 수정 1] onSubmit 타입 변경 (nickname은 선택적)
  onSubmit: (
    email: string,
    password: string,
    nickname?: string,
    phoneNumber?: string
  ) => Promise<void>;
}

export default function AuthForm({ type, onSubmit }: AuthFormProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [nickname, setNickname] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // 🚨 [핵심 수정 3] 회원가입 시 nickname 전달
      if (type === "signup") {
        if (!nickname) {
          // 닉네임 유효성 검사
          throw new Error("닉네임을 입력해야 합니다.");
        }
        await onSubmit(email, password, nickname, phoneNumber);
      } else {
        // 로그인은 기존과 동일
        await onSubmit(email, password);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.form
      onSubmit={handleSubmit}
      className="max-w-md mx-auto mt-16 p-8 bg-white dark:bg-gray-800 rounded-2xl shadow transition-colors"
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <motion.h1
        className="text-2xl font-semibold mb-6 text-center"
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        {type === "login" ? "로그인" : "회원가입"}
      </motion.h1>

      <div className="flex flex-col gap-4">
        {/* 🆕 [핵심 추가 4] 회원가입 시에만 닉네임 필드 표시 */}
        {type === "signup" && (
          <motion.input
            type="text"
            placeholder="닉네임 (표시될 이름)"
            className="p-3 rounded-md border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-violet-500 transition"
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            required
            whileFocus={{ scale: 1.02 }}
          />
        )}

        {type === "signup" && (
          <motion.input
            type="tel" // 전화번호 타입
            placeholder="전화번호 (선택 사항)"
            className="p-3 rounded-md border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-violet-500 transition"
            value={phoneNumber}
            onChange={(e) => setPhoneNumber(e.target.value)}
            // required를 제거하여 선택 사항으로 둡니다.
            whileFocus={{ scale: 1.02 }}
          />
        )}
        <motion.input
          type="text" // 👈 "email"이 아닌 "text" 유지 (admin 로그인을 위해)
          placeholder="아이디 이메일"
          className="p-3 rounded-md border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-violet-500 transition"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          whileFocus={{ scale: 1.02 }}
        />
        <motion.input
          type="password"
          placeholder="비밀번호 (6자 이상)"
          className="p-3 rounded-md border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-violet-500 transition"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          whileFocus={{ scale: 1.02 }}
        />

        <AnimatePresence>
          {error && (
            <motion.p
              className="text-red-500 text-sm mt-1"
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
            >
              {error}
            </motion.p>
          )}
        </AnimatePresence>

        <motion.button
          type="submit"
          disabled={loading}
          className="mt-2 py-3 rounded-md bg-violet-600 hover:bg-violet-700 text-white font-semibold transition disabled:opacity-60 flex justify-center items-center" // 🚨 flex 추가
          whileTap={{ scale: 0.97 }}
        >
          {loading ? (
            <Loader2 className="w-5 h-5 animate-spin" /> // 🚨 로딩 아이콘
          ) : type === "login" ? (
            "로그인"
          ) : (
            "회원가입"
          )}
        </motion.button>
      </div>
    </motion.form>
  );
}
