export interface AuthUser {
  id: string;
  role: string;
  fullName: string;
  email: string | null;
  phone: string;
  accountStatus: string;
  createdAt: string;
  updatedAt: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface AuthSession {
  user: AuthUser | null;
  tokens: AuthTokens;
}

export interface LoginForm {
  identifier: string;
  password: string;
}

export interface RegisterForm {
  fullName: string;
  email: string;
  phone: string;
  password: string;
}
