import { useCallback, useState } from "react";

import { authService } from "./auth.service";
import { clearAuthSession, readAuthSession, saveAuthSession } from "./authStorage";
import type { AuthSession, LoginForm, RegisterForm } from "./auth.types";

export function useAuthSession() {
  const [session, setSession] = useState<AuthSession | null>(() => readAuthSession());

  const signIn = useCallback(async (form: LoginForm) => {
    const response = await authService.loginRider(form);

    if (!response.data) {
      throw new Error(response.message || "Login failed");
    }

    saveAuthSession(response.data);
    setSession(response.data);
    return response.message;
  }, []);

  const register = useCallback(async (form: RegisterForm) => {
    const response = await authService.registerRider(form);

    if (!response.data) {
      throw new Error(response.message || "Registration failed");
    }

    saveAuthSession(response.data);
    setSession(response.data);
    return response.message;
  }, []);

  const signOut = useCallback(() => {
    clearAuthSession();
    setSession(null);
    window.location.hash = "/";
  }, []);

  return {
    session,
    isAuthenticated: Boolean(session?.tokens.accessToken),
    signIn,
    register,
    signOut
  };
}
