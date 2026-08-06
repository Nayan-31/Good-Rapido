import { createGoodRapidoApiClient } from "@good-rapido/api-client";

import { readDriverAuthSession } from "@/features/auth/authStorage";

export const apiClient = createGoodRapidoApiClient({
  baseUrl: import.meta.env.VITE_API_BASE_URL ?? "http://localhost:5000",
  getAccessToken: () => readDriverAuthSession()?.tokens.accessToken ?? null
});
