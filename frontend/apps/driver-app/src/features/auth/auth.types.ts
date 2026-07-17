export interface DriverAuthUser {
  id: string;
  role: "driver" | string;
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

export interface DriverAuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface DriverAuthSession {
  user: DriverAuthUser | null;
  tokens: DriverAuthTokens;
}

export interface DriverLoginForm {
  identifier: string;
  password: string;
}

export interface DriverRegisterForm {
  fullName: string;
  email: string;
  phone: string;
  employeeCode: string;
  department: string;
  serviceZone: string;
  password: string;
}
