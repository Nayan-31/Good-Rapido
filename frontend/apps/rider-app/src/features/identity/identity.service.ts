import type { ApiResponse } from "@good-rapido/api-client";

import { apiClient } from "@/services/apiClient";
import type { IdentityOptions, IdentityVerification } from "./identity.types";
import { buildIdentityPayload } from "./identity.utils";
import type { IdentityDocumentForm } from "./identity.types";

type IdentityOptionsResponse = ApiResponse<{
  options: IdentityOptions;
}>;

type IdentityVerificationResponse = ApiResponse<{
  identity: IdentityVerification;
}>;

export const identityService = {
  async getOptions() {
    return apiClient.core.identity.getOptions() as Promise<IdentityOptionsResponse>;
  },
  async getMe() {
    return apiClient.core.identity.getMe() as Promise<IdentityVerificationResponse>;
  },
  async saveDocuments(documents: IdentityDocumentForm[]) {
    return apiClient.core.identity.upsertMe(buildIdentityPayload(documents)) as Promise<IdentityVerificationResponse>;
  },
  async submit() {
    return apiClient.core.identity.submitMe() as Promise<IdentityVerificationResponse>;
  }
};
