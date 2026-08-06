import type { DriverAuthSession, DriverAuthUser } from "./auth.types";

export const DRIVER_ACCESS_TOKEN_KEY = "goodRapido.driverAccessToken";
export const DRIVER_REFRESH_TOKEN_KEY = "goodRapido.driverRefreshToken";
export const DRIVER_AUTH_SESSION_CHANGED_EVENT = "goodRapido:driverAuthSessionChanged";
const DRIVER_USER_KEY = "goodRapido.driverUser";
const LEGACY_DRIVER_ACCESS_TOKEN_KEYS = ["goodRapido.accessToken", "accessToken"];
const LEGACY_DRIVER_REFRESH_TOKEN_KEYS = ["goodRapido.refreshToken", "refreshToken"];

export const readDriverAuthSession = (): DriverAuthSession | null => {
  if (typeof window === "undefined") {
    return null;
  }

  const accessToken = readSessionValue(DRIVER_ACCESS_TOKEN_KEY, LEGACY_DRIVER_ACCESS_TOKEN_KEYS);
  const refreshToken = readSessionValue(DRIVER_REFRESH_TOKEN_KEY, LEGACY_DRIVER_REFRESH_TOKEN_KEYS);

  if (!accessToken || !refreshToken) {
    clearDriverAuthSessionStorage();
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
  } else {
    sessionStorage.removeItem(DRIVER_USER_KEY);
    localStorage.removeItem(DRIVER_USER_KEY);
  }

  notifyDriverAuthSessionChanged();
};

export const clearDriverAuthSession = () => {
  clearDriverAuthSessionStorage();
  notifyDriverAuthSessionChanged();
};

const clearDriverAuthSessionStorage = () => {
  sessionStorage.removeItem(DRIVER_ACCESS_TOKEN_KEY);
  sessionStorage.removeItem(DRIVER_REFRESH_TOKEN_KEY);
  sessionStorage.removeItem(DRIVER_USER_KEY);
  localStorage.removeItem(DRIVER_ACCESS_TOKEN_KEY);
  localStorage.removeItem(DRIVER_REFRESH_TOKEN_KEY);
  localStorage.removeItem(DRIVER_USER_KEY);
  LEGACY_DRIVER_ACCESS_TOKEN_KEYS.forEach((key) => localStorage.removeItem(key));
  LEGACY_DRIVER_REFRESH_TOKEN_KEYS.forEach((key) => localStorage.removeItem(key));
};

const notifyDriverAuthSessionChanged = () => {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(DRIVER_AUTH_SESSION_CHANGED_EVENT));
  }
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

const readSessionValue = (key: string, legacyKeys: string[] = []) => {
  const sessionValue = sessionStorage.getItem(key);

  if (sessionValue) {
    return sessionValue;
  }

  const legacyValue = [key, ...legacyKeys]
    .map((legacyKey) => localStorage.getItem(legacyKey))
    .find((value): value is string => Boolean(value));

  if (legacyValue) {
    sessionStorage.setItem(key, legacyValue);
    [key, ...legacyKeys].forEach((legacyKey) => localStorage.removeItem(legacyKey));
  }

  return legacyValue ?? null;
};
