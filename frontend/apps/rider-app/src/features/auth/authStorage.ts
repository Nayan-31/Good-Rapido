import type { AuthSession, AuthUser } from "./auth.types";

export const RIDER_ACCESS_TOKEN_KEY = "goodRapido.riderAccessToken";
export const RIDER_REFRESH_TOKEN_KEY = "goodRapido.riderRefreshToken";
export const RIDER_USER_KEY = "goodRapido.riderUser";
const LEGACY_RIDER_ACCESS_TOKEN_KEYS = ["goodRapido.accessToken", "accessToken"];

export const readAuthSession = (): AuthSession | null => {
  if (typeof window === "undefined") {
    return null;
  }

  const accessToken = readSessionValue(RIDER_ACCESS_TOKEN_KEY, LEGACY_RIDER_ACCESS_TOKEN_KEYS);
  const refreshToken = readSessionValue(RIDER_REFRESH_TOKEN_KEY);

  if (!accessToken || !refreshToken) {
    return null;
  }

  return {
    user: readStoredUser(),
    tokens: {
      accessToken,
      refreshToken
    }
  };
};

export const saveAuthSession = (session: AuthSession) => {
  sessionStorage.setItem(RIDER_ACCESS_TOKEN_KEY, session.tokens.accessToken);
  sessionStorage.setItem(RIDER_REFRESH_TOKEN_KEY, session.tokens.refreshToken);
  localStorage.removeItem(RIDER_ACCESS_TOKEN_KEY);
  localStorage.removeItem(RIDER_REFRESH_TOKEN_KEY);

  if (session.user) {
    sessionStorage.setItem(RIDER_USER_KEY, JSON.stringify(session.user));
    localStorage.removeItem(RIDER_USER_KEY);
  }
};

export const clearAuthSession = () => {
  sessionStorage.removeItem(RIDER_ACCESS_TOKEN_KEY);
  sessionStorage.removeItem(RIDER_REFRESH_TOKEN_KEY);
  sessionStorage.removeItem(RIDER_USER_KEY);
  localStorage.removeItem(RIDER_ACCESS_TOKEN_KEY);
  localStorage.removeItem(RIDER_REFRESH_TOKEN_KEY);
  localStorage.removeItem(RIDER_USER_KEY);
  LEGACY_RIDER_ACCESS_TOKEN_KEYS.forEach((key) => localStorage.removeItem(key));
};

const readStoredUser = (): AuthUser | null => {
  const rawUser = readSessionValue(RIDER_USER_KEY);

  if (!rawUser) {
    return null;
  }

  try {
    return JSON.parse(rawUser) as AuthUser;
  } catch {
    sessionStorage.removeItem(RIDER_USER_KEY);
    localStorage.removeItem(RIDER_USER_KEY);
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
