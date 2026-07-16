import { createCoreApi } from "./modules/coreApi";
import { createPublicApi } from "./modules/publicApi";
import { HttpClient } from "./shared/httpClient";
import type { ApiClientOptions } from "./types";

export const createGoodRapidoApiClient = (options: ApiClientOptions = {}) => {
  const http = new HttpClient(options);

  return {
    public: createPublicApi(http),
    core: createCoreApi(http)
  };
};

export type GoodRapidoApiClient = ReturnType<typeof createGoodRapidoApiClient>;
