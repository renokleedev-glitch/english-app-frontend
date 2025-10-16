// src/lib/errors.ts
export function toErrorMessage(e: any): string {
  // axios 에러 형태?
  const data = e?.response?.data ?? e?.data ?? e;

  // FastAPI( Pydantic ) 예: { detail: [{ type, loc, msg, input } ...] }
  const detail = data?.detail ?? data?.message ?? data?.error ?? data;

  if (Array.isArray(detail)) {
    // 배열이면 msg만 뽑아 조인
    const msgs = detail
      .map((it: any) => it?.msg || it?.message || JSON.stringify(it))
      .filter(Boolean);
    return msgs.join("\n");
  }

  if (typeof detail === "object") {
    // 객체면 msg or message 우선, 없으면 JSON 문자열
    return detail?.msg || detail?.message || JSON.stringify(detail);
  }

  if (typeof detail === "string") return detail;

  // 최후
  return (e?.message as string) || "Unknown error";
}
