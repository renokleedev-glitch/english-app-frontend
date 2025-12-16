import { api } from "./api";
import { setToken, clearToken } from "./token";
import { useAuthStore } from "@/store/authStore";
import { loginUser } from "./api"; // 👈 [수정] 일관성을 위해 api.ts의 loginUser 사용 (선택 사항)
import { AxiosError } from "axios"; // 👈 Axios를 사용한다면 필요합니다.

export async function login(email: string, password: string) {
  try {
    const params = new URLSearchParams();
    params.append("username", email);
    params.append("password", password);

    const res = await api.post("/api/login/token", params, {
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
    });

    const token = res.data?.access_token;

    if (token) {
      setToken(token);
      const fetchUser = useAuthStore.getState().fetchUser;
      await fetchUser();

      // ✅ 성공 시: 성공했다는 신호(true) 반환
      return { success: true };
    }

    return { success: false, error: "토큰을 받아오지 못했습니다." };
  } catch (error) {
    const axiosError = error as AxiosError;
    let errorMessage = "로그인 중 알 수 없는 오류가 발생했습니다.";

    // 🚨 백엔드 에러 응답 처리 (400, 401 등)
    if (axiosError.response) {
      // 아까 했던 방식(inline type assertion) 그대로 적용
      const errorData = axiosError.response.data as { detail: string };

      // 백엔드 메시지가 있으면 보여주고, 없으면 기본 메시지 ("이메일 또는 비밀번호가...")
      errorMessage = errorData.detail || "이메일 또는 비밀번호를 확인해주세요.";
    }

    // ❌ 실패 시: 에러 메시지 반환
    return { success: false, error: errorMessage };
  }
}

export async function signup(
  email: string,
  password: string,
  nickname: string,
  phoneNumber?: string
) {
  try {
    const res = await api.post("/api/users/", {
      email,
      password,
      nickname,
      phone_number: phoneNumber,
    });

    // 1. 성공 시 자동 로그인
    if (res.status === 200 || res.status === 201) {
      await login(email, password);
      return { success: true, data: res.data };
    }
    return { success: false, error: "회원가입에 실패했습니다." };
  } catch (error) {
    const axiosError = error as AxiosError;

    if (axiosError.response && axiosError.response.status === 400) {
      // 💡 [수정] 별도 인터페이스 파일 없이, 여기서 바로 타입을 알려줍니다.
      const errorData = axiosError.response.data as { detail: string };

      // 이제 빨간줄 없이 detail에 접근 가능합니다.
      const errorMessage = errorData.detail || "이미 존재하는 아이디입니다.";

      return { success: false, error: errorMessage };
    }
    // ⚠️ 추가: 400 에러가 아닌 다른 에러(500 등)가 났을 때 처리
    return { success: false, error: "알 수 없는 오류가 발생했습니다." };
  }
}

export function logout() {
  clearToken();
  useAuthStore.getState().logout();
}
