import type { AuthSession, AuthUser } from "./auth.types";

export const RIDER_ACCESS_TOKEN_KEY = "goodRapido.riderAccessToken";
export const RIDER_REFRESH_TOKEN_KEY = "goodRapido.riderRefreshToken";
export const RIDER_USER_KEY = "goodRapido.riderUser";

export const readAuthSession = (): AuthSession | null => {
  if (typeof window === "undefined") {
    return null;
  }

  const accessToken = localStorage.getItem(RIDER_ACCESS_TOKEN_KEY) ?? localStorage.getItem("goodRapido.accessToken");
  const refreshToken = localStorage.getItem(RIDER_REFRESH_TOKEN_KEY);

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
  localStorage.setItem(RIDER_ACCESS_TOKEN_KEY, session.tokens.accessToken);
  localStorage.setItem(RIDER_REFRESH_TOKEN_KEY, session.tokens.refreshToken);

  if (session.user) {
    localStorage.setItem(RIDER_USER_KEY, JSON.stringify(session.user));
  }
};

export const clearAuthSession = () => {
  localStorage.removeItem(RIDER_ACCESS_TOKEN_KEY);
  localStorage.removeItem(RIDER_REFRESH_TOKEN_KEY);
  localStorage.removeItem(RIDER_USER_KEY);
  localStorage.removeItem("goodRapido.accessToken");
  localStorage.removeItem("accessToken");
};

const readStoredUser = (): AuthUser | null => {
  const rawUser = localStorage.getItem(RIDER_USER_KEY);

  if (!rawUser) {
    return null;
  }

  try {
    return JSON.parse(rawUser) as AuthUser;
  } catch {
    localStorage.removeItem(RIDER_USER_KEY);
    return null;
  }
};
