import type { OpsAuthRole, OpsAuthSession, OpsAuthUser } from "./auth.types";

const ACCESS_TOKEN_KEY = "goodRapido.opsAccessToken";
const REFRESH_TOKEN_KEY = "goodRapido.opsRefreshToken";
const USER_KEY = "goodRapido.opsUser";
const ROLE_KEY = "goodRapido.opsRole";

export const readOpsAuthSession = (): OpsAuthSession | null => {
  if (typeof window === "undefined") {
    return null;
  }

  const accessToken = localStorage.getItem(ACCESS_TOKEN_KEY);
  const refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY);
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
  localStorage.setItem(ACCESS_TOKEN_KEY, session.tokens.accessToken);
  localStorage.setItem(REFRESH_TOKEN_KEY, session.tokens.refreshToken);
  localStorage.setItem(ROLE_KEY, session.role);

  if (session.user) {
    localStorage.setItem(USER_KEY, JSON.stringify(session.user));
  }
};

export const clearOpsAuthSession = () => {
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
  localStorage.removeItem(ROLE_KEY);
};

const readStoredRole = (): OpsAuthRole | null => {
  const role = localStorage.getItem(ROLE_KEY);

  if (role === "admin" || role === "ops") {
    return role;
  }

  return null;
};

const readStoredUser = (): OpsAuthUser | null => {
  const rawUser = localStorage.getItem(USER_KEY);

  if (!rawUser) {
    return null;
  }

  try {
    return JSON.parse(rawUser) as OpsAuthUser;
  } catch {
    localStorage.removeItem(USER_KEY);
    return null;
  }
};
