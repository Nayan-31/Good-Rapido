import type { OpsAuthRole, OpsAuthSession, OpsAuthUser } from "./auth.types";

const ACCESS_TOKEN_KEY = "goodRapido.opsAccessToken";
const REFRESH_TOKEN_KEY = "goodRapido.opsRefreshToken";
const USER_KEY = "goodRapido.opsUser";
const ROLE_KEY = "goodRapido.opsRole";
export const OPS_AUTH_SESSION_CHANGED_EVENT = "goodRapido:opsAuthSessionChanged";
const OPS_AUTH_NOTICE_KEY = "goodRapido.opsAuthNotice";
const LEGACY_OPS_ACCESS_TOKEN_KEYS = ["goodRapido.accessToken", "accessToken"];
const LEGACY_OPS_REFRESH_TOKEN_KEYS = ["goodRapido.refreshToken", "refreshToken"];

export const readOpsAuthSession = (): OpsAuthSession | null => {
  if (typeof window === "undefined") {
    return null;
  }

  const accessToken = readSessionValue(ACCESS_TOKEN_KEY, LEGACY_OPS_ACCESS_TOKEN_KEYS);
  const refreshToken = readSessionValue(REFRESH_TOKEN_KEY, LEGACY_OPS_REFRESH_TOKEN_KEYS);
  const role = readStoredRole();
  const hasPartialSession = Boolean(accessToken || refreshToken || role || sessionStorage.getItem(USER_KEY) || localStorage.getItem(USER_KEY));

  if (!accessToken || !refreshToken || !role) {
    clearOpsAuthSessionStorage();
    if (hasPartialSession) {
      writeOpsAuthNotice("We cleared an incomplete ops session. Please sign in again.");
    }
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
  sessionStorage.removeItem(OPS_AUTH_NOTICE_KEY);
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
  localStorage.removeItem(ROLE_KEY);

  if (session.user) {
    sessionStorage.setItem(USER_KEY, JSON.stringify(session.user));
    localStorage.removeItem(USER_KEY);
  } else {
    sessionStorage.removeItem(USER_KEY);
    localStorage.removeItem(USER_KEY);
  }

  notifyOpsAuthSessionChanged();
};

export const clearOpsAuthSession = (notice?: string) => {
  clearOpsAuthSessionStorage();
  if (notice) {
    writeOpsAuthNotice(notice);
  }
  notifyOpsAuthSessionChanged();
};

export const consumeOpsAuthNotice = () => {
  const notice = sessionStorage.getItem(OPS_AUTH_NOTICE_KEY);
  sessionStorage.removeItem(OPS_AUTH_NOTICE_KEY);
  return notice;
};

const clearOpsAuthSessionStorage = () => {
  sessionStorage.removeItem(ACCESS_TOKEN_KEY);
  sessionStorage.removeItem(REFRESH_TOKEN_KEY);
  sessionStorage.removeItem(USER_KEY);
  sessionStorage.removeItem(ROLE_KEY);
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
  localStorage.removeItem(ROLE_KEY);
  LEGACY_OPS_ACCESS_TOKEN_KEYS.forEach((key) => localStorage.removeItem(key));
  LEGACY_OPS_REFRESH_TOKEN_KEYS.forEach((key) => localStorage.removeItem(key));
};

const writeOpsAuthNotice = (notice: string) => {
  sessionStorage.setItem(OPS_AUTH_NOTICE_KEY, notice);
};

const notifyOpsAuthSessionChanged = () => {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(OPS_AUTH_SESSION_CHANGED_EVENT));
  }
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
