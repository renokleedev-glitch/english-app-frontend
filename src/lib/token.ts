// ✅ src/lib/token.ts
const TOKEN_KEY = "access_token";

/** 🔐 토큰 저장 */
export function setToken(token: string) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(TOKEN_KEY, token);
    console.log("🔐 Token saved to localStorage");
  } catch (err) {
    console.error("❌ Failed to save token:", err);
  }
}

/** 🔍 토큰 조회 */
export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const token = localStorage.getItem(TOKEN_KEY);
    return token || null;
  } catch (err) {
    console.error("❌ Failed to read token:", err);
    return null;
  }
}

/** 🧹 토큰 삭제 */
export function clearToken() {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(TOKEN_KEY);
    console.log("🧹 Token cleared from localStorage");
  } catch (err) {
    console.error("❌ Failed to clear token:", err);
  }
}

/** 🕒 로그인 직후 localStorage sync 보장용 */
export async function waitForTokenSync(delayMs = 100) {
  return new Promise((resolve) => setTimeout(resolve, delayMs));
}
