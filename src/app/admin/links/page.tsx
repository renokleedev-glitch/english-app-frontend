// src/app/admin/links/page.tsx (신규 파일)
"use client";

import { useState, useEffect, FormEvent } from "react";
import {
  Word,
  ExamQuestion,
  WordQuestionLink,
  WordQuestionLinkCreate,
} from "@/schemas";
import {
  adminGetWords,
  adminGetExamQuestions,
  adminGetWordQuestionLinks,
  adminCreateWordQuestionLink,
  adminDeleteWordQuestionLink,
} from "@/lib/api";
import { toast } from "sonner";
import {
  Loader2,
  AlertCircle,
  Link as LinkIcon,
  Trash2,
  CheckSquare,
} from "lucide-react";

// ------------------------------------------------------------------
// 1. 링크 생성 폼 컴포넌트
// ------------------------------------------------------------------
interface LinkFormProps {
  words: Word[];
  questions: ExamQuestion[];
  onLinkCreated: () => void; // 링크 생성 후 목록 새로고침용
}

function LinkForm({ words, questions, onLinkCreated }: LinkFormProps) {
  const [selectedWordId, setSelectedWordId] = useState<string>("");
  const [selectedQuestionId, setSelectedQuestionId] = useState<string>("");
  const [isSaving, setIsSaving] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!selectedWordId || !selectedQuestionId) {
      toast.error("단어와 문제를 모두 선택해야 합니다.");
      return;
    }

    const linkData: WordQuestionLinkCreate = {
      word_id: Number(selectedWordId),
      grammar_question_id: Number(selectedQuestionId),
    };

    setIsSaving(true);
    toast.loading("링크를 생성 중입니다...");

    try {
      await adminCreateWordQuestionLink(linkData);
      toast.dismiss();
      toast.success("단어와 문제가 성공적으로 연결되었습니다.");
      onLinkCreated(); // 목록 새로고침
      setSelectedWordId("");
      setSelectedQuestionId("");
    } catch (e: any) {
      toast.dismiss();
      toast.error(`연결 실패: ${e.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="p-4 bg-white dark:bg-gray-800 rounded-lg shadow border dark:border-gray-700 mb-6"
    >
      <h2 className="text-xl font-semibold mb-4">새 연결 추가</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* 단어 선택 */}
        <div>
          <label className="block text-sm font-medium mb-1">1. 단어 선택</label>
          <select
            value={selectedWordId}
            onChange={(e) => setSelectedWordId(e.target.value)}
            required
            className="w-full p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600"
          >
            <option value="">-- 단어 선택 --</option>
            {words.map((w) => (
              <option key={w.id} value={w.id}>
                {w.text} ({w.meaning})
              </option>
            ))}
          </select>
        </div>

        {/* 문제 선택 */}
        <div>
          <label className="block text-sm font-medium mb-1">
            2. 내신 문제 선택
          </label>
          <select
            value={selectedQuestionId}
            onChange={(e) => setSelectedQuestionId(e.target.value)}
            required
            className="w-full p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600"
          >
            <option value="">-- 문제 선택 (ID: 유형) --</option>
            {questions.map((q) => (
              <option key={q.id} value={q.id}>
                ID {q.id}: {q.grammar_point}
              </option>
            ))}
          </select>
        </div>

        {/* 제출 버튼 */}
        <div className="flex items-end">
          <button
            type="submit"
            disabled={isSaving}
            className="w-full px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center"
          >
            <LinkIcon size={16} className="mr-1" />
            {isSaving ? "연결 중..." : "연결하기"}
          </button>
        </div>
      </div>
    </form>
  );
}

// ------------------------------------------------------------------
// 2. 단어-문제 연결 관리 메인 페이지
// ------------------------------------------------------------------
export default function AdminLinksPage() {
  // 3가지 데이터를 모두 로드해야 함
  const [links, setLinks] = useState<WordQuestionLink[]>([]);
  const [words, setWords] = useState<Word[]>([]);
  const [questions, setQuestions] = useState<ExamQuestion[]>([]);

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // --- 데이터 로딩 ---
  const fetchData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      // 3가지 데이터를 병렬로 로드
      const [linksData, wordsData, questionsData] = await Promise.all([
        adminGetWordQuestionLinks(),
        adminGetWords(),
        adminGetExamQuestions(),
      ]);
      setLinks(linksData);
      setWords(wordsData);
      setQuestions(questionsData);
    } catch (e: any) {
      setError(e.message);
      toast.error(`데이터 로드 실패: ${e.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // --- 이벤트 핸들러 ---
  const handleDeleteLink = async (linkData: WordQuestionLinkCreate) => {
    if (
      !confirm(
        `[문제 ID: ${linkData.grammar_question_id}]와 [단어 ID: ${linkData.word_id}]의 연결을 정말 삭제하시겠습니까?`
      )
    ) {
      return;
    }
    toast.loading("연결을 삭제 중입니다...");
    try {
      await adminDeleteWordQuestionLink(linkData);
      toast.dismiss();
      toast.success("연결이 삭제되었습니다.");
      fetchData(); // 목록 새로고침
    } catch (e: any) {
      toast.dismiss();
      toast.error(`삭제 실패: ${e.message}`);
    }
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
      <h1 className="text-3xl font-bold mb-6 flex items-center">
        <CheckSquare className="mr-3" />
        단어-문제 연결 관리
      </h1>

      {/* 링크 생성 폼 */}
      <LinkForm words={words} questions={questions} onLinkCreated={fetchData} />

      {/* 현재 연결된 목록 테이블 */}
      <div className="relative overflow-x-auto shadow-md rounded-lg mt-8">
        <table className="w-full text-sm text-left text-gray-500 dark:text-gray-400">
          <caption className="p-5 text-lg font-semibold text-left bg-white dark:bg-gray-800 dark:text-white">
            현재 연결된 목록 ({links.length}개)
          </caption>
          <thead className="text-xs text-gray-700 uppercase bg-gray-100 dark:bg-gray-700 dark:text-gray-400">
            <tr>
              <th scope="col" className="px-4 py-3">
                단어 (Word)
              </th>
              <th scope="col" className="px-4 py-3">
                내신 문제 (Question)
              </th>
              <th scope="col" className="px-4 py-3">
                관리
              </th>
            </tr>
          </thead>
          <tbody>
            {links.map((link) => (
              <tr
                key={`${link.grammar_question_id}-${link.word_id}`}
                className="bg-white dark:bg-gray-800 border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">
                  (ID: {link.word_id}) {link.word.text}
                </td>
                <td className="px-4 py-3 font-medium text-gray-900 dark:text-white max-w-md truncate">
                  (ID: {link.grammar_question_id}) {link.question.grammar_point}
                </td>
                <td className="px-4 py-3">
                  <button
                    onClick={() =>
                      handleDeleteLink({
                        grammar_question_id: link.grammar_question_id,
                        word_id: link.word_id,
                      })
                    }
                    className="p-2 text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300"
                    title="연결 해제"
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
