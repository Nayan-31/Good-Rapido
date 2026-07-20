import type { ApiResponse } from "@good-rapido/api-client";

import { apiClient } from "@/services/apiClient";
import type {
  AdminCreateFormState,
  AdminDashboard,
  AdminOptions,
  AdminUserDetail,
  AdminUserFilters,
  AdminUserListResponseData
} from "./adminUsers.types";

type AdminOptionsResponse = ApiResponse<{ options: AdminOptions }>;
type AdminDashboardResponse = ApiResponse<{ dashboard: AdminDashboard }>;
type AdminUserListResponse = ApiResponse<AdminUserListResponseData>;
type AdminUserDetailResponse = ApiResponse<AdminUserDetail>;

export const adminUsersService = {
  async load(filters: AdminUserFilters) {
    const query = {
      limit: 50,
      role: filters.role || undefined,
      accountStatus: filters.accountStatus || undefined,
      q: filters.q || undefined
    };

    const [options, dashboard, users] = await Promise.all([
      apiClient.private.admin.getOptions() as Promise<AdminOptionsResponse>,
      apiClient.private.admin.getDashboard() as Promise<AdminDashboardResponse>,
      apiClient.private.admin.listUsers(query) as Promise<AdminUserListResponse>
    ]);

    return {
      options: options.data?.options,
      dashboard: dashboard.data?.dashboard,
      users: users.data
    };
  },

  async getUser(userId: string) {
    const response = await apiClient.private.admin.getUser(userId) as AdminUserDetailResponse;

    return response.data;
  },

  async createUser(form: AdminCreateFormState, permissions: string[]) {
    const response = await apiClient.private.admin.createUser({
      role: form.role,
      fullName: form.fullName,
      email: form.email || undefined,
      phone: form.phone,
      employeeCode: form.employeeCode || undefined,
      department: form.department || undefined,
      serviceZone: form.serviceZone || undefined,
      accountStatus: form.accountStatus || undefined,
      password: form.password,
      permissions: permissions.length ? permissions : undefined
    }) as AdminUserDetailResponse;

    return response.data;
  },

  async updateProfile(userId: string, form: AdminCreateFormState) {
    const response = await apiClient.private.admin.updateUser(userId, {
      fullName: form.fullName,
      email: form.email || undefined,
      phone: form.phone,
      employeeCode: form.employeeCode || undefined,
      department: form.department || undefined,
      serviceZone: form.serviceZone || undefined
    }) as AdminUserDetailResponse;

    return response.data;
  },

  async updateStatus(userId: string, accountStatus: string) {
    const response = await apiClient.private.admin.updateUserStatus(userId, {
      accountStatus
    }) as AdminUserDetailResponse;

    return response.data;
  },

  async updatePermissions(userId: string, permissions: string[]) {
    const response = await apiClient.private.admin.updateUserPermissions(userId, {
      permissions
    }) as AdminUserDetailResponse;

    return response.data;
  }
};
