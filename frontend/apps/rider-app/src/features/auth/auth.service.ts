import type { ApiPayload, ApiResponse } from "@good-rapido/api-client";

import { apiClient } from "@/services/apiClient";
import type { AuthSession, LoginForm, RegisterForm } from "./auth.types";

type AuthSessionResponse = ApiResponse<AuthSession>;

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
  }
};
