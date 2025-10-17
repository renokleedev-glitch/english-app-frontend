// src/lib/token.ts
const TOKEN_KEY = "access_token";

/** ✅ 토큰 저장 (클라이언트에서만 작동) */
export function setToken(token: string) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(TOKEN_KEY, token);
    console.log("🔐 Token saved to localStorage");
  } catch (err) {
    console.error("❌ Failed to set token:", err);
  }
}

/** ✅ 토큰 가져오기 (SSR 방어 포함) */
export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const token = localStorage.getItem(TOKEN_KEY);
    return token || null;
  } catch (err) {
    console.error("❌ Failed to get token:", err);
    return null;
  }
}

/** ✅ 토큰 삭제 (로그아웃 시 사용) */
export function clearToken() {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(TOKEN_KEY);
    console.log("🧹 Token cleared from localStorage");
  } catch (err) {
    console.error("❌ Failed to clear token:", err);
  }
}

/** ✅ (선택) 로그인 직후 동기화 안전 대기용 */
export async function waitForTokenSync(delayMs = 50) {
  return new Promise((resolve) => setTimeout(resolve, delayMs));
}
