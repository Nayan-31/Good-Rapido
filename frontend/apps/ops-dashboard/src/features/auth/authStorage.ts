import type { OpsAuthRole, OpsAuthSession, OpsAuthUser } from "./auth.types";

const ACCESS_TOKEN_KEY = "goodRapido.opsAccessToken";
const REFRESH_TOKEN_KEY = "goodRapido.opsRefreshToken";
const USER_KEY = "goodRapido.opsUser";
const ROLE_KEY = "goodRapido.opsRole";

export const readOpsAuthSession = (): OpsAuthSession | null => {
  if (typeof window === "undefined") {
    return null;
  }

  const accessToken = readSessionValue(ACCESS_TOKEN_KEY);
  const refreshToken = readSessionValue(REFRESH_TOKEN_KEY);
  const role = readStoredRole();

  if (!accessToken || !refreshToken || !role) {
    return null;
  }

  return {
    role,
    user: readStoredUser(),
    tokens: {
      accessToken,
      refreshToken
    }
  };
};

export const saveOpsAuthSession = (session: OpsAuthSession) => {
  sessionStorage.setItem(ACCESS_TOKEN_KEY, session.tokens.accessToken);
  sessionStorage.setItem(REFRESH_TOKEN_KEY, session.tokens.refreshToken);
  sessionStorage.setItem(ROLE_KEY, session.role);
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
  localStorage.removeItem(ROLE_KEY);

  if (session.user) {
    sessionStorage.setItem(USER_KEY, JSON.stringify(session.user));
    localStorage.removeItem(USER_KEY);
  }
};

export const clearOpsAuthSession = () => {
  sessionStorage.removeItem(ACCESS_TOKEN_KEY);
  sessionStorage.removeItem(REFRESH_TOKEN_KEY);
  sessionStorage.removeItem(USER_KEY);
  sessionStorage.removeItem(ROLE_KEY);
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
  localStorage.removeItem(ROLE_KEY);
};

const readStoredRole = (): OpsAuthRole | null => {
  const role = readSessionValue(ROLE_KEY);

  if (role === "admin" || role === "ops") {
    return role;
  }

  return null;
};

const readStoredUser = (): OpsAuthUser | null => {
  const rawUser = readSessionValue(USER_KEY);

  if (!rawUser) {
    return null;
  }

  try {
    return JSON.parse(rawUser) as OpsAuthUser;
  } catch {
    sessionStorage.removeItem(USER_KEY);
    localStorage.removeItem(USER_KEY);
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
