import type { AuthSession, AuthUser } from "./auth.types";

const ACCESS_TOKEN_KEY = "goodRapido.riderAccessToken";
const REFRESH_TOKEN_KEY = "goodRapido.riderRefreshToken";
const USER_KEY = "goodRapido.riderUser";

export const readAuthSession = (): AuthSession | null => {
  if (typeof window === "undefined") {
    return null;
  }

  const accessToken = localStorage.getItem(ACCESS_TOKEN_KEY) ?? localStorage.getItem("goodRapido.accessToken");
  const refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY);

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
  localStorage.setItem(ACCESS_TOKEN_KEY, session.tokens.accessToken);
  localStorage.setItem(REFRESH_TOKEN_KEY, session.tokens.refreshToken);

  if (session.user) {
    localStorage.setItem(USER_KEY, JSON.stringify(session.user));
  }
};

export const clearAuthSession = () => {
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
  localStorage.removeItem("goodRapido.accessToken");
  localStorage.removeItem("accessToken");
};

const readStoredUser = (): AuthUser | null => {
  const rawUser = localStorage.getItem(USER_KEY);

  if (!rawUser) {
    return null;
  }

  try {
    return JSON.parse(rawUser) as AuthUser;
  } catch {
    localStorage.removeItem(USER_KEY);
    return null;
  }
};
