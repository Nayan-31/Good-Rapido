import type { DriverAuthSession, DriverAuthUser } from "./auth.types";

export const DRIVER_ACCESS_TOKEN_KEY = "goodRapido.driverAccessToken";
export const DRIVER_REFRESH_TOKEN_KEY = "goodRapido.driverRefreshToken";
const DRIVER_USER_KEY = "goodRapido.driverUser";

export const readDriverAuthSession = (): DriverAuthSession | null => {
  if (typeof window === "undefined") {
    return null;
  }

  const accessToken = readSessionValue(DRIVER_ACCESS_TOKEN_KEY);
  const refreshToken = readSessionValue(DRIVER_REFRESH_TOKEN_KEY);

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
  sessionStorage.setItem(DRIVER_ACCESS_TOKEN_KEY, session.tokens.accessToken);
  sessionStorage.setItem(DRIVER_REFRESH_TOKEN_KEY, session.tokens.refreshToken);
  localStorage.removeItem(DRIVER_ACCESS_TOKEN_KEY);
  localStorage.removeItem(DRIVER_REFRESH_TOKEN_KEY);

  if (session.user) {
    sessionStorage.setItem(DRIVER_USER_KEY, JSON.stringify(session.user));
    localStorage.removeItem(DRIVER_USER_KEY);
  }
};

export const clearDriverAuthSession = () => {
  sessionStorage.removeItem(DRIVER_ACCESS_TOKEN_KEY);
  sessionStorage.removeItem(DRIVER_REFRESH_TOKEN_KEY);
  sessionStorage.removeItem(DRIVER_USER_KEY);
  localStorage.removeItem(DRIVER_ACCESS_TOKEN_KEY);
  localStorage.removeItem(DRIVER_REFRESH_TOKEN_KEY);
  localStorage.removeItem(DRIVER_USER_KEY);
};

const readStoredDriverUser = (): DriverAuthUser | null => {
  const rawUser = readSessionValue(DRIVER_USER_KEY);

  if (!rawUser) {
    return null;
  }

  try {
    return JSON.parse(rawUser) as DriverAuthUser;
  } catch {
    sessionStorage.removeItem(DRIVER_USER_KEY);
    localStorage.removeItem(DRIVER_USER_KEY);
    return null;
  }
};

const readSessionValue = (key: string) => {
  const sessionValue = sessionStorage.getItem(key);

  if (sessionValue) {
    return sessionValue;
  }

  const legacyValue = localStorage.getItem(key);

  if (legacyValue) {
    sessionStorage.setItem(key, legacyValue);
    localStorage.removeItem(key);
  }

  return legacyValue;
};
