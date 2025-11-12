// src/app/admin/words/page.tsx
"use client";

import { useState, useEffect, FormEvent } from "react";
import { Word, WordCreate, WordUpdate } from "@/schemas";
import {
  adminGetWords,
  adminCreateWord,
  adminUpdateWord,
  adminDeleteWord,
} from "@/lib/api";
import { toast } from "sonner";
import {
  Loader2,
  AlertCircle,
  Plus,
  Edit,
  Trash2,
  X,
  BookText,
} from "lucide-react";

// ------------------------------------------------------------------
// 1. 단어 생성/수정 모달 컴포넌트
// ------------------------------------------------------------------
interface WordModalProps {
  // 🚨 'word' prop이 있으면 '수정 모드', 없으면 '생성 모드'
  word?: Word | null;
  onClose: () => void;
  onSave: () => void; // 🚨 저장 완료 후 부모 컴포넌트(페이지)에 알림
}

function WordModal({ word, onClose, onSave }: WordModalProps) {
  const [formData, setFormData] = useState<WordCreate | WordUpdate>({
    text: word?.text || "",
    meaning: word?.meaning || "",
    grade_level: word?.grade_level || 1,
    pronunciation: word?.pronunciation || "",
    example_sentence_english: word?.example_sentence_english || "",
    example_sentence_korean: word?.example_sentence_korean || "",
    // audio_url 필드는 편의상 생략 (필요시 추가)
  });
  const [isSaving, setIsSaving] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    toast.loading(
      word ? "단어를 수정 중입니다..." : "새 단어를 생성 중입니다..."
    );

    try {
      if (word) {
        // --- 수정 모드 ---
        await adminUpdateWord(word.id, formData as WordUpdate);
      } else {
        // --- 생성 모드 ---
        await adminCreateWord(formData as WordCreate);
      }
      toast.dismiss();
      toast.success(
        word ? "단어가 수정되었습니다." : "새 단어가 생성되었습니다."
      );
      onSave(); // 부모(페이지)에 저장 완료 알림 -> 데이터 새로고침
      onClose(); // 모달 닫기
    } catch (e: any) {
      toast.dismiss();
      toast.error(`오류 발생: ${e.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: name === "grade_level" ? Number(value) : value,
    }));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold">
            {word ? "단어 수정" : "새 단어 추가"}
          </h2>
          <button
            onClick={onClose}
            disabled={isSaving}
            className="text-gray-500 hover:text-gray-800 dark:hover:text-gray-200"
          >
            <X size={24} />
          </button>
        </div>

        {/* 단어 입력 폼 */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium">단어 (Text)</label>
              <input
                type="text"
                name="text"
                value={formData.text}
                onChange={handleChange}
                required
                className="w-full p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600"
              />
            </div>
            <div>
              <label className="block text-sm font-medium">뜻 (Meaning)</label>
              <input
                type="text"
                name="meaning"
                value={formData.meaning}
                onChange={handleChange}
                required
                className="w-full p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium">
              학년 (Grade Level)
            </label>
            <input
              type="number"
              name="grade_level"
              value={formData.grade_level || ""}
              onChange={handleChange}
              className="w-full p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600"
            />
          </div>
          <div>
            <label className="block text-sm font-medium">
              발음 (Pronunciation)
            </label>
            <input
              type="text"
              name="pronunciation"
              value={formData.pronunciation || ""}
              onChange={handleChange}
              className="w-full p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600"
            />
          </div>
          <div>
            <label className="block text-sm font-medium">영어 예문</label>
            <textarea
              name="example_sentence_english"
              value={formData.example_sentence_english || ""}
              onChange={handleChange}
              rows={2}
              className="w-full p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600"
            />
          </div>
          <div>
            <label className="block text-sm font-medium">예문 해석</label>
            <textarea
              name="example_sentence_korean"
              value={formData.example_sentence_korean || ""}
              onChange={handleChange}
              rows={2}
              className="w-full p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600"
            />
          </div>

          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="px-4 py-2 text-sm font-medium bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 dark:bg-gray-600 dark:text-gray-100"
            >
              취소
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {isSaving ? <Loader2 className="animate-spin" /> : "저장"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ------------------------------------------------------------------
// 2. 단어 관리 메인 페이지
// ------------------------------------------------------------------
export default function AdminWordsPage() {
  const [words, setWords] = useState<Word[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 🚨 [핵심] 모달 상태 관리
  const [editingWord, setEditingWord] = useState<Word | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  // --- 데이터 로딩 ---
  const fetchWords = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await adminGetWords();
      setWords(data);
    } catch (e: any) {
      setError(e.message);
      toast.error(`단어 목록 로드 실패: ${e.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchWords();
  }, []);

  // --- 이벤트 핸들러 ---
  const handleDelete = async (wordId: number, wordText: string) => {
    if (
      !confirm(
        `'${wordText}' 단어를 정말 삭제하시겠습니까?\n(연결된 내신 문제도 확인해야 합니다.)`
      )
    ) {
      return;
    }
    toast.loading("단어를 삭제 중입니다...");
    try {
      await adminDeleteWord(wordId);
      toast.dismiss();
      toast.success("단어가 삭제되었습니다.");
      fetchWords(); // 목록 새로고침
    } catch (e: any) {
      toast.dismiss();
      toast.error(`삭제 실패: ${e.message}`);
    }
  };

  const handleModalClose = () => {
    setEditingWord(null);
    setIsCreateModalOpen(false);
  };

  const handleModalSave = () => {
    fetchWords(); // 저장 완료 시 목록 새로고침
  };

  // --- UI 렌더링 ---
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
      {/* 모달 렌더링 */}
      {(isCreateModalOpen || editingWord) && (
        <WordModal
          word={editingWord}
          onClose={handleModalClose}
          onSave={handleModalSave}
        />
      )}

      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold flex items-center">
          <BookText className="mr-3" />
          단어 관리
        </h1>
        <button
          onClick={() => setIsCreateModalOpen(true)}
          className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 flex items-center"
        >
          <Plus size={18} className="mr-1" /> 새 단어 추가
        </button>
      </div>

      {/* 단어 목록 테이블 */}
      <div className="relative overflow-x-auto shadow-md rounded-lg">
        <table className="w-full text-sm text-left text-gray-500 dark:text-gray-400">
          <thead className="text-xs text-gray-700 uppercase bg-gray-100 dark:bg-gray-700 dark:text-gray-400">
            <tr>
              <th scope="col" className="px-4 py-3">
                단어 (Text)
              </th>
              <th scope="col" className="px-4 py-3">
                뜻 (Meaning)
              </th>
              <th scope="col" className="px-4 py-3">
                학년
              </th>
              <th scope="col" className="px-4 py-3">
                관리
              </th>
            </tr>
          </thead>
          <tbody>
            {words.map((word) => (
              <tr
                key={word.id}
                className="bg-white dark:bg-gray-800 border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                <td className="px-4 py-3 font-medium text-gray-900 dark:text-white whitespace-nowrap">
                  {word.text}
                </td>
                <td className="px-4 py-3">{word.meaning}</td>
                <td className="px-4 py-3">{word.grade_level || "N/A"}</td>
                <td className="px-4 py-3 flex space-x-2">
                  <button
                    onClick={() => setEditingWord(word)}
                    className="p-2 text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                    title="수정"
                  >
                    <Edit size={16} />
                  </button>
                  <button
                    onClick={() => handleDelete(word.id, word.text)}
                    className="p-2 text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300"
                    title="삭제"
                  >
                    <Trash2 size={16} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
