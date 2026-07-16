import { createGoodRapidoApiClient } from "@good-rapido/api-client";

export const apiClient = createGoodRapidoApiClient({
  baseUrl: import.meta.env.VITE_API_BASE_URL ?? "http://localhost:5000"
});
