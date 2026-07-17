import type { DriverAuthSession, DriverAuthUser } from "./auth.types";

export const DRIVER_ACCESS_TOKEN_KEY = "goodRapido.driverAccessToken";
export const DRIVER_REFRESH_TOKEN_KEY = "goodRapido.driverRefreshToken";
const DRIVER_USER_KEY = "goodRapido.driverUser";

export const readDriverAuthSession = (): DriverAuthSession | null => {
  if (typeof window === "undefined") {
    return null;
  }

  const accessToken = localStorage.getItem(DRIVER_ACCESS_TOKEN_KEY);
  const refreshToken = localStorage.getItem(DRIVER_REFRESH_TOKEN_KEY);

  if (!accessToken || !refreshToken) {
    return null;
  }

  return {
    user: readStoredDriverUser(),
    tokens: {
      accessToken,
      refreshToken
    }
  };
};

export const saveDriverAuthSession = (session: DriverAuthSession) => {
  localStorage.setItem(DRIVER_ACCESS_TOKEN_KEY, session.tokens.accessToken);
  localStorage.setItem(DRIVER_REFRESH_TOKEN_KEY, session.tokens.refreshToken);

  if (session.user) {
    localStorage.setItem(DRIVER_USER_KEY, JSON.stringify(session.user));
  }
};

export const clearDriverAuthSession = () => {
  localStorage.removeItem(DRIVER_ACCESS_TOKEN_KEY);
  localStorage.removeItem(DRIVER_REFRESH_TOKEN_KEY);
  localStorage.removeItem(DRIVER_USER_KEY);
};

const readStoredDriverUser = (): DriverAuthUser | null => {
  const rawUser = localStorage.getItem(DRIVER_USER_KEY);

  if (!rawUser) {
    return null;
  }

  try {
    return JSON.parse(rawUser) as DriverAuthUser;
  } catch {
    localStorage.removeItem(DRIVER_USER_KEY);
    return null;
  }
};
