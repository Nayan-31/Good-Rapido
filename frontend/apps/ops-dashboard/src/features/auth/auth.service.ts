import type { ApiResponse } from "@good-rapido/api-client";

import { apiClient } from "@/services/apiClient";
import type { OpsAuthRole, OpsAuthSession, OpsAuthUser, OpsLoginForm } from "./auth.types";

type OpsAuthSessionResponse = ApiResponse<{
  user: OpsAuthUser;
  tokens: OpsAuthSession["tokens"];
}>;

type OpsProfileResponse = ApiResponse<{
  user: OpsAuthUser;
}>;

export const opsAuthService = {
  async login(form: OpsLoginForm): Promise<ApiResponse<OpsAuthSession>> {
    const response = await roleApi(form.role).login({
      identifier: form.identifier.trim(),
      password: form.password
    }) as OpsAuthSessionResponse;

    return {
      ...response,
      data: response.data
        ? {
            ...response.data,
            role: form.role
          }
        : undefined
    };
  },

  async refresh(role: OpsAuthRole, refreshToken: string): Promise<ApiResponse<OpsAuthSession>> {
    const response = await roleApi(role).refresh({ refreshToken }) as OpsAuthSessionResponse;

    return {
      ...response,
      data: response.data
        ? {
            ...response.data,
            role
          }
        : undefined
    };
  },

  getMe(role: OpsAuthRole) {
    return roleApi(role).me() as Promise<OpsProfileResponse>;
  },

  logout(role: OpsAuthRole, refreshToken: string) {
    return roleApi(role).logout({ refreshToken }) as Promise<ApiResponse>;
  }
};

const roleApi = (role: OpsAuthRole) => role === "admin" ? apiClient.private.auth.admins : apiClient.private.auth.ops;
