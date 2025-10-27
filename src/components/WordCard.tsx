"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Volume2, CheckCircle } from "lucide-react"; // 스피커, 체크 아이콘
import { Word } from "@/schemas"; // 타입 임포트
import { recordListenAction } from "@/lib/api"; // API 함수 임포트
import { toast } from "sonner"; // 알림 라이브러리

// WordCard가 받을 props 타입 정의
interface WordCardProps {
  word: Word;
  // 단어 학습 상태가 변경될 때 호출될 콜백 (선택 사항)
  onProgressUpdate?: (wordId: number, lang: "en" | "ko", count: number) => void;
}

export default function WordCard({ word, onProgressUpdate }: WordCardProps) {
  // ✅ 상태 변수 분리 및 추가
  const [englishPlayCount, setEnglishPlayCount] = useState(0);
  const [koreanPlayCount, setKoreanPlayCount] = useState(0);
  const [playingLanguage, setPlayingLanguage] = useState<"en" | "ko" | null>(
    null
  ); // 'en', 'ko', null
  const [isEnglishCompleted, setIsEnglishCompleted] = useState(false);
  const [isKoreanCompleted, setIsKoreanCompleted] = useState(false);

  // ✅ 초기 상태 설정 (페이지 로드 시 기존 진행도 반영 - 추후 구현)
  // useEffect(() => {
  //   // TODO: 백엔드에서 초기 progress 데이터를 받아와서 count 및 completed 상태 설정
  // }, [word.id]);

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

          if (currentPlay < 3) {
            setTimeout(() => window.speechSynthesis.speak(utterance), 200);
          } else {
            setPlayingLanguage(null); // 재생 완료
            // ✅ 백엔드 API 호출
            try {
              await recordListenAction(word.id, language);
              console.log(
                `Recorded listen action for ${word.id} (${language})`
              );
              if (language === "en") setIsEnglishCompleted(true);
              else setIsKoreanCompleted(true);
              onProgressUpdate?.(word.id, language, 3); // 상태 변경 콜백 호출
            } catch (apiError: any) {
              console.error("API Error:", apiError);
              toast.error(
                `학습 기록 저장 실패 (${language}): ${apiError.message}`
              );
              // API 실패 시 카운트 롤백 또는 재시도 로직 추가 가능
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
