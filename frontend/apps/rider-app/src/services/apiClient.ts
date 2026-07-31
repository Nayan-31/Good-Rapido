import { createGoodRapidoApiClient } from "@good-rapido/api-client";

import {
  clearAuthSession,
  RIDER_ACCESS_TOKEN_KEY,
  RIDER_REFRESH_TOKEN_KEY,
  RIDER_USER_KEY
} from "@/features/auth/authStorage";
import type { AuthSession } from "@/features/auth/auth.types";

const baseUrl = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:5000";
let refreshPromise: Promise<string | null> | null = null;

export const apiClient = createGoodRapidoApiClient({
  baseUrl,
  getAccessToken: () => getValidRiderAccessToken()
});

const getValidRiderAccessToken = async () => {
  const accessToken =
    localStorage.getItem(RIDER_ACCESS_TOKEN_KEY) ??
    localStorage.getItem("goodRapido.accessToken") ??
    localStorage.getItem("accessToken");

  if (accessToken && !isJwtExpired(accessToken)) {
    return accessToken;
  }

  return refreshRiderAccessToken();
};

const refreshRiderAccessToken = () => {
  if (refreshPromise) {
    return refreshPromise;
  }

  refreshPromise = requestRiderTokenRefresh().finally(() => {
    refreshPromise = null;
  });

  return refreshPromise;
};

const requestRiderTokenRefresh = async () => {
  const refreshToken = localStorage.getItem(RIDER_REFRESH_TOKEN_KEY);

  if (!refreshToken) {
    return null;
  }

  try {
    const response = await fetch(`${baseUrl}/api/v1/public/auth/riders/refresh`, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ refreshToken }),
      credentials: "include"
    });
    const payload = await response.json() as { data?: AuthSession };

    if (!response.ok || !payload.data?.tokens.accessToken) {
      throw new Error("Rider session refresh failed");
    }

    localStorage.setItem(RIDER_ACCESS_TOKEN_KEY, payload.data.tokens.accessToken);
    localStorage.setItem(RIDER_REFRESH_TOKEN_KEY, payload.data.tokens.refreshToken);

    if (payload.data.user) {
      localStorage.setItem(RIDER_USER_KEY, JSON.stringify(payload.data.user));
    }

    return payload.data.tokens.accessToken;
  } catch {
    clearAuthSession();
    return null;
  }
};

const isJwtExpired = (token: string) => {
  const payload = decodeJwtPayload(token);
  const expiresAtSeconds = typeof payload?.exp === "number" ? payload.exp : 0;
  const refreshBufferSeconds = 30;

  if (!expiresAtSeconds) {
    return true;
  }

  return expiresAtSeconds <= Math.floor(Date.now() / 1000) + refreshBufferSeconds;
};

const decodeJwtPayload = (token: string): { exp?: number } | null => {
  try {
    const payloadPart = token.split(".")[1];

    if (!payloadPart) {
      return null;
    }

    const normalizedPayload = payloadPart.replace(/-/g, "+").replace(/_/g, "/");
    const paddedPayload = normalizedPayload.padEnd(
      normalizedPayload.length + ((4 - (normalizedPayload.length % 4)) % 4),
      "="
    );

    return JSON.parse(atob(paddedPayload)) as { exp?: number };
  } catch {
    return null;
  }
};
