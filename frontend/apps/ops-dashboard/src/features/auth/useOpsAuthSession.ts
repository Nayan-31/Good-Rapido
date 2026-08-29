import { useCallback, useEffect, useState } from "react";

import {
  clearOpsAuthSession,
  OPS_AUTH_SESSION_CHANGED_EVENT,
  readOpsAuthSession,
  saveOpsAuthSession
} from "./authStorage";
import { opsAuthService } from "./auth.service";
import type { OpsAuthSession, OpsLoginForm } from "./auth.types";

export function useOpsAuthSession() {
  const [session, setSession] = useState<OpsAuthSession | null>(() => readOpsAuthSession());
  const [isRestoring, setIsRestoring] = useState(false);

  const applySession = useCallback((nextSession: OpsAuthSession) => {
    saveOpsAuthSession(nextSession);
    setSession(nextSession);
  }, []);

  const signIn = useCallback(
    async (form: OpsLoginForm) => {
      const response = await opsAuthService.login(form);

      if (!response.data) {
        throw new Error(response.message || "Ops login failed");
      }

      applySession(response.data);
      return response.message || "Ops session ready";
    },
    [applySession]
  );

  const restoreSession = useCallback(async () => {
    const storedSession = readOpsAuthSession();

    if (!storedSession?.tokens.refreshToken) {
      clearOpsAuthSession();
      setSession(null);
      return "No saved ops session found";
    }

    setIsRestoring(true);

    try {
      if (storedSession.tokens.accessToken) {
        try {
          const profileResponse = await opsAuthService.getMe(storedSession.role);
          const restoredSession = {
            ...storedSession,
            user: profileResponse.data?.user ?? storedSession.user
          };

          applySession(restoredSession);
          return profileResponse.message || "Ops session restored";
        } catch {
          // Refresh below handles expired access tokens.
        }
      }

      const refreshResponse = await opsAuthService.refresh(storedSession.role, storedSession.tokens.refreshToken);

      if (!refreshResponse.data) {
        throw new Error(refreshResponse.message || "Ops session restore failed");
      }

      applySession(refreshResponse.data);
      return refreshResponse.message || "Ops session restored";
    } catch (error) {
      clearOpsAuthSession("Saved ops session expired. Please sign in again.");
      setSession(null);
      throw error;
    } finally {
      setIsRestoring(false);
    }
  }, [applySession]);

  const signOut = useCallback(async () => {
    const storedSession = session ?? readOpsAuthSession();

    try {
      if (storedSession?.tokens.refreshToken) {
        await opsAuthService.logout(storedSession.role, storedSession.tokens.refreshToken);
      }
    } finally {
      clearOpsAuthSession("You have been signed out safely.");
      setSession(null);
    }
  }, [session]);

  useEffect(() => {
    if (!readOpsAuthSession()) {
      return;
    }

    void restoreSession().catch(() => {
      // Failed restore intentionally exposes logged-out state.
    });
  }, [restoreSession]);

  useEffect(() => {
    const syncStoredSession = () => setSession(readOpsAuthSession());

    window.addEventListener(OPS_AUTH_SESSION_CHANGED_EVENT, syncStoredSession);

    return () => window.removeEventListener(OPS_AUTH_SESSION_CHANGED_EVENT, syncStoredSession);
  }, []);

  const isAuthenticated = Boolean(session?.tokens.accessToken) || isRestoring;

  return {
    session,
    isAuthenticated,
    isRestoring,
    signIn,
    refreshSession: restoreSession,
    restoreSession,
    signOut
  };
}
