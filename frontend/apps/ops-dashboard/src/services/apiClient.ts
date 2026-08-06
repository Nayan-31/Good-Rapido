import { createGoodRapidoApiClient } from "@good-rapido/api-client";

import { readOpsAuthSession } from "@/features/auth/authStorage";

const readAccessToken = () => {
  if (typeof window === "undefined") {
    return null;
  }

  return readOpsAuthSession()?.tokens.accessToken ?? null;
};

export const apiClient = createGoodRapidoApiClient({
  baseUrl: import.meta.env.VITE_API_BASE_URL ?? "http://localhost:3000",
  getAccessToken: readAccessToken
});
