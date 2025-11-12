// src/app/admin/exam/page.tsx (신규 파일)
"use client";

import { useState, useEffect, FormEvent } from "react";
import {
  ExamQuestion,
  GrammarQuestionCreate,
  GrammarQuestionUpdate,
} from "@/schemas";
import {
  adminGetExamQuestions,
  adminCreateExamQuestion,
  adminUpdateExamQuestion,
  adminDeleteExamQuestion,
} from "@/lib/api";
import { toast } from "sonner";
import {
  Loader2,
  AlertCircle,
  Plus,
  Edit,
  Trash2,
  X,
  FileText,
} from "lucide-react";

// ------------------------------------------------------------------
// 1. 내신 문제 생성/수정 모달 컴포넌트
// ------------------------------------------------------------------
interface ExamModalProps {
  question?: ExamQuestion | null;
  onClose: () => void;
  onSave: () => void;
}

function ExamModal({ question, onClose, onSave }: ExamModalProps) {
  // 🚨 [핵심] JSON 필드(choices)는 문자열(JSON.stringify)로 관리
  const [formData, setFormData] = useState({
    grade_level: question?.grade_level || 1,
    grammar_point: question?.grammar_point || "",
    question_type: question?.question_type || "MC",
    question_text: question?.question_text || "",
    // 🚨 choices는 JSON 객체이므로 문자열로 변환하여 textarea에서 편집
    choices: question?.choices
      ? JSON.stringify(question.choices, null, 2)
      : "[]",
    correct_answer: question?.correct_answer || "",
    explanation: question?.explanation || "",
    // 🚨 scrambled_words는 배열이므로 join/split으로 변환
    scrambled_words: question?.scrambled_words
      ? question.scrambled_words.join(", ")
      : "",
  });
  const [isSaving, setIsSaving] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    toast.loading(
      question ? "문제를 수정 중입니다..." : "새 문제를 생성 중입니다..."
    );

    try {
      // 🚨 [핵심] 폼 데이터를 백엔드 스키마에 맞게 변환
      const payload: GrammarQuestionCreate | GrammarQuestionUpdate = {
        ...formData,
        grade_level: Number(formData.grade_level),
        // choices는 문자열을 JSON 객체로 파싱
        choices: JSON.parse(formData.choices || "[]"),
        // scrambled_words는 쉼표(,) 기준으로 배열로 변환
        scrambled_words: formData.scrambled_words
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
      };

      if (question) {
        // --- 수정 모드 ---
        await adminUpdateExamQuestion(
          question.id,
          payload as GrammarQuestionUpdate
        );
      } else {
        // --- 생성 모드 ---
        await adminCreateExamQuestion(payload as GrammarQuestionCreate);
      }
      toast.dismiss();
      toast.success(
        question ? "문제가 수정되었습니다." : "새 문제가 생성되었습니다."
      );
      onSave();
      onClose();
    } catch (e: any) {
      toast.dismiss();
      // 🚨 JSON 파싱 오류 등 상세 에러 표시
      toast.error(`오류 발생: ${e.message}. (Choices JSON 형식을 확인하세요.)`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold">
            {question ? "내신 문제 수정" : "새 내신 문제 추가"}
          </h2>
          <button onClick={onClose} disabled={isSaving}>
            <X size={24} />
          </button>
        </div>

        {/* 폼 */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium">학년 (Grade)</label>
              <input
                type="number"
                name="grade_level"
                value={formData.grade_level}
                onChange={handleChange}
                required
                className="w-full p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600"
              />
            </div>
            <div>
              <label className="block text-sm font-medium">문제 유형</label>
              <select
                name="question_type"
                value={formData.question_type}
                onChange={handleChange}
                className="w-full p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600"
              >
                <option value="MC">객관식 (MC)</option>
                <option value="CORRECT">문장 수정 (CORRECT)</option>
                <option value="CONSTRUCT">영작 (CONSTRUCT)</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium">
              문법 포인트 (Category)
            </label>
            <input
              type="text"
              name="grammar_point"
              value={formData.grammar_point}
              onChange={handleChange}
              required
              className="w-full p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600"
            />
          </div>
          <div>
            <label className="block text-sm font-medium">
              문제 본문 (Text)
            </label>
            <textarea
              name="question_text"
              value={formData.question_text}
              onChange={handleChange}
              required
              rows={4}
              className="w-full p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600"
            />
          </div>
          <div>
            <label className="block text-sm font-medium">
              객관식 선택지 (Choices JSON)
            </label>
            <textarea
              name="choices"
              value={formData.choices}
              onChange={handleChange}
              rows={5}
              className="w-full p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600 font-mono text-sm"
              placeholder='[{"id": 1, "text": "보기1"}, {"id": 2, "text": "보기2"}]'
            />
          </div>
          <div>
            <label className="block text-sm font-medium">
              영작 제시 단어 (쉼표로 구분)
            </label>
            <input
              type="text"
              name="scrambled_words"
              value={formData.scrambled_words}
              onChange={handleChange}
              className="w-full p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600"
              placeholder="word1, word2, word3"
            />
          </div>
          <div>
            <label className="block text-sm font-medium">
              정답 (Correct Answer)
            </label>
            <input
              type="text"
              name="correct_answer"
              value={formData.correct_answer}
              onChange={handleChange}
              required
              className="w-full p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600"
              placeholder="MC의 경우 정답 ID (예: '3'), 주관식은 정답 문장"
            />
          </div>
          <div>
            <label className="block text-sm font-medium">
              해설 (Explanation)
            </label>
            <textarea
              name="explanation"
              value={formData.explanation}
              onChange={handleChange}
              rows={3}
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
// 2. 내신 문제 관리 메인 페이지
// ------------------------------------------------------------------
export default function AdminExamPage() {
  const [questions, setQuestions] = useState<ExamQuestion[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [editingQuestion, setEditingQuestion] = useState<ExamQuestion | null>(
    null
  );
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  // --- 데이터 로딩 ---
  const fetchQuestions = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await adminGetExamQuestions();
      setQuestions(data);
    } catch (e: any) {
      setError(e.message);
      toast.error(`문제 목록 로드 실패: ${e.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchQuestions();
  }, []);

  // --- 이벤트 핸들러 ---
  const handleDelete = async (questionId: number, questionText: string) => {
    if (
      !confirm(
        `[문제 ID: ${questionId}] "${questionText.substring(
          0,
          20
        )}..." 문제를 정말 삭제하시겠습니까?`
      )
    ) {
      return;
    }
    toast.loading("문제를 삭제 중입니다...");
    try {
      await adminDeleteExamQuestion(questionId);
      toast.dismiss();
      toast.success("문제가 삭제되었습니다.");
      fetchQuestions(); // 목록 새로고침
    } catch (e: any) {
      toast.dismiss();
      toast.error(`삭제 실패: ${e.message}`);
    }
  };

  const handleModalClose = () => {
    setEditingQuestion(null);
    setIsCreateModalOpen(false);
  };

  const handleModalSave = () => {
    fetchQuestions(); // 저장 완료 시 목록 새로고침
  };

  // --- UI 렌더링 ---
  if (isLoading) {
    /* ... 로딩 UI ... */
  }
  if (error) {
    /* ... 에러 UI ... */
  }

  return (
    <div>
      {/* 모달 렌더링 */}
      {(isCreateModalOpen || editingQuestion) && (
        <ExamModal
          question={editingQuestion}
          onClose={handleModalClose}
          onSave={handleModalSave}
        />
      )}

      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold flex items-center">
          <FileText className="mr-3" />
          내신 문제 관리
        </h1>
        <button
          onClick={() => setIsCreateModalOpen(true)}
          className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 flex items-center"
        >
          <Plus size={18} className="mr-1" /> 새 문제 추가
        </button>
      </div>

      {/* 문제 목록 테이블 */}
      <div className="relative overflow-x-auto shadow-md rounded-lg">
        <table className="w-full text-sm text-left text-gray-500 dark:text-gray-400">
          <thead className="text-xs text-gray-700 uppercase bg-gray-100 dark:bg-gray-700 dark:text-gray-400">
            <tr>
              <th scope="col" className="px-4 py-3">
                ID
              </th>
              <th scope="col" className="px-4 py-3">
                문법 포인트 (Category)
              </th>
              <th scope="col" className="px-4 py-3">
                유형
              </th>
              <th scope="col" className="px-4 py-3">
                문제
              </th>
              <th scope="col" className="px-4 py-3">
                관리
              </th>
            </tr>
          </thead>
          <tbody>
            {questions.map((q) => (
              <tr
                key={q.id}
                className="bg-white dark:bg-gray-800 border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                <td className="px-4 py-3 font-medium">{q.id}</td>
                <td className="px-4 py-3">{q.grammar_point}</td>
                <td className="px-4 py-3">{q.question_type}</td>
                <td className="px-4 py-3 text-gray-900 dark:text-white max-w-md truncate">
                  {q.question_text}
                </td>
                <td className="px-4 py-3 flex space-x-2">
                  <button
                    onClick={() => setEditingQuestion(q)}
                    className="p-2 text-blue-600 hover:text-blue-800"
                    title="수정"
                  >
                    <Edit size={16} />
                  </button>
                  <button
                    onClick={() => handleDelete(q.id, q.question_text)}
                    className="p-2 text-red-600 hover:text-red-800"
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
