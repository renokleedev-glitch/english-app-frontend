"use client";

import { motion } from "framer-motion";

interface UserAvatarProps {
  email?: string;
}

export default function UserAvatar({ email }: UserAvatarProps) {
  if (!email) return null;

  const initial = email[0]?.toUpperCase() ?? "?";

  return (
    <motion.div
      initial={{ scale: 0.6, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      exit={{ scale: 0.6, opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="w-8 h-8 flex items-center justify-center rounded-full bg-violet-600 text-white text-sm font-semibold shadow-md"
      title={email}
    >
      {initial}
    </motion.div>
  );
}
