export interface AdminDashboardSummary {
  totalUsers: number;
  activeCount: number;
  pendingCount: number;
  blockedCount: number;
  suspendedCount: number;
  driverCount: number;
  adminCount: number;
  opsCount: number;
}

export interface AdminDashboard {
  summary: AdminDashboardSummary;
  modules: Array<{
    key: string;
    label: string;
    description: string;
    requiredPermission: string;
  }>;
  recentUsers: AdminUserListItem[];
}

export interface AdminOptions {
  roles: string[];
  statuses: string[];
  permissions: string[];
  defaultRolePermissions: Record<string, string[]>;
  dashboardModules: AdminDashboard["modules"];
}

export interface AdminUserListItem {
  id: string;
  role: string | null;
  fullName: string | null;
  email: string | null;
  phone: string | null;
  employeeCode: string | null;
  department: string | null;
  serviceZone: string | null;
  accountStatus: string | null;
  permissionCount: number;
  lastLoginAt: string | null;
  createdAt: string | null;
}

export interface AdminUser extends AdminUserListItem {
  permissions: string[];
  updatedAt: string | null;
}

export interface AdminUserGuidance {
  isSelf: boolean;
  canUpdateStatus: boolean;
  canUpdatePermissions: boolean;
  defaultPermissions: string[];
}

export interface AdminUserDetail {
  user: AdminUser;
  guidance: AdminUserGuidance;
}

export interface AdminUserListResponseData {
  users: AdminUserListItem[];
  summary: AdminDashboardSummary;
}

export interface AdminCreateFormState {
  role: string;
  fullName: string;
  email: string;
  phone: string;
  employeeCode: string;
  department: string;
  serviceZone: string;
  accountStatus: string;
  password: string;
}

export interface AdminUserFilters {
  role: string;
  accountStatus: string;
  q: string;
}
