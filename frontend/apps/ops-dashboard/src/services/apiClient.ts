import { createGoodRapidoApiClient } from "@good-rapido/api-client";

const readAccessToken = () => {
  if (typeof window === "undefined") {
    return null;
  }

  return localStorage.getItem("goodRapido.opsAccessToken");
};

export const apiClient = createGoodRapidoApiClient({
  baseUrl: import.meta.env.VITE_API_BASE_URL ?? "http://localhost:3000",
  getAccessToken: readAccessToken
});
