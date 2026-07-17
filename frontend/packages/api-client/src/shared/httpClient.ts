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

  constructor(options: ApiClientOptions = {}) {
    this.baseUrl = options.baseUrl?.replace(/\/+$/, "") ?? "";
    this.defaultHeaders = options.defaultHeaders;
    this.fetcher = options.fetcher ?? ((input, init) => globalThis.fetch(input, init));
    this.getAccessToken = options.getAccessToken;
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
    const accessToken = await this.getAccessToken?.();
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

    if (!response.ok) {
      throw new ApiClientError(resolveErrorMessage(payload, response.statusText), response.status, payload);
    }

    return payload as ApiResponse<TData>;
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
