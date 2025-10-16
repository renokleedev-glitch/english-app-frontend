"use client";

import { motion } from "framer-motion";
import { useAuthStore } from "@/store/authStore";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function DashboardPage() {
  const { user } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    if (!user) router.push("/login");
  }, [user]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
      className="min-h-[80vh] flex flex-col items-center justify-center"
    >
      <h1 className="text-3xl font-semibold text-violet-600 dark:text-violet-400 mb-4">
        환영합니다 🎉
      </h1>
      <p className="text-gray-700 dark:text-gray-300">
        {user?.email}님, 오늘도 좋은 하루 되세요!
      </p>
    </motion.div>
  );
}
