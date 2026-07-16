import type { ApiResponse } from "@good-rapido/api-client";

import { apiClient } from "@/services/apiClient";
import type { BookingHomeForm, FareEstimate } from "./booking.types";
import { buildFareEstimatePayload } from "./booking.utils";

type FareEstimateResponse = ApiResponse<{
  estimate: FareEstimate;
}>;

export const bookingService = {
  createFareEstimate(form: BookingHomeForm) {
    return apiClient.public.fare.createEstimate(buildFareEstimatePayload(form)) as Promise<FareEstimateResponse>;
  }
};
