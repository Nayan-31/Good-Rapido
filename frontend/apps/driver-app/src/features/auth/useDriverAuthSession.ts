import { useCallback, useEffect, useState } from "react";

import { clearDriverAuthSession, readDriverAuthSession, saveDriverAuthSession } from "./authStorage";
import { driverAuthService } from "./auth.service";
import type { DriverAuthSession, DriverLoginForm, DriverRegisterForm } from "./auth.types";

export function useDriverAuthSession() {
  const [session, setSession] = useState<DriverAuthSession | null>(() => readDriverAuthSession());
  const [isRestoring, setIsRestoring] = useState(false);

  const applySession = useCallback((nextSession: DriverAuthSession) => {
    saveDriverAuthSession(nextSession);
    setSession(nextSession);
  }, []);

  const restoreSession = useCallback(async () => {
    const storedSession = readDriverAuthSession();

    if (!storedSession?.tokens.refreshToken) {
      clearDriverAuthSession();
      setSession(null);
      return "No saved driver session found";
    }

    setIsRestoring(true);

    try {
      if (storedSession.tokens.accessToken) {
        try {
          const profileResponse = await driverAuthService.getDriverSession();
          const restoredSession = {
            ...storedSession,
            user: profileResponse.data?.user ?? storedSession.user
          };

          applySession(restoredSession);
          return profileResponse.message || "Driver session restored";
        } catch {
          // Access token may be expired. Refresh token handles the real restore path below.
        }
      }

      const refreshResponse = await driverAuthService.refreshDriver(storedSession.tokens.refreshToken);

      if (!refreshResponse.data) {
        throw new Error(refreshResponse.message || "Driver session restore failed");
      }

      applySession(refreshResponse.data);
      return refreshResponse.message || "Driver session restored";
    } catch (error) {
      clearDriverAuthSession();
      setSession(null);
      throw error;
    } finally {
      setIsRestoring(false);
    }
  }, [applySession]);

  const signIn = useCallback(
    async (form: DriverLoginForm) => {
      const response = await driverAuthService.loginDriver(form);

      if (!response.data) {
        throw new Error(response.message || "Driver login failed");
      }

      applySession(response.data);
      return response.message;
    },
    [applySession]
  );

  const register = useCallback(
    async (form: DriverRegisterForm) => {
      const response = await driverAuthService.registerDriver(form);

      if (!response.data) {
        throw new Error(response.message || "Driver registration failed");
      }

      applySession(response.data);
      return response.message;
    },
    [applySession]
  );

  const signOut = useCallback(async () => {
    const refreshToken = session?.tokens.refreshToken ?? readDriverAuthSession()?.tokens.refreshToken;

    try {
      if (refreshToken) {
        await driverAuthService.logoutDriver(refreshToken);
      }
    } finally {
      clearDriverAuthSession();
      setSession(null);
    }
  }, [session?.tokens.refreshToken]);

  useEffect(() => {
    if (!readDriverAuthSession()) {
      return;
    }

    void restoreSession().catch(() => {
      // The hook exposes logged-out state after a failed restore.
    });
  }, [restoreSession]);

  return {
    session,
    isAuthenticated: Boolean(session?.tokens.accessToken),
    isRestoring,
    signIn,
    register,
    restoreSession,
    signOut
  };
}
