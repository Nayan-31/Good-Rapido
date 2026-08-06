import type { ApiClientOptions, ApiQuery, ApiResponse, RequestOptions } from "../types";

type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

export class ApiClientError extends Error {
  status: number;
  response: unknown;

  constructor(message: string, status: number, response: unknown) {
    super(message);
    this.name = "ApiClientError";
    this.status = status;
    this.response = response;
  }
}

export class HttpClient {
  private readonly baseUrl: string;
  private readonly defaultHeaders?: HeadersInit;
  private readonly fetcher: typeof fetch;
  private readonly getAccessToken?: ApiClientOptions["getAccessToken"];
  private readonly refreshAccessToken?: ApiClientOptions["refreshAccessToken"];
  private readonly onUnauthorized?: ApiClientOptions["onUnauthorized"];

  constructor(options: ApiClientOptions = {}) {
    this.baseUrl = options.baseUrl?.replace(/\/+$/, "") ?? "";
    this.defaultHeaders = options.defaultHeaders;
    this.fetcher = options.fetcher ?? ((input, init) => globalThis.fetch(input, init));
    this.getAccessToken = options.getAccessToken;
    this.refreshAccessToken = options.refreshAccessToken;
    this.onUnauthorized = options.onUnauthorized;
  }

  get<TData = unknown>(path: string, options?: RequestOptions) {
    return this.request<TData>("GET", path, options);
  }

  post<TData = unknown>(path: string, body?: RequestOptions["body"], options?: Omit<RequestOptions, "body">) {
    return this.request<TData>("POST", path, { ...options, body });
  }

  put<TData = unknown>(path: string, body?: RequestOptions["body"], options?: Omit<RequestOptions, "body">) {
    return this.request<TData>("PUT", path, { ...options, body });
  }

  patch<TData = unknown>(path: string, body?: RequestOptions["body"], options?: Omit<RequestOptions, "body">) {
    return this.request<TData>("PATCH", path, { ...options, body });
  }

  delete<TData = unknown>(path: string, options?: RequestOptions) {
    return this.request<TData>("DELETE", path, options);
  }

  private async request<TData>(method: HttpMethod, path: string, options: RequestOptions = {}) {
    const accessToken = this.shouldAttachAccessToken(path) ? await this.getAccessToken?.() : null;
    const firstAttempt = await this.send(method, path, options, accessToken ?? null);

    if (firstAttempt.response.ok) {
      return firstAttempt.payload as ApiResponse<TData>;
    }

    if (this.canRetryWithFreshToken(path, options, firstAttempt.response.status)) {
      const refreshedToken = await this.refreshAccessToken?.();

      if (refreshedToken) {
        const retryAttempt = await this.send(method, path, options, refreshedToken);

        if (retryAttempt.response.ok) {
          return retryAttempt.payload as ApiResponse<TData>;
        }

        await this.notifyUnauthorized(retryAttempt.response.status);
        throw new ApiClientError(
          resolveErrorMessage(retryAttempt.payload, retryAttempt.response.statusText),
          retryAttempt.response.status,
          retryAttempt.payload
        );
      }
    }

    await this.notifyUnauthorized(firstAttempt.response.status);
    throw new ApiClientError(
      resolveErrorMessage(firstAttempt.payload, firstAttempt.response.statusText),
      firstAttempt.response.status,
      firstAttempt.payload
    );
  }

  private async send(method: HttpMethod, path: string, options: RequestOptions, accessToken: string | null) {
    const headers = new Headers(this.defaultHeaders);

    headers.set("Accept", "application/json");

    if (options.body) {
      headers.set("Content-Type", "application/json");
    }

    if (accessToken) {
      headers.set("Authorization", `Bearer ${accessToken}`);
    }

    new Headers(options.headers).forEach((value, key) => headers.set(key, value));

    const response = await this.fetcher(this.createUrl(path, options.query), {
      method,
      headers,
      body: options.body ? JSON.stringify(options.body) : undefined,
      signal: options.signal,
      credentials: "include"
    });
    const payload = await readResponsePayload(response);

    return {
      response,
      payload
    };
  }

  private canRetryWithFreshToken(path: string, options: RequestOptions, status: number) {
    return status === 401
      && !options.skipAuthRefresh
      && !path.includes("/auth/")
      && Boolean(this.refreshAccessToken);
  }

  private async notifyUnauthorized(status: number) {
    if (status === 401) {
      await this.onUnauthorized?.();
    }
  }

  private shouldAttachAccessToken(path: string) {
    return !/\/auth\/.+\/(?:login|register|refresh|logout)$/.test(path);
  }

  private createUrl(path: string, query?: ApiQuery) {
    const url = new URL(`${this.baseUrl}${path}`);

    Object.entries(query ?? {}).forEach(([key, value]) => {
      if (value !== null && value !== undefined) {
        url.searchParams.set(key, String(value));
      }
    });

    return url.toString();
  }
}

const readResponsePayload = async (response: Response) => {
  const contentType = response.headers.get("content-type") ?? "";

  if (contentType.includes("application/json")) {
    return response.json();
  }

  return response.text();
};

const resolveErrorMessage = (payload: unknown, fallback: string) => {
  if (typeof payload === "object" && payload !== null && "message" in payload) {
    const message = (payload as { message?: unknown }).message;

    if (typeof message === "string") {
      return message;
    }
  }

  return fallback || "Request failed";
};
