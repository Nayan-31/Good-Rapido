export type OpsAuthRole = "admin" | "ops";

export interface OpsAuthUser {
  id: string;
  role: OpsAuthRole | string;
  fullName: string;
  email: string | null;
  phone: string;
  employeeCode: string | null;
  department: string | null;
  serviceZone: string | null;
  permissions: string[];
  accountStatus: string;
  lastLoginAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface OpsAuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface OpsAuthSession {
  user: OpsAuthUser | null;
  tokens: OpsAuthTokens;
  role: OpsAuthRole;
}

export interface OpsLoginForm {
  role: OpsAuthRole;
  identifier: string;
  password: string;
}
