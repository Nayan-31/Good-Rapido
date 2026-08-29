import { ApiClientError } from "./httpClient";

export type ApiErrorContext =
  | "login"
  | "register"
  | "restore"
  | "refresh"
  | "logout"
  | "protectedRoute"
  | "request";

const contextFallbacks: Record<ApiErrorContext, string> = {
  login: "Login failed. Please check your credentials and try again.",
  register: "Registration failed. Please check the details and try again.",
  restore: "Your saved session has expired. Please sign in again.",
  refresh: "Session refresh failed. Please sign in again.",
  logout: "You have been signed out locally. The server session may already be expired.",
  protectedRoute: "Please sign in again to continue.",
  request: "Request failed. Please try again."
};

export const toFriendlyApiErrorMessage = (error: unknown, context: ApiErrorContext = "request") => {
  const status = error instanceof ApiClientError ? error.status : undefined;
  const rawMessage = error instanceof Error ? error.message : "";
  const normalizedMessage = rawMessage.toLowerCase();

  if (status === 429 || normalizedMessage.includes("too many requests")) {
    return "Too many attempts right now. Please wait a minute, then try again.";
  }

  if (status === 401 || /invalid .*token|access token|refresh token|unauthorized|session/i.test(rawMessage)) {
    if (context === "login") {
      return contextFallbacks.login;
    }

    if (context === "register") {
      return contextFallbacks.register;
    }

    return contextFallbacks[context];
  }

  if (status === 403 || normalizedMessage.includes("forbidden") || normalizedMessage.includes("permission")) {
    return "You do not have permission for this action. Please use an account with the right access.";
  }

  if (normalizedMessage.includes("failed to fetch") || normalizedMessage.includes("network")) {
    return "Cannot reach the backend right now. Please check that the API server is running.";
  }

  if (/invalid .*credentials|credential/i.test(rawMessage)) {
    return context === "register" ? contextFallbacks.register : contextFallbacks.login;
  }

  return rawMessage || contextFallbacks[context];
};
