import type { ApiResponse } from "@good-rapido/api-client";

import { apiClient } from "@/services/apiClient";
import type { BookingHomeForm } from "@/features/booking/booking.types";
import type { MatchingResult } from "./matching.types";
import { buildMatchingPayload } from "./matching.utils";

type MatchingResponse = ApiResponse<{
  matching: MatchingResult;
}>;

export const matchingService = {
  match(form: BookingHomeForm) {
    return apiClient.core.matchingEngine.match(buildMatchingPayload(form)) as Promise<MatchingResponse>;
  }
};
