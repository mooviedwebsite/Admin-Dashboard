import { useState, useEffect, useCallback } from "react";
import { apiFetch, setToken, clearToken } from "@/lib/api";

interface AdminUser {
  id: number;
  name: string;
  email: string;
  isAdmin: boolean;
}

interface AuthState {
  user: AdminUser | null;
  loading: boolean;
}

export function useAuth() {
  const [state, setState] = useState<AuthState>({ user: null, loading: true });

  const verify = useCallback(async () => {
    const token = localStorage.getItem("admin_token");
    if (!token) {
      setState({ user: null, loading: false });
      return;
    }
    try {
      const user = await apiFetch<AdminUser>("/auth/me");
      setState({ user, loading: false });
    } catch {
      clearToken();
      setState({ user: null, loading: false });
    }
  }, []);

  useEffect(() => {
    verify();
  }, [verify]);

  const login = useCallback(
    async (email: string, password: string): Promise<void> => {
      const data = await apiFetch<{ user: AdminUser; token: string }>(
        "/admin/login",
        {
          method: "POST",
          body: JSON.stringify({ email, password }),
        }
      );
      setToken(data.token);
      setState({ user: data.user, loading: false });
    },
    []
  );

  const logout = useCallback(() => {
    clearToken();
    setState({ user: null, loading: false });
  }, []);

  return { ...state, login, logout };
}
