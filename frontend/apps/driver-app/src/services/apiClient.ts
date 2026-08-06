import { createGoodRapidoApiClient } from "@good-rapido/api-client";

import {
  clearDriverAuthSession,
  readDriverAuthSession,
  saveDriverAuthSession
} from "@/features/auth/authStorage";
import type { DriverAuthSession } from "@/features/auth/auth.types";

const baseUrl = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:3000";
let refreshPromise: Promise<string | null> | null = null;

export const apiClient = createGoodRapidoApiClient({
  baseUrl,
  getAccessToken: () => getValidDriverAccessToken(),
  refreshAccessToken: () => refreshDriverAccessToken(),
  onUnauthorized: () => clearDriverAuthSession()
});

export const driverApiBaseUrl = baseUrl;

export const getValidDriverAccessToken = async () => {
  const accessToken = readDriverAuthSession()?.tokens.accessToken;

  if (accessToken && !isJwtExpiring(accessToken)) {
    return accessToken;
  }

  return refreshDriverAccessToken();
};

const refreshDriverAccessToken = () => {
  if (refreshPromise) {
    return refreshPromise;
  }

  refreshPromise = requestDriverTokenRefresh().finally(() => {
    refreshPromise = null;
  });

  return refreshPromise;
};

const requestDriverTokenRefresh = async () => {
  const refreshToken = readDriverAuthSession()?.tokens.refreshToken;

  if (!refreshToken) {
    return null;
  }

  try {
    const response = await fetch(`${baseUrl}/api/v1/private/auth/drivers/refresh`, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ refreshToken }),
      credentials: "include"
    });
    const payload = await response.json() as { data?: DriverAuthSession };

    if (!response.ok || !payload.data?.tokens.accessToken) {
      throw new Error("Driver session refresh failed");
    }

    saveDriverAuthSession(payload.data);
    return payload.data.tokens.accessToken;
  } catch {
    clearDriverAuthSession();
    return null;
  }
};

const isJwtExpiring = (token: string) => {
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
