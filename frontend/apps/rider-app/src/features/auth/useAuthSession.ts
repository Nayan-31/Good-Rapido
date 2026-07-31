import { useCallback, useEffect, useState } from "react";

import { authService } from "./auth.service";
import { clearAuthSession, readAuthSession, saveAuthSession } from "./authStorage";
import type { AuthSession, LoginForm, RegisterForm } from "./auth.types";

export function useAuthSession() {
  const [session, setSession] = useState<AuthSession | null>(() => readAuthSession());
  const [isRestoring, setIsRestoring] = useState(false);

  const applySession = useCallback((nextSession: AuthSession) => {
    saveAuthSession(nextSession);
    setSession(nextSession);
  }, []);

  const restoreSession = useCallback(async () => {
    const storedSession = readAuthSession();

    if (!storedSession?.tokens.refreshToken) {
      clearAuthSession();
      setSession(null);
      return "No saved rider session found";
    }

    setIsRestoring(true);

    try {
      if (storedSession.tokens.accessToken) {
        try {
          const profileResponse = await authService.getRiderSession();
          const restoredSession = {
            ...storedSession,
            user: profileResponse.data?.user ?? storedSession.user
          };

          applySession(restoredSession);
          return profileResponse.message || "Rider session restored";
        } catch {
          // Access token may be expired. Refresh token handles the real restore path below.
        }
      }

      const refreshResponse = await authService.refreshRider(storedSession.tokens.refreshToken);

      if (!refreshResponse.data) {
        throw new Error(refreshResponse.message || "Rider session restore failed");
      }

      applySession(refreshResponse.data);
      return refreshResponse.message || "Rider session restored";
    } catch (error) {
      clearAuthSession();
      setSession(null);
      throw error;
    } finally {
      setIsRestoring(false);
    }
  }, [applySession]);

  const signIn = useCallback(
    async (form: LoginForm) => {
      const response = await authService.loginRider(form);

      if (!response.data) {
        throw new Error(response.message || "Login failed");
      }

      applySession(response.data);
      return response.message;
    },
    [applySession]
  );

  const register = useCallback(
    async (form: RegisterForm) => {
      const response = await authService.registerRider(form);

      if (!response.data) {
        throw new Error(response.message || "Registration failed");
      }

      applySession(response.data);
      return response.message;
    },
    [applySession]
  );

  const signOut = useCallback(async () => {
    const refreshToken = session?.tokens.refreshToken ?? readAuthSession()?.tokens.refreshToken;

    try {
      if (refreshToken) {
        await authService.logoutRider(refreshToken);
      }
    } finally {
      clearAuthSession();
      setSession(null);
      window.location.hash = "/";
    }
  }, [session?.tokens.refreshToken]);

  useEffect(() => {
    if (!readAuthSession()) {
      return;
    }

    void restoreSession().catch(() => {
      // The hook exposes logged-out state after a failed restore.
    });
  }, [restoreSession]);

  const isAuthenticated = Boolean(session?.tokens.accessToken) || isRestoring;

  return {
    session,
    isAuthenticated,
    isRestoring,
    restoreSession,
    signIn,
    register,
    signOut
  };
}
