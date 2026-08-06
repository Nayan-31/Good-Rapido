import { createGoodRapidoApiClient } from "@good-rapido/api-client";

import {
  clearOpsAuthSession,
  readOpsAuthSession,
  saveOpsAuthSession
} from "@/features/auth/authStorage";
import type { OpsAuthRole, OpsAuthSession, OpsAuthUser } from "@/features/auth/auth.types";

const baseUrl = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:3000";
let refreshPromise: Promise<string | null> | null = null;

type OpsRefreshResponse = {
  user: OpsAuthUser;
  tokens: OpsAuthSession["tokens"];
};

export const apiClient = createGoodRapidoApiClient({
  baseUrl,
  getAccessToken: () => getValidOpsAccessToken(),
  refreshAccessToken: () => refreshOpsAccessToken(),
  onUnauthorized: () => clearOpsAuthSession()
});

export const opsApiBaseUrl = baseUrl;

export const getValidOpsAccessToken = async () => {
  const accessToken = readOpsAuthSession()?.tokens.accessToken;

  if (accessToken && !isJwtExpiring(accessToken)) {
    return accessToken;
  }

  return refreshOpsAccessToken();
};

const refreshOpsAccessToken = () => {
  if (refreshPromise) {
    return refreshPromise;
  }

  refreshPromise = requestOpsTokenRefresh().finally(() => {
    refreshPromise = null;
  });

  return refreshPromise;
};

const requestOpsTokenRefresh = async () => {
  const storedSession = readOpsAuthSession();

  if (!storedSession?.tokens.refreshToken) {
    return null;
  }

  try {
    const response = await fetch(`${baseUrl}${refreshPathForRole(storedSession.role)}`, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ refreshToken: storedSession.tokens.refreshToken }),
      credentials: "include"
    });
    const payload = await response.json() as { data?: OpsRefreshResponse };

    if (!response.ok || !payload.data?.tokens.accessToken) {
      throw new Error("Ops session refresh failed");
    }

    saveOpsAuthSession({
      role: storedSession.role,
      user: payload.data.user,
      tokens: payload.data.tokens
    });
    return payload.data.tokens.accessToken;
  } catch {
    clearOpsAuthSession();
    return null;
  }
};

const refreshPathForRole = (role: OpsAuthRole) =>
  role === "admin" ? "/api/v1/private/auth/admins/refresh" : "/api/v1/private/auth/ops/refresh";

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
