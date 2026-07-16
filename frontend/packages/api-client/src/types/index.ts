export type ApiPayload = Record<string, unknown>;

export type ApiQuery = Record<string, string | number | boolean | null | undefined>;

export interface ApiResponse<TData = unknown> {
  success: boolean;
  message: string;
  data?: TData;
}

export interface ApiClientOptions {
  baseUrl?: string;
  defaultHeaders?: HeadersInit;
  fetcher?: typeof fetch;
  getAccessToken?: () => string | null | Promise<string | null>;
}

export interface RequestOptions {
  body?: ApiPayload;
  query?: ApiQuery;
  headers?: HeadersInit;
  signal?: AbortSignal;
}
