import type { ApiPayload, ApiResponse } from "@good-rapido/api-client";

import { apiClient } from "@/services/apiClient";
import type { AuthSession, AuthUser, LoginForm, RegisterForm } from "./auth.types";

type AuthSessionResponse = ApiResponse<AuthSession>;
type RiderProfileResponse = ApiResponse<{ user: AuthUser }>;

export const authService = {
  loginRider(form: LoginForm) {
    return apiClient.public.auth.loginRider({
      identifier: form.identifier.trim(),
      password: form.password
    }) as Promise<AuthSessionResponse>;
  },

  registerRider(form: RegisterForm) {
    const payload: ApiPayload = {
      fullName: form.fullName.trim(),
      phone: form.phone.trim(),
      password: form.password
    };

    if (form.email.trim()) {
      payload.email = form.email.trim();
    }

    return apiClient.public.auth.registerRider(payload) as Promise<AuthSessionResponse>;
  },

  refreshRider(refreshToken: string) {
    return apiClient.public.auth.refreshRider({ refreshToken }) as Promise<AuthSessionResponse>;
  },

  logoutRider(refreshToken: string) {
    return apiClient.public.auth.logoutRider({ refreshToken }) as Promise<ApiResponse>;
  },

  getRiderSession() {
    return apiClient.public.auth.getRiderSession() as Promise<RiderProfileResponse>;
  }
};
