import type { HttpClient } from "../shared/httpClient";
import type { ApiPayload } from "../types";

export const createPrivateApi = (http: HttpClient) => ({
  auth: {
    drivers: {
      registerDriver: (payload: ApiPayload) => http.post("/api/v1/private/auth/drivers/register", payload),
      loginDriver: (payload: ApiPayload) => http.post("/api/v1/private/auth/drivers/login", payload),
      refreshDriver: (payload: ApiPayload) => http.post("/api/v1/private/auth/drivers/refresh", payload),
      logoutDriver: (payload: ApiPayload) => http.post("/api/v1/private/auth/drivers/logout", payload),
      getDriverSession: () => http.get("/api/v1/private/auth/drivers/me")
    }
  }
});
