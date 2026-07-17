import { createGoodRapidoApiClient } from "@good-rapido/api-client";

const DRIVER_ACCESS_TOKEN_KEY = "goodRapido.driverAccessToken";

export const apiClient = createGoodRapidoApiClient({
  baseUrl: import.meta.env.VITE_API_BASE_URL ?? "http://localhost:5000",
  getAccessToken: () => localStorage.getItem(DRIVER_ACCESS_TOKEN_KEY) ?? localStorage.getItem("accessToken")
});
