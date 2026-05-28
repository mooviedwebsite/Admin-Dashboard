import { useState, useEffect, useCallback } from "react";
import { apiFetch, setUserToken, clearUserToken } from "@/lib/api";

export interface User {
  id: number;
  name: string;
  email: string;
  isAdmin?: boolean;
}

interface AuthState {
  user: User | null;
  loading: boolean;
}

export function useUserAuth() {
  const [state, setState] = useState<AuthState>({ user: null, loading: true });

  const verify = useCallback(async () => {
    const token = localStorage.getItem("user_token");
    if (!token) {
      setState({ user: null, loading: false });
      return;
    }
    try {
      const user = await apiFetch<User>("/auth/me", {}, true);
      setState({ user, loading: false });
    } catch {
      clearUserToken();
      setState({ user: null, loading: false });
    }
  }, []);

  useEffect(() => {
    verify();
  }, [verify]);

  const login = useCallback(async (email: string, password: string) => {
    const data = await apiFetch<{ user: User; token: string }>(
      "/auth/login",
      { method: "POST", body: JSON.stringify({ email, password }) }
    );
    setUserToken(data.token);
    setState({ user: data.user, loading: false });
  }, []);

  const register = useCallback(async (name: string, email: string, password: string) => {
    const data = await apiFetch<{ user: User; token: string }>(
      "/auth/register",
      { method: "POST", body: JSON.stringify({ name, email, password }) }
    );
    setUserToken(data.token);
    setState({ user: data.user, loading: false });
  }, []);

  const logout = useCallback(() => {
    clearUserToken();
    setState({ user: null, loading: false });
  }, []);

  return { ...state, login, register, logout };
}
