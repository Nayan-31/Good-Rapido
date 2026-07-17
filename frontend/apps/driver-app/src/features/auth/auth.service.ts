import type { ApiPayload, ApiResponse } from "@good-rapido/api-client";

import { apiClient } from "@/services/apiClient";
import type { DriverAuthSession, DriverAuthUser, DriverLoginForm, DriverRegisterForm } from "./auth.types";

type DriverAuthSessionResponse = ApiResponse<DriverAuthSession>;
type DriverProfileResponse = ApiResponse<{ user: DriverAuthUser }>;

export const driverAuthService = {
  loginDriver(form: DriverLoginForm) {
    return apiClient.private.auth.drivers.loginDriver({
      identifier: form.identifier.trim(),
      password: form.password
    }) as Promise<DriverAuthSessionResponse>;
  },

  registerDriver(form: DriverRegisterForm) {
    const payload: ApiPayload = {
      fullName: form.fullName.trim(),
      phone: form.phone.trim(),
      password: form.password
    };

    if (form.email.trim()) {
      payload.email = form.email.trim();
    }

    if (form.employeeCode.trim()) {
      payload.employeeCode = form.employeeCode.trim();
    }

    if (form.department.trim()) {
      payload.department = form.department.trim();
    }

    if (form.serviceZone.trim()) {
      payload.serviceZone = form.serviceZone.trim();
    }

    return apiClient.private.auth.drivers.registerDriver(payload) as Promise<DriverAuthSessionResponse>;
  },

  refreshDriver(refreshToken: string) {
    return apiClient.private.auth.drivers.refreshDriver({ refreshToken }) as Promise<DriverAuthSessionResponse>;
  },

  logoutDriver(refreshToken: string) {
    return apiClient.private.auth.drivers.logoutDriver({ refreshToken }) as Promise<ApiResponse>;
  },

  getDriverSession() {
    return apiClient.private.auth.drivers.getDriverSession() as Promise<DriverProfileResponse>;
  }
};
