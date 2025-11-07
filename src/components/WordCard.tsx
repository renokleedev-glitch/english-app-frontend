"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Volume2, CheckCircle } from "lucide-react"; // 스피커, 체크 아이콘
import { Word } from "@/schemas"; // 타입 임포트
import { recordListenAction } from "@/lib/api"; // API 함수 임포트
import { toast } from "sonner"; // 알림 라이브러리

interface WordCardProps {
  word: Word;
  // ✅ 초기 진행 상태 (부모로부터 받음)
  initialProgress?: { en: number; ko: number };
  // ✅ 진행도 업데이트 시 부모에게 알림 (카운터용)
  onProgressUpdate?: (wordId: number, lang: "en" | "ko", count: number) => void;
  // ✅ [핵심 추가] 영어/한국어 3회 듣기 모두 완료 시 호출
  onStudyComplete: (wordId: number) => void;
}

export default function WordCard({
  word,
  initialProgress,
  onProgressUpdate,
  onStudyComplete,
}: WordCardProps) {
  // ✅ 초기 상태를 initialProgress prop으로 설정
  const [englishPlayCount, setEnglishPlayCount] = useState(
    initialProgress?.en || 0
  );
  const [koreanPlayCount, setKoreanPlayCount] = useState(
    initialProgress?.ko || 0
  );
  const [playingLanguage, setPlayingLanguage] = useState<"en" | "ko" | null>(
    null
  );
  const [isEnglishCompleted, setIsEnglishCompleted] = useState(
    (initialProgress?.en || 0) >= 3
  );
  const [isKoreanCompleted, setIsKoreanCompleted] = useState(
    (initialProgress?.ko || 0) >= 3
  );

  // ✅ [핵심 추가] 두 언어 모두 완료되었는지 감지하는 useEffect
  useEffect(() => {
    // isEnglishCompleted와 isKoreanCompleted가 모두 true일 때 onStudyComplete 콜백 호출
    if (isEnglishCompleted && isKoreanCompleted) {
      console.log(`WordCard ${word.id} (${word.text}) is fully completed.`);
      onStudyComplete(word.id);
    }
    // onStudyComplete, word.id는 일반적으로 변경되지 않지만, ESLint 규칙을 위해 포함
  }, [isEnglishCompleted, isKoreanCompleted, onStudyComplete, word.id]);

  // ✅ 언어별 오디오 재생 함수
  const handlePlayAudio = async (language: "en" | "ko") => {
    // 이미 다른 언어가 재생 중이거나, 현재 언어가 이미 완료되었으면 무시
    if (
      playingLanguage ||
      (language === "en" && isEnglishCompleted) ||
      (language === "ko" && isKoreanCompleted)
    ) {
      console.log(
        `Playback skipped for ${language} (playing: ${playingLanguage}, enDone: ${isEnglishCompleted}, koDone: ${isKoreanCompleted})`
      );
      return;
    }

    const textToSpeak = language === "en" ? word.text : word.meaning;
    const audioUrl =
      language === "en" ? word.english_audio_url : word.korean_audio_url; // Web TTS 사용 시 불필요

    // 텍스트 없으면 재생 불가
    if (!textToSpeak) {
      toast.error(
        `${language === "en" ? "영어 단어" : "한국어 뜻"} 정보가 없습니다.`
      );
      return;
    }

    setPlayingLanguage(language); // 현재 재생 중인 언어 설정
    // 해당 언어 카운트 초기화 (항상 0부터 3까지 다시 세도록)
    if (language === "en") setEnglishPlayCount(0);
    else setKoreanPlayCount(0);

    console.log(`Playing ${language} audio for "${textToSpeak}" 3 times...`);

    try {
      if ("speechSynthesis" in window) {
        // --- Web Speech API 사용 ---
        window.speechSynthesis.cancel(); // 이전 발음 취소
        const utterance = new SpeechSynthesisUtterance(textToSpeak);
        utterance.lang = language === "en" ? "en-US" : "ko-KR"; // 언어 설정
        utterance.rate = 0.9;

        // 목소리 설정 (선택 사항, 비동기 로딩 주의)
        const setVoice = () => {
          const voices = window.speechSynthesis.getVoices();
          const targetVoice = voices.find((v) =>
            v.lang.startsWith(utterance.lang.split("-")[0])
          );
          if (targetVoice) utterance.voice = targetVoice;
          console.log(
            `Using voice for ${utterance.lang}: ${utterance.voice?.name}`
          );
        };

        // 목소리가 로드되었는지 확인 후 설정, 아니면 이벤트 리스너 등록
        if (window.speechSynthesis.getVoices().length > 0) {
          setVoice();
        } else {
          window.speechSynthesis.onvoiceschanged = setVoice;
        }

        let currentPlay = 0;
        utterance.onend = async () => {
          currentPlay++;
          // 해당 언어 카운트 업데이트
          if (language === "en") setEnglishPlayCount(currentPlay);
          else setKoreanPlayCount(currentPlay);

          // ✅ 부모 페이지에 카운트 업데이트 알림
          onProgressUpdate?.(word.id, language, currentPlay);

          if (currentPlay < 3) {
            setTimeout(() => window.speechSynthesis.speak(utterance), 200);
          } else {
            setPlayingLanguage(null); // 재생 완료
            // ✅ 백엔드 API 호출
            try {
              await recordListenAction(word.id, language);
              // ✅ [수정] 3회 완료 시 해당 언어 완료 상태 true로 설정
              if (language === "en") setIsEnglishCompleted(true);
              else setIsKoreanCompleted(true);
            } catch (apiError: any) {
              console.error("API Error:", apiError);
              toast.error(
                `학습 기록 저장 실패 (${language}): ${apiError.message}`
              );
              if (language === "en") setEnglishPlayCount(0);
              else setKoreanPlayCount(0);
            }
          }
        };
        utterance.onerror = (event) => {
          console.error("SpeechSynthesis Error:", event.error);
          toast.error(`음성 재생 오류 (${language}): ${event.error}`);
          setPlayingLanguage(null);
        };
        window.speechSynthesis.speak(utterance);
        // --- ---
      } else {
        toast.error("브라우저가 음성 합성을 지원하지 않습니다.");
        setPlayingLanguage(null);
      }
    } catch (error) {
      console.error("TTS Error:", error);
      toast.error(`음성 재생 중 오류 발생 (${language})`);
      setPlayingLanguage(null);
    }
  };

  // ✅ 전체 카드 완료 상태
  const isCardCompleted = isEnglishCompleted && isKoreanCompleted;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={`
        p-4 bg-white dark:bg-gray-800 rounded-lg shadow 
        border border-gray-200 dark:border-gray-700 
        transition-all duration-300
        ${
          isCardCompleted ? "opacity-50 cursor-default" : ""
        } // 전체 완료 시 효과
      `}
    >
      {/* --- 영어 영역 --- */}
      <div
        className={`flex justify-between items-center mb-2 ${
          isEnglishCompleted ? "" : "cursor-pointer group"
        }`}
        onClick={() => handlePlayAudio("en")} // 영어 단어 영역 클릭 시 영어 재생
      >
        <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-100">
          {word.text}
        </h2>
        <div className="flex items-center space-x-2">
          {isEnglishCompleted ? (
            <CheckCircle className="w-5 h-5 text-green-500" />
          ) : (
            <>
              <span className="text-xs font-mono text-gray-400 dark:text-gray-500 w-6 text-right">
                {englishPlayCount}/3
              </span>
              <button
                className={`p-2 rounded-full transition-colors ${
                  playingLanguage === "en"
                    ? "bg-violet-100 dark:bg-violet-900 animate-pulse"
                    : "bg-gray-100 dark:bg-gray-700 group-hover:bg-violet-100 dark:group-hover:bg-violet-900"
                }`}
                aria-label="영어 발음 듣기"
                disabled={!!playingLanguage} // 다른 소리가 재생 중일 때는 비활성화
              >
                <Volume2
                  className={`w-5 h-5 ${
                    playingLanguage === "en"
                      ? "text-violet-500"
                      : "text-gray-600 dark:text-gray-300 group-hover:text-violet-500"
                  }`}
                />
              </button>
            </>
          )}
        </div>
      </div>

      {/* --- 구분선 --- */}
      <hr className="border-gray-200 dark:border-gray-700 my-2" />

      {/* --- 한국어 영역 --- */}
      <div
        className={`flex justify-between items-center mt-2 ${
          isKoreanCompleted ? "" : "cursor-pointer group"
        }`}
        onClick={() => handlePlayAudio("ko")} // 한국어 뜻 영역 클릭 시 한국어 재생
      >
        <p className="text-gray-600 dark:text-gray-400">{word.meaning}</p>
        <div className="flex items-center space-x-2">
          {isKoreanCompleted ? (
            <CheckCircle className="w-5 h-5 text-green-500" />
          ) : (
            <>
              <span className="text-xs font-mono text-gray-400 dark:text-gray-500 w-6 text-right">
                {koreanPlayCount}/3
              </span>
              <button
                className={`p-2 rounded-full transition-colors ${
                  playingLanguage === "ko"
                    ? "bg-violet-100 dark:bg-violet-900 animate-pulse"
                    : "bg-gray-100 dark:bg-gray-700 group-hover:bg-violet-100 dark:group-hover:bg-violet-900"
                }`}
                aria-label="한국어 뜻 듣기"
                disabled={!!playingLanguage} // 다른 소리가 재생 중일 때는 비활성화
              >
                <Volume2
                  className={`w-5 h-5 ${
                    playingLanguage === "ko"
                      ? "text-violet-500"
                      : "text-gray-600 dark:text-gray-300 group-hover:text-violet-500"
                  }`}
                />
              </button>
            </>
          )}
        </div>
      </div>
    </motion.div>
  );
}
